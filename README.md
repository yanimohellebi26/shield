# SHIELD

Web adaptation of the SHIELD card-combat game (2–8 players). Rules: `SHIELD_REGLES.md`. Plan: `SHIELD_WEB_PLAN.md`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run server     # game server for online tables, ws://localhost:2567
npm test           # rules engine tests
npm run typecheck
npm run build
npm run e2e        # browser tests: no-stall robustness (desktop, 4× slower CPU, phone) + render budget
```

Dev URL switches: `?autoplay` (your seat plays itself), `?speed=3`, `?off=bloom,shadows,sparkles,spot,domes,bursts` (isolate rendering cost).

## Layout

- `packages/engine` — pure TypeScript rules: setup, legal commands, actions, hidden-information views, bot. No UI/network code.
- `apps/server` — Colyseus game server: online tables (5-letter codes, 2–8 seats, bots fill empty seats), authoritative engine, per-player views, reconnection.
- `apps/web` — React + Vite + React Three Fiber table.
  - `src/game/store.ts` — local game loop (you vs bots), event queue.
  - `src/game/director.ts` — turns engine events into card animations, popups and effects.
  - `src/game/layout.ts` — table/seat geometry for 2–8 players (landscape and portrait).
  - `src/three/*` — 3D scene, cards, table, effects. `src/ui/*` — HUD, lobby, projected labels.

## Design

Figma: https://www.figma.com/design/masO0QdiVxnEvMhdrAxvfy — foundations (colour variables, type), card system (faces, back, value medallion), Seat and Opponent Tile components, desktop 8-player table and phone layout.

Card faces: Adrian Kennard's CC0 SVG deck, recoloured by `tools/import-cards.mjs` (see `CREDITS.md`). The SHIELD back is drawn in code (`apps/web/src/three/textures.ts`).
