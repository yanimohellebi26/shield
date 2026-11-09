import { Room, type Client } from '@colyseus/core';
import {
  apply,
  chooseBotCommand,
  createGame,
  eventsFor,
  legalCommands,
  MAX_PLAYERS,
  MIN_PLAYERS,
  RuleError,
  viewFor,
  type Command,
  type GameEvent,
  type GameState,
} from '@shield/engine';

/**
 * One SHIELD table. The server is authoritative: it holds the full game state, validates every
 * command with the rules engine, and sends each player only their own view (secret shields and
 * charges never leave the server).
 *
 * Messages to clients:  'lobby' (table setup), 'start' / 'update' / 'resume' (game), 'error'.
 * Messages from clients: 'seats' and 'start' and 'rematch' (host only), 'cmd' (a game command).
 *
 * Every payload is localised for its recipient: their own player id is replaced by 'you', so the
 * client renders an online table exactly like a local one.
 */

const BOT_NAMES = ['Aria', 'Bastion', 'Corvin', 'Dahlia', 'Eskel', 'Freya', 'Garrick', 'Hel', 'Ivo', 'Juno', 'Kael'];
const TURN_LIMIT_MS = 60_000;
const ABSENT_TURN_MS = 20_000;
const RECONNECT_SECONDS = 120;
/** Test hook: SHIELD_TIME_SCALE=0.01 makes waits (animations, bots, turn limits) 100× shorter. */
const timeScale = () => Number(process.env.SHIELD_TIME_SCALE ?? 1);

interface Human {
  sessionId: string;
  name: string;
  connected: boolean;
  /** When the connection dropped (for the log). */
  droppedAt?: number;
  /** Engine player id once the game has started. */
  playerId?: string;
}

export interface LobbyMessage {
  code: string;
  seats: number;
  started: boolean;
  isHost: boolean;
  players: { name: string; you: boolean; host: boolean; connected: boolean }[];
}

/** Rough duration of the client-side animation for a batch of events (1× speed). */
function animationMs(events: GameEvent[]): number {
  let ms = 300;
  for (const e of events) {
    switch (e.type) {
      case 'attack':
        ms += 2600 + e.charge.length * 150;
        break;
      case 'charge':
        ms += 900;
        break;
      case 'shieldChange':
        ms += 1200;
        break;
      case 'lifeSwap':
      case 'lifeOffer':
      case 'lifeOfferResolved':
        ms += 2000;
        break;
      case 'eliminated':
        ms += 1200;
        break;
      case 'chargeLost':
        ms += 900;
        break;
      case 'gameOver':
        ms += 1500;
        break;
      default:
        ms += 150;
    }
  }
  return ms;
}

const LOCAL_KEYS = new Set(['id', 'viewer', 'current', 'player', 'target', 'winner']);

/** Replaces the recipient's own player id by 'you' in id-carrying fields. */
export function localize<T>(value: T, playerId: string): T {
  const walk = (v: unknown, key?: string): unknown => {
    if (typeof v === 'string') return key && LOCAL_KEYS.has(key) && v === playerId ? 'you' : v;
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, k)]));
    return v;
  };
  return walk(value) as T;
}

/** Reverse of localize for incoming commands: a client never names itself, but be safe. */
function delocalize(cmd: Command, playerId: string): Command {
  if (cmd.type === 'act' && 'target' in cmd.action && cmd.action.target === 'you') {
    return { type: 'act', action: { ...cmd.action, target: playerId } };
  }
  return cmd;
}

function isCommand(x: unknown): x is Command {
  if (!x || typeof x !== 'object') return false;
  const c = x as { type?: unknown; action?: { type?: unknown; target?: unknown } };
  if (c.type === 'lifeSwap' || c.type === 'acceptLife' || c.type === 'declineLife') return true;
  if (c.type !== 'act' || !c.action || typeof c.action.type !== 'string') return false;
  return ['attack', 'charge', 'shieldSelf', 'shieldOther', 'pass'].includes(c.action.type) && (c.action.target === undefined || typeof c.action.target === 'string');
}

