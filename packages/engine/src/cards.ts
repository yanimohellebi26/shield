import type { Card, Suit } from './types';

export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
export const LIFE_SWAP_THRESHOLD = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export function value(card: Card): number {
  return card.rank;
}

export function rankLabel(rank: number): string {
  switch (rank) {
    case 1:
      return 'A';
    case 11:
      return 'J';
    case 12:
      return 'Q';
    case 13:
      return 'K';
    default:
      return String(rank);
  }
}

export function cardLabel(card: Card): string {
  const suit = { S: '♠', H: '♥', D: '♦', C: '♣' }[card.suit];
  return `${rankLabel(card.rank)}${suit}`;
}

/** The standard 52-card deck, unshuffled. */
export function fullDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) cards.push({ id: `${suit}${rank}`, suit, rank });
  }
  return cards;
}

export function sum(cards: readonly Card[]): number {
  return cards.reduce((total, c) => total + value(c), 0);
}
