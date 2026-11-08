import { create } from 'zustand';
import {
  apply,
  chooseBotCommand,
  createGame,
  eventsFor,
  legalCommands,
  viewFor,
  type Card,
  type Command,
  type GameEvent,
  type GameState,
  type GameView,
} from '@shield/engine';
import type { Vec3 } from './layout';
import type { LobbyInfo } from '../net/online';
import { t, tYou } from '../ui/i18n';

export const LOCAL_ID = 'you';

const BOT_NAMES = ['Aria', 'Bastion', 'Corvin', 'Dahlia', 'Eskel', 'Freya', 'Garrick', 'Hel', 'Ivo', 'Juno', 'Kael'];

export interface FlyerSpec {
  /** Changes each time the flyer is (re)launched, restarting its animation. */
  key: number;
  card: Card | null;
  from: Vec3;
  to: Vec3;
  fromFlip: number;
  toFlip: number;
  fromTilt: number;
  toTilt: number;
  fromScale: number;
  toScale: number;
  /** In-plane rotation of the card (radians); charge piles lie sideways at π/2. */
  fromSpin: number;
  toSpin: number;
  duration: number;
  arc: number;
  ease: string;
  glow: string | null;
  onDone?: () => void;
}

export interface Popup {
  id: number;
  pos: Vec3;
  text: string;
  sub?: string;
  kind: 'damage' | 'blocked' | 'info' | 'heal';
}

export interface Burst {
  id: number;
  pos: Vec3;
  color: string;
  size: number;
}

/** Animation-only steps that are not engine events (start of game). */
export type UiEvent = GameEvent | { type: 'shuffle' } | { type: 'deal'; view: GameView };

/** Temporary changes applied over the displayed view while an animation is in progress. */
export interface Overrides {
  hideShield: Record<string, boolean>;
  hideCharge: Record<string, boolean>;
  hideLife: Record<string, boolean>;
  hp: Record<string, number>;
  shieldCard: Record<string, Card>;
  discardCount: number | null;
  /** Card shown on top of the discard pile once a flying card has landed there. */
  discardTop: Card | null;
  deckDelta: number;
}

const noOverrides = (): Overrides => ({
  hideShield: {},
  hideCharge: {},
  hideLife: {},
  hp: {},
  shieldCard: {},
  discardCount: null,
  discardTop: null,
  deckDelta: 0,
});

export type Targeting = null | 'attack' | 'shieldOther';

/** Running totals for the end-of-game summary, taken from engine events (not animations). */
export interface Stats {
  dealt: Record<string, number>;
  kills: Record<string, number>;
  biggest: { n: number; by: string } | null;
  /** Player ids in the order they were eliminated. */
  outOrder: string[];
}

const noStats = (): Stats => ({ dealt: {}, kills: {}, biggest: null, outOrder: [] });

function tally(stats: Stats, events: GameEvent[]): Stats {
  const next: Stats = { dealt: { ...stats.dealt }, kills: { ...stats.kills }, biggest: stats.biggest, outOrder: [...stats.outOrder] };
  let attacker: string | null = null;
  for (const e of events) {
    if (e.type === 'attack') {
      attacker = e.player;
      next.dealt[e.player] = (next.dealt[e.player] ?? 0) + e.damage;
      if (!next.biggest || e.damage > next.biggest.n) next.biggest = { n: e.damage, by: e.player };
    } else if (e.type === 'eliminated') {
      next.outOrder.push(e.player);
      if (attacker) next.kills[attacker] = (next.kills[attacker] ?? 0) + 1;
    }
  }
  return next;
}

export interface LogLine {
  id: number;
  text: string;
  tone: 'neutral' | 'hit' | 'block' | 'shield' | 'charge' | 'life' | 'out';
}

