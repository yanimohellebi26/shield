import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { isHidden, type PlayerView } from '@shield/engine';
import { CHARGE_SPIN, FLAT, isPortrait, slotPos, type SeatLayout, type Slot } from '../game/layout';
import { LOCAL_ID, useGame } from '../game/store';
import { lifeCards } from '../game/lifeCards';
import { Card3D } from './Card3D';
import { matTexture } from './textures';
import { t } from '../ui/i18n';
import { useLang } from '../ui/prefs';

/** Role colours: life cards wear a crimson border, the single shield a thick blue one. */
export const LIFE_FRAME = '#c23446';
export const SHIELD_FRAME = '#3d8bff';

/** Printed card places: label key and role colour (life crimson, shield blue, charge amber). */
const MAT: Record<Slot, ['mat.life' | 'mat.shield' | 'mat.charge', string]> = {
  life0: ['mat.life', '#c23446'],
  life1: ['mat.life', '#c23446'],
  shield: ['mat.shield', '#3d8bff'],
  charge: ['mat.charge', '#e6a23c'],
};

function Mat({ seat, slot }: { seat: SeatLayout; slot: Slot }) {
  useLang();
  const [label, tint] = MAT[slot];
  const [x, , z] = slotPos(seat, slot);
  return (
    <mesh position={[x, 0.004, z]} rotation-x={-Math.PI / 2} rotation-z={slot === 'charge' ? CHARGE_SPIN : 0} scale={seat.scale}>
      <planeGeometry args={[0.82, 1.09]} />
      <meshBasicMaterial map={matTexture(t(label), tint)} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function FlatCard({ seat, slot, stack = 0, children }: { seat: SeatLayout; slot: Slot; stack?: number; children: React.ReactNode }) {
  return (
    <group position={slotPos(seat, slot, stack)} rotation-x={FLAT} scale={seat.scale}>
      {children}
    </group>
  );
}

/** Pulsing ring under the active seat, and a coloured one under valid targets. */
function SeatRing({ seat, color, active }: { seat: SeatLayout; color: string; active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const m = ref.current.material as THREE.MeshBasicMaterial;
    m.opacity = active ? 0.42 + Math.sin(clock.elapsedTime * 3) * 0.14 : 0;
  });
  return (
    <mesh
      ref={ref}
      position={[seat.pos[0], 0.003, seat.pos[2] + (isPortrait() ? 0.15 : 0)]}
      rotation-x={-Math.PI / 2}
      scale={isPortrait() ? [seat.scale * 1.58, seat.scale * 0.66, 1] : [seat.scale * 1.75, seat.scale * 0.95, 1]}
    >
      <ringGeometry args={[1.12, 1.24, 96]} />
      <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function Seat({ player, seat }: { player: PlayerView; seat: SeatLayout }) {
  const ov = useGame((s) => s.ov);
  const focus = useGame((s) => s.focus);
  const targeting = useGame((s) => s.targeting);
  const pickTarget = useGame((s) => s.pickTarget);
  const [hover, setHover] = useState(false);

  const isLocal = player.id === LOCAL_ID;
  const active = focus === player.id && !player.eliminated;
  const targetable = !!targeting && !isLocal && !player.eliminated;
  const shield = ov.shieldCard[player.id] ?? player.shield;
  const shieldKnown = shield && !isHidden(shield);
  const dealing = useGame((s) => s.dealing);
  // While dealing, the real cards land; afterwards the cards always add up to the HP.
  const shownLife = dealing ? player.life : lifeCards(player.life, ov.hp[player.id] ?? player.hp);
  const ringColor = targetable ? (targeting === 'attack' ? '#ff4b3a' : '#5aa9ff') : '#ffcf6b';

  return (
    <group>
      <SeatRing seat={seat} color={ringColor} active={(active && !targeting) || targetable} />
      {(['life0', 'life1', 'shield', 'charge'] as Slot[]).map((s) => (
        <Mat key={s} seat={seat} slot={s} />
      ))}

      {!ov.hideLife[player.id] &&
        shownLife.map((c, i) => (
          <FlatCard key={c.id} seat={seat} slot={i === 0 ? 'life0' : 'life1'} stack={i === 2 ? 1 : 0}>
            {i === 2 ? (
              // Above 26 HP: a third card, fanned over the second one.
              <group position={[0.32, -0.22, 0]} rotation-z={-0.12}>
                <Card3D card={c} frame={LIFE_FRAME} />
              </group>
            ) : (
              <Card3D card={c} frame={LIFE_FRAME} />
            )}
          </FlatCard>
        ))}

      {shield && !ov.hideShield[player.id] && (
        <FlatCard seat={seat} slot="shield">
          {shieldKnown ? (
            <Card3D card={shield} frame={SHIELD_FRAME} glow="#5aa9ff" glowStrength={0.45} />
          ) : (
            <group rotation-y={Math.PI}>
              <Card3D card={null} frame={SHIELD_FRAME} />
            </group>
          )}
        </FlatCard>
      )}

      {/* Charge: one sideways pile, stacked card on card, so it never reads as a second shield. */}
      {!ov.hideCharge[player.id] &&
        Array.from({ length: player.chargeCount }, (_, i) => (
          <FlatCard key={i} seat={seat} slot="charge" stack={i}>
            <group rotation-y={Math.PI} rotation-z={CHARGE_SPIN + (i % 2 ? 1 : -1) * 0.04 * Math.min(i, 3)}>
              <Card3D card={null} glow={i === player.chargeCount - 1 ? '#ffb347' : null} glowStrength={0.35 + 0.15 * player.chargeCount} />
            </group>
          </FlatCard>
        ))}

      {/* Click/hover area for choosing a target. */}
      <mesh
        position={[seat.pos[0], 0.05, seat.pos[2] + 0.2]}
        rotation-x={-Math.PI / 2}
        visible={false}
        onPointerOver={(e) => {
          if (!targetable) return;
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          if (!targetable) return;
          e.stopPropagation();
          document.body.style.cursor = '';
          pickTarget(player.id);
        }}
      >
        <planeGeometry args={[3.6 * seat.scale, 2 * seat.scale]} />
      </mesh>

    </group>
  );
}
