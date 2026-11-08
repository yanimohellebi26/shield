# SHIELD — project rules

Web adaptation of the user's card-combat game SHIELD (2–8 players). The user writes in French; UI ships in French by default (FR/EN).
Rules of the game: `SHIELD_REGLES.md` (section 14 = decisions in force). Plan: `SHIELD_WEB_PLAN.md`.

## Commands

```bash
npm run dev        # http://localhost:5173 (Vite)
npm run server     # online game server, ws://localhost:2567 (Colyseus)
npm test           # rules engine + server integration tests
npm run balance -w @shield/engine   # balance simulations (docs/EQUILIBRAGE.md)
npm run typecheck
npm run build
npm run e2e        # Playwright: no-stall robustness, render budget, two-browser online game with reload
```

Dev URL switches: `?autoplay` (local seat plays itself), `?speed=3`, `?off=bloom,bursts,shadows`. In dev, the store is on `window.__shield`, frame stats on `window.__perf`.

## Project structure

```
packages/engine/        Pure TypeScript rules. No React/Three/DOM/network. Deterministic (seeded RNG).
  src/engine.ts         createGame, legalCommands, apply(state, player, command) -> { state, events }
  src/view.ts           viewFor(state, viewer): what one player may know (hidden shield/charge redacted)
  src/bot.ts            computer opponent — sees only the public view
apps/server/            Colyseus 0.18 server (pinned versions). src/ShieldRoom.ts = one table.
apps/web/
  index.html            Google Fonts link (Alegreya SC, Alegreya Sans)
  public/cards/*.svg    52 card faces (Kennard CC0 deck, recoloured by tools/import-cards.mjs)
  src/main.tsx          App: loading screen → Lobby | Stage (Scene + Overlay + Hud); global CSS imports
  src/styles.css        The whole skin: tokens (:root), materials, every screen, phone rules
  src/game/store.ts     Zustand store: game state, displayed view, animation queue, UI state
  src/game/director.ts  Turns engine events into choreography (flyers, popups, bursts, log lines)
  src/game/layout.ts    World-space layout: seats, slots, deck/discard, landscape vs portrait
  src/three/            React Three Fiber scene: Card3D, Table, Seat, Effects, textures, anchors
  src/ui/               DOM UI: Hud (lobby, action bar, game over), Overlay (nameplates/tiles), Modals, i18n, prefs, icons
tools/import-cards.mjs  Re-imports and recolours the card SVGs
```

Flow: UI action → `store.send(cmd)` → engine `apply` → events queued → `director.animateEvent` plays each → view committed.

Online (`store.mode === 'online'`): `store.send` forwards to `net/online.ts` → server `ShieldRoom` applies the command with
the same engine and sends each player `{ events, view, legal }`, already localised (their own id is `'you'`), into the same
queue. The server is authoritative: never trust or compute game state on the client; secret cards never leave the server.
Server pacing waits for the client animations (`animationMs`); bots and absent players are played by `chooseBotCommand`.
The UI reads allowed moves from `store.legal` (engine locally, server online), never from `game` directly.
**Never put game rules in the UI.** UI asks the engine (`legalCommands`) what is allowed.

## Design system

### Visual direction

A **physical tabletop**, not a web page. The user explicitly rejected the generic "AI website" look. Do not add:
gradient-clipped text, glassmorphism/backdrop blur, neon glows, pill-shaped everything, emoji/Unicode icons,
tracked uppercase Inter labels, or slogan copy with em dashes.

Materials (all in `apps/web/src/styles.css`):
- **Walnut panel** `var(--panel-bg)` + `var(--panel-edge)` + `var(--drop)`, 1px `--line` border, radius 7–10px, optional inner brass outline (`outline: 1px solid rgba(201,154,75,.35); outline-offset: -6px`).
- **Brass plate** `.primary`: engraved dark text, 3px bottom "thickness", pressed on `:active`.
- **Wooden button** `.ghost` / `.icon-btn`; selected state = brass (`.count.on`, `.segmented .on`).
- **Nameplate** `.seat-badge` with **wax-seal HP** `.hp-seal`; phone `.tile` uses the same plate.
- **Action card** `.act`: coloured role medallion (`.act-icon`) + name + one-line effect.

### Tokens

Source of truth in code: CSS custom properties at the top of `apps/web/src/styles.css`
(`--bg, --panel, --ink, --muted, --gold, --gold-hi, --red, --blue, --amber, --green, --turn, --line`
plus materials `--wood-*, --grain, --panel-bg, --panel-edge, --drop` and fonts `--display, --text`).

