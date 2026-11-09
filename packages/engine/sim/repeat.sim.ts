import { it } from 'vitest';
import { apply, chooseBotCommand, createGame, legalCommands, viewFor } from '../src';
it('card repeats', () => {
  for (const n of [2, 4, 6, 8]) {
    let draws = 0, repeats = 0, games = 400, reshuffles = 0;
    for (let g = 0; g < games; g++) {
      let s = createGame({ players: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: '' })), seed: 7 + g });
      const seen = new Set<string>(s.players.flatMap((p) => p.life.map((c) => c.id)));
      for (let k = 0; k < 4000 && s.phase !== 'over'; k++) {
        const me = s.players[s.current]!.id;
        const before = s.discard.length + s.deck.length;
        const out = apply(s, me, chooseBotCommand(viewFor(s, me), legalCommands(s, me)));
        for (const e of out.events) {
          if (e.type === 'reshuffle') reshuffles++;
          const c = e.type === 'attack' ? e.card : e.type === 'lifeSwap' ? e.card : null;
          if (c) { draws++; if (seen.has(c.id)) repeats++; seen.add(c.id); }
        }
        s = out.state;
      }
    }
    console.log(`${n}p: face-up cards already seen earlier in the game: ${(100 * repeats / draws).toFixed(1)}% · reshuffles/game ${(reshuffles / games).toFixed(2)}`);
  }
});
