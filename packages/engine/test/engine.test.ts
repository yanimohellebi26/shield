import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  apply,
  chooseBotCommand,
  createGame,
  eventsFor,
  fullDeck,
  legalCommands,
  viewFor,
  type Card,
  type Command,
  type GameState,
  type Suit,
} from '../src';

let uid = 0;
const C = (rank: number, suit: Suit = 'S'): Card => ({ id: `t${uid++}`, suit, rank });

interface PlayerSpec {
  hp?: number;
  life?: number[];
  shield?: number;
  shieldRevealed?: boolean;
  charge?: number[];
  lifeSwapUsed?: boolean;
}

/** Builds a state directly, so each rule can be tested in isolation. Deck is given top card first. */
function game(players: PlayerSpec[], deckTopFirst: number[] = [], current = 0): GameState {
  return {
    players: players.map((s, i) => {
      const life = (s.life ?? [10, 10]).map((r) => C(r, 'H'));
      return {
        id: `p${i}`,
        name: `P${i}`,
        life,
        hp: s.hp ?? life.reduce((t, c) => t + c.rank, 0),
        shield: C(s.shield ?? 5, 'C'),
        shieldRevealed: s.shieldRevealed ?? false,
        charge: (s.charge ?? []).map((r) => C(r, 'D')),
        lifeSwapUsed: s.lifeSwapUsed ?? false,
        eliminated: false,
      };
    }),
    deck: deckTopFirst.map((r) => C(r)).reverse(),
    discard: [],
    current,
    phase: 'action',
    turn: 1,
    lifeOffer: null,
    winner: null,
    rng: 42,
    seq: 0,
  };
}

const attack = (target: string): Command => ({ type: 'act', action: { type: 'attack', target } });
const charge: Command = { type: 'act', action: { type: 'charge' } };

describe('setup', () => {
  it('adds the two face-up life cards: Queen + 7 = 19 HP', () => {
    const deck = [C(12), C(7), C(3), C(1), C(1), C(1), ...fullDeck()];
    const s = createGame({ players: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], deckTopFirst: deck, first: 0 });
    expect(s.players[0]!.hp).toBe(19);
    expect(s.players[0]!.shield!.rank).toBe(3);
    expect(s.players[0]!.shieldRevealed).toBe(false);
  });

  it('supports 2 to 8 players and leaves 52 − 3n cards', () => {
    for (let n = 2; n <= 8; n++) {
      const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
      expect(createGame({ players, seed: n }).deck).toHaveLength(52 - 3 * n);
    }
    expect(() => createGame({ players: [{ id: 'a', name: 'A' }], seed: 1 })).toThrow();
    const nine = Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    expect(() => createGame({ players: nine, seed: 1 })).toThrow();
  });
});

