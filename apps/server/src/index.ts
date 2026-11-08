import { defineRoom, defineServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ShieldRoom } from './ShieldRoom';

/** SHIELD game server: one Colyseus room type, "shield", one room per table. */
const port = Number(process.env.PORT ?? 2567);

const server = defineServer({
  transport: new WebSocketTransport({ pingInterval: 10_000 }),
  rooms: { shield: defineRoom(ShieldRoom) },
});

server.listen(port).then(() => console.log(`SHIELD server listening on :${port}`));
