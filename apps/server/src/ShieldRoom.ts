import { Room, type Client } from '@colyseus/core';
import {
  actorOf,
  apply,
  chooseBotCommand,
  createGame,
  eventsFor,
  legalCommands,
  MAX_PLAYERS,
  MIN_PLAYERS,
  newRecord,
  RuleError,
  viewFor,
  type Command,
  type GameEvent,
  type GameRecord,
  type GameState,
} from '@shield/engine';
import { saveRecord } from './records';

/**
 * One SHIELD table. The server is authoritative: it holds the full game state, validates every
 * command with the rules engine, and sends each player only their own view (secret shields and
 * charges never leave the server).
 *
 * Messages to clients:  'lobby' (table setup), 'start' / 'update' / 'resume' (game), 'chat', 'error'.
 * Messages from clients: 'seats' and 'start' and 'rematch' (host only), 'cmd' (a game command),
 * 'chat' (a short message or a reaction).
 *
 * People may join a table in progress: they wait (and can chat) until the game ends, then take
 * part in the next one, even if that means more seats than the host chose (up to 8).
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
  /** Engine player id in the current game; absent while waiting for the next game. */
  playerId?: string;
  /** Last chat message time (rate limit). */
  chatAt?: number;
  /** Secret kept by the browser so the same person can take their seat back after a long absence. */
  key?: string;
}

const REACTIONS = ['bravo', 'ouch', 'gg', 'laugh', 'think', 'hurry'] as const;
const CHAT_MAX = 140;
const CHAT_GAP_MS = 800;

export interface LobbyMessage {
  code: string;
  seats: number;
  started: boolean;
  isHost: boolean;
  /** You joined during a game and will play in the next one. */
  waiting: boolean;
  players: { name: string; you: boolean; host: boolean; connected: boolean; waiting: boolean }[];
}

