import { isHidden, type GameView, type PlayerView } from './view';
import type { Command } from './types';

/** Average card value (1..13). Hidden shields and future draws are estimated with it. */
const EXPECTED = 7;

function estimatedShield(p: PlayerView): number {
  return p.shield && !isHidden(p.shield) ? p.shield.rank : EXPECTED;
}

/**
 * A simple computer opponent. It sees only the public view, exactly like a human:
 * no hidden shields, no charge contents, no upcoming card.
 */
export function chooseBotCommand(view: GameView, legal: Command[], random: () => number = Math.random): Command {
  if (legal.length === 0) throw new Error('Bot has no legal command');
  const me = view.players.find((p) => p.id === view.viewer)!;

  // At exactly 1 HP the offer is visible: keep anything better than 1.
  if (view.phase === 'lifeOffer') {
    const accept = (view.lifeOffer?.rank ?? 0) > me.hp;
    return { type: accept ? 'acceptLife' : 'declineLife' };
  }

  // Below 5 HP a blind draw averages 7, so replacing life is worth it.
  const swap = legal.find((c) => c.type === 'lifeSwap');
  if (swap && (me.hp <= 3 || random() < 0.7)) return swap;

  const byId = new Map(view.players.map((p) => [p.id, p]));
  const expectedAttack = EXPECTED * (me.chargeCount + 1);

  let best: Command = legal[0]!;
  let bestScore = -Infinity;
  for (const cmd of legal) {
    if (cmd.type !== 'act') continue;
    const a = cmd.action;
    let score = 0;
    switch (a.type) {
      case 'attack': {
        const t = byId.get(a.target)!;
        const dmg = Math.max(0, expectedAttack - estimatedShield(t));
        score = dmg + (dmg >= t.hp ? 8 : 0) + (26 - t.hp) * 0.08;
        break;
      }
      case 'charge': {
        // Any hit that gets through loses the whole charge, so a bigger pile is a bigger bet.
        // Charge less when already holding cards, when our shield is weak or known, and at busy tables.
        const mine = me.shield && !isHidden(me.shield) ? me.shield.rank : EXPECTED;
        const opponents = view.players.filter((p) => !p.eliminated && p.id !== me.id).length;
        score = 3.4 - me.chargeCount * 1.5 - (mine < EXPECTED ? 1.2 : 0) - (opponents >= 3 ? 0.6 : 0);
        break;
      }
      case 'shieldSelf': {
        // A weak revealed shield exposes us; it matters more when it protects a charge.
        const mine = me.shield && !isHidden(me.shield) ? me.shield.rank : EXPECTED;
        score = (EXPECTED - mine) * 0.9 + (me.hp < 8 ? 1 : 0) + (mine < EXPECTED ? me.chargeCount * 0.8 : 0);
        break;
      }
      case 'shieldOther': {
        const t = byId.get(a.target)!;
        score = t.shield && !isHidden(t.shield) ? (t.shield.rank - EXPECTED) * 0.8 : -1;
        break;
      }
      case 'pass':
        score = -5;
        break;
    }
    score += random() * 1.5;
    if (score > bestScore) {
      bestScore = score;
      best = cmd;
    }
  }
  return best;
}
