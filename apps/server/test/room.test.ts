import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { defineRoom, defineServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import type { Command, GameView } from '@shield/engine';
import { ShieldRoom, type LobbyMessage } from '../src/ShieldRoom';

/** End-to-end over real WebSockets: two people and one bot play a whole game. */
const PORT = 2600 + Math.floor(Math.random() * 300);
let server: ReturnType<typeof defineServer>;

beforeAll(async () => {
  process.env.SHIELD_TIME_SCALE = '0.005';
  server = defineServer({ transport: new WebSocketTransport(), rooms: { shield: defineRoom(ShieldRoom) } });
  await server.listen(PORT);
});
afterAll(async () => {
  await server.gracefullyShutdown(false);
});

interface Payload {
  events: { type: string }[];
  view: GameView;
  legal: Command[];
}

/** A scripted player: plays the first attack (or anything legal) whenever it is their turn. */
function autoplay(room: Room, log: { updates: number; gameOver: boolean; views: GameView[]; errors: string[] }) {
  const act = (p: Payload) => {
    log.views.push(p.view);
    if (p.events.some((e) => e.type === 'gameOver')) log.gameOver = true;
    if (p.view.current !== 'you' || p.view.phase === 'over' || !p.legal.length) return;
    const pick = p.legal.find((c) => c.type === 'act' && c.action.type === 'attack') ?? p.legal.find((c) => c.type === 'acceptLife') ?? p.legal[0]!;
    setTimeout(() => room.send('cmd', pick), 5);
  };
  room.onMessage('start', act);
  room.onMessage('update', (p: Payload) => {
    log.updates++;
    act(p);
  });
  room.onMessage('error', (e: { message: string }) => log.errors.push(e.message));
}

describe('online table', () => {
  it('two players and a bot play a full game; each sees only their own view', async () => {
    const a = new Client(`ws://localhost:${PORT}`);
    const b = new Client(`ws://localhost:${PORT}`);
    const host = await a.create('shield', { name: 'Ana', seats: 3 });
    expect(host.roomId).toMatch(/^[A-Z]{5}$/);

    const lobbies: LobbyMessage[] = [];
    host.onMessage('lobby', (m: LobbyMessage) => lobbies.push(m));
    const guest = await b.joinById(host.roomId, { name: 'Ben' });
    guest.onMessage('lobby', () => undefined);

    const la = { updates: 0, gameOver: false, views: [] as GameView[], errors: [] as string[] };
    const lb = { updates: 0, gameOver: false, views: [] as GameView[], errors: [] as string[] };
    autoplay(host, la);
    autoplay(guest, lb);

    await waitFor(() => lobbies.some((l) => l.players.length === 2));
    const lobby = lobbies.at(-1)!;
    expect(lobby.isHost).toBe(true);
    expect(lobby.players.map((p) => p.name)).toEqual(['Ana', 'Ben']);

    // Only the host can start; the guest's request is ignored.
    guest.send('start');
    await sleep(100);
    expect(la.views.length).toBe(0);
    host.send('start');

    await waitFor(() => la.gameOver && lb.gameOver, 60_000);
    const first = la.views[0]!;
    expect(first.viewer).toBe('you');
    expect(first.players).toHaveLength(3);
    expect(first.players.filter((p) => p.id === 'you')).toHaveLength(1);
    // Nobody ever sees an unrevealed shield or a charged card.
    for (const v of [...la.views, ...lb.views]) {
      for (const p of v.players) expect(JSON.stringify(p.shield ?? null)).not.toMatch(/"rank".*"hidden"|"hidden".*"rank"/);
      expect(JSON.stringify(v)).not.toContain('"charge":[');
    }
    expect(la.updates).toBeGreaterThan(3);
    expect(la.errors).toEqual([]);
    await host.leave();
    await guest.leave();
  }, 90_000);

  it('rejects a command sent out of turn', async () => {
    const a = new Client(`ws://localhost:${PORT}`);
    const b = new Client(`ws://localhost:${PORT}`);
    const host = await a.create('shield', { name: 'Ana', seats: 2 });
    const guest = await b.joinById(host.roomId, { name: 'Ben' });
    const starts = new Map<Room, Payload>();
    const errors: string[] = [];
    host.onMessage('start', (p: Payload) => starts.set(host, p));
    guest.onMessage('start', (p: Payload) => starts.set(guest, p));
    for (const r of [host, guest]) {
      r.onMessage('lobby', () => undefined);
      r.onMessage('update', () => undefined);
      r.onMessage('error', (e: { message: string }) => errors.push(e.message));
    }
    host.send('start');
    await waitFor(() => starts.size === 2);
    const waiting = starts.get(host)!.view.current === 'you' ? guest : host;
    waiting.send('cmd', { type: 'act', action: { type: 'charge' } });
    await waitFor(() => errors.some((e) => e.startsWith('Illegal command')));
    await host.leave();
    await guest.leave();
  });

  it('someone joining a game in progress waits, then plays the next game as an extra seat', async () => {
    const host = await new Client(`ws://localhost:${PORT}`).create('shield', { name: 'Ana', seats: 2 });
    const guest = await new Client(`ws://localhost:${PORT}`).joinById(host.roomId, { name: 'Ben' });
    const la = { updates: 0, gameOver: false, views: [] as GameView[], errors: [] as string[] };
    const lb = { updates: 0, gameOver: false, views: [] as GameView[], errors: [] as string[] };
    for (const r of [host, guest]) r.onMessage('lobby', () => undefined);
    autoplay(host, la);
    autoplay(guest, lb);
    host.send('start');
    await waitFor(() => la.views.length > 0);

    const late = await new Client(`ws://localhost:${PORT}`).joinById(host.roomId, { name: 'Cleo' });
    const lateLobby: LobbyMessage[] = [];
    const lateStart: Payload[] = [];
    late.onMessage('lobby', (m: LobbyMessage) => lateLobby.push(m));
    late.onMessage('start', (p: Payload) => lateStart.push(p));
    late.onMessage('update', () => undefined);
    await waitFor(() => lateLobby.length > 0);
    expect(lateLobby.at(-1)).toMatchObject({ started: true, waiting: true });
    expect(lateStart).toHaveLength(0);

    await waitFor(() => la.gameOver, 60_000);
    host.send('rematch');
    await waitFor(() => lateStart.length === 1);
    expect(lateStart[0]!.view.players).toHaveLength(3); // 2 seats chosen, 3 people: the table grows
    expect(lateStart[0]!.view.players.some((p) => p.id === 'you')).toBe(true);
    for (const r of [host, guest, late]) await r.leave();
  }, 90_000);

  it('relays chat messages and reactions to everyone at the table', async () => {
    const host = await new Client(`ws://localhost:${PORT}`).create('shield', { name: 'Ana', seats: 2 });
    const guest = await new Client(`ws://localhost:${PORT}`).joinById(host.roomId, { name: 'Ben' });
    const got: { from: string; you: boolean; text?: string; reaction?: string }[] = [];
    host.onMessage('lobby', () => undefined);
    guest.onMessage('lobby', () => undefined);
    host.onMessage('chat', (m) => got.push(m));
    guest.onMessage('chat', () => undefined);
    guest.send('chat', { text: '  bien   joué  ' });
    await waitFor(() => got.length === 1);
    expect(got[0]).toMatchObject({ from: 'Ben', you: false, text: 'bien joué' });
    guest.send('chat', { reaction: 'bravo' }); // too soon: dropped
    await sleep(900);
    guest.send('chat', { reaction: 'nonsense' }); // unknown: dropped
    host.send('chat', { reaction: 'gg' });
    await waitFor(() => got.length === 2);
    expect(got[1]).toMatchObject({ from: 'Ana', you: true, reaction: 'gg' });
    await host.leave();
    await guest.leave();
  });
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond: () => boolean, ms = 10_000) {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error('timed out');
    await sleep(20);
  }
}
