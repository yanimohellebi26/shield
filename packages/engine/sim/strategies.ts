import { chooseBotCommand } from '../src/bot';
import { legacyBotCommand } from './legacyBot';
import { isHidden, type GameView } from '../src/view';
import type { Command } from '../src/types';

/** A strategy picks a command from what one player is allowed to see. */
export type Strategy = (view: GameView, legal: Command[], random: () => number) => Command;

const acts = (legal: Command[], type: string) => legal.filter((c) => c.type === 'act' && c.action.type === type);
const pick = <T>(xs: T[], r: () => number) => xs[Math.floor(r() * xs.length)]!;
const me = (v: GameView) => v.players.find((p) => p.id === v.viewer)!;
const known = (v: GameView, id: string) => {
  const s = v.players.find((p) => p.id === id)!.shield;
  return s && !isHidden(s) ? s.rank : 7;
};
const lifeDecisions = (v: GameView, legal: Command[]): Command | null => {
  if (v.phase === 'lifeOffer') return { type: (v.lifeOffer?.rank ?? 0) > me(v).hp ? 'acceptLife' : 'declineLife' };
  return legal.find((c) => c.type === 'lifeSwap') ?? null;
};
/** Attack the opponent with the weakest known/assumed shield, ties broken by lowest HP. */
const bestAttack = (v: GameView, legal: Command[]): Command | null => {
  const options = acts(legal, 'attack');
  if (!options.length) return null;
  return options.sort((a, b) => {
    const ta = (a as { action: { target: string } }).action.target;
    const tb = (b as { action: { target: string } }).action.target;
    const pa = v.players.find((p) => p.id === ta)!;
    const pb = v.players.find((p) => p.id === tb)!;
    return known(v, ta) - known(v, tb) || pa.hp - pb.hp;
  })[0]!;
};

/** Builds a charge of `k` cards (or as many as allowed), then attacks. */
function chargeThen(k: number): Strategy {
  return (v, legal) => {
    const life = lifeDecisions(v, legal);
    if (life) return life;
    if (me(v).chargeCount < k && acts(legal, 'charge').length) return acts(legal, 'charge')[0]!;
    return bestAttack(v, legal) ?? acts(legal, 'charge')[0] ?? legal[0]!;
  };
}

export const STRATEGIES: Record<string, Strategy> = {
  /** The shipped bot. */
  smart: chooseBotCommand,
  /** The bot as it was before the charge rule changed. */
  legacy: legacyBotCommand,
  /** Any legal move. */
  random: (v, legal, r) => (v.phase === 'lifeOffer' ? pick(legal, r) : pick(legal, r)),
  /** Never charges: attacks every turn. */
  aggressive: (v, legal) => lifeDecisions(v, legal) ?? bestAttack(v, legal) ?? legal[0]!,
  charge1: chargeThen(1),
  charge2: chargeThen(2),
  charge3: chargeThen(3),
  charge4: chargeThen(4),
  /** Fixes a weak revealed shield first, sabotages strong enemy shields, otherwise attacks. */
  defender: (v, legal) => {
    const life = lifeDecisions(v, legal);
    if (life) return life;
    const mine = me(v).shield;
    if (mine && !isHidden(mine) && mine.rank <= 6 && acts(legal, 'shieldSelf').length) return acts(legal, 'shieldSelf')[0]!;
    const strong = acts(legal, 'shieldOther').find((c) => known(v, (c as { action: { target: string } }).action.target) >= 11);
    if (strong) return strong;
    return bestAttack(v, legal) ?? legal[0]!;
  },
};
