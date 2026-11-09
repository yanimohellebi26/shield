import { defineRoom, defineServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ShieldRoom } from './ShieldRoom';

/** SHIELD game server: one Colyseus room type, "shield", one room per table. */
const port = Number(process.env.PORT ?? 2567);

const server = defineServer({
  // A client that misses 3 pings in a row (30-40 s of silence) is dropped; shorter network
  // hiccups (Wi-Fi, mobile) are tolerated.
  transport: new WebSocketTransport({ pingInterval: 10_000, pingMaxRetries: 3 }),
  rooms: { shield: defineRoom(ShieldRoom) },
});

server.listen(port).then(() => console.log(`SHIELD server listening on :${port}`));
