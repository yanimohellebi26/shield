import { apply, createGame } from './engine';
import type { Command, GameState, RuleOptions } from './types';

/**
 * A complete game, as a dataset entry: enough to replay it move by move with the engine
 * (createGame with the same seed and players, then apply each move in order).
 *
 * Saved for every game with at least one human (online by the server, local ones sent by the
 * browser). See docs/DATASET.md.
 */
export interface GameRecord {
  /** Format version. */
  v: 1;
  id: string;
  source: 'online' | 'local';
  startedAt: string;
  endedAt: string | null;
  seed: number;
  rules?: Partial<RuleOptions>;
  players: { id: string; name: string; kind: 'human' | 'bot' }[];
  /**
   * Every command in order. `by`: 'human' (a person chose it), 'bot' (a computer seat),
   * 'auto' (the bot played for a human who was away or out of time). `ms`: time since start.
   */
  moves: { player: string; cmd: Command; by: 'human' | 'bot' | 'auto'; ms: number }[];
  winner: string | null;
  /** False when the table closed before the end. */
  finished: boolean;
}

export function newRecord(source: GameRecord['source'], state: GameState, seed: number, players: GameRecord['players']): GameRecord {
  return {
    v: 1,
    id: `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`,
    source,
    startedAt: new Date().toISOString(),
    endedAt: null,
    seed,
    ...(state.rules ? { rules: state.rules } : {}),
    players,
    moves: [],
    winner: null,
    finished: false,
  };
}

/**
 * Replays a record with the engine. Returns the final state, or an error if any move is illegal
 * or the stated winner does not match: this is how untrusted records are checked.
 */
export function replayRecord(rec: GameRecord): { ok: true; state: GameState } | { ok: false; error: string } {
  try {
    if (rec.v !== 1 || !Array.isArray(rec.players) || !Array.isArray(rec.moves)) return { ok: false, error: 'bad format' };
    let state = createGame({ players: rec.players.map(({ id, name }) => ({ id, name })), seed: rec.seed, rules: rec.rules });
    for (const m of rec.moves) state = apply(state, m.player, m.cmd).state;
    if (rec.finished && (state.phase !== 'over' || state.winner !== rec.winner)) return { ok: false, error: 'result does not match' };
    return { ok: true, state };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