export interface ChatMessage {
  from: string;
  you: boolean;
  text?: string;
  reaction?: (typeof REACTIONS)[number];
  at: number;
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

const LOCAL_KEYS = new Set(['id', 'viewer', 'current', 'player', 'target', 'winner', 'lifeOfferTo']);

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
  private record: GameRecord | null = null;
  private startedAt = 0;
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
    this.onMessage('chat', (client, msg: unknown) => this.onChat(client, msg));
  }

  onJoin(client: Client, options: { name?: string; key?: string }) {
    const key = typeof options?.key === 'string' && options.key.length >= 8 ? options.key.slice(0, 64) : undefined;
    // Coming back with the same seat key (phone woke up, tab reopened): give the seat back.
    const back = key ? this.humans.find((h) => h.key === key) : undefined;
    if (back) {
      const wasAbsent = !back.connected;
      back.sessionId = client.sessionId;
      back.connected = true;
      this.log(`rejoin ${back.name}${wasAbsent ? '' : ' (replaces an open session)'}`);
      this.sendLobby();
      if (this.game && back.playerId) client.send('resume', this.payloadFor(back.playerId, []));
      if (this.game && this.actingHuman() === back) this.scheduleNext();
      return;
    }
    if (this.present().length >= MAX_PLAYERS) throw new Error('This table is full.');
    const name = String(options?.name ?? '').trim().slice(0, 16) || `Joueur ${this.humans.length + 1}`;
    this.humans.push({ sessionId: client.sessionId, name, connected: true, key });
    // Before a game the table grows with its guests; during one, newcomers wait for the next.
    if (!this.game && this.humans.length > this.seats) this.seats = this.humans.length;
    if (this.present().length >= MAX_PLAYERS) void this.lock();
    this.log(`join ${name}${this.game && this.game.phase !== 'over' ? ' (waits for the next game)' : ''}`);
    this.sendLobby();
    // Someone arriving after the end sees the final table until the rematch.
  }

  async onDrop(client: Client, code?: number) {
    const h = this.human(client.sessionId);
    if (!h) return;
    h.connected = false;
    h.droppedAt = Date.now();
    this.log(`drop ${h.name} code=${code ?? '?'}`);
    this.sendLobby();
    if (this.game && this.actingHuman() === h) this.scheduleNext(ABSENT_TURN_MS);
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
    if (this.game && this.actingHuman() === h) this.scheduleNext();
  }

  onLeave(client: Client, code?: number) {
    const h = this.human(client.sessionId);
    if (!h) return;
    this.log(`leave ${h.name} code=${code ?? '?'}`);
    if (!this.game || !h.playerId || this.game.phase === 'over') {
      // Not in a running game: free the seat. The next player becomes host.
      this.humans = this.humans.filter((x) => x !== h);
      if (this.present().length < MAX_PLAYERS) void this.unlock();
    } else {
      // During the game: the seat stays, played by a bot from now on.
      h.connected = false;
      h.sessionId = `left:${h.sessionId}`;
      if (this.actingHuman() === h) this.scheduleNext(1500);
    }
    this.sendLobby();
  }

  onDispose() {
    clearTimeout(this.timer);
    // A table closed mid-game is still worth keeping.
    if (this.record && !this.record.finished && this.record.moves.some((m) => m.by === 'human')) {
      this.record.endedAt = new Date().toISOString();
      void saveRecord(this.record);
    }
  }

  // ------------------------------------------------------------------ game flow

  private startGame() {
    clearTimeout(this.timer);
    // People who left during the last game drop out; those waiting take a seat, even past the
    // number the host chose.
    this.humans = this.humans.filter((h) => !h.sessionId.startsWith('left:'));
    for (const h of this.humans) h.playerId = undefined;
    this.seats = this.clampSeats(Math.max(this.seats, this.humans.length));
    const bots = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    const players = Array.from({ length: Math.max(this.seats, MIN_PLAYERS) }, (_, i) => {
      const id = `p${i}`;
      const h = this.humans[i];
      if (h) h.playerId = id;
      return { id, name: h ? h.name : bots[i]!, kind: h ? ('human' as const) : ('bot' as const) };
    });
    const seed = (Math.random() * 2 ** 32) >>> 0;
    this.game = createGame({ players, seed });
    this.record = newRecord('online', this.game, seed, players);
    this.startedAt = Date.now();
    if (this.present().length >= MAX_PLAYERS) void this.lock();
    else void this.unlock();
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
    // The engine decides who may act now (life replacement is allowed on anyone's turn).
    this.play(h.playerId, delocalize(raw, h.playerId), 'human');
  }

  private onChat(client: Client, raw: unknown) {
    const h = this.human(client.sessionId);
    if (!h || !raw || typeof raw !== 'object') return;
    const now = Date.now();
    if (h.chatAt && now - h.chatAt < CHAT_GAP_MS) return;
    const m = raw as { text?: unknown; reaction?: unknown };
    const reaction = REACTIONS.find((r) => r === m.reaction);
    const text = typeof m.text === 'string' ? m.text.replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX) : '';
    if (!reaction && !text) return;
    h.chatAt = now;
    for (const x of this.humans) {
      const c = this.client(x);
      if (c) c.send('chat', { from: h.name, you: x === h, ...(reaction ? { reaction } : { text }), at: now } satisfies ChatMessage);
    }
  }

  private play(playerId: string, cmd: Command, by: 'human' | 'bot' | 'auto') {
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
    if (this.record) {
      this.record.moves.push({ player: playerId, cmd, by, ms: Date.now() - this.startedAt });
      if (this.game.phase === 'over') {
        this.record.finished = true;
        this.record.winner = this.game.winner;
        this.record.endedAt = new Date().toISOString();
        void saveRecord(this.record);
        this.record = null;
      }
    }
    for (const h of this.humans) {
      const c = this.client(h);
      if (c && h.playerId) c.send('update', this.payloadFor(h.playerId, events));
    }
    if (this.game.phase === 'over') this.sendLobby();
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
    const pid = actorOf(g);
    const h = this.humans.find((x) => x.playerId === pid);
    const autoplay = !h || !h.connected;
    const delay = autoplay ? animation + (h ? Math.max(humanLimit ?? 0, ABSENT_TURN_MS) : 700) : animation + (humanLimit ?? TURN_LIMIT_MS);
    this.timer = setTimeout(() => {
      const now = this.game;
      if (!now || now.phase === 'over' || actorOf(now) !== pid) return;
      this.play(pid, chooseBotCommand(viewFor(now, pid), legalCommands(now, pid)), h ? 'auto' : 'bot');
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
        waiting: this.isWaiting(h),
        players: this.present().map((x) => ({ name: x.name, you: x === h, host: x === host, connected: x.connected, waiting: this.isWaiting(x) })),
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

  /** The human the game is waiting for right now, if any. */
  private actingHuman() {
    const g = this.game;
    if (!g) return undefined;
    const pid = actorOf(g);
    return this.humans.find((h) => h.playerId === pid);
  }

  /** People still at the table (not those who left a running game). */
  private present() {
    return this.humans.filter((h) => !h.sessionId.startsWith('left:'));
  }

  /** Joined while a game was running: plays from the next game on. */
  private isWaiting(h: Human) {
    return !!this.game && !h.playerId;
  }

  private clampSeats(n: number) {
    return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(n)));
  }
}