function newCode(): string {
  // No easily confused letters (I/O/0/1).
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return Array.from({ length: 5 }, () => A[Math.floor(Math.random() * A.length)]).join('');
}

export class ShieldRoom extends Room {
  maxClients = MAX_PLAYERS;

  private humans: Human[] = [];
  private seats = 4;
  private game: GameState | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  onCreate(options: { seats?: number }) {
    this.roomId = newCode();
    this.seats = this.clampSeats(options?.seats ?? 4);
    this.autoDispose = true;

    this.onMessage('seats', (client, n: unknown) => {
      if (!this.isHost(client) || this.game || typeof n !== 'number') return;
      this.seats = Math.max(this.clampSeats(n), this.humans.length);
      this.sendLobby();
    });
    this.onMessage('start', (client) => {
      if (this.isHost(client) && !this.game) this.startGame();
    });
    this.onMessage('rematch', (client) => {
      if (this.isHost(client) && this.game?.phase === 'over') this.startGame();
    });
    this.onMessage('cmd', (client, cmd: unknown) => this.onCommand(client, cmd));
  }

  onJoin(client: Client, options: { name?: string }) {
    if (this.game) throw new Error('This table has already started.');
    const name = String(options?.name ?? '').trim().slice(0, 16) || `Joueur ${this.humans.length + 1}`;
    this.humans.push({ sessionId: client.sessionId, name, connected: true });
    if (this.humans.length > this.seats) this.seats = this.humans.length;
    if (this.humans.length >= MAX_PLAYERS) void this.lock();
    this.sendLobby();
  }

