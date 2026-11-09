import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { put } from '@vercel/blob';
import type { GameRecord } from '@shield/engine';

/**
 * Where finished games go (the dataset, see docs/DATASET.md):
 * - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production): games/YYYY-MM-DD/<id>.json, private.
 * - a local folder when GAME_LOG_DIR is set (development).
 * - nowhere otherwise (tests).
 */
export async function saveRecord(rec: GameRecord): Promise<void> {
  const day = rec.startedAt.slice(0, 10);
  const name = `games/${day}/${rec.id}.json`;
  const body = JSON.stringify(rec);
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await put(name, body, { access: 'private', contentType: 'application/json', addRandomSuffix: false });
    } else if (process.env.GAME_LOG_DIR) {
      const dir = join(process.env.GAME_LOG_DIR, 'games', day);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${rec.id}.json`), body);
    } else {
      return;
    }
    console.log(`saved ${name} (${rec.source}, ${rec.moves.length} moves)`);
  } catch (err) {
    console.error(`could not save ${name}:`, err instanceof Error ? err.message : err);
  }
}
