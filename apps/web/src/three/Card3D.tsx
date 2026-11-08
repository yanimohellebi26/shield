import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import type { Card } from '@shield/engine';
import { CARD_H, CARD_W } from '../game/layout';
import { backTexture, faceTexture } from './textures';

const THICK = 0.012;
const RADIUS = 0.055;

function roundedShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

let shared: { face: THREE.ShapeGeometry; body: THREE.ExtrudeGeometry; edge: THREE.MeshStandardMaterial; glow: THREE.ShapeGeometry; frame: THREE.ExtrudeGeometry } | null = null;

function geometry() {
  if (shared) return shared;
  const shape = roundedShape(CARD_W, CARD_H, RADIUS);
  const face = new THREE.ShapeGeometry(shape, 6);
  const uv = face.attributes.uv!;
  const pos = face.attributes.position!;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / CARD_W + 0.5, pos.getY(i) / CARD_H + 0.5);
  const body = new THREE.ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: false, curveSegments: 6 });
  body.translate(0, 0, -THICK / 2);
  const glow = new THREE.ShapeGeometry(roundedShape(CARD_W + 0.12, CARD_H + 0.12, RADIUS + 0.06), 6);
  const edge = new THREE.MeshStandardMaterial({ color: '#d9ccae', roughness: 0.9 });
  // A solid coloured border just outside the card, visible from both sides.
  const frameShape = roundedShape(CARD_W + 0.085, CARD_H + 0.085, RADIUS + 0.04);
  frameShape.holes.push(new THREE.Path(roundedShape(CARD_W - 0.002, CARD_H - 0.002, RADIUS).getPoints(24)));
  const frame = new THREE.ExtrudeGeometry(frameShape, { depth: THICK + 0.004, bevelEnabled: false, curveSegments: 6 });
  frame.translate(0, 0, -(THICK + 0.004) / 2);
  shared = { face, body, edge, glow, frame };
  return shared;
}

// Matte card stock: low reflections keep faces readable under the table lamp.
const backMat = () => new THREE.MeshStandardMaterial({ map: backTexture(), roughness: 0.7, metalness: 0.05, envMapIntensity: 0.45 });
let backMaterial: THREE.MeshStandardMaterial | null = null;
const faceMats = new Map<string, THREE.MeshStandardMaterial>();

function faceMaterial(card: Card): THREE.MeshStandardMaterial {
  const key = `${card.suit}${card.rank}`;
  let m = faceMats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: faceTexture(card), roughness: 0.92, envMapIntensity: 0.3 });
    faceMats.set(key, m);
  }
  return m;
}

export interface CardProps {
  card: Card | null;
  /** Halo colour drawn behind the card, or null. */
  glow?: string | null;
  glowStrength?: number;
  castShadow?: boolean;
  /** Solid border colour that identifies the card's role (life, shield), or null. */
  frame?: string | null;
  onClick?: () => void;
}

const frameMats = new Map<string, THREE.MeshStandardMaterial>();
function frameMaterial(color: string): THREE.MeshStandardMaterial {
  let m = frameMats.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.18, metalness: 0.2, roughness: 0.5 });
    frameMats.set(color, m);
  }
  return m;
}

/**
 * A physical card in its own local frame: face toward +Z, back toward −Z.
 * Parents orient it (tilt about X, flip about Y). A null card shows its back on both sides.
 */
export const Card3D = forwardRef<THREE.Group, CardProps>(function Card3D({ card, glow, glowStrength = 1, castShadow = true, frame = null }, ref) {
  const g = geometry();
  backMaterial ??= backMat();
  const front = card ? faceMaterial(card) : backMaterial;
  const glowMat = useMemo(
    () =>
      glow
        ? new THREE.MeshBasicMaterial({
            color: new THREE.Color(glow).multiplyScalar(1.3 * glowStrength),
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            toneMapped: false,
            side: THREE.DoubleSide,
          })
        : null,
    [glow, glowStrength],
  );
  return (
    <group ref={ref}>
      <mesh geometry={g.body} material={g.edge} castShadow={castShadow} receiveShadow />
      <mesh geometry={g.face} material={front} position-z={THICK / 2 + 0.0005} />
      <mesh geometry={g.face} material={backMaterial} position-z={-THICK / 2 - 0.0005} rotation-y={Math.PI} />
      {frame && <mesh geometry={g.frame} material={frameMaterial(frame)} />}
      {glowMat && <mesh geometry={g.glow} material={glowMat} position-z={0} />}
    </group>
  );
});
