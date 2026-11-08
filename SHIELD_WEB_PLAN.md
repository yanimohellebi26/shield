# SHIELD — Web Game Development Plan

**Prepared:** 7 November 2026  
**Status:** implementation proposal; unresolved gameplay rules remain proposals.
**Visual direction updated:** physical 3D card movement, expressive combat effects, and synchronized sound.  
**Game reference:** [SHIELD_REGLES.md](./SHIELD_REGLES.md), version 0.1.  
**Deliverable:** a development plan, not an implemented or deployed game.

## 1. Recommended approach

Build SHIELD as a **custom browser game with a realistic 3D tabletop, accessible HTML controls, and a server that controls every match**.

Use **TypeScript + React + Vite** for the application, **Three.js through React Three Fiber** for the table and cards, **Node.js + Colyseus** for multiplayer, and **Supabase Auth + PostgreSQL** for identities and durable data. Develop in **Visual Studio Code**, create 3D assets in **Blender**, and use **Figma, Inkscape, and Krita** for interface design and card artwork. Use **GPT Image or Google's Nano Banana** during asset production.

The priority order should be:

1. Complete and validate your specific SHIELD rules.
2. Prove that a card looks convincing and that an attack, block, and charged strike feel physical and run smoothly on a phone.
3. Complete a real online match between two browsers.
4. Finish the table, animations, sound, tutorial, and recovery behavior.
5. Expand to the agreed player count and run a private beta.

The most valuable investment is **a skilled web-game developer working with a good technical artist**. Realism comes from consistent card design, materials, lighting, motion, and sound. A more expensive image generator alone will not provide these.

### Proposed first-release scope

| Area | Recommendation |
|---|---|
| Access | Open a link in a desktop or mobile browser; no mandatory installation. |
| Multiplayer | Private rooms with invitation links and room codes. |
| Players | First complete development slice: 2 players. Release target: 2–4, subject to rules approval. |
| Accounts | Guest play first; optional persistent account for history and returning players. |
| Presentation | One finished 3D table, a complete 52-card deck, and a coherent set of combat animations/effects/sounds. |
| Rules | One versioned ruleset displayed in the lobby. |
| Learning | Short interactive tutorial and an always-available rules panel. |
| Reliability | Refresh/reconnect support, persisted accepted actions, and server restart recovery. |
| Languages | French interface first, with strings prepared for English translation; a proposal based on the existing rules document. |
| Later additions | Public matchmaking, ranked play, more table themes, advanced bots, and spectator/replay interfaces. |

Treat **10–20 minutes per match** as an initial playtesting target, not an established property of SHIELD. Measure actual duration before deciding turn timers or matchmaking formats.

## 2. Preserve the game described in the rules file

### Confirmed mechanics

- A standard deck of **52 cards**, without jokers.
- Each player starts with **two visible life cards**, whose values are added, and **one hidden shield**.
- There is **no described starting hand**. Show life, shield, and charge zones rather than a fan of playable hand cards.
- The player chooses an action **before drawing its card**.
- Actions: attack, charge, replace your shield, and replace another player's shield.
- Unrevealed shields and charges are unknown **even to their owner**.
- An attacked shield is revealed and stays in play face up.
- Damage is **max(0, attack value − shield value)**.
- Life replacement is additional to the normal action and limited to once in the game; the per-player interpretation still needs confirmation.
- At exactly 1 HP, the player can inspect the replacement card before accepting it.
- Suits and red/black colors have no described gameplay powers.

The source explicitly confirms A = 1, J = 11, Q = 12, and K = 13. Number-card values, a shared draw pile, and the interpretation of the life threshold as HP < 5 are the source document's stated readings. Preserve those distinctions in the final specification.

### Decisions to settle before finalizing the engine

These defaults make a coherent prototype possible. **They are recommendations, not rules already approved by you.** Record accepted choices in a versioned specification and cross-reference the original document.

| Topic | Proposed first-release rule | Why it needs a decision |
|---|---|---|
| Players | 2–4; begin implementation with 2. | The source does not establish a maximum. |
| Setup | Server shuffles; lobby seats define turn order; randomly select the first player; deal two life rounds, then one shield round. | First player, direction, and distribution order are open. |
| Target selection | Commit both action and target before drawing. | Action timing is confirmed; target timing is not. |
| Charge limit | One charge card maximum. | Stacking is unconfirmed. |
| Turn after charging | Attack is compulsory on the next own turn; use and consume the entire charge. | This follows the initial “next turn” wording but needs validation. |
| Shield strength | Keep the same shield value until replacement. | Keeping the card is confirmed; absence of wear should be explicit. |
| Life window | Optional at the start of your own turn, before the normal action, while alive at 1–4 HP. | Timing and reactive rescue are unspecified. |
| Low starting HP | Permit replacement on the first own turn if eligible. | Starting below 5 HP is possible. |
| Life entitlement | One attempt per player per match; refusing at 1 HP consumes the attempt. | The source leaves this open; the proposal prevents repeated free peeks. |
| Life amount | The new card becomes the HP total, rather than adding to remaining HP. | This is the source's interpretation of “replace.” |
| Life-card display | Original cards remain as the initial-life display while HP changes numerically. When replacement is accepted, discard them and display the new card. | Cards and remaining HP need distinct meanings. |
| Private life offer | At 1 HP, only the beneficiary sees the candidate before deciding. Acceptance reveals it; refusal discards it face up. | Visibility and rejected-card destination are open. |
| Elimination/victory | Immediate elimination at HP ≤ 0; last survivor wins; no post-lethal life replacement. | Plausible, but unconfirmed. |
| Discard | Used attacks/charges, replaced shields/life cards, rejected offers, and eliminated players' cards enter a face-up discard. | This affects both card counting and future draws. |
| Empty pile | Shuffle only the discard into the draw pile. Never shuffle installed cards. | Recycling has not been established. |
| No drawable card anywhere | End as a draw with a clear reason, without partially applying the attempted action. | The engine needs a defined exhaustion outcome. |
| Public information | Current HP, remaining players, shield reveal status, charge presence, and discard contents are public. | Current HP and removed-card visibility need confirmation. |