Figma (file `masO0QdiVxnEvMhdrAxvfy`, collection **SHIELD**) uses slash names. Map them like this when implementing a Figma design:

| Figma variable | CSS token | Meaning |
|---|---|---|
| `bg/stage` | `--bg` | page background |
| `bg/panel` | `--panel` (`--panel-bg` for the textured fill) | panels |
| `text/primary` | `--ink` | main text |
| `text/muted` | `--muted` | secondary text |
| `brand/gold` / `brand/gold-hi` | `--gold` / `--gold-hi` | brass, titles |
| `fx/hit` | `--red` | damage, attack targeting |
| `fx/shield` | `--blue` | shield, block, shield-swap targeting |
| `fx/charge` | `--amber` | charge |
| `fx/life` | `--green` | life gain / replacement |
| `fx/turn` | `--turn` | active-turn highlight |
| `card/*`, `table/*` | hex in `three/textures.ts`, `Table.tsx`, `tools/import-cards.mjs` | card art and 3D table |

Rules:
- DOM colours come from the tokens. Add a token rather than a new hex in a component.
- 3D colours are hex strings in `src/three/*`; keep them consistent with the table above.
- Role colours are fixed across 3D, DOM and Figma: **life = crimson frame `#c23446`**, **shield = blue frame `#3d8bff` + "BOUCLIER" tag**, **charge = amber sideways pile + "×N"**, **turn = gold**, **attack target = red**, **shield-swap target = blue**.
- 3D lighting must keep card faces readable: matte card materials (roughness ≥ 0.9 faces), Bloom `luminanceThreshold` above 1 so only deliberate effects glow. Check a close-up screenshot of a seat after any lighting change.
- No spacing tokens; radii 4 (tags), 7 (buttons), 8–10 (panels), 999 only for the seal and counters.

### Typography

- **Alegreya SC** (`--display`, 700/800/900): logo, titles, names, numbers, button labels. Small caps do the job of "labels"; no letter-spaced uppercase.
- **Alegreya Sans** (`--text`, 500/700/800): body, log, sub-labels.
- Use `font-variant-numeric: lining-nums tabular-nums` for HP and counters.
- Loaded from Google Fonts in `apps/web/index.html`; `main.tsx` waits for them because canvases (medallions, card back, felt crest) use Alegreya SC. In canvas code write the family as `"Alegreya SC"` (double quotes inside single-quoted strings).

### Components

React function components, no component library, no Storybook. The Figma components map to code like this:

| Figma component | Code |
|---|---|
| Seat (states Idle/Active/Target attack/Target shield/Out) | 3D: `three/Seat.tsx`; nameplate: `SeatBadge` in `ui/Overlay.tsx` (`.seat-badge.active/.target.attack/.target.shieldOther/.out`, `.hp-seal`) |
| Opponent Tile (phone) | `OpponentTile` in `ui/Overlay.tsx` (`.tile.*`) |
| Card Face / Card Back / Value Medallion | `three/Card3D.tsx` + `three/textures.ts` (`faceTexture`, `backTexture`, `medallion`) |
| Action dock | `ActionBar` in `ui/Hud.tsx` (`.action-bar`, `.act.attack/.charge/.shield/.other`) |
| Buttons | `.primary` (brass), `.ghost` / `.icon-btn` (wood), `.segmented`, `.count` |

Pattern for a stateful element: one base class plus modifier classes, joined in JSX:

```tsx
<div className={['seat-badge', isLocal ? 'local' : '', active ? 'active' : '', out ? 'out' : '', targetable ? `target ${targeting}` : ''].join(' ')}>
```

DOM elements that follow the 3D table use the projected-anchor system — do not use drei `<Html>`:

```tsx
const ref = useAnchor([x, y, z]);           // src/three/anchors.ts
<div ref={ref} className="anchored seat-badge">…</div>
```

### Text and i18n

All user-visible strings go through `src/ui/i18n.ts` — never hard-code UI text.

```ts
t('act.attack');                                            // "Attaquer" / "Attack"
tYou('log.hit', isLocal, { name, target, atk, shield, dmg, hp }); // uses 'log.hit.you' for the local player
```

Tone: a board-game rulebook. Short sentences, no slogans, no em dashes, natural French log lines ("Freya charge une carte").

