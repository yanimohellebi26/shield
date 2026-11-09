# Jeu de données des parties (pour l'apprentissage par renforcement)

Chaque partie jouée par au moins un humain est enregistrée :

- **en ligne** : par le serveur, à la fin de la partie (ou à la fermeture de la table si elle n'est pas finie) ;
- **contre l'ordinateur** : le navigateur envoie la partie au serveur à la fin. Le serveur la **rejoue avec le moteur** avant de l'accepter, donc une partie truquée est refusée.

Les parties lancées avec `?autoplay` (tests) ne sont pas enregistrées.

## Où sont les fichiers

- Production : Vercel Blob, magasin privé `shield-games`, chemin `games/AAAA-MM-JJ/<id>.json`.
  Le serveur Render écrit avec la variable `BLOB_READ_WRITE_TOKEN`.
- Développement : `GAME_LOG_DIR=./dataset npm run server` écrit dans `./dataset/games/…`.

Télécharger tout le jeu de données :

```bash
BLOB_READ_WRITE_TOKEN=... node tools/download-games.mjs dataset
```

Le jeton se trouve sur Vercel : *Storage → shield-games → .env.local*.

## Format (`GameRecord`, `packages/engine/src/record.ts`)

```jsonc
{
  "v": 1,
  "id": "2026-11-09T14-17-22-455Z-peas5j",
  "source": "online",                 // ou "local"
  "startedAt": "…", "endedAt": "…",
  "seed": 123456789,                   // graine du moteur : la partie est reproductible
  "players": [{ "id": "p0", "name": "Yani", "kind": "human" }, { "id": "p1", "name": "Aria", "kind": "bot" }],
  "moves": [
    { "player": "p0", "cmd": { "type": "act", "action": { "type": "charge" } }, "by": "human", "ms": 5120 },
    { "player": "p1", "cmd": { "type": "act", "action": { "type": "attack", "target": "p0" } }, "by": "bot", "ms": 9800 }
  ],
  "winner": "p0",
  "finished": true
}
```

- `by` : `human` (choisi par une personne), `bot` (siège ordinateur), `auto` (le bot a joué à la place d'un humain absent ou trop lent). Pour imiter les humains, ne garder que `human`.
- `ms` : temps écoulé depuis le début de la partie.

## Rejouer une partie et obtenir les observations

Le moteur est déterministe : avec la même graine et les mêmes coups, on retrouve chaque état.
`viewFor(state, joueur)` donne exactement ce que ce joueur voyait (boucliers et charges cachés), c'est l'observation à utiliser pour l'apprentissage.

```ts
import { apply, createGame, legalCommands, viewFor, type GameRecord } from '@shield/engine';

function* transitions(rec: GameRecord) {
  let state = createGame({ players: rec.players, seed: rec.seed, rules: rec.rules });
  for (const m of rec.moves) {
    const observation = viewFor(state, m.player);
    const legal = legalCommands(state, m.player);
    const next = apply(state, m.player, m.cmd).state;
    yield { observation, legal, action: m.cmd, by: m.by, done: next.phase === 'over' };
    state = next;
  }
}
```

La récompense finale vaut par exemple +1 pour `winner`, -1 pour les autres. `replayRecord(rec)` vérifie qu'un fichier se rejoue sans erreur.
