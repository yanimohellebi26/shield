import * as THREE from 'three';
import { rankLabel, type Card } from '@shield/engine';
import { ICON_PATHS } from '../ui/iconPaths';

/**
 * Card art. Faces come from Adrian Kennard's CC0 deck (public/cards, see CREDITS.md),
 * rasterised once per card with a SHIELD value medallion. Backs are drawn here.
 */
const W = 768;
const H = Math.round(768 * (336 / 240));
const R = 50;

const RANK_FILE: Record<number, string> = { 1: 'A', 10: 'T', 11: 'J', 12: 'Q', 13: 'K' };
const art = new Map<string, HTMLImageElement>();

/** URL of a card's face artwork. */
export function cardUrl(card: Card): string {
  return `${import.meta.env.BASE_URL}cards/${RANK_FILE[card.rank] ?? card.rank}${card.suit}.svg`;
}

/** Loads all 52 faces; call before the first frame. Falls back to drawn faces on failure. */
export function preloadCardArt(): Promise<void> {
  const loads: Promise<void>[] = [];
  for (const suit of ['S', 'H', 'D', 'C']) {
    for (let rank = 1; rank <= 13; rank++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `${import.meta.env.BASE_URL}cards/${RANK_FILE[rank] ?? rank}${suit}.svg`;
      loads.push(
        img
          .decode()
          .then(() => void art.set(`${suit}${rank}`, img))
          .catch(() => undefined),
      );
    }
  }
  return Promise.all(loads).then(() => undefined);
}

/** Gold coin with the card's SHIELD value, in the empty top-right and bottom-left corners. */
function medallion(ctx: CanvasRenderingContext2D, rank: number) {
  const r = W * 0.072;
  const draw = () => {
    const x = W * 0.885;
    const y = H * 0.075;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#f6e2a8');
    g.addColorStop(0.55, '#d6a849');
    g.addColorStop(1, '#8a6224');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = r * 0.12;
    ctx.strokeStyle = '#6b4a18';
    ctx.stroke();
    ctx.fillStyle = '#2a1a06';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(r * (rank >= 10 ? 0.95 : 1.15))}px "Alegreya SC", Georgia, serif`;
    ctx.fillText(String(rank), x, y + r * 0.08);
  };
  draw();
  ctx.save();
  ctx.translate(W, H);
  ctx.rotate(Math.PI);
  draw();
  ctx.restore();
}

const cache = new Map<string, THREE.CanvasTexture>();

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return [c, c.getContext('2d')!];
}

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' } as const;
const RED = '#b0172a';
const INK = '#17181f';
const GOLD = '#b8893a';

export function faceTexture(card: Card): THREE.CanvasTexture {
  const key = `${card.suit}${card.rank}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const img = art.get(key);
  if (img) {
    const [c, ctx] = canvas();
    rounded(ctx, 0, 0, W, H, R);
    ctx.clip();
    ctx.drawImage(img, 0, 0, W, H);
    medallion(ctx, card.rank);
    const t = toTexture(c);
    cache.set(key, t);
    return t;
  }

  const [c, ctx] = canvas();
  const color = card.suit === 'H' || card.suit === 'D' ? RED : INK;
  const glyph = SUIT_GLYPH[card.suit];
  const label = rankLabel(card.rank);

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#fbf6ea');
  bg.addColorStop(1, '#ece0c4');
  ctx.fillStyle = bg;
  rounded(ctx, 0, 0, W, H, R);
  ctx.fill();

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  rounded(ctx, 22, 22, W - 44, H - 44, R - 12);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  rounded(ctx, 32, 32, W - 64, H - 64, R - 18);
  ctx.stroke();

  // Corner indices.
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const corner = () => {
    ctx.font = '800 92px "Alegreya SC", Georgia, serif';
    ctx.fillText(label, 88, 104);
    ctx.font = '64px serif';
    ctx.fillText(glyph, 88, 178);
  };
  corner();
  ctx.save();
  ctx.translate(W, H);
  ctx.rotate(Math.PI);
  corner();
  ctx.restore();

  // Centre: the value, which is what the game cares about.
  const cx = W / 2;
  const cy = H / 2;
  ctx.globalAlpha = 0.1;
  ctx.font = '440px serif';
  ctx.fillText(glyph, cx, cy + 20);
  ctx.globalAlpha = 1;
  if (card.rank >= 11 || card.rank === 1) {
    ctx.font = '800 230px "Alegreya SC", Georgia, serif';
    ctx.fillText(label, cx, cy - 10);
  } else {
    ctx.font = '170px serif';
    ctx.fillText(glyph, cx, cy - 70);
    ctx.font = '800 150px "Alegreya SC", Georgia, serif';
    ctx.fillText(label, cx, cy + 95);
  }

  // Value plate.
  ctx.fillStyle = color;
  rounded(ctx, cx - 74, H - 168, 148, 56, 28);
  ctx.fill();
  ctx.fillStyle = '#fbf6ea';
  ctx.font = '800 38px Inter, sans-serif';
  ctx.fillText(`${card.rank}`, cx, H - 139);

  const t = toTexture(c);
  cache.set(key, t);
  return t;
}

