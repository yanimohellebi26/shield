/**
 * Loaded before anything else (first import of main.tsx), so before the Colyseus SDK.
 *
 * Browsers fire "offline" on any network change (Wi-Fi roaming, VPN, Docker bridges on Linux),
 * even when the internet is still there, and the SDK closes every connection on it: players saw
 * "Connection lost" while everything worked. The event is stopped here; a real outage is still
 * caught by the socket itself and by the server's pings, and `online.ts` forces a quick
 * reconnection when the network comes back after a real offline period.
 */
let offlineAt = 0;
if (typeof addEventListener === 'function') {
  addEventListener('offline', (e) => {
    offlineAt = Date.now();
    e.stopImmediatePropagation();
  });
}
/** When the browser last said it went offline (0 if never). */
export const lastOffline = () => offlineAt;
