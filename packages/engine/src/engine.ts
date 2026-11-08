import { fullDeck, LIFE_SWAP_THRESHOLD, MAX_PLAYERS, MIN_PLAYERS, sum, value } from './cards';
import { nextRandom, shuffle } from './rng';
import { DEFAULT_RULES, RuleError, type Action, type Card, type Command, type GameEvent, type GameState, type Player, type RuleOptions } from './types';

export interface NewGameOptions {
  players: { id: string; name: string }[];
  seed?: number;
  /** Test hook: draw order, first card drawn first. Defaults to a seeded shuffle of 52 cards. */
  deckTopFirst?: Card[];
  /** Index of the first player. Defaults to a seeded random choice. */
  first?: number;
  /** Rule variants (balance testing). Omitted options keep the standard rules. */
  rules?: Partial<RuleOptions>;
}

export function rulesOf(state: GameState): RuleOptions {
  return { ...DEFAULT_RULES, ...state.rules };
}

export interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

/** Deals each player two face-up life cards and one secret shield, player by player. */
export function createGame(opts: NewGameOptions): GameState {
  const n = opts.players.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new RuleError(`SHIELD needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
  if (new Set(opts.players.map((p) => p.id)).size !== n) throw new RuleError('Player ids must be unique');

  let rng = (opts.seed ?? Date.now()) >>> 0;
  let deck: Card[];
  if (opts.deckTopFirst) {
    deck = opts.deckTopFirst.slice().reverse();
  } else {
    [deck, rng] = shuffle(fullDeck(), rng);
  }

  const take = (): Card => {
    const c = deck.pop();
    if (!c) throw new RuleError('Not enough cards to deal');
    return c;
  };

  const players: Player[] = opts.players.map(({ id, name }) => {
    const life = [take(), take()];
    return {
      id,
      name,
      life,
      hp: sum(life),
      shield: take(),
      shieldRevealed: false,
      charge: [],
      lifeSwapUsed: false,
      eliminated: false,
    };
  });

  let first = opts.first;
  if (first === undefined) {
    const [r, next] = nextRandom(rng);
    rng = next;
    first = Math.floor(r * n);
  }

  const rules: RuleOptions = { ...DEFAULT_RULES, ...opts.rules };
  if (n === 2) {
    const second = players[(first + 1) % n]!;
    if (rules.secondPlayerCharge) second.charge.push(take());
    second.hp += rules.secondPlayerHp;
  }
  const state: GameState = { players, deck, discard: [], current: first, phase: 'action', turn: 1, lifeOffer: null, winner: null, rng, seq: 0 };
  if (opts.rules) state.rules = { ...opts.rules };
  return state;
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.current]!;
}

export function findPlayer(state: GameState, id: string): Player {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new RuleError(`Unknown player ${id}`);
  return p;
}

function cardsAvailable(state: GameState): number {
  return state.deck.length + state.discard.length;
}

/** Every command `playerId` may send right now. Empty when it is not their turn. */
export function legalCommands(state: GameState, playerId: string): Command[] {
  if (state.phase === 'over') return [];
  const me = currentPlayer(state);
  if (me.id !== playerId) return [];

  if (state.phase === 'lifeOffer') return [{ type: 'acceptLife' }, { type: 'declineLife' }];

  const cmds: Command[] = [];
  const canDraw = cardsAvailable(state) > 0;
  const opponents = state.players.filter((p) => !p.eliminated && p.id !== me.id);

  if (canDraw && !me.lifeSwapUsed && me.hp < LIFE_SWAP_THRESHOLD) cmds.push({ type: 'lifeSwap' });

  const act = (action: Action) => cmds.push({ type: 'act', action });
  const rules = rulesOf(state);
  const mayAttack = !(rules.noAttackFirstTurn && state.turn === 1);
  if (canDraw) {
    if (mayAttack) for (const o of opponents) act({ type: 'attack', target: o.id });
    if (me.charge.length < rules.maxCharge) act({ type: 'charge' });
    act({ type: 'shieldSelf' });
    for (const o of opponents) act({ type: 'shieldOther', target: o.id });
  } else if (me.charge.length > 0) {
    for (const o of opponents) act({ type: 'attack', target: o.id });
  } else {
    act({ type: 'pass' });
  }
  return cmds;
}

export function isLegal(state: GameState, playerId: string, cmd: Command): boolean {
  const key = JSON.stringify(cmd);
  return legalCommands(state, playerId).some((c) => JSON.stringify(c) === key);
}

/**
 * Applies one command. Pure: the input state is not modified.
 * Throws RuleError when the command is not legal for this player now.
 */
export function apply(prev: GameState, playerId: string, cmd: Command): ApplyResult {
  if (!isLegal(prev, playerId, normalize(cmd))) {
    throw new RuleError(`Illegal command ${JSON.stringify(cmd)} for ${playerId} (phase ${prev.phase})`);
  }
  const state: GameState = JSON.parse(JSON.stringify(prev)) as GameState;
  const events: GameEvent[] = [];
  state.seq++;
  const me = currentPlayer(state);

  switch (cmd.type) {
    case 'lifeSwap': {
      const card = draw(state, events)!;
      me.lifeSwapUsed = true;
      if (me.hp === 1) {
        state.phase = 'lifeOffer';
        state.lifeOffer = card;
        events.push({ type: 'lifeOffer', player: me.id, card });
      } else {
        const oldLife = me.life;
        const hpBefore = me.hp;
        state.discard.push(...oldLife);
        me.life = [card];
        me.hp = value(card);
        events.push({ type: 'lifeSwap', player: me.id, card, oldLife, hpBefore, hpAfter: me.hp });
      }
      return { state, events };
    }
    case 'acceptLife':
    case 'declineLife': {
      const card = state.lifeOffer!;
      const accepted = cmd.type === 'acceptLife';
      const hpBefore = me.hp;
      const oldLife = accepted ? me.life : [];
      if (accepted) {
        state.discard.push(...me.life);
        me.life = [card];
        me.hp = value(card);
      } else {
        state.discard.push(card);
      }
      state.lifeOffer = null;
      state.phase = 'action';
      events.push({ type: 'lifeOfferResolved', player: me.id, accepted, card, oldLife, hpBefore, hpAfter: me.hp });
      return { state, events };
    }
    case 'act':
      resolveAction(state, me, cmd.action, events);
      endTurn(state, events);
      return { state, events };
  }
}

function normalize(cmd: Command): Command {
  // Rebuild with a stable key order so JSON comparison in isLegal is reliable.
  if (cmd.type !== 'act') return { type: cmd.type };
  const a = cmd.action;
  const action: Action =
    a.type === 'attack' || a.type === 'shieldOther' ? { type: a.type, target: a.target } : { type: a.type };
  return { type: 'act', action };
}

/** Draws the top card, reshuffling the discard pile into a new deck when needed. */
function draw(state: GameState, events: GameEvent[]): Card | null {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return null;
    const [deck, rng] = shuffle(state.discard, state.rng);
    state.deck = deck;
    state.rng = rng;
    state.discard = [];
    events.push({ type: 'reshuffle', count: deck.length });
  }
  return state.deck.pop() ?? null;
}

function resolveAction(state: GameState, me: Player, action: Action, events: GameEvent[]): void {
  switch (action.type) {
    case 'pass':
      events.push({ type: 'pass', player: me.id });
      return;

    case 'charge': {
      me.charge.push(draw(state, events)!);
      events.push({ type: 'charge', player: me.id, chargeCount: me.charge.length });
      return;
    }

    case 'shieldSelf':
    case 'shieldOther': {
      const target = action.type === 'shieldSelf' ? me : findPlayer(state, action.target);
      const card = draw(state, events)!;
      const oldShield = target.shield;
      if (oldShield) state.discard.push(oldShield);
      target.shield = card;
      target.shieldRevealed = false;
      events.push({ type: 'shieldChange', player: me.id, target: target.id, oldShield });
      return;
    }

    case 'attack': {
      const target = findPlayer(state, action.target);
      const card = draw(state, events);
      const charge = me.charge;
      me.charge = [];
      const attack = (card ? value(card) : 0) + sum(charge);
      const shield = target.shield!;
      const shieldWasHidden = !target.shieldRevealed;
      target.shieldRevealed = true;
      const damage = Math.max(0, attack - value(shield));
      const hpBefore = target.hp;
      target.hp -= damage;
      if (card) state.discard.push(card);
      state.discard.push(...charge);
      events.push({
        type: 'attack',
        player: me.id,
        target: target.id,
        card,
        charge,
        attack,
        shield,
        shieldWasHidden,
        damage,
        hpBefore,
        hpAfter: target.hp,
      });
      if (target.hp <= 0) {
        eliminate(state, target, events);
      } else if (damage > 0 && target.charge.length > 0 && rulesOf(state).chargeLoss !== 'never') {
        // A hit that gets through breaks the target's charge (standard rule). In the 'beats'
        // variant only an attack strictly greater than the charge breaks it, compared in secret.
        if (rulesOf(state).chargeLoss === 'anyDamage' || attack > sum(target.charge)) {
          const cards = target.charge;
          target.charge = [];
          state.discard.push(...cards);
          events.push({ type: 'chargeLost', player: target.id, cards, attack });
        } else {
          events.push({ type: 'chargeHeld', player: target.id, attack });
        }
      }
      return;
    }
  }
}

function eliminate(state: GameState, p: Player, events: GameEvent[]): void {
  const discarded = [...p.life, ...(p.shield ? [p.shield] : []), ...p.charge];
  state.discard.push(...discarded);
  p.life = [];
  p.shield = null;
  p.charge = [];
  p.eliminated = true;
  events.push({ type: 'eliminated', player: p.id, discarded });
}

function endTurn(state: GameState, events: GameEvent[]): void {
  const alive = state.players.filter((p) => !p.eliminated);
  if (alive.length <= 1) {
    state.phase = 'over';
    state.winner = alive[0]?.id ?? null;
    if (state.winner) events.push({ type: 'gameOver', winner: state.winner });
    return;
  }
  const n = state.players.length;
  let i = state.current;
  do i = (i + 1) % n;
  while (state.players[i]!.eliminated);
  state.current = i;
  state.turn++;
  state.phase = 'action';
  events.push({ type: 'turnStart', player: state.players[i]!.id, turn: state.turn });
}