  async onDrop(client: Client, code?: number) {
    const h = this.human(client.sessionId);
    if (!h) return;
    h.connected = false;
    h.droppedAt = Date.now();
    this.log(`drop ${h.name} code=${code ?? '?'}`);
    this.sendLobby();
    if (this.game && this.currentHuman() === h) this.scheduleNext(ABSENT_TURN_MS);
    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
    } catch {
      // Reconnection window expired: onLeave follows.
    }
  }

  onReconnect(client: Client) {
    const h = this.human(client.sessionId);
    if (!h) return;
    h.connected = true;
    this.log(`reconnect ${h.name} after ${h.droppedAt ? ((Date.now() - h.droppedAt) / 1000).toFixed(1) : '?'}s`);
    this.sendLobby();
    if (this.game && h.playerId) client.send('resume', this.payloadFor(h.playerId, []));
    if (this.game && this.currentHuman() === h) this.scheduleNext();
  }

  onLeave(client: Client, code?: number) {
    const h = this.human(client.sessionId);
    if (!h) return;
    this.log(`leave ${h.name} code=${code ?? '?'}`);
    if (!this.game) {
      // Before the game: free the seat. The next player becomes host.
      this.humans = this.humans.filter((x) => x !== h);
      void this.unlock();
    } else {
      // During the game: the seat stays, played by a bot from now on.
      h.connected = false;
      h.sessionId = `left:${h.sessionId}`;
      if (this.currentHuman() === h) this.scheduleNext(1500);
    }
    this.sendLobby();
  }

  onDispose() {
    clearTimeout(this.timer);
  }

  // ------------------------------------------------------------------ game flow

  private startGame() {
    clearTimeout(this.timer);
    const bots = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const players = Array.from({ length: Math.max(this.seats, MIN_PLAYERS) }, (_, i) => {
      const id = `p${i}`;
      const h = this.humans[i];
      if (h) h.playerId = id;
      return { id, name: h ? h.name : bots[i]! };
    });
    this.game = createGame({ players, seed: (Math.random() * 2 ** 32) >>> 0 });
    void this.lock();
    for (const h of this.humans) {
      const c = this.client(h);
      if (c && h.playerId) c.send('start', this.payloadFor(h.playerId, []));
    }
    this.sendLobby();
    // Let everyone watch the shuffle and the deal before the first move.
    this.scheduleNext(undefined, 4000);
  }

  private onCommand(client: Client, raw: unknown) {
    const h = this.human(client.sessionId);
    if (!this.game || !h?.playerId || !isCommand(raw)) return;
    if (this.game.players[this.game.current]!.id !== h.playerId) {
      client.send('error', { message: 'not-your-turn' });
      return;
    }
    this.play(h.playerId, delocalize(raw, h.playerId));
  }

  private play(playerId: string, cmd: Command) {
    if (!this.game) return;
    let events: GameEvent[];
    try {
      const out = apply(this.game, playerId, cmd);
      this.game = out.state;
      events = out.events;
    } catch (err) {
      if (err instanceof RuleError) {
        this.clientOf(playerId)?.send('error', { message: err.message });
        return;
      }
      throw err;
    }
    for (const h of this.humans) {
      const c = this.client(h);
      if (c && h.playerId) c.send('update', this.payloadFor(h.playerId, events));
    }
    this.scheduleNext(undefined, animationMs(events));
  }

  /**
   * Decides who acts next: bots after the animation and a short pause; humans get a turn limit,
   * after which (or quickly, if they are disconnected) a bot plays for them.
   */
  private scheduleNext(humanLimit?: number, animation = 0) {
    clearTimeout(this.timer);
    const g = this.game;
    if (!g || g.phase === 'over') return;
    const pid = g.players[g.current]!.id;
    const h = this.humans.find((x) => x.playerId === pid);
    const autoplay = !h || !h.connected;
    const delay = autoplay ? animation + (h ? Math.max(humanLimit ?? 0, ABSENT_TURN_MS) : 700) : animation + (humanLimit ?? TURN_LIMIT_MS);
    this.timer = setTimeout(() => {
      const now = this.game;
      if (!now || now.phase === 'over' || now.players[now.current]!.id !== pid) return;
      this.play(pid, chooseBotCommand(viewFor(now, pid), legalCommands(now, pid)));
    }, delay * timeScale());
  }

  // ------------------------------------------------------------------ helpers

  /** One line per connection event, readable in the Render logs. Silent in tests. */
  private log(msg: string) {
    if (process.env.VITEST) return;
    console.log(`[${this.roomId}] ${msg}`);
  }

  private payloadFor(playerId: string, events: GameEvent[]) {
    const g = this.game!;
    return localize({ events: eventsFor(events, playerId), view: viewFor(g, playerId), legal: legalCommands(g, playerId) }, playerId);
  }

  private sendLobby() {
    const host = this.humans.find((h) => h.connected) ?? this.humans[0];
    for (const h of this.humans) {
      const c = this.client(h);
      if (!c) continue;
      const msg: LobbyMessage = {
        code: this.roomId,
        seats: this.seats,
        started: !!this.game,
        isHost: h === host,
        players: this.humans.map((x) => ({ name: x.name, you: x === h, host: x === host, connected: x.connected })),
      };
      c.send('lobby', msg);
    }
  }

  private isHost(client: Client) {
    const host = this.humans.find((h) => h.connected) ?? this.humans[0];
    return host?.sessionId === client.sessionId;
  }

  private human(sessionId: string) {
    return this.humans.find((h) => h.sessionId === sessionId);
  }

  private client(h: Human) {
    return h.connected ? this.clients.find((c) => c.sessionId === h.sessionId) : undefined;
  }

  private clientOf(playerId: string) {
    const h = this.humans.find((x) => x.playerId === playerId);
    return h ? this.client(h) : undefined;
  }

  private currentHuman() {
    const g = this.game;
    if (!g) return undefined;
    return this.humans.find((h) => h.playerId === g.players[g.current]!.id);
  }

  private clampSeats(n: number) {
    return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(n)));
  }
}
