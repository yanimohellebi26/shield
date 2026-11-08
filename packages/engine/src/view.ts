import type { Card, GameEvent, GameState, Phase } from './types';

/** A card slot whose face nobody may know yet. Carries no id, so it cannot leak identity. */
export interface HiddenCard {
  hidden: true;
}
export type SlotCard = Card | HiddenCard;

export function isHidden(c: SlotCard | null | undefined): c is HiddenCard {
  return !!c && 'hidden' in c;
}

export interface PlayerView {
  id: string;
  name: string;
  life: Card[];
  hp: number;
  shield: SlotCard | null;
  chargeCount: number;
  lifeSwapUsed: boolean;
  eliminated: boolean;
}

/** Everything one viewer is allowed to know. The only per-viewer secret is the 1 HP life offer. */
export interface GameView {
  viewer: string | null;
  players: PlayerView[];
  deckCount: number;
  discard: Card[];
  current: string;
  phase: Phase;
  turn: number;
  /** The 1 HP offer card, present only for the player it is offered to. */
  lifeOffer: Card | null;
  winner: string | null;
}

export function viewFor(state: GameState, viewer: string | null): GameView {
  const current = state.players[state.current]!;
  return {
    viewer,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      life: p.life.map((c) => ({ ...c })),
      hp: p.hp,
      shield: p.shield ? (p.shieldRevealed ? { ...p.shield } : { hidden: true }) : null,
      chargeCount: p.charge.length,
      lifeSwapUsed: p.lifeSwapUsed,
      eliminated: p.eliminated,
    })),
    deckCount: state.deck.length,
    discard: state.discard.map((c) => ({ ...c })),
    current: current.id,
    phase: state.phase,
    turn: state.turn,
    lifeOffer: state.lifeOffer && current.id === viewer ? { ...state.lifeOffer } : null,
    winner: state.winner,
  };
}

/** Redacts events for one viewer (only the 1 HP offer card is private). */
export function eventsFor(events: GameEvent[], viewer: string | null): GameEvent[] {
  return events.map((e) => (e.type === 'lifeOffer' && e.player !== viewer ? { ...e, card: null } : e));
}