describe('damage examples from SHIELD_REGLES.md §5.3', () => {
  const cases = [
    { name: 'simple attack with a 10', charge: [], card: 10, shield: 6, hp: 18, damage: 4, after: 14 },
    { name: 'tie', charge: [], card: 8, shield: 8, hp: 14, damage: 0, after: 14 },
    { name: 'stronger shield', charge: [], card: 3, shield: 9, hp: 14, damage: 0, after: 14 },
    { name: 'charge 7 then King', charge: [7], card: 13, shield: 12, hp: 16, damage: 8, after: 8 },
    { name: 'charge 4 then 8', charge: [4], card: 8, shield: 9, hp: 4, damage: 3, after: 1 },
  ];
  for (const c of cases) {
    it(c.name, () => {
      const s = game([{ charge: c.charge }, { hp: c.hp, shield: c.shield }], [c.card]);
      const { state, events } = apply(s, 'p0', attack('p1'));
      const ev = events.find((e) => e.type === 'attack');
      expect(ev).toMatchObject({ attack: sum(c.charge) + c.card, damage: c.damage, hpAfter: c.after });
      expect(state.players[1]!.hp).toBe(c.after);
    });
  }

  it('attack exceeding remaining life (13 vs 5 at 6 HP) eliminates', () => {
    const s = game([{}, { hp: 6, shield: 5 }], [13]);
    const { state, events } = apply(s, 'p0', attack('p1'));
    expect(events.map((e) => e.type)).toEqual(['attack', 'eliminated', 'gameOver']);
    expect(state.players[1]!.eliminated).toBe(true);
    expect(state.phase).toBe('over');
    expect(state.winner).toBe('p0');
  });
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('shields', () => {
  it('is revealed by an attack, even a blocked one, and stays face up with the same value', () => {
    const s = game([{}, { shield: 12 }, {}], [3, 1, 1, 13]);
    let { state } = apply(s, 'p0', attack('p1'));
    expect(state.players[1]!.shieldRevealed).toBe(true);
    expect(state.players[1]!.hp).toBe(20);
    state = apply(state, 'p1', { type: 'act', action: { type: 'charge' } }).state;
    state = apply(state, 'p2', { type: 'act', action: { type: 'charge' } }).state;
    const r = apply(state, 'p0', attack('p1'));
    expect(r.events[0]).toMatchObject({ type: 'attack', shieldWasHidden: false, damage: 1 });
  });

  it('a new shield comes from the deck, face down; the old one goes to the discard', () => {
    const s = game([{}, { shield: 12, shieldRevealed: true }], [2]);
    const { state, events } = apply(s, 'p0', { type: 'act', action: { type: 'shieldOther', target: 'p1' } });
    expect(state.players[1]!.shield!.rank).toBe(2);
    expect(state.players[1]!.shieldRevealed).toBe(false);
    expect(state.discard.map((c) => c.rank)).toEqual([12]);
    expect(events[0]).toMatchObject({ type: 'shieldChange', target: 'p1', oldShield: { rank: 12 } });
  });
});

describe('charge', () => {
  it('stacks without limit, survives other actions, and is fully used by the next attack', () => {
    let s = game([{}, { shield: 1 }], [5, 1, 6, 1, 4, 1, 2, 1, 3]);
    s = apply(s, 'p0', charge).state; // 5
    s = apply(s, 'p1', charge).state;
    s = apply(s, 'p0', charge).state; // 6
    s = apply(s, 'p1', charge).state;
    s = apply(s, 'p0', { type: 'act', action: { type: 'shieldSelf' } }).state; // charge kept
    s = apply(s, 'p1', charge).state;
    s = apply(s, 'p0', charge).state; // 2
    s = apply(s, 'p1', charge).state;
    expect(s.players[0]!.charge.map((c) => c.rank)).toEqual([5, 6, 2]);
    const { state, events } = apply(s, 'p0', attack('p1'));
    expect(events[0]).toMatchObject({ attack: 5 + 6 + 2 + 3, damage: 15 });
    expect(state.players[0]!.charge).toHaveLength(0);
  });

  it('is hidden from everyone, owner included', () => {
    let s = game([{}, {}], [9]);
    s = apply(s, 'p0', charge).state;
    for (const viewer of ['p0', 'p1', null]) {
      const v = viewFor(s, viewer);
      expect(v.players[0]!.chargeCount).toBe(1);
      expect(JSON.stringify(v)).not.toContain('"rank":9');
    }
  });
});

describe('charge under attack', () => {
  it('is lost when a damaging attack is greater than the charge', () => {
    const s = game([{}, { shield: 2, charge: [3, 4] }], [9]);
    const { state, events } = apply(s, 'p0', attack('p1'));
    expect(events.map((e) => e.type)).toEqual(['attack', 'chargeLost', 'turnStart']);
    expect(state.players[1]!.charge).toHaveLength(0);
    expect(state.discard.map((c) => c.rank)).toEqual([9, 3, 4]);
  });

  it('holds on a tie or a smaller attack, without revealing its value', () => {
    for (const card of [7, 5]) {
      const s = game([{}, { shield: 2, charge: [3, 4] }], [card]);
      const { state, events } = apply(s, 'p0', attack('p1'));
      const held = events.find((e) => e.type === 'chargeHeld');
      expect(held).toEqual({ type: 'chargeHeld', player: 'p1', attack: card });
      expect(state.players[1]!.charge).toHaveLength(2);
      expect(JSON.stringify(viewFor(state, 'p1'))).not.toMatch(/"rank":[34],"id":"t|"suit":"D"/);
    }
  });

  it('is untouched when the shield blocks the attack', () => {
    const s = game([{}, { shield: 13, charge: [1] }], [12]);
    const { state, events } = apply(s, 'p0', attack('p1'));
    expect(events.some((e) => e.type === 'chargeLost' || e.type === 'chargeHeld')).toBe(false);
    expect(state.players[1]!.charge).toHaveLength(1);
  });
});

describe('life replacement', () => {
  it('at 2–4 HP is blind and binding, even if worse', () => {
    const s = game([{ hp: 4 }, {}], [2]);
    expect(legalCommands(s, 'p0')).toContainEqual({ type: 'lifeSwap' });
    const { state, events } = apply(s, 'p0', { type: 'lifeSwap' });
    expect(state.players[0]!.hp).toBe(2);
    expect(state.players[0]!.lifeSwapUsed).toBe(true);
    expect(state.current).toBe(0); // the normal action still follows
    expect(events[0]).toMatchObject({ type: 'lifeSwap', hpBefore: 4, hpAfter: 2 });
    expect(legalCommands(state, 'p0')).not.toContainEqual({ type: 'lifeSwap' });
  });

  it('is not available at 5 HP or more', () => {
    expect(legalCommands(game([{ hp: 5 }, {}], [2]), 'p0')).not.toContainEqual({ type: 'lifeSwap' });
  });

  it('at exactly 1 HP shows the card first; accepting sets HP to it', () => {
    const s = game([{ hp: 1 }, {}], [12]);
    const offered = apply(s, 'p0', { type: 'lifeSwap' });
    expect(offered.state.phase).toBe('lifeOffer');
    expect(viewFor(offered.state, 'p0').lifeOffer?.rank).toBe(12);
    expect(viewFor(offered.state, 'p1').lifeOffer).toBeNull();
    expect(eventsFor(offered.events, 'p1')[0]).toMatchObject({ type: 'lifeOffer', card: null });
    const { state } = apply(offered.state, 'p0', { type: 'acceptLife' });
    expect(state.players[0]!.hp).toBe(12);
    expect(state.phase).toBe('action');
  });

  it('declining at 1 HP keeps 1 HP and still uses the only replacement', () => {
    const s = game([{ hp: 1 }, {}], [1]);
    const offered = apply(s, 'p0', { type: 'lifeSwap' }).state;
    const { state } = apply(offered, 'p0', { type: 'declineLife' });
    expect(state.players[0]!.hp).toBe(1);
    expect(state.players[0]!.lifeSwapUsed).toBe(true);
    expect(state.discard.map((c) => c.rank)).toEqual([1]);
  });

  it('only the current player, on their own turn', () => {
    const s = game([{}, { hp: 3 }], [2]);
    expect(() => apply(s, 'p1', { type: 'lifeSwap' })).toThrow();
  });
});

describe('turns, discard and deck', () => {
  it('skips eliminated players clockwise', () => {
    const s = game([{}, { hp: 1, shield: 1 }, {}], [13, 1]);
    const { state } = apply(s, 'p0', attack('p1'));
    expect(state.current).toBe(2);
  });

  it('reshuffles the discard pile into a new deck when empty', () => {
    const s = game([{}, { shield: 13 }], [4]);
    s.discard = [C(7), C(8)];
    const r1 = apply(s, 'p0', attack('p1'));
    const r2 = apply(r1.state, 'p1', charge);
    expect(r2.events[0]).toMatchObject({ type: 'reshuffle', count: 3 });
  });

  it('with no card anywhere, a player attacks with charge only or passes', () => {
    const s = game([{ charge: [6] }, {}], []);
    expect(legalCommands(s, 'p0').every((c) => c.type === 'act' && c.action.type === 'attack')).toBe(true);
    const s2 = game([{}, {}], []);
    expect(legalCommands(s2, 'p0')).toEqual([{ type: 'act', action: { type: 'pass' } }]);
  });

  it('rejects out-of-turn and invalid targets', () => {
    const s = game([{}, {}], [5]);
    expect(() => apply(s, 'p1', charge)).toThrow();
    expect(() => apply(s, 'p0', attack('p0'))).toThrow();
    expect(() => apply(s, 'p0', attack('nobody'))).toThrow();
  });
});

describe('invariants over random bot games (2–8 players)', () => {
  it('conserves the 52 cards, never leaks hidden cards, and keeps state consistent', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 8 }), fc.integer({ min: 0, max: 2 ** 31 }), (n, seed) => {
        const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
        let s = createGame({ players, seed });
        let r = seed;
        const rand = () => ((r = (r * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
        for (let step = 0; step < 3000 && s.phase !== 'over'; step++) {
          const me = s.players[s.current]!.id;
          const view = viewFor(s, me);
          const cmd = chooseBotCommand(view, legalCommands(s, me), rand);
          s = apply(s, me, cmd).state;

          const all = [
            ...s.deck,
            ...s.discard,
            ...(s.lifeOffer ? [s.lifeOffer] : []),
            ...s.players.flatMap((p) => [...p.life, ...(p.shield ? [p.shield] : []), ...p.charge]),
          ];
          expect(all).toHaveLength(52);
          expect(new Set(all.map((c) => c.id)).size).toBe(52);

          for (const p of s.players) {
            if (p.eliminated) expect(p.hp).toBeLessThanOrEqual(0);
            else expect(p.hp).toBeGreaterThan(0);
          }
          const leak = JSON.stringify(viewFor(s, null));
          for (const p of s.players) {
            for (const c of p.charge) expect(leak).not.toContain(`"id":"${c.id}"`);
            if (p.shield && !p.shieldRevealed) expect(leak).not.toContain(`"id":"${p.shield.id}"`);
          }
        }
      }),
      { numRuns: 60 },
    );
  });
});
