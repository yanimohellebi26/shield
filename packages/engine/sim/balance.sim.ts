import { it } from 'vitest';
import { apply, createGame, legalCommands } from '../src/engine';
import { viewFor } from '../src/view';
import type { GameEvent, RuleOptions } from '../src/types';
import { STRATEGIES, type Strategy } from './strategies';

interface GameResult {
  turns: number;
  winnerSeatFromFirst: number;
  winnerStrategy: string;
  actions: Record<string, number>;
  attacks: number;
  blocked: number;
  damage: number;
  chargeLost: number;
  chargeHeld: number;
  lifeSwaps: number;
  reshuffles: number;
  stalled: boolean;
}

function lcg(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

function play(n: number, seats: string[], seed: number, rules: Partial<RuleOptions> = {}): GameResult {
  const players = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  let s = createGame({ players, seed, rules });
  const first = s.current;
  const r = lcg(seed * 7 + 3);
  const res: GameResult = { turns: 0, winnerSeatFromFirst: -1, winnerStrategy: '', actions: {}, attacks: 0, blocked: 0, damage: 0, chargeLost: 0, chargeHeld: 0, lifeSwaps: 0, reshuffles: 0, stalled: false };
  for (let step = 0; step < 5000 && s.phase !== 'over'; step++) {
    const i = s.current;
    const id = s.players[i]!.id;
    const strat: Strategy = STRATEGIES[seats[i]!]!;
    const cmd = strat(viewFor(s, id), legalCommands(s, id), r);
    if (cmd.type === 'act') res.actions[cmd.action.type] = (res.actions[cmd.action.type] ?? 0) + 1;
    if (cmd.type === 'lifeSwap') res.lifeSwaps++;
    const out = apply(s, id, cmd);
    s = out.state;
    for (const e of out.events as GameEvent[]) {
      if (e.type === 'attack') {
        res.attacks++;
        res.damage += e.damage;
        if (e.damage === 0) res.blocked++;
      } else if (e.type === 'chargeLost') res.chargeLost++;
      else if (e.type === 'chargeHeld') res.chargeHeld++;
      else if (e.type === 'reshuffle') res.reshuffles++;
    }
  }
  res.turns = s.turn;
  res.stalled = s.phase !== 'over';
  if (s.winner) {
    const w = s.players.findIndex((p) => p.id === s.winner);
    res.winnerSeatFromFirst = (w - first + n) % n;
    res.winnerStrategy = seats[w]!;
  }
  return res;
}

const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * p)]!;

const VARIANTS: [string, Partial<RuleOptions>][] = [
  ['standard', {}],
  ['charge max 3', { maxCharge: 3 }],
  ['charge max 2', { maxCharge: 2 }],
  ['charge lost on any hit', { chargeLoss: 'anyDamage' }],
  ['max 3 + lost on any hit', { maxCharge: 3, chargeLoss: 'anyDamage' }],
  ['no attack on turn 1', { noAttackFirstTurn: true }],
  ['2p: second player starts with 1 charge', { secondPlayerCharge: true }],
  ['lost on any hit + 2p second-player charge', { chargeLoss: 'anyDamage', secondPlayerCharge: true }],
  ['2p hp+2', { secondPlayerHp: 2 }],
  ['2p hp+3', { secondPlayerHp: 3 }],
  ['2p hp+4', { secondPlayerHp: 4 }],
  ['lost on any hit + 2p hp+3', { chargeLoss: 'anyDamage', secondPlayerHp: 3 }],
];
const ONLY = process.env.ONLY;
const CHALLENGERS = ['legacy', 'random', 'aggressive', 'charge1', 'charge2', 'charge3', 'charge4', 'defender'];

it('balance report', () => {
  const GAMES = Number(process.env.GAMES ?? 1000);
  const out: string[] = [];
  for (const [label, rules] of VARIANTS.filter(([l]) => !ONLY || l.includes(ONLY))) {
    out.push(`\n### ${label}`);
    // Pace, fairness and action mix with smart bots everywhere.
    const pace: string[] = [];
    for (const n of [2, 4, 8]) {
      const rs = Array.from({ length: GAMES }, (_, g) => play(n, Array(n).fill('smart'), 1000 + g, rules));
      const turns = rs.map((x) => x.turns);
      const firstWins = rs.filter((x) => x.winnerSeatFromFirst === 0).length / GAMES;
      const acts: Record<string, number> = {};
      rs.forEach((x) => Object.entries(x.actions).forEach(([k, v]) => (acts[k] = (acts[k] ?? 0) + v)));
      const tot = Object.values(acts).reduce((a, b) => a + b, 0);
      const sh = ((acts.shieldSelf ?? 0) + (acts.shieldOther ?? 0)) / tot;
      const stalled = rs.filter((x) => x.stalled).length;
      pace.push(
        `${n}p: ${(q(turns, 0.5) / n).toFixed(1)} rounds (p90 ${(q(turns, 0.9) / n).toFixed(1)}), first player ${pct(firstWins)} vs ${pct(1 / n)}, charge ${pct((acts.charge ?? 0) / tot)} / attack ${pct((acts.attack ?? 0) / tot)} / shields ${pct(sh)}${stalled ? `, STALLED ${stalled}` : ''}`,
      );
    }
    out.push(...pace.map((l) => `- ${l}`));
    // Strategy depth: each challenger alone against smart bots.
    const row = (n: number) =>
      CHALLENGERS.map((name) => {
        let wins = 0;
        for (let g = 0; g < GAMES; g++) {
          const seat = g % n;
          const seats = Array.from({ length: n }, (_, i) => (i === seat ? name : 'smart'));
          if (play(n, seats, 50_000 + g, rules).winnerStrategy === name) wins++;
        }
        return `${name} ${pct(wins / GAMES)}`;
      }).join(' · ');
    out.push(`- vs smart, 2p (fair 50%): ${row(2)}`);
    out.push(`- vs smart, 4p (fair 25%): ${row(4)}`);
  }
  console.log(out.join('\n') + '\n');
});