The strict one-charge/next-turn-attack rule is a starting hypothesis. If playtests favor storing a charge while changing shields, specify that alternative deliberately, including expiration and stacking.

**Phase-zero output:** a written answer for every item in section 11 of the source rules, plus examples for lethal damage, refusal at 1 HP, and an empty draw pile. Do not borrow missing rules automatically from another game called “Shield.”

## 3. Website research and design references

Research used public product pages, documentation, and published images. The PlayingCards.io and Tabletopia card previews were visually inspected. These are design references, not claims that their internal technology was audited or live multiplayer performance benchmarked.

| Reference | Evidence and useful lesson | Application to SHIELD |
|---|---|---|
| **Poker Now** | Its published flow uses a nickname, private table, and shared browser link. [Product](https://www.pokernow.com/) · [Invitation tutorial](https://www.pokernow.com/blog/no-download-poker-with-friends-tutorial) | Make “Create room → share link → play” the main entry flow. Keep setup short and connected players visible. |
| **PlayingCards.io** | Supports room codes, custom decks, and synchronized tabletop movement. Its FAQ leaves rules enforcement to players. The preview separates deck, table, and personal zones. [Product](https://playingcards.io/) · [FAQ](https://playingcards.io/docs/faq) · [Preview](https://playingcards.io/img/custom-sample-1.jpg) | Borrow clear zones and simple invitations. Optionally use it for manual rule playtests. Enforce SHIELD rules and secrecy on your own server. |
| **Tabletopia** | Cards can be flipped, stacked, rotated, and shuffled. The published preview shows deck thickness and a tabletop presentation. It describes itself as a sandbox without automatic rules enforcement. [Cards](https://help.tabletopia.com/knowledge-base/card/) · [About](https://tabletopia.com/about) | Use physical thickness, contact shadows, stacked cards, and restrained perspective. Keep camera and legal actions guided. |
| **Board Game Arena** | Documents tutorial/replay workflows and interface guidance. [Tutorial checklist](https://en.doc.boardgamearena.com/Tutorials_checklist) · [Studio UX/UI guidance](https://doc.studio.boardgamearena.com/framework-documentation/guidelines/) | Teach action-before-draw with a scripted turn. Explain the current phase and maintain readable history. |
| **CardGames.io** | Its public interface includes player customization, rematch controls, dark-theme options, and a photosensitive mode. [Website](https://cardgames.io/) | Prioritize readable standard cards, easy rematches, and player-controlled effects. |

**Design synthesis:** Poker Now's invitation flow, Tabletopia's physical materials, Board Game Arena's learning support, and the legibility of traditional browser card games.

Develop SHIELD's own composition and artwork. Competitor logos, illustrations, screenshots, and sounds are reference material, not distributable game assets.

## 4. Choose the engine deliberately

There are three distinct components: the **renderer** draws cards, the **rules engine** decides what happens, and the **multiplayer server** distributes authorized results. Keep them separate.

| Option | Fit for SHIELD | Decision |
|---|---|---|
| **Three.js + React Three Fiber** | Real geometry, controllable materials/lighting, flips, and React integration. React Three Fiber is a React renderer for Three.js. [Documentation](https://r3f.docs.pmnd.rs/getting-started/introduction) | **Recommended for the requested realism.** Use a small fixed-camera scene. |
| **PixiJS** | Good for a polished 2D presentation using sprites and effects. [Official site](https://pixijs.com/) | Choose if the prototype shows painted depth meets the visual goal more efficiently. Avoid adding another renderer without a demonstrated need. |
| **Phaser** | Browser-focused 2D framework with JavaScript/TypeScript; its documentation distinguishes it from a built-in 3D engine. [Documentation](https://docs.phaser.io/phaser/getting-started/what-is-phaser) | Good alternative for fully 2D SHIELD; less direct for the selected material-and-lighting approach. |
| **React + CSS transforms** | Suitable for the functional prototype, accessible controls, and a lightweight board. | Keep as the fallback view, sharing the same player-state projection. |
| **Unity/Godot-style workflow** | Worth evaluating if native apps and an existing engine team become central requirements. | Browser-first TypeScript is the more direct fit here. This is a project-fit judgment, not a claim that other engines cannot do it. |

Start with the stable WebGL renderer supported by the selected Three.js release. Evaluate WebGPU later against real target devices. Pin compatible React/React Three Fiber versions; their majors must be paired according to the [compatibility guidance](https://r3f.docs.pmnd.rs/getting-started/introduction).

## 5. Languages, software, and IDE

| Layer | Tool/language | Role |
|---|---|---|
| Application | **TypeScript**, strict mode | Shared types, engine, server, and UI. [TypeScript](https://www.typescriptlang.org/) |
| Interface | **React + HTML + CSS** | Lobby, action controls, HP, dialogs, settings, accessibility. |
| Development/build | **Vite** | Local development and frontend production bundle. [Vite guide](https://vite.dev/guide/) |
| Table renderer | **Three.js + React Three Fiber + Drei** | Cards, table, camera, lights, and scene helpers. |
| Combat presentation | **GSAP + reusable Three.js effects**, optional React Postprocessing | Choreographed card movement, impacts, trails, shield feedback, and synchronized sound; see section 7. |
| Rules | **Small pure TypeScript module** | Legal actions, phases, damage, card movement, life replacement, victory. |
| Multiplayer | **Node.js + Colyseus** | Rooms, command handling, public-state synchronization, reconnect handling. [Colyseus](https://docs.colyseus.io/) |
| Input validation | **Zod or equivalent runtime schemas** | Validate network commands; TypeScript alone cannot validate incoming data. |
| Identity | **Supabase Auth** | Guest identities and optional persistent accounts. [Anonymous sign-in API](https://supabase.com/docs/reference/javascript/auth-signinanonymously) |
| Durable data | **PostgreSQL + SQL migrations**, hosted by Supabase | Snapshots, ordered events, membership, results, profiles. |
| Tests | **Vitest + fast-check + Playwright** | Rule examples, invariants, and multiple-browser flows. [Vitest](https://vitest.dev/guide/) · [fast-check](https://fast-check.dev/) · [Playwright](https://playwright.dev/docs/intro) |
| Workflow | **Git + GitHub + pnpm workspaces** | One repository, reproducible dependencies, CI, review. |
| Packaging | **Docker** for the server | Repeatable local and hosted runtime. |

Keep UI state simple: local React state for selections/dialogs and one adapter for the server's current player view. Add a state library only if component complexity warrants it. Independent copies of authoritative HP or card state invite synchronization bugs.

### Where to work

Open **/home/yani/Projets/shield in Visual Studio Code**. It already contains the rules and this plan.

VS Code supports TypeScript editing, and Codex has an official IDE integration for VS Code and compatible editors. Use it for small implementation tasks, test generation, and review, retaining human review for rules and visual quality. [VS Code TypeScript](https://code.visualstudio.com/docs/languages/typescript) · [Codex IDE documentation](https://learn.chatgpt.com/docs/codex/ide)

Prepare a supported Node.js LTS release, pnpm, Git, Docker, and browser developer tools. Pin compatible versions and a lockfile rather than copying old tutorial versions.

Use **Figma in the browser** for layouts/clickable flows, **Inkscape** for exact card vectors, **Krita** for texture cleanup, and **Blender** for geometry/materials/lighting references. Blender supports modeling, animation, rendering, and game-asset creation, including on Linux. [Blender capabilities](https://www.blender.org/features/)

At implementation time, provide root commands for development, typechecking, tests, and builds. The development command should start the client and game server together; document local database/auth setup. No installation is required to read this plan.

## 6. Art direction and realistic card production

### Proposed identity

Default direction: **a premium physical card table**. The visual preference remains open and can change without replacing the architecture.

- Deep green or charcoal felt with a fine, subdued weave.
- Restrained walnut table edge.
- Warm off-white cardstock, clear red/black suits, large corner indices.
- Original symmetric SHIELD card back.
- Soft overhead light and contact shadows that seat cards on the table.
- Small metallic accents around the interface and calm, high-contrast text.
- Fixed, gently angled camera; flatter composition on small screens.

Preserve the identity of a standard 52-card game. Decorative court-card art is possible, but ranks and suits must remain immediately recognizable.

### Make one card convincing before producing the whole deck

| Property | Production direction |
|---|---|
| Shape | Rounded corners, small bevel, consistent proportions. |
| Dimensions | Start from a proposed 63:88 poker-card proportion; confirm against the reference deck. |
| Thickness | Start around 0.3 mm at real-world scale and tune against photos; an art target, not a rule. |
| Paper | Subtle roughness/fiber detail and restrained reflections. |
| Ink | Crisp vector ranks/suits; no blur baked into the face. |
| Edge | Fine pale edge catching light during flips. |
| Lighting | Broad soft key light, controlled environment/fill, believable shadows. |
| Motion | Short lift, travel, rotation, gentle settle through authored animation curves. |
| Sound | Quiet paper slide, restrained flip, clear damage cue. |

Start with **MeshStandardMaterial**. Test **MeshPhysicalMaterial** where a light coating improves the reference match. Advanced physical features add per-pixel cost, so evaluate them on phones. [Three.js material documentation](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)

Blender authors the assets and visual reference; Three.js renders the live game. A Blender render is not automatically a browser-ready material. Export appropriate GLB/glTF geometry and compatible texture maps. [Blender rendering](https://www.blender.org/features/rendering/)

### GPT Image and Nano Banana

**GPT Image** supports image generation and reference-based editing. **Nano Banana** is Google's Gemini image-generation family. Use either to explore table atmosphere, back ornament, or court-card illustrations. Select the currently available model after comparing representative assets; no SHIELD-specific quality winner has been measured. [OpenAI image guide](https://developers.openai.com/api/docs/guides/image-generation) · [Google image guide](https://ai.google.dev/gemini-api/docs/image-generation)

Recommended workflow:

1. Collect physical deck photos, material references, and a small visual reference board; evaluate an existing precise SVG deck before creating custom faces.
2. Generate a few consistent concept directions with GPT Image or Nano Banana.
3. Select one direction; establish a reusable reference image and palette.
4. Create one precise SVG template with named rank, suit, pip, and illustration layers.
5. Generate all 52 faces from a verified card manifest and controlled layout rules.
6. Retouch approved illustrations/back; inspect every face at gameplay size.
7. Build one reusable card mesh/material set.
8. Tune the browser result against the reference before creating cosmetic variants.

Use exact vector typography and suit symbols for production faces. AI concepts can contain wrong pips, mirrored indices, inconsistent margins, or mismatched faces and need correction.

Example **concept-art prompt**, to adapt after choosing the aesthetic:

> Premium physical playing-card table for an original game called SHIELD. Deep green felt, restrained walnut edge, warm ivory cardstock, soft broad overhead lighting, realistic paper and contact shadows. Fixed gently elevated camera, uncluttered center with space for a draw pile and resolution area. Consistent materials and understated mood. No interface text, no rank lettering, no logos from existing games. Art-direction reference; exact cards and controls will be constructed separately.

Generate assets **before release**, review/export them, and serve static files. Live turns should not depend on image generation or an LLM.

### Initial asset package

| Asset | Deliverable |
|---|---|
| Faces | Editable SVG template, 52 verified exports, rank/suit manifest. |
| Back | One original symmetric back, identical across hidden cards. |
| Card mesh | Reusable rounded mesh with front, back, and edge surfaces. |
| Textures | Base color, normal, roughness as needed; high-resolution masters and optimized runtime versions. |
| Table | One felt surface/edge; no unnecessary room environment in v1. |
| Lighting | One carefully chosen environment/reference setup. |
| Interface | Original attack/shield/charge/life icons and reusable components. |
| Audio | Consistent draw, flip, move, impact, turn, and match-end sounds. |
| Source records | Editable sources, author/license records, export settings, asset versions. |

Start around 1024 × 1430 for card-face inspection exports, then choose gameplay resolution from device tests. Avoid allocating a full-resolution texture for every card by default: reuse resources, load appropriate resolutions, and evaluate atlases/compressed textures. Atlases need padding against edge bleeding.

Poly Haven documents its material/lighting assets as CC0 and can supply wood, fabric, and environment references. Validate chosen assets and retain source records. [Library](https://polyhaven.com/) · [License](https://polyhaven.com/license)

**Fairness:** backs, edge patterns, wear, and hidden-card handles must not reveal rank or suit. Cosmetic variation must not create recognizable marked cards.

## 7. User experience and screen flow

### Main journey

**Home → Create/join room → Nickname → Lobby → Ready → Match → Result → Rematch**

The main entry choices should be **Play with friends** and **Learn SHIELD**. Make account creation optional for the first private match. The lobby displays seats, connection state, readiness, and the agreed rules version.

### Proposed table layout

~~~text
                   Opponent: name · current HP · connection
                    [life cards] [shield] [charge zone]

         Draw pile        Action/reveal area        Discard
         remaining        attack − shield = damage  visible history

                      Your life / shield / charge
                      Your current HP and life-use status

         ATTACK       CHARGE       YOUR SHIELD       THEIR SHIELD
         Contextual life option · Rules · Sound · Settings
~~~

Life cards show the basis of life; a large numeric HP value shows remaining life. For example, a Queen and 7 still explain the initial 19 HP after damage reduces current life to 14. Do not require players to recalculate remaining HP from cards.

For three/four players, place opponents around the center and the local player at the bottom. On narrow screens, use compact opponent summaries and a clear target-selection panel. Make every potential target's HP available without camera navigation.

### The action flow teaches the rules

1. Present legal actions for the current phase.
2. Select an action and, under the proposed rule, a target.
3. Show a concise commitment: **“Attack Léa, then draw.”**
4. Submit once. The server validates, commits, draws, and resolves.
5. Animate the authorized result and update public history.

Selections can change before submission. Once the server accepts an action, the player cannot inspect its draw and change the decision. There must be no independent early “Draw” action.

For charge/new shield, move a face-down card into its zone. Show **“Unknown to everyone”**, including to the owner. Inspecting a hidden card may explain its role but must never flip it.

### Life replacement

- At 2–4 HP, explain before commitment: **“Replace your HP with the drawn card's value. This may lower your HP.”**
- At 1 HP, reserve the candidate on the server, show it only to the beneficiary, and offer Accept/Decline.
- Under the proposed rule, either decision consumes the attempt. Explain that before the offer is requested.
- A reconnect restores the same offer and never generates another peek.
- Resolving the life choice continues to the normal action.

### Motion and accessibility

- Initial timing targets: 200–350 ms ordinary travel, 300–500 ms standalone flip, about 1.0–1.4 seconds for a full attack and up to roughly 1.8 seconds for a charged attack. Some phases overlap; tune through repeated playtests.
- Keep effects local to the attacked area and damage arithmetic legible.
- Include reduced motion, sound controls, keyboard focus, and status indicators that do not depend on color alone.
- Provide equivalent HTML controls for canvas actions. Dragging can be optional polish; tapping/clicking must suffice.
- Use a textual event feed and accessible announcements for turns, reveals, and damage.
- Support card inspection by click/tap; do not rely exclusively on hover.
- Advance game state independently of animation callbacks. A backgrounded tab must not stall the match.

The tutorial should demonstrate an ordinary attack, a blocked attack that still reveals a shield, a hidden charge, shield replacement, and the 1-HP exception.

### Combat feel: physical cards and expressive impacts

**Direction refined after the owner's request:** SHIELD must feel like card combat. Use real 3D card geometry on a table with a fixed, slightly elevated camera, sometimes called a 2.5D presentation. Combine believable paper, weight, and travel with stylized effects that make attack, block, charge, and life changes immediately understandable.

The card faces can still come from a precise existing SVG deck. Build one reusable front/back/edge mesh, apply the appropriate face texture, and spend the custom art effort on the back, table, combat effects, and sound. BGA identifies Adrian Kennard's SVG cards as a source for its card sheets. [BGA resources](https://en.doc.boardgamearena.com/Common_board_game_elements_image_resources) · [SVG deck source](https://www.me.uk/cards/)

Effects should communicate game events. Hearthstone's effects team describes that priority and the use of motion and sound to reinforce important moments. Use this as a production reference for feedback and pacing, not as evidence about SHIELD's browser stack or a requirement to copy its fantasy style. [Developer discussion](https://hearthstone.blizzard.com/en-us/news/22552047)

#### Movement direction

- **Selection:** a small lift and tilt, with the shadow separating from the table as height increases.
- **Draw:** the top card slides from the deck, travels along a shallow arc, then settles into the correct zone.
- **Attack anticipation:** a brief pullback/tilt prepares the strike and establishes its direction.
- **Strike:** accelerate toward the target, then deliver a crisp contact and a small recoil.
- **Landing:** quick deceleration and one restrained settle; avoid excessive bouncing that makes cardstock feel rubbery.
- **Flip:** rotate around a consistent axis; preserve the sense of a thin physical object.
- **Stacks:** keep small vertical offsets and coherent edges; avoid interpenetrating cards and unexplained teleportation.

Author these motions with animation curves and limited spring-like settling. A full rigid-body simulation is optional experimentation, not a dependency: key game positions must remain controlled and repeatable. One animation controller owns each card transform so hover, targeting, and combat timelines cannot fight each other.

#### Effects by action

| Game event | Card movement | Visual/audio feedback | Gameplay information to preserve |
|---|---|---|---|
| Ordinary attack | Lift, anticipation, fast directed strike, then move to the appropriate resolved zone. | Short trail, localized impact, crisp paper/impact sound, damage number. | Show attack minus shield and the actual resulting HP. |
| Fully blocked attack | Strike meets the shield area and recoils. | Brief shield ripple, restrained sparks, distinct block sound, “Blocked / 0 damage.” | Reveal the shield even when no HP is lost. |
| Attack passing defense | Same strike, followed by a local reaction in the target's life area. | Stronger but short impact cue and HP reduction. | The shield remains face up and intact; the visual must not imply its destruction or loss of defense. |
| Charge stored | Card travels face down into the charge zone. | Brief energy-gathering effect and a low, restrained cue. | Use the same effect for every hidden charge value; intensity must not disclose the card. |
| Charged attack | Reveal the allowed cards; visually gather their energy into one strike. | A stronger trail/impact and a fuller sound than an ordinary attack. | Show the sum of charge and drawn card; consume charge only under the accepted rules. |
| Shield replacement | Old shield leaves its zone; new shield arrives face down. | Protective ring and soft placement cue. | Never briefly show the new face, including to the owner. |
| Life replacement | Resolve the offer and settle the accepted card into the life zone. | Renewal effect and clear old-to-new HP feedback. | A replacement can lower HP; do not label every replacement as healing. Keep the 1-HP candidate private until its allowed disclosure. |
| Elimination/victory | Brief final reaction and transition to the agreed result layout. | A distinct short payoff, strongest once at match end. | Move cards only according to the accepted elimination/discard rules. |

Suits and ranks gain no new abilities through these effects. Do not imply fire damage, critical hits, shield durability, or other mechanics absent from the rules. Effect intensity may depend on already-public attack/damage results, never unrevealed values.

#### Example attack choreography

Target a **roughly 1.0–1.4-second sequence** after the authoritative result arrives; these timings are initial design targets:

1. **0–250 ms:** draw and reveal the attack card; reveal a hidden target shield in a clear order.
2. **250–400 ms:** small lift/pullback and target emphasis.
3. **400–650 ms:** fast, slightly arced strike.
4. **650–750 ms:** contact cue and an optional 40–60 ms local animation pause to emphasize impact.
5. **750–1,050 ms:** show the damage calculation, update displayed HP, and settle the shield.
6. **1,050–1,400 ms:** move consumed cards to their rule-defined zones and release the presentation queue.

The authoritative game is already resolved; this sequence presents its permitted events. A charged attack may have a slightly longer reveal, with an initial ceiling around 1.8 seconds. Tune both through repeated-play testing.

If the client is slow, backgrounded, or reconnecting, skip obsolete choreography and reconcile immediately to the latest authorized view. Do not force players to watch a backlog or pause the server for an effect. Any temporary animation pause affects presentation only.

#### Production tools

| Need | Recommendation |
|---|---|
| Physical card/table rendering | Three.js + React Three Fiber, reusing the existing stack. |
| Sequenced movement | GSAP timelines for lift, anticipation, strike, recoil, and settling. [Timeline documentation](https://gsap.com/docs/v3/GSAP/Timeline/) |
| Sparks, rings, trails | Reusable Three.js particle/mesh effects with authored textures; pool short-lived effects. |
| Limited glow | Optional React Postprocessing, starting with selective/subtle bloom. [Documentation](https://react-postprocessing.docs.pmnd.rs/introduction) |
| Asset authoring | Blender for card/table geometry and motion references; vector/raster tools for effect textures. |
| Audio | A small original or licensed library of paper, strike, shield, charge, and victory sounds, timed to the same presentation events. |

Keep interface text and damage numbers sharp, with HTML controls above the rendered scene. Reserve camera shake for an optional, very small high-impact accent; reduced-motion mode disables shake and impact pauses. Avoid continuous idle particles so the renderer can still rest between actions.

Benchmark the most demanding charged attack with all players visible, rather than measuring only an idle table. Provide a low-effects setting with fewer particles and cheaper lighting while preserving movement direction, result text, and sound cues.

#### First combat prototype to review

Create one small scene with two player areas, a draw pile, and the final-style card mesh. Include ordinary attack, block, charged attack, shield replacement, and life replacement in a repeatable preview.

The review asks: does the card feel physical, is the impact satisfying after twenty repetitions, is the outcome clear with sound muted, and does the full sequence meet the target phone frame budget? This proof should precede producing a large effect library.


## 8. Architecture and repository layout

~~~mermaid
flowchart LR
    Browser["Browser: React controls + Three.js table"]
    Auth["Supabase Auth"]
    Server["Node.js / Colyseus match service"]
    Engine["Pure TypeScript SHIELD rules"]
    Database["PostgreSQL: snapshots + events + results"]
    Assets["Static CDN: card art + models + audio"]
    Browser -->|"guest or account sign-in"| Auth
    Browser <-->|"authenticated WSS commands / player views"| Server
    Server -->|"verify identity"| Auth
    Server --> Engine
    Server <-->|"transactional persistence"| Database
    Browser --> Assets
~~~

Suggested structure when implementation starts:

~~~text
shield/
├── SHIELD_REGLES.md                 # Original reference and uncertainty labels
├── SHIELD_WEB_PLAN.md               # This plan
├── apps/
│   ├── web/                        # React UI, accessible controls, 3D scene
│   └── game-server/                # Colyseus rooms, auth, persistence, timers
├── packages/
│   ├── game-core/                  # Framework-independent rules/projections
│   ├── protocol/                   # Public command/view schemas and validation
│   └── assets/                     # Runtime manifests and export metadata
├── art-source/                     # Editable SVG/Blender sources; LFS if needed
├── supabase/                       # SQL migrations and local configuration
├── tests/
│   ├── rules/
│   ├── multiplayer/
│   └── browser/
└── docs/
    ├── rules-v1.md                  # Accepted rules and edge cases
    ├── art-direction.md
    ├── protocol.md
    └── operations.md
~~~

The rules engine must have no dependency on React, Three.js, sockets, wall-clock time, or a database. Supply randomness and timeout events explicitly. The same initial state and recorded inputs must reproduce the same result.

Keep **rulesVersion**, **protocolVersion**, and **assetVersion** separate. A card-back texture change should not invalidate a saved match. A gameplay change must not silently alter an active room's rules.

## 9. Rules engine and hidden information

### State and commands

Model life, shields, charges, draw pile, discard, pending life offers, turn, and elimination explicitly. Maintain a **card-location ledger**: each of the 52 cards occupies exactly one zone, including temporary resolution and pending-offer zones.

Proposed authoritative phases:

~~~text
LOBBY → DEAL → TURN_START
                  ↓
          optional LIFE_DECISION
          [private LIFE_OFFER only at 1 HP]
                  ↓
             ACTION_SELECTION
                  ↓
          COMMIT_AND_DRAW → RESOLVE
                  ↓
            ELIMINATION_CHECK
                  ↓
          NEXT_TURN or MATCH_END
~~~

Damage is numeric; elimination is a separate rule applied after damage. If raw HP becomes −2, retain that value in the event if useful while displaying an eliminated player at 0. Display clamping must not create a rescue opportunity.

Conceptual engine boundaries:

~~~ts
// Contract sketches, not an implementation.
getLegalActions(state, playerId)
applyCommand(state, authorizedCommand, explicitInputs)
getPlayerView(state, viewerId)
~~~

Separate life requests/decisions from the one normal action. Dealing, damage resolution, and turn advancement are server-generated. Clients must not be able to set HP, select card values, or request arbitrary reveals.

### Visibility contract

| Information | Server | Owning player | Other players / later spectators |
|---|---|---|---|
| Initial life faces and public HP | Full | Visible | Visible |
| Unrevealed shield value/suit | Full | **Absent** | **Absent** |
| Unused charge value/suit | Full | **Absent** | **Absent** |
| Draw-pile order | Full | **Absent** | **Absent** |
| Revealed shield | Full | Visible | Visible |
| Pending life offer at 1 HP | Full | Beneficiary only | Absent until the accepted disclosure rule applies |
| Public attack/discard events | Full | Visible | Visible |
| Random source and private snapshots | Full | **Absent** | **Absent** |

Do not send secrets and cover them with card-back graphics. Players can inspect browser memory and network messages. A hidden-card client object should include only an opaque visual handle, role/zone, and allowed public status.

Colyseus documents that synchronized state is visible to all clients by default and offers per-client **StateView** filtering. Keep canonical secret state outside the broadly synchronized schema and create explicit public/player projections. Use per-client filtering or authenticated private messages for the permitted life offer. [Visibility documentation](https://docs.colyseus.io/state/view)

All 52 face illustrations can be public assets. The secret is the **mapping from a hidden card instance to its identity**, plus pile order. Do not leak that mapping through IDs, object names, texture assignments, logs, diagnostics, or replay data. Rotate/redact visual handles during reshuffles so an old public identity cannot be tracked into a newly hidden card.

Bots must consume the same allowed player view. A legal-action heuristic or information-limited simulation bot is sufficient for early playtests; an LLM is unnecessary for enforcing rules or choosing routine turns.

## 10. Multiplayer correctness and recovery

### Process an action exactly once

1. Authenticate the connection and bind it to a verified room seat.
2. Receive a unique **actionId**, **expectedRevision**, action type, and required target.
3. Process commands through a sequential queue for that room.
4. Validate membership, phase, turn ownership, target, entitlement, and revision.
5. Compute the next state/events, including any server-side draw.
6. Persist snapshot, events, revision, and deduplication receipt in one database transaction.
7. After successful commit, acknowledge and publish only each viewer's allowed result.
8. If persistence fails, retain the last committed state and do not report acceptance.

Retries with the same actionId return the recorded outcome without drawing another card. Stale/invalid actions do not change state. If a commit succeeds but its response is lost, retry or reconnect retrieves the accepted revision.

Use a server-side cryptographically strong random source for unbiased Fisher–Yates shuffling. Record the resulting deck order privately for recovery/replay; use fixed inputs in automated tests. Never publish live deck order or random seeds.

### Distinguish two recovery problems

**Client disconnect:** reserve the seat for a proposed 60–90-second grace period, authenticate reconnection, and send the latest player view. Show “Reconnecting” and disable new submissions. Build on Colyseus's reconnection mechanisms. [Reconnection documentation](https://docs.colyseus.io/room/reconnection)

**Server crash/deployment:** in-memory rooms are gone. Reconstruct from the last committed snapshot and ordered events, including pending offers and consumed entitlements. Use a stable application match ID independent of the transient room process. A resume endpoint verifies membership and resolves that match ID to the current room.

A Colyseus reconnect token alone must not be assumed to restore a room after process loss. The application must implement persistence and reconstruction.

Protect each match with a database-backed owner lease/epoch and a guarded revision update. Only the current owner may commit. A recovered room must acquire ownership before processing commands, preventing an old process and its replacement from both advancing the same match during deployment.


Reset/resume deadlines under a documented outage policy so players do not forfeit because of server downtime. Separate private audit history from public history.

### Operational policies to validate

- Private matches have a generous or optional turn timer.
- A timed-out 1-HP offer never draws a new candidate; proposed outcome is decline with the attempt consumed.
- After the reconnect grace period, apply a documented abandonment/forfeit rule, including the destination of that player's cards.
- One authenticated seat controls the game. A second tab may take over explicitly without creating another actor.
- During deployment, stop accepting new rooms, persist active work, notify clients, and reconnect/resume.

Room codes locate invitations; they are not proof of seat ownership. Use membership checks, rate-limited code lookup, and optional host admission before starting.

## 11. Hosting and durable storage

### Recommended initial topology

| Component | Choice | Reason |
|---|---|---|
| React/Vite frontend | **Render Static Site** | CDN, HTTPS, custom domains, repository-based builds. [Documentation](https://render.com/docs/static-sites) |
| Colyseus service | **One paid, continuously available Render web-service instance**, packaged with Docker | Simple persistent Node process for v1; supports inbound WebSockets. [Documentation](https://render.com/docs/websocket) |
| Database/identity | **Supabase managed PostgreSQL + Auth** | Managed identity and durable relational records. |
| Initial art/audio | Versioned static assets with the frontend | Consistent client/asset releases; add object storage when needed. |

Choose nearby European server/database regions if the first audience is France/Europe. Verify available regions and latency before purchasing capacity. Separate development, staging, and production data.

Render documents that sockets can disconnect during instance replacement and reconnecting clients may reach a different instance. Persistence/resume is therefore part of the initial design. [Connection lifecycle](https://render.com/docs/websocket)

Do not enable generic multiple replicas and assume Colyseus routing works automatically. Multiple processes require shared presence/driver infrastructure and routing to the room-owning process. At that stage, evaluate Colyseus Cloud or a supported multi-process setup. Redis coordination alone does not provide durable match recovery. [Colyseus scaling](https://docs.colyseus.io/scalability)

### Suggested records

| Record | Contents/access |
|---|---|
| Profiles | Minimal display identity/preferences; ownership-aware access. |
| Matches | Rules version, lifecycle state, timestamps, public result metadata. |
| Match members | Verified identity-to-seat mapping and resume authorization. |
| Private snapshots | Canonical state, deck order, pending choices, revision, recovery metadata; server-only. |
| Private events | Ordered complete events for reproduction/audit; server-only. |
| Public history | Redacted events suitable for display. |
| Action receipts | Unique action IDs and committed outcomes for retry safety. |

Use a dedicated database role with only required permissions. Keep secret records in an unexposed schema with no browser access. Use RLS and explicit grants for intentionally exposed tables; never ship secret/service keys in the frontend. Supabase distinguishes table grants from row policies, so both must be reviewed. [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Data API exposure change](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

An anonymously signed-in user still has an identity and differs from the unauthenticated database role. Check match membership, not just “authenticated.” [Anonymous-user distinction](https://supabase.com/docs/guides/database/postgres/row-level-security)

The server is the sole gameplay writer. Database subscriptions must not become a second client path for applying moves. Browser-editable profile/preferences are a separate concern.

Operational essentials: HTTPS/WSS, origin checks, bounded message sizes, per-user/room rate limits, health checks, error monitoring, backup restoration drills, and redacted logs. Debug with match IDs/revisions rather than private card values in general analytics.

## 12. Performance and quality targets

These are **acceptance targets to measure**, not demonstrated results.

| Measure | Initial target and context |
|---|---|
| Desktop rendering | 60 FPS during ordinary animations on the agreed reference laptop. |
| Mobile rendering | At least 30 FPS on an agreed mid-range Android phone and supported iPhone; aim for 60 where feasible. |
| Idle rendering | Stop continuous rendering when the table is still; wake for input and animation. |
| Initial payload | Aim for ≤5 MB transferred for code/essential assets; load higher-resolution inspection art later. |
| First playable screen | Aim for ≤5 seconds under an agreed mobile network profile; measure cold-cache loading. |
| Action response | Aim for p95 server acknowledgment under 300 ms for the initial European test audience, excluding animation duration. |
| Network interruption | Refresh/short disconnect restores the correct revision, seat, and pending decision. |
| Hidden information | No unauthorized identities/values in player payloads, reconnect snapshots, public history, or diagnostics. |
| Capacity | Begin with a measured test of 100 concurrent 4-player rooms; publish real capacity only after profiling. |

Use on-demand rendering, geometry/material reuse, adaptive resolution, and graphics settings. React Three Fiber documents these techniques. Expensive shadows/materials need cheaper options on constrained devices. [Performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)

When WebGL is unavailable or repeatedly lost, offer the functional HTML/CSS board using the same player view. Reduce effects without hiding rules or interactions.

Test actual Safari/iOS and Android devices alongside automation. Include touch, portrait/landscape, small screens, browser zoom, reduced motion, and tab suspension.

## 13. Validation that matters for SHIELD

### Rules and invariants

- Reproduce every arithmetic example in section 5.3 of the source rules.
- Assert 52 unique cards across all zones after every transition.
- Reject wrong-turn/wrong-phase actions and attacks against eliminated players.
- Confirm the action is committed before its draw becomes known.
- Confirm a blocked attack reveals and preserves the shield.
- Confirm shield replacement never reveals the new shield to its owner.
- Test charge use/expiration against the accepted rule, not an assumed variant.
- Test life replacement at HP 5, 4, 2, 1, 0, and negative HP.
- Test acceptance/refusal at 1 HP, including refresh and repeated requests.
- Test discard recycling, exhaustion, elimination, victory, and abandoned seats.
- Reproduce a recorded match with the same final state and event sequence.

Use property-based testing for card conservation and secrecy, alongside explicit examples for rules players must understand.

### Online behavior

- Two to four independent browsers finish a match through the production-like server.
- Duplicate/out-of-order messages never draw twice or double-apply damage.
- Forged player IDs cannot act for another seat.
- Clients cannot fetch private snapshots through database/history endpoints.
- Killing the server restores both accepted turns and pending life offers.
- Deployment/reconnect does not consume another life attempt.
- Persistence failure produces a recoverable error instead of an unrecorded move.
- A stale/replaced room owner cannot commit after a new owner takes over.

### Visual/usability review

- All 52 faces have correct rank/suit combinations, pips, margins, and orientation.
- Hidden backs/edges do not encode identity.
- Current HP and selected target remain readable at normal size.
- The 1-HP offer never appears for the wrong player during animation/reconnect.
- Five first-time testers can join by link and complete a match after the tutorial.
- Review browser screenshots and motion on devices, not only offline Blender renders.

## 14. Delivery roadmap

For the expanded combat-presentation scope, estimate **12–16 calendar weeks** for an experienced full-time developer with timely part-time design, technical-art, and QA support. A solo developer learning the stack should budget several months. These are planning estimates, to refine after rules and visual prototyping.

| Phase | Indicative timing | Deliverables | Exit condition |
|---|---|---|---|
| 0. Rules/references | Week 1 | Accepted rule specification, example turns, target devices, art references. | Each open rule has a recorded decision or explicitly deferred variant. |
| 1. Visual/technical proof | Week 2 | Production-style card/table patch with attack, block, and charge previews; engine skeleton; basic two-browser connection. | Convincing movement and combat feedback within the provisional mobile frame budget. |
| 2. Complete online slice | Weeks 3–4 | Full two-player game, all actions, life exception, victory, invitations, basic persistence. | Independent browsers finish/rematch with correct secrecy. |
| 3. Reliability/full player count | Weeks 5–7 | Guest identity, 2–4 players if approved, idempotency, crash recovery, timers, tests. | Reconnect/restart and information-isolation tests pass. |
| 4. Presentation/learning | Weeks 8–12 | Full deck, materials, combat choreography/VFX/sound, tutorial, responsive controls, fallback. | New players understand outcomes; repeated-play pacing and device targets pass. |
| 5. Beta/release | Weeks 13–14 | Load testing, playtest fixes, backups, monitoring, release checklist, deployment/domain setup. | No unresolved state-corruption or hidden-information defects. |
| Contingency | Up to weeks 15–16 | Device problems, art iteration, rule refinement. | Evidence supports release rather than a deadline alone. |

Art exploration can proceed while the engine develops. Final deck production follows the successful single-card proof so texture/material decisions are not repeated 52 times.

The first review milestone combines **a convincing card-combat preview and one complete online match**. Review the attack, blocked hit, and charged strike on a phone before expanding the effect library.

## 15. People, tools, and operating budget

### People

| Role | Planning allowance | Main contribution |
|---|---:|---|
| Experienced TypeScript/web-game developer | 55–75 working days | Rules, renderer integration, server, persistence, tests, deployment. |
| Technical/3D artist | 15–25 days | Card/table assets, lighting, combat motion, reusable VFX, optimization. |
| Sound design | 2–5 days | A cohesive set of timed card, impact, block, charge, and result sounds. |
| Product/UI designer | 5–10 days | Targeting, responsive layout, tutorial, readable states. |
| QA/playtest support | 5–10 days | Devices, reconnects, secrecy, usability. |
| Game owner | Short sessions throughout | Rule decisions, visual review, playtests. |

These are effort allowances, not contractor quotes. Multiply agreed days by actual rates and add contingency for art revisions/technical findings. People can combine roles if they have the relevant experience.

### Services and tools

Reserve roughly **€60–180/month** for an early production environment, monitoring, and modest usage. Keep a separate allowance for staging, domain registration, image generation, and optional paid design software. This is a planning envelope, not a provider quote or capacity guarantee.

Verify compute, database, seats, backups, storage, transfer, tax, and currency conversion before subscribing. Supabase currently lists Pro from **US$25/month**, only one component. Render cost depends on the selected service configuration. [Supabase pricing](https://supabase.com/pricing) · [Render pricing](https://render.com/pricing)

Choose a production game-server plan that stays available and a database plan with suitable backup/retention. Free tiers can serve development, but their availability and quotas need verification before production use.

Spend extra budget first on **art quality, mobile performance, and reliability testing**. Public matchmaking and cosmetic catalogs can follow evidence that people enjoy repeated matches.

## 16. Resources you can provide

| Resource | Preferred form | Purpose |
|---|---|---|
| Final rule decisions | Written answers to section 2. | Complete engine and accurate tutorial. |
| Physical deck reference | Clear front/back photos or scans, dimensions, short handling video. | Proportions, finish, motion, visual character. |
| Visual preference | Premium felt/wood, dark fantasy, or modern minimal, with a few liked/disliked references. | Focused art direction. |
| Original artwork/logo | SVG, layered sources, or high-resolution files with usage information. | Consistent branding/editable assets. |
| Audience | Countries, languages, player count, common phones/computers. | Hosting region, layout, performance targets. |
| Time/budget | Launch target and available development/art support. | Staffing and scope. |
| Test players | Small group including people who have never played SHIELD. | Clarity, duration, repeat-play feedback. |
| Service access | Repository/hosting invitations during implementation. | Deployment; use service secret settings rather than shared documents for credentials. |

Maintain an asset register: source, creator, permission/license, editable file, runtime export, and version. Physical scans can be references; production artwork needs appropriate reuse rights or original work.

## 17. Ready-to-start backlog

1. Resolve rules, choose reference devices, and select the visual direction.
2. Build/inspect the card-and-combat proof on desktop and phone, including attack, block, charged attack, and reduced-effects mode.
3. Set up the monorepo, compatible dependencies, local startup, and CI.
4. Implement the pure engine with example tests and 52-card conservation.
5. Implement player projections and test forbidden-data absence.
6. Connect two authenticated browsers and complete a match.
7. Add transactional persistence, retry safety, reconnect, and restart recovery.
8. Add the agreed player count and complete targeting/life-offer flows.
9. Produce final deck/table assets, motion, audio, and accessible controls.
10. Run device/load/usability tests, then private beta and reviewed release.

**Implementation decision:** TypeScript in VS Code; React/Vite for the application; Three.js/React Three Fiber for realistic cards; a deterministic SHIELD engine; Node/Colyseus as match authority; Supabase for identity/persistence; Blender/vector tools for production assets; GPT Image or Nano Banana for art exploration and selected artwork.
