/**
 * World-space layout, shared by the static table and the animations.
 *
 * Landscape: every seat sits around a wide oval table (Figma "04 Desktop").
 * Portrait (phones): opponents become compact DOM tiles pinned to a grid of anchor points at the
 * top, the felt becomes a central arena, and the local seat is large at the bottom (Figma "05 Phone").
 * Cards still fly to and from each opponent's anchor, so animations land on the right tile.
 */
export type Vec3 = [number, number, number];

/** Poker-card proportions (2.5 × 3.5 in), matching the face artwork. */
export const CARD_W = 0.714;
export const CARD_H = 1.0;

let portrait = false;
export function setPortrait(p: boolean) {
  portrait = p;
}
export function isPortrait() {
  return portrait;
}

/** Landscape oval radii. */
export const TABLE_RADII: [number, number] = [9.4, 5.7];
/** Portrait arena: a rounded felt rectangle. */
export const ARENA = { w: 8.7, d: 4.6, z: -2.55, r: 1.0 };

export const deckPos = (): Vec3 => (portrait ? [-3.1, 0, ARENA.z + 1.3] : [-0.9, 0, -0.1]);
export const discardPos = (): Vec3 => (portrait ? [3.1, 0, ARENA.z + 1.3] : [0.9, 0, -0.1]);
/** Where a 1 HP offer is shown, large, in front of the camera. */
export const offerPos = (): Vec3 => (portrait ? [0, 4, ARENA.z + 0.4] : [0, 4.2, 3.4]);

export type Slot = 'life0' | 'life1' | 'shield' | 'charge';
const SLOT_X: Record<Slot, number> = { life0: -1.42, life1: -0.64, shield: 0.38, charge: 1.5 };

export interface SeatLayout {
  pos: Vec3;
  scale: number;
  /** 0 for the local player, nearest the camera. */
  rel: number;
  /** Portrait opponents are drawn as DOM tiles, not 3D cards. */
  tile: boolean;
}

/** Portrait opponent grid: 3 columns, filled row by row from the top. */
const GRID_X = [-3.05, 0, 3.05];
const GRID_Z = [-9.9, -7.9, -5.9];

export function seatLayouts(n: number, localIndex: number): SeatLayout[] {
  return Array.from({ length: n }, (_, i) => {
    const rel = (i - localIndex + n) % n;
    const local = rel === 0;
    if (portrait) {
      if (local) return { pos: [0, 0, 1.55], scale: 1.8, rel, tile: false };
      const k = rel - 1;
      return { pos: [GRID_X[k % 3]!, 0, GRID_Z[Math.floor(k / 3)]!], scale: 0.55, rel, tile: true };
    }
    const theta = Math.PI / 2 + (2 * Math.PI * rel) / n;
    const scale = local ? 1.22 : n <= 4 ? 1.12 : n <= 6 ? 1.02 : 0.94;
    return { pos: [7.0 * Math.cos(theta), 0, (local ? 4.25 : 4.0) * Math.sin(theta)], scale, rel, tile: false };
  });
}

/** Where a seat's card sits. Tiles collapse every slot onto the tile itself. */
export function slotPos(seat: SeatLayout, slot: Slot, stack = 0): Vec3 {
  const [x, , z] = seat.pos;
  if (seat.tile) return [x + SLOT_X[slot] * 0.25, 0.4 + stack * 0.014, z];
  return [x + SLOT_X[slot] * seat.scale, 0.012 + stack * 0.014, z];
}

/** A point above the table where drawn cards are presented to everyone. */
export function hoverPos(seat: SeatLayout, offsetX = 0): Vec3 {
  if (portrait) return [offsetX, 3.0, ARENA.z + 0.3];
  const [x, , z] = seat.pos;
  return [x * 0.55 + offsetX, 3.0, z * 0.55 + 1.2];
}

/** Where a popup about a seat appears: above a table seat, or just below a phone tile. */
export function popupPos(seat: SeatLayout, slot?: Slot): Vec3 {
  if (seat.tile) return [seat.pos[0], 0.6, seat.pos[2] + 1.15];
  const [x, , z] = slot ? slotPos(seat, slot) : seat.pos;
  return [x, slot ? 1.1 : 1.3, z];
}

/** Scale of cards presented in the air (attack reveal, life draws). */
export const presentScale = () => (portrait ? 1.9 : 1.6);

export function lift([x, y, z]: Vec3, dy: number): Vec3 {
  return [x, y + dy, z];
}

/** Charge piles lie sideways so they can never be mistaken for the (single) shield. */
export const CHARGE_SPIN = Math.PI / 2;

/** Rotations for a card group: tilt is rotation about X (flat = −π/2), flip about local Y (0 = face up). */
export const FLAT = -Math.PI / 2;
export const PRESENT = -0.55;
export const FACE_UP = 0;
export const FACE_DOWN = Math.PI;
