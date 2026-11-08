/** Suits have no game effect in SHIELD; they only exist for presentation. */
export type Suit = 'S' | 'H' | 'D' | 'C';

/** A physical card. Its value is its rank: Ace = 1 … King = 13. */
export interface Card {
  id: string;
  suit: Suit;
  rank: number;
}

export interface Player {
  id: string;
  name: string;
  /** Cards currently representing life (face up). Display only: HP is tracked in `hp`. */
  life: Card[];
  hp: number;
  /** Unknown to everyone, owner included, until attacked. */
  shield: Card | null;
  shieldRevealed: boolean;
  /** Charged cards, face down and unknown to everyone until the next attack. */
  charge: Card[];
  lifeSwapUsed: boolean;
  eliminated: boolean;
}

export type Phase = 'action' | 'lifeOffer' | 'over';

/**
 * Optional rule variants, used to test balance. The defaults are the rules in SHIELD_REGLES.md.
 */
export interface RuleOptions {
  /** Most cards a charge may hold (default: no limit). */
  maxCharge: number;
  /**
   * When a hit threatens the target's charge:
   * 'beats' (default) — damage > 0 and attack > charge; 'anyDamage' — any damaging hit; 'never'.
   */
  chargeLoss: 'beats' | 'anyDamage' | 'never';
  /** The very first turn of the game cannot be an attack (evens out the first-player edge). */
  noAttackFirstTurn: boolean;
  /** In a 2-player game, the second player starts with one card already charged (hidden). */
  secondPlayerCharge: boolean;
  /** In a 2-player game, extra starting HP for the second player. */
  secondPlayerHp: number;
}

export const DEFAULT_RULES: RuleOptions = { maxCharge: Infinity, chargeLoss: 'beats', noAttackFirstTurn: false, secondPlayerCharge: false, secondPlayerHp: 0 };

export interface GameState {
  players: Player[];
  /** Draw pile; the top card is the last element. */
  deck: Card[];
  /** Face-up discard pile; the top card is the last element. */
  discard: Card[];
  /** Index into `players` of the player whose turn it is. */
  current: number;
  phase: Phase;
  turn: number;
  /** Card offered to the current player at exactly 1 HP (visible to them only). */
  lifeOffer: Card | null;
  winner: string | null;
  /** Seeded RNG state, so a game is reproducible from its seed and commands. */
  rng: number;
  /** Number of commands applied so far. */
  seq: number;
  /** Rule variants in force; absent means the standard rules. */
  rules?: Partial<RuleOptions>;
}

export type Action =
  | { type: 'attack'; target: string }
  | { type: 'charge' }
  | { type: 'shieldSelf' }
  | { type: 'shieldOther'; target: string }
  /** Only legal when no card can be drawn and the player has no charge to attack with. */
  | { type: 'pass' };

export type Command =
  | { type: 'act'; action: Action }
  /** Life replacement: start of own turn, before the action, HP 1–4, once per game. */
  | { type: 'lifeSwap' }
  | { type: 'acceptLife' }
  | { type: 'declineLife' };

/**
 * Events describe what happened, in order, so the UI can animate it.
 * They never contain a hidden card (new shields and charged cards), except
 * `lifeOffer.card`, which `eventsFor` redacts for everyone but the beneficiary.
 */
export type GameEvent =
  | { type: 'turnStart'; player: string; turn: number }
  | { type: 'reshuffle'; count: number }
  | { type: 'lifeSwap'; player: string; card: Card; oldLife: Card[]; hpBefore: number; hpAfter: number }
  | { type: 'lifeOffer'; player: string; card: Card | null }
  | { type: 'lifeOfferResolved'; player: string; accepted: boolean; card: Card; oldLife: Card[]; hpBefore: number; hpAfter: number }
  | { type: 'charge'; player: string; chargeCount: number }
  | { type: 'shieldChange'; player: string; target: string; oldShield: Card | null }
  | {
      type: 'attack';
      player: string;
      target: string;
      /** Card drawn for the attack (null if the deck and discard were both empty). */
      card: Card | null;
      charge: Card[];
      attack: number;
      shield: Card;
      shieldWasHidden: boolean;
      damage: number;
      hpBefore: number;
      hpAfter: number;
    }
  /** The attacked player took damage and the attack exceeded their charge: the charge is discarded (face up). */
  | { type: 'chargeLost'; player: string; cards: Card[]; attack: number }
  /** The attacked player took damage but the attack did not exceed their charge. Values stay secret. */
  | { type: 'chargeHeld'; player: string; attack: number }
  | { type: 'eliminated'; player: string; discarded: Card[] }
  | { type: 'pass'; player: string }
  | { type: 'gameOver'; winner: string };

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleError';
  }
}
