#!/usr/bin/env node
/**
 * Downloads every recorded game (the RL dataset) from the Vercel Blob store into a folder.
 *
 *   BLOB_READ_WRITE_TOKEN=... node tools/download-games.mjs [out-dir=dataset]
 *
 * Files already downloaded are skipped. See docs/DATASET.md for the format.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { get, list } from '@vercel/blob';

const out = process.argv[2] ?? 'dataset';
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Set BLOB_READ_WRITE_TOKEN (Vercel dashboard, Storage, shield-games, .env.local).');
  process.exit(1);
}

let cursor;
let fetched = 0;
let skipped = 0;
do {
  const page = await list({ prefix: 'games/', cursor, limit: 1000 });
  for (const blob of page.blobs) {
    const file = join(out, blob.pathname);
    try {
      await access(file);
      skipped++;
      continue;
    } catch {
      // Not downloaded yet.
    }
    const res = await get(blob.pathname, { access: 'private' });
    const text = await new Response(res.stream).text();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text);
    fetched++;
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);
console.log(`${fetched} new game(s) in ${out}/games, ${skipped} already there.`);
