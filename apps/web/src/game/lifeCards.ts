import type { Card } from '@shield/engine';

/**
 * The life cards shown in front of a player always add up to their HP exactly (5 HP shows
 * 3 + 2, never the starting Queen and 7). They are display cards, not cards from the deck.
 *
 * Starting from the player's real life cards, it keeps the highest one that still fits and
 * replaces the other, so cards change one at a time as HP goes down. Above 26 HP (two Kings,
 * plus the second-player bonus) a third card is needed.
 */
export function lifeCards(life: readonly Card[], hp: number): Card[] {
  if (hp <= 0) return [];
  const total = life.reduce((t, c) => t + c.rank, 0);
  if (total === hp) return [...life];
  const base = [...life].sort((a, b) => b.rank - a.rank);
  const suitOf = (i: number) => base[i]?.suit ?? base[0]?.suit ?? 'H';
  const make = (rank: number, i: number): Card => ({ id: `life-${base[i]?.id ?? 'x'}-${i}-${rank}`, suit: suitOf(i), rank });
  if (hp === 1) return [make(1, 0)];
  if (hp > 26) return [make(13, 0), make(13, 1), make(hp - 26, 2)];
  // Keep a real card when the rest still fits on one card.
  for (const keep of base) {
    const rest = hp - keep.rank;
    if (rest >= 1 && rest <= 13) {
      const other = base.indexOf(keep) === 0 ? 1 : 0;
      return [keep, make(rest, other)];
    }
  }
  const a = Math.min(13, Math.ceil(hp / 2));
  return [make(a, 0), make(hp - a, 1)];
}
