import { Client, type Room } from '@colyseus/sdk';
import type { Command, GameEvent, GameView } from '@shield/engine';
import { useGame } from '../game/store';

/**
 * Connection to the SHIELD game server (apps/server). The server is authoritative; this module
 * only forwards commands and hands server messages to the store. Payloads are already localised:
 * the local player's id is 'you', exactly like in a local game.
 */

export interface LobbyInfo {
  code: string;
  seats: number;
  started: boolean;
  isHost: boolean;
  players: { name: string; you: boolean; host: boolean; connected: boolean }[];
}

interface Payload {
  events: GameEvent[];
  view: GameView;
  legal: Command[];
}

const TOKEN_KEY = 'shield.reconnect';

function serverUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  const secure = location.protocol === 'https:';
  return `${secure ? 'wss' : 'ws'}://${location.hostname}:2567`;
}

let client: Client | null = null;
let room: Room | null = null;

function getClient() {
  client ??= new Client(serverUrl());
  return client;
}

function rememberToken(r: Room) {
  try {
    sessionStorage.setItem(TOKEN_KEY, r.reconnectionToken);
  } catch {
    // Without storage, a page reload simply leaves the table.
  }
}

function forgetToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing stored.
  }
}

function attach(r: Room) {
  room = r;
  rememberToken(r);
  const store = useGame.getState;
  r.onMessage('lobby', (m: LobbyInfo) => store().onLobby(m));
  r.onMessage('start', (p: Payload) => store().onOnlineStart(p.view, p.legal));
  r.onMessage('update', (p: Payload) => store().onOnlineUpdate(p.events, p.view, p.legal));
  r.onMessage('resume', (p: Payload) => store().onOnlineResume(p.view, p.legal));
  r.onMessage('error', (e: { message: string }) => console.warn('server:', e.message));
  r.onDrop(() => useGame.setState({ netStatus: 'reconnecting' }));
  r.onReconnect(() => {
    rememberToken(r);
    useGame.setState({ netStatus: 'connected' });
  });
  r.onLeave(() => {
    if (room === r) room = null;
    forgetToken();
    useGame.setState({ netStatus: 'idle' });
  });
  useGame.setState({ netStatus: 'connected', netError: null });
}

async function connect(open: () => Promise<Room>) {
  useGame.setState({ netStatus: 'connecting', netError: null });
  try {
    attach(await open());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    useGame.setState({ netStatus: 'error', netError: message });
    throw err;
  }
}

export const online = {
  create: (name: string, seats: number) => connect(() => getClient().create('shield', { name, seats })),
  join: (code: string, name: string) => connect(() => getClient().joinById(code.trim().toUpperCase(), { name })),
  /** After a page reload, return to the table this tab was sitting at. */
  async resume(): Promise<boolean> {
    let token: string | null = null;
    try {
      token = sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return false;
    }
    if (!token) return false;
    try {
      await connect(() => getClient().reconnect(token!));
      return true;
    } catch {
      forgetToken();
      useGame.setState({ netStatus: 'idle', netError: null });
      return false;
    }
  },
  send: (cmd: Command) => room?.send('cmd', cmd),
  setSeats: (n: number) => room?.send('seats', n),
  start: () => room?.send('start'),
  rematch: () => room?.send('rematch'),
  async leave() {
    forgetToken();
    const r = room;
    room = null;
    await r?.leave(true).catch(() => undefined);
  },
};
