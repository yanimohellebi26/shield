// Imports Adrian Kennard's CC0 SVG playing cards (https://www.me.uk/cards/) into the web app,
// recoloured to the SHIELD palette.
// Usage: node tools/import-cards.mjs <unzipped-deck-dir> <output-dir>
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error('usage: import-cards.mjs <src> <out>');

const PALETTE = {
  white: '#fbf6ea', // paper
  red: '#b0172a', // crimson
  black: '#17181f', // ink
  '#44F': '#2c4a8c', // royal blue in the court cards
  '#FC4': '#d6a849', // gold in the court cards
};

const recolour = (svg) =>
  svg.replace(/(fill|stroke)="([^"]+)"/g, (m, attr, colour) => (colour in PALETTE ? `${attr}="${PALETTE[colour]}"` : m));

mkdirSync(out, { recursive: true });
const files = readdirSync(src).filter((f) => /^[2-9TJQKA][SHDC]\.svg$/.test(f));
if (files.length !== 52) throw new Error(`expected 52 faces, found ${files.length}`);
for (const f of files) {
  let svg = readFileSync(join(src, f), 'utf8');
  if (/<script|javascript:|\son\w+=/i.test(svg)) throw new Error(`refusing ${f}: contains script`);
  svg = svg.replace(/<text[^>]*>cards\.revk\.uk<\/text>/g, '');
  svg = recolour(svg);
  writeFileSync(join(out, f), svg);
}
console.log(`imported ${files.length} cards into ${out}`);