let back: THREE.CanvasTexture | null = null;

const BW = 512;
const BH = Math.round(512 * (336 / 240));
const BR = 34;

export function backTexture(): THREE.CanvasTexture {
  if (back) return back;
  const [c, ctx] = canvas();
  // Drawn in a 512-wide design space, scaled to the texture size.
  ctx.scale(W / BW, H / BH);
  const g = ctx.createRadialGradient(BW / 2, BH / 2, 40, BW / 2, BH / 2, BH * 0.7);
  g.addColorStop(0, '#1d3b6e');
  g.addColorStop(1, '#0a1630');
  ctx.fillStyle = g;
  rounded(ctx, 0, 0, BW, BH, BR);
  ctx.fill();

  // Lattice.
  ctx.save();
  rounded(ctx, 36, 36, BW - 72, BH - 72, BR - 16);
  ctx.clip();
  ctx.strokeStyle = 'rgba(214,170,90,0.22)';
  ctx.lineWidth = 2;
  for (let i = -BH; i < BW + BH; i += 34) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + BH, BH);
    ctx.moveTo(i, BH);
    ctx.lineTo(i + BH, 0);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = '#d6aa5a';
  ctx.lineWidth = 5;
  rounded(ctx, 22, 22, BW - 44, BH - 44, BR - 12);
  ctx.stroke();
  ctx.lineWidth = 2;
  rounded(ctx, 36, 36, BW - 72, BH - 72, BR - 16);
  ctx.stroke();

  // Shield emblem.
  const cx = BW / 2;
  const cy = BH / 2 - 10;
  const shield = (s: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 150 * s);
    ctx.bezierCurveTo(cx + 70 * s, cy - 110 * s, cx + 120 * s, cy - 120 * s, cx + 130 * s, cy - 125 * s);
    ctx.bezierCurveTo(cx + 135 * s, cy + 10 * s, cx + 100 * s, cy + 120 * s, cx, cy + 175 * s);
    ctx.bezierCurveTo(cx - 100 * s, cy + 120 * s, cx - 135 * s, cy + 10 * s, cx - 130 * s, cy - 125 * s);
    ctx.bezierCurveTo(cx - 120 * s, cy - 120 * s, cx - 70 * s, cy - 110 * s, cx, cy - 150 * s);
    ctx.closePath();
  };
  shield(1);
  const sg = ctx.createLinearGradient(cx - 130, cy - 150, cx + 130, cy + 175);
  sg.addColorStop(0, '#f2d38f');
  sg.addColorStop(0.5, '#b8893a');
  sg.addColorStop(1, '#7a5520');
  ctx.fillStyle = sg;
  ctx.fill();
  shield(0.82);
  ctx.fillStyle = '#0f2148';
  ctx.fill();
  ctx.fillStyle = '#d6aa5a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 120px "Alegreya SC", Georgia, serif';
  ctx.fillText('S', cx, cy + 12);
  ctx.font = '800 40px "Alegreya SC", Georgia, serif';
  ctx.fillText('S BH I E L D', cx, BH - 92);

  back = toTexture(c);
  return back;
}

