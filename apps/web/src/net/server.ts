import type { GameRecord } from '@shield/engine';

/** WebSocket URL of the game server (VITE_SERVER_URL in production, port 2567 on this host in dev). */
export function serverUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  const secure = location.protocol === 'https:';
  return `${secure ? 'wss' : 'ws'}://${location.hostname}:2567`;
}

/** Sends a finished local game to the server, which checks it by replay and adds it to the dataset. */
export function uploadRecord(rec: GameRecord) {
  const url = `${serverUrl().replace(/^ws/, 'http')}/api/games`;
  void fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(rec), keepalive: true }).catch(() => {
    // Offline or server asleep: this game is simply not recorded.
  });
}
