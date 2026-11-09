import { defineRoom, defineServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { replayRecord, type GameRecord } from '@shield/engine';
import { ShieldRoom } from './ShieldRoom';
import { saveRecord } from './records';

/** SHIELD game server: one Colyseus room type, "shield", one room per table. */
const port = Number(process.env.PORT ?? 2567);

/** Local games (played in the browser against bots) are sent here to join the dataset. */
const recent = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 10;
}

const server = defineServer({
  // A client that misses 3 pings in a row (30-40 s of silence) is dropped; shorter network
  // hiccups (Wi-Fi, mobile) are tolerated.
  transport: new WebSocketTransport({ pingInterval: 10_000, pingMaxRetries: 3 }),
  rooms: { shield: defineRoom(ShieldRoom) },
  express: (app) => {
    app.use('/api', (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'content-type');
      if (req.method === 'OPTIONS') return void res.sendStatus(204);
      next();
    });
    app.post('/api/games', express.json({ limit: '512kb' }), (req, res) => {
      if (tooMany(req.ip ?? '?')) return void res.status(429).json({ error: 'slow down' });
      const rec = req.body as GameRecord;
      // Trust nothing: the record must replay exactly with the engine.
      const check = replayRecord(rec);
      const humans = Array.isArray(rec?.players) ? rec.players.filter((p) => p.kind === 'human').length : 0;
      if (!check.ok || rec.source !== 'local' || humans !== 1 || !rec.moves.some((m) => m.by === 'human')) {
        return void res.status(400).json({ error: check.ok ? 'not a local human game' : check.error });
      }
      void saveRecord({ ...rec, id: rec.id.replace(/[^\w-]/g, '').slice(0, 60) || `local-${Date.now()}` });
      res.status(201).json({ ok: true });
    });
  },
});

server.listen(port).then(() => console.log(`SHIELD server listening on :${port}`));
