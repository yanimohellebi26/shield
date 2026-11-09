import { Client, type Room } from '@colyseus/sdk';
import type { Command, GameEvent, GameView } from '@shield/engine';
import { useGame } from '../game/store';
import { lastOffline } from './guard';
import { serverUrl } from './server';

/**
 * Connection to the SHIELD game server (apps/server). The server is authoritative; this module
 * only forwards commands and hands server messages to the store. Payloads are already localised:
 * the local player's id is 'you', exactly like in a local game.
 *
 * Staying at the table:
 * - short drops: the SDK reconnects by itself (the banner only shows after 3 s);
 * - page reload: the reconnection token kept in sessionStorage;
 * - long absence (phone in a pocket, reconnection given up, tab closed): the table code and a
 *   seat key kept in localStorage let the player rejoin and take their seat back.
 */

export interface LobbyInfo {
  code: string;
  seats: number;
  started: boolean;
  isHost: boolean;
  /** Joined during a game: plays from the next one. */
  waiting: boolean;
  players: { name: string; you: boolean; host: boolean; connected: boolean; waiting: boolean }[];
}

export interface ChatMessage {
  from: string;
  you: boolean;
  text?: string;
  reaction?: string;
  at: number;
}

interface Payload {
  events: GameEvent[];
  view: GameView;
  legal: Command[];
}

const TOKEN_KEY = 'shield.reconnect';
const SEAT_KEY = 'shield.seat';
const BANNER_DELAY_MS = 3000;

let client: Client | null = null;
let room: Room | null = null;
/** True while we are deliberately leaving (no rejoin attempt). */
let leaving = false;

function getClient() {
  client ??= new Client(serverUrl());
  return client;
}

const store = () => useGame.getState();

function session<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

interface Seat {
  code: string;
  name: string;
  key: string;
  at: number;
}
/** A seat is worth coming back to for half an hour. */
const SEAT_TTL_MS = 30 * 60_000;
const readSeat = (): Seat | null => {
  const s = session(() => JSON.parse(localStorage.getItem(SEAT_KEY) ?? 'null') as Seat | null, null);
  return s && Date.now() - (s.at ?? 0) < SEAT_TTL_MS ? s : null;
};
const newKey = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

function remember(r: Room, name: string, key: string) {
  session(() => sessionStorage.setItem(TOKEN_KEY, r.reconnectionToken), undefined);
  session(() => localStorage.setItem(SEAT_KEY, JSON.stringify({ code: r.roomId, name, key, at: Date.now() } satisfies Seat)), undefined);
}

function forget() {
  session(() => sessionStorage.removeItem(TOKEN_KEY), undefined);
  session(() => localStorage.removeItem(SEAT_KEY), undefined);
}

function attach(r: Room, name: string, key: string) {
  room = r;
  remember(r, name, key);
  r.onMessage('lobby', (m: LobbyInfo) => store().onLobby(m));
  r.onMessage('start', (p: Payload) => store().onOnlineStart(p.view, p.legal));
  r.onMessage('update', (p: Payload) => store().onOnlineUpdate(p.events, p.view, p.legal));
  r.onMessage('resume', (p: Payload) => store().onOnlineResume(p.view, p.legal));
  r.onMessage('chat', (m: ChatMessage) => store().onChat(m));
  r.onMessage('error', (e: { message: string }) => console.warn('server:', e.message));
  // Keep retrying for as long as the server holds the seat (120 s), at most 2 s apart.
  r.reconnection.maxRetries = 70;
  r.reconnection.maxDelay = 2000;
  let bannerTimer: ReturnType<typeof setTimeout> | undefined;
  r.onDrop((code, reason) => {
    console.warn(`connection dropped (${code}${reason ? `: ${reason}` : ''}), reconnecting`);
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => room === r && useGame.setState({ netStatus: 'reconnecting' }), BANNER_DELAY_MS);
  });
  r.onReconnect(() => {
    clearTimeout(bannerTimer);
    remember(r, name, key);
    useGame.setState({ netStatus: 'connected' });
  });
  r.onLeave((code) => {
    clearTimeout(bannerTimer);
    if (room !== r) return;
    room = null;
    if (leaving || code === 4000) {
      forget();
      useGame.setState({ netStatus: 'idle' });
      return;
    }
    // Reconnection given up (or the server restarted): try to take the seat back.
    void rejoin().then((ok) => {
      if (!ok) useGame.setState({ netStatus: store().screen === 'game' ? 'lost' : 'idle' });
    });
  });
  useGame.setState({ netStatus: 'connected', netError: null });
}

async function connect(open: () => Promise<Room>, name: string, key: string) {
  useGame.setState({ netStatus: 'connecting', netError: null });
  leaving = false;
  try {
    attach(await open(), name, key);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    useGame.setState({ netStatus: 'error', netError: message });
    throw err;
  }
}

/** Joins the remembered table again with the same seat key; the server gives the seat back. */
async function rejoin(): Promise<boolean> {
  const seat = readSeat();
  if (!seat) return false;
  try {
    await connect(() => getClient().joinById(seat.code, { name: seat.name, key: seat.key }), seat.name, seat.key);
    return true;
  } catch {
    forget();
    useGame.setState({ netStatus: 'idle', netError: null });
    return false;
  }
}

// Back from a real offline period: don't wait for the socket to notice, reconnect now.
if (typeof addEventListener === 'function') {
  addEventListener('online', () => {
    const since = lastOffline();
    if (room && since && Date.now() - since > 3000) room.connection.close(4010, 'network back');
  });
}

export const online = {
  create(name: string, seats: number) {
    const key = newKey();
    return connect(() => getClient().create('shield', { name, seats, key }), name, key);
  },
  join(code: string, name: string) {
    const key = newKey();
    return connect(() => getClient().joinById(code.trim().toUpperCase(), { name, key }), name, key);
  },
  /** After a page reload (or coming back later), return to the table this browser was sitting at. */
  async resume(): Promise<boolean> {
    const token = session(() => sessionStorage.getItem(TOKEN_KEY), null);
    const seat = readSeat();
    if (token && seat) {
      try {
        await connect(() => getClient().reconnect(token), seat.name, seat.key);
        return true;
      } catch {
        // Token expired: fall back to the seat key.
      }
    }
    return rejoin();
  },
  send: (cmd: Command) => room?.send('cmd', cmd),
  chat: (msg: { text?: string; reaction?: string }) => room?.send('chat', msg),
  setSeats: (n: number) => room?.send('seats', n),
  start: () => room?.send('start'),
  rematch: () => room?.send('rematch'),
  async leave() {
    leaving = true;
    forget();
    const r = room;
    room = null;
    await r?.leave(true).catch(() => undefined);
  },
};