Add every new key to **both** `fr` and `en` (the `en` dictionary is typed against `fr`, so a missing key fails typecheck). Components re-render on language change via `useLang()` from `ui/prefs.ts`.

### Styling approach

- Plain global CSS in one file, `src/styles.css`, organised in commented sections. BEM-ish class names, no CSS Modules, no Tailwind, no CSS-in-JS.
- Inline `style` only for computed values (positions, CSS variables like `--fan-hover`).
- Never animate `transform` on `.anchored` elements: the projector writes their `transform` every frame. Use `filter`/`box-shadow` for hover feedback.
- Responsive: one breakpoint, `@media (max-width: 760px)` (phones), plus `(max-width: 480px)` for modals. Portrait screens switch the 3D layout too (`setPortrait` in `game/layout.ts`): opponents become DOM tiles at the top, the felt becomes an arena, the local seat sits large at the bottom.
- Respect safe areas: fixed bars add `env(safe-area-inset-top/bottom, 0px)`.
- Accessibility: visible `:focus-visible` outlines, `aria-label` on icon buttons, `aria-live` for log/banner, keyboard shortcuts (A, C, B, E, 1–7, Esc), and "reduced motion" (`reducedMotion()` in `ui/prefs.ts`; defaults to `prefers-reduced-motion`).

### Icons

- Icon set: **game-icons.net** (CC BY 3.0, credited in `CREDITS.md`) through `react-icons/gi`.
- Components import **semantic names** from `src/ui/icons.tsx` (`IconAttack`, `IconCharge`, `IconNewShield`, `IconSwapShield`, `IconShieldValue`, `IconHeart`, `IconLifeSwap`, `IconLog`, `IconRules`, `IconSettings`, `IconLeave`, `IconClose`, `IconOut`, `IconWinner`, `IconWait`, `IconPlayers`), never `react-icons` directly. Add new icons there.
- Icons inherit `currentColor`; size them in CSS (`svg { width; height }` per context).
- Canvas drawings (seat mats) use raw paths from `src/ui/iconPaths.ts` (generated from the same set) with `Path2D`.
- No Unicode or emoji glyphs as icons.

### Assets

- Card faces: `apps/web/public/cards/{A,2…9,T,J,Q,K}{S,H,D,C}.svg`, referenced via `cardUrl(card)` (`three/textures.ts`), preloaded by `preloadCardArt()`. Regenerate with `node tools/import-cards.mjs <unzipped-deck> apps/web/public/cards`.
- Download the deck with `ace=Plain`: other ace styles embed a QR code.
- Everything else (felt, wood, card back, mats) is generated on canvases in `three/textures.ts`. No image CDN; Vite serves `public/` as-is.
- Credits for third-party assets go in `CREDITS.md`.

## 3D and animation rules (learned the hard way)

- Animations must run in real time: `gsap.ticker.lagSmoothing(0)` is set in `main.tsx`. Do not reintroduce frame-dependent timing.
- Every awaited flight goes through `fly()` in `director.ts`, which always resolves (on landing, relaunch/clear, or watchdog). The queue in `store.ts` wraps each event in a 15 s timeout. Keep both.
- The user asked for **minimal, clean effects**: flying cards, one spark + shockwave on impact, damage popups, a light shake. The following were removed because attacks froze on the user's machine: hit-stop slow motion, energy domes, light trails, camera lean, full-screen flashes, extra particle kinds, turn spotlight, floating dust. Don't re-add heavy per-attack effects without asking.
- drei `Sparkles` and `Trail` produce NaN pixels with the Bloom pass (full black frames). Don't use them.
- Run `npm run e2e` after any change to the director, store, scene or effects.

## Figma workflow

- File: https://www.figma.com/design/masO0QdiVxnEvMhdrAxvfy — sections 01 Foundations, 02 Cards, 03 Components (Seat, Opponent Tile), 04 Desktop — 8 players, 05 Phone — 8 players.
- The Figma plan is **Starter**: MCP tool calls are rate-limited. Batch work into few `use_figma` calls; read with `get_screenshot` sparingly.
- Card faces in Figma are PNG image fills rendered from the SVGs (Figma's SVG importer breaks the deck's `<symbol>/<use>` structure).
- When implementing from Figma: map variables with the token table above, reuse existing classes/components, translate texts into `i18n.ts`, and verify at 1600×900 and 390×844 with Playwright screenshots.