export type NetStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface Store {
  /** 'room' = waiting room of an online table. */
  screen: 'lobby' | 'room' | 'game';
  mode: 'local' | 'online';
  /** Full game state — local games only; online, the server keeps it. */
  game: GameState | null;
  /** What the local player may do now (from the engine locally, from the server online). */
  legal: Command[];
  /** Online waiting room / table info. */
  table: LobbyInfo | null;
  netStatus: NetStatus;
  netError: string | null;
  /** What the table currently shows: lags behind `game` while animations play. */
  shown: GameView | null;
  queue: { events: UiEvent[]; view: GameView }[];
  busy: boolean;
  speed: number;
  targeting: Targeting;
  flyers: Record<string, FlyerSpec>;
  popups: Popup[];
  bursts: Burst[];
  shake: number;
  /** True while the opening shuffle and deal play. */
  dealing: boolean;
  stats: Stats;
  /** Incremented each time the local player's turn begins (drives the "your turn" banner). */
  yourTurn: number;
  /** Starting HP not coming from life cards (2-player second-seat bonus), shown during the deal. */
  hpBonus: Record<string, number>;
  ov: Overrides;
  log: LogLine[];
  focus: string | null;
  /** Mirrors layout orientation so the scene re-renders when it flips. */
  portrait: boolean;

  start: (players: number, name: string) => void;
  backToLobby: () => void;
  send: (cmd: Command) => void;
  setTargeting: (t: Targeting) => void;
  pickTarget: (id: string) => void;
  setSpeed: (s: number) => void;
  onLobby: (info: LobbyInfo) => void;
  onOnlineStart: (view: GameView, legal: Command[]) => void;
  onOnlineUpdate: (events: GameEvent[], view: GameView, legal: Command[]) => void;
  onOnlineResume: (view: GameView, legal: Command[]) => void;
}

let botTimer: ReturnType<typeof setTimeout> | undefined;

/** Dev/test switches from the URL: ?autoplay (your seat plays itself), ?speed=4. */
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const AUTOPLAY = params.has('autoplay');
const START_SPEED = Number(params.get('speed')) || 1;
/** Bumped on every new game, so stale animation loops stop. */
let generation = 0;

/** Table opening shared by local and online games: shuffle and deal animations, first log lines. */
function openingState(view: GameView): Partial<Store> {
  const first = view.players.find((p) => p.id === view.current)!;
  const n = view.players.length;
  const second = n === 2 ? view.players[(view.players.indexOf(first) + 1) % 2]! : null;
  // The table starts empty with a full deck; the shuffle and deal fill it.
  const empty: GameView = { ...view, deckCount: 52, players: view.players.map((p) => ({ ...p, life: [], shield: null, chargeCount: 0 })) };
  generation++;
  return {
    screen: 'game',
    shown: empty,
    queue: [{ events: [{ type: 'shuffle' }, { type: 'deal', view }], view }],
    busy: false,
    targeting: null,
    flyers: {},
    popups: [],
    bursts: [],
    dealing: true,
    ov: noOverrides(),
    stats: noStats(),
    hpBonus: Object.fromEntries(view.players.map((p) => [p.id, p.hp - p.life.reduce((t, c) => t + c.rank, 0)])),
    log: [
      { id: Date.now(), text: first.id === LOCAL_ID ? t('log.first.you') : t('log.first', { name: first.name }), tone: 'neutral' },
      ...(second ? [{ id: Date.now() + 1, text: tYou('log.secondBonus', second.id === LOCAL_ID, { name: second.name }), tone: 'life' as const }] : []),
    ],
    focus: null,
  };
}