const matCache = new Map<string, THREE.CanvasTexture>();

/** Mats under each seat slot: a dashed outline and an icon, so life, shield and charge read without words. */
export function matTexture(icon: keyof typeof ICON_PATHS, tint: string): THREE.CanvasTexture {
  const key = icon + tint;
  const hit = matCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 340;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 5;
  ctx.setLineDash([16, 10]);
  ctx.beginPath();
  ctx.roundRect(10, 10, 236, 320, 18);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = tint;
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.save();
  ctx.translate(128 - 48, 170 - 48);
  ctx.scale(96 / 512, 96 / 512);
  ctx.fill(new Path2D(ICON_PATHS[icon]));
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  matCache.set(key, t);
  return t;
}

/** Felt with a soft vignette and a faint central crest. */
export function feltTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(512, 320, 40, 512, 320, 620);
  g.addColorStop(0, '#1f5a4c');
  g.addColorStop(0.6, '#123d34');
  g.addColorStop(1, '#0a2420');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 640);
  const img = ctx.getImageData(0, 0, 1024, 640);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] = img.data[i]! + n;
    img.data[i + 1] = img.data[i + 1]! + n;
    img.data[i + 2] = img.data[i + 2]! + n;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(214,170,90,0.18)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(512, 320, 230, 140, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(512, 320, 380, 236, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Embroidered crest, faint, between the deck and the discard pile.
  ctx.save();
  ctx.translate(512, 300);
  ctx.globalAlpha = 0.16;
  const sh = (s: number) => {
    ctx.beginPath();
    ctx.moveTo(0, -70 * s);
    ctx.bezierCurveTo(33 * s, -52 * s, 56 * s, -56 * s, 61 * s, -59 * s);
    ctx.bezierCurveTo(63 * s, 5 * s, 47 * s, 56 * s, 0, 82 * s);
    ctx.bezierCurveTo(-47 * s, 56 * s, -63 * s, 5 * s, -61 * s, -59 * s);
    ctx.bezierCurveTo(-56 * s, -56 * s, -33 * s, -52 * s, 0, -70 * s);
    ctx.closePath();
  };
  ctx.strokeStyle = '#d6aa5a';
  ctx.lineWidth = 3;
  sh(0.75);
  ctx.stroke();
  sh(0.62);
  ctx.stroke();
  ctx.fillStyle = '#d6aa5a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 54px "Alegreya SC", Georgia, serif';
  ctx.fillText('S', 0, 4);
  ctx.font = '800 22px "Alegreya SC", Georgia, serif';
  ctx.fillText('S  H  I  E  L  D', 0, 104);
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Lacquered wood grain for the table rim. */
export function woodTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#5a2f17');
  g.addColorStop(0.5, '#3e1f0e');
  g.addColorStop(1, '#2a1408');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * 256;
    const amp = 2 + Math.random() * 8;
    const freq = 0.004 + Math.random() * 0.01;
    const phase = Math.random() * 10;
    ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? '20,8,2' : '120,62,28'},${0.08 + Math.random() * 0.18})`;
    ctx.lineWidth = 0.6 + Math.random() * 2.2;
    ctx.beginPath();
    for (let x = 0; x <= 1024; x += 8) ctx.lineTo(x, y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1) * amp * 0.3);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  t.anisotropy = 8;
  return t;
}

/** Fine grain noise used as a bump map (felt fibres, leather pores). */
export function noiseTexture(size = 256, strength = 60): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * strength;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(12, 8);
  return t;
}
