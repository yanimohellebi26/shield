import { useMemo } from 'react';
import * as THREE from 'three';
import { ARENA, CARD_H, CARD_W, deckPos, discardPos, FLAT, TABLE_RADII } from '../game/layout';
import { useGame } from '../game/store';
import { Card3D } from './Card3D';
import { feltTexture, noiseTexture, woodTexture } from './textures';

function ellipseShape(rx: number, rz: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
  return s;
}

/** Rounded rectangle centred on the origin (shape space: x right, y = −z). */
function roundedRect(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Outline of the playing surface grown (or shrunk) by `grow`, for the current orientation. */
function outline(portrait: boolean, grow: number): THREE.Shape {
  if (portrait) {
    const { w, d, r } = ARENA;
    return roundedRect(w + 2 * grow, d + 2 * grow, Math.max(0.05, r + grow));
  }
  const [rx, rz] = TABLE_RADII;
  return ellipseShape(rx + grow, rz + grow);
}

/** A flat band between two outlines (outer grow, inner grow). */
function band(portrait: boolean, outerGrow: number, innerGrow: number): THREE.Shape {
  const s = outline(portrait, outerGrow);
  s.holes.push(new THREE.Path(outline(portrait, innerGrow).getPoints(160).reverse()));
  return s;
}

/**
 * The table: embroidered felt, a brass inlay at the felt edge, a padded leather rail and a
 * lacquered wooden rim, standing over a dark floor.
 */
export function TableSurface() {
  const portrait = useGame((s) => s.portrait);
  const felt = useMemo(() => feltTexture(), []);
  const wood = useMemo(() => woodTexture(), []);
  const feltBump = useMemo(() => noiseTexture(256, 90), []);
  const leatherBump = useMemo(() => {
    const t = noiseTexture(128, 70);
    t.repeat.set(40, 4);
    return t;
  }, []);
  const geos = useMemo(() => {
    const w = portrait ? ARENA.w : 2 * TABLE_RADII[0];
    const d = portrait ? ARENA.d : 2 * TABLE_RADII[1];
    const feltGeo = new THREE.ShapeGeometry(outline(portrait, 0), 128);
    const pos = feltGeo.attributes.position!;
    const uv = feltGeo.attributes.uv!;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / d + 0.5);
    const extrude = (shape: THREE.Shape, depth: number, bevel: number) =>
      new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 160 });
    return {
      feltGeo,
      brass: new THREE.ShapeGeometry(band(portrait, -0.1, -0.16), 128),
      rail: extrude(band(portrait, 0.55, 0.12), 0.06, 0.12),
      wood: extrude(band(portrait, 0.95, 0.05), 0.22, 0.08),
    };
  }, [portrait]);
  const z = portrait ? ARENA.z : 0;

  return (
    <group position-z={z}>
      <mesh geometry={geos.feltGeo} rotation-x={-Math.PI / 2} receiveShadow>
        <meshStandardMaterial map={felt} bumpMap={feltBump} bumpScale={0.6} roughness={0.96} />
      </mesh>
      <mesh geometry={geos.brass} rotation-x={-Math.PI / 2} position-y={0.004}>
        <meshStandardMaterial color="#c9a14e" metalness={1} roughness={0.28} emissive="#3a2a0c" />
      </mesh>
      <mesh geometry={geos.wood} rotation-x={-Math.PI / 2} position-y={-0.18} castShadow receiveShadow>
        <meshPhysicalMaterial map={wood} color="#b07a52" roughness={0.38} clearcoat={1} clearcoatRoughness={0.12} />
      </mesh>
      <mesh geometry={geos.rail} rotation-x={-Math.PI / 2} position-y={0.02} castShadow receiveShadow>
        <meshPhysicalMaterial color="#2a130b" roughness={0.78} bumpMap={leatherBump} bumpScale={0.4} sheen={0.6} sheenColor="#6b3a22" sheenRoughness={0.5} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.6} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#07090d" roughness={1} />
      </mesh>
    </group>
  );
}

/** Deck in the centre (left) and face-up discard pile (right). */
export function Piles() {
  useGame((s) => s.portrait);
  const DECK_POS = deckPos();
  const DISCARD_POS = discardPos();
  const shown = useGame((s) => s.shown);
  const ov = useGame((s) => s.ov);
  if (!shown) return null;
  const deckCount = Math.max(0, shown.deckCount + ov.deckDelta);
  const discardCount = ov.discardCount ?? shown.discard.length;
  const top = ov.discardTop ?? shown.discard[shown.discard.length - 1] ?? null;
  const deckLayers = Math.min(deckCount, 26);
  const deckH = Math.max(0.012, deckLayers * 0.012);
  const discardH = Math.min(discardCount, 30) * 0.004;

  return (
    <group>
      {deckLayers > 0 && (
        <group position={[DECK_POS[0], 0, DECK_POS[2]]}>
          {/* The stack's edges as one block, with a real card on top: far cheaper than one mesh per card. */}
          <mesh position-y={(deckH + 0.012) / 2} castShadow receiveShadow>
            <boxGeometry args={[CARD_W * 0.985, deckH, CARD_H * 0.985]} />
            <meshStandardMaterial color="#e8dcc0" roughness={0.8} />
          </mesh>
          <group position-y={deckH + 0.014} rotation-x={FLAT}>
            <group rotation-y={Math.PI}>
              <Card3D card={null} />
            </group>
          </group>
        </group>
      )}
      {discardCount > 0 && top && (
        <group position={[DISCARD_POS[0], 0.012 + discardH, DISCARD_POS[2]]} rotation-x={FLAT}>
          <group rotation-z={0.06}>
            <Card3D card={top} />
          </group>
        </group>
      )}
    </group>
  );
}