export const useGame = create<Store>((set, get) => ({
  screen: 'lobby',
  mode: 'local',
  game: null,
  legal: [],
  table: null,
  netStatus: 'idle',
  netError: null,
  shown: null,
  queue: [],
  busy: false,
  speed: START_SPEED,
  targeting: null,
  flyers: {},
  popups: [],
  bursts: [],
  shake: 0,
  dealing: false,
  stats: noStats(),
  yourTurn: 0,
  hpBonus: {},
  ov: noOverrides(),
  log: [],
  focus: null,
  portrait: false,

  start(count, name) {
    clearTimeout(botTimer);
    const bots = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, count - 1);
    const players = [{ id: LOCAL_ID, name: name.trim() || t('lobby.namePlaceholder') }, ...bots.map((b, i) => ({ id: `bot${i}`, name: b }))];
    const game = createGame({ players, seed: (Math.random() * 2 ** 32) >>> 0 });
    set({ ...openingState(viewFor(game, LOCAL_ID)), mode: 'local', game, legal: legalCommands(game, LOCAL_ID) });
    setTimeout(() => void pump(), 350);
  },

  backToLobby() {
    clearTimeout(botTimer);
    generation++;
    if (get().mode === 'online') void import('../net/online').then(({ online }) => online.leave());
    set({ screen: 'lobby', mode: 'local', game: null, shown: null, table: null, legal: [], queue: [], busy: false, flyers: {}, popups: [], bursts: [], dealing: false });
  },

  send(cmd) {
    if (get().mode === 'online') {
      // The server applies it and sends the result back to everyone.
      set({ targeting: null, legal: [] });
      void import('../net/online').then(({ online }) => online.send(cmd));
      return;
    }
    const { game } = get();
    if (!game || game.phase === 'over') return;
    const actor = game.players[game.current]!.id;
    const { state, events } = apply(game, actor, cmd);
    set((s) => ({
      game: state,
      legal: legalCommands(state, LOCAL_ID),
      stats: tally(s.stats, events),
      targeting: null,
      queue: [...s.queue, { events: eventsFor(events, LOCAL_ID), view: viewFor(state, LOCAL_ID) }],
    }));
    void pump();
  },

  onLobby(info) {
    set((s) => ({ table: info, mode: 'online', screen: s.screen === 'lobby' && !info.started ? 'room' : s.screen }));
  },

  onOnlineStart(view, legal) {
    clearTimeout(botTimer);
    set({ ...openingState(view), mode: 'online', game: null, legal });
    setTimeout(() => void pump(), 350);
  },

  onOnlineUpdate(events, view, legal) {
    set((s) => ({ legal, stats: tally(s.stats, events), queue: [...s.queue, { events, view }] }));
    void pump();
  },

  onOnlineResume(view, legal) {
    // Back after a reload or a dropped connection: show the table as it is now, no replay.
    generation++;
    set({ mode: 'online', screen: 'game', shown: view, legal, queue: [], busy: false, flyers: {}, ov: noOverrides(), dealing: false, focus: view.current });
  },

  setTargeting(t) {
    set({ targeting: t });
  },

  pickTarget(id) {
    const { targeting } = get();
    if (!targeting || id === LOCAL_ID) return;
    get().send({ type: 'act', action: targeting === 'attack' ? { type: 'attack', target: id } : { type: 'shieldOther', target: id } });
  },

  setSpeed(speed) {
    set({ speed });
  },
}));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([p, new Promise<void>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms))]);
}

/** Plays queued results one at a time, then commits each new view. */
async function pump() {
  const s = useGame.getState();
  if (s.busy || s.queue.length === 0) return;
  const gen = generation;
  const [next, ...rest] = s.queue;
  useGame.setState({ busy: true, queue: rest });
  const { animateEvent } = await import('./director');
  for (const e of next!.events) {
    try {
      await withTimeout(animateEvent(e), 15000);
    } catch (err) {
      console.error(`Animation of "${e.type}" failed; continuing`, err);
    }
    // A new game (or leaving) abandons whatever this pump was playing.
    if (gen !== generation) return;
  }
  // Nothing in flight survives the commit.
  useGame.setState({ flyers: {} });
  const wasMine = useGame.getState().shown?.current === LOCAL_ID && useGame.getState().shown?.phase === 'action' && !useGame.getState().dealing;
  useGame.setState({ shown: next!.view, ov: noOverrides(), busy: false, dealing: false });
  const v = next!.view;
  if (v.current === LOCAL_ID && v.phase === 'action' && !wasMine && !AUTOPLAY) useGame.setState((s) => ({ yourTurn: s.yourTurn + 1 }));
  if (useGame.getState().queue.length) void pump();
  else scheduleBot();
}

/** Bots act on their own turn after a short "thinking" pause. */
function scheduleBot() {
  clearTimeout(botTimer);
  const { game, busy, queue, speed, mode } = useGame.getState();
  if (mode === 'online') return;
  if (!game || busy || queue.length || game.phase === 'over') return;
  const me = game.players[game.current]!;
  if (me.id === LOCAL_ID && !AUTOPLAY) return;
  botTimer = setTimeout(() => {
    const g = useGame.getState().game;
    if (!g || g !== game) return;
    const legal = legalCommands(g, me.id);
    useGame.getState().send(chooseBotCommand(viewFor(g, me.id), legal));
  }, 650 / speed);
}

let uid = 1;
export const nextId = () => uid++;

// Expose the store to automated tests in development builds.
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __shield: typeof useGame }).__shield = useGame;
