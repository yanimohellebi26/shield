import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import { useGame, type Burst, type FlyerSpec } from '../game/store';
import { reducedMotion } from '../ui/prefs';
import { Card3D } from './Card3D';

/** One card in flight: position on a quadratic arc, plus tilt, flip, spin and scale tweens. */
function Flyer({ spec }: { spec: FlyerSpec }) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const g = outer.current!;
    const f = inner.current!;
    const a = new THREE.Vector3(...spec.from);
    const b = new THREE.Vector3(...spec.to);
    const c = a.clone().lerp(b, 0.5);
    c.y += spec.arc;
    const p = new THREE.Vector3();
    const proxy = { t: 0 };
    const set = (t: number) => {
      const u = 1 - t;
      p.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(c, 2 * u * t).addScaledVector(b, t * t);
      g.position.copy(p);
      g.rotation.x = THREE.MathUtils.lerp(spec.fromTilt, spec.toTilt, t);
      f.rotation.y = THREE.MathUtils.lerp(spec.fromFlip, spec.toFlip, t);
      // A little roll while flipping makes the turn feel physical.
      f.rotation.z =
        THREE.MathUtils.lerp(spec.fromSpin, spec.toSpin, t) + Math.sin(t * Math.PI) * (spec.fromFlip !== spec.toFlip ? 0.25 : 0.08);
      g.scale.setScalar(THREE.MathUtils.lerp(spec.fromScale, spec.toScale, t));
    };
    set(0);
    const tween = gsap.to(proxy, {
      t: 1,
      duration: spec.duration,
      ease: spec.ease,
      onUpdate: () => set(proxy.t),
      onComplete: () => spec.onDone?.(),
    });
    return () => {
      tween.kill();
    };
  }, [spec.key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={outer}>
      <group ref={inner}>
        <Card3D card={spec.card} glow={spec.glow} glowStrength={0.9} />
      </group>
    </group>
  );
}

export function Flyers() {
  const flyers = useGame((s) => s.flyers);
  return (
    <>
      {Object.entries(flyers).map(([id, spec]) => (
        <Flyer key={id} spec={spec} />
      ))}
    </>
  );
}

const SPARKS = 46;

/** Shockwave ring plus a spray of sparks. */
function BurstFx({ burst }: { burst: Burst }) {
  const ring = useRef<THREE.Mesh>(null);
  const points = useRef<THREE.Points>(null);
  const start = useRef<number | null>(null);
  const { geo, vel } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(SPARKS * 3);
    const v: THREE.Vector3[] = [];
    for (let i = 0; i < SPARKS; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (1.5 + Math.random() * 3.5) * burst.size;
      v.push(new THREE.Vector3(Math.cos(a) * s, 2 + Math.random() * 4 * burst.size, Math.sin(a) * s));
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geo: g, vel: v };
  }, [burst.size]);
  const color = useMemo(() => new THREE.Color(burst.color).multiplyScalar(3), [burst.color]);

  useFrame(({ clock }) => {
    start.current ??= clock.elapsedTime;
    const t = clock.elapsedTime - start.current;
    if (ring.current) {
      // Fast at first, then easing out to a bounded radius.
      const s = 0.3 + (1 - Math.exp(-t * 7)) * 1.9 * burst.size;
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 - t * 1.8);
    }
    if (points.current) {
      const arr = geo.attributes.position!.array as Float32Array;
      for (let i = 0; i < SPARKS; i++) {
        const v = vel[i]!;
        arr[i * 3] = v.x * t;
        arr[i * 3 + 1] = Math.max(0, v.y * t - 6 * t * t);
        arr[i * 3 + 2] = v.z * t;
      }
      geo.attributes.position!.needsUpdate = true;
      (points.current.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - t * 1.4);
    }
  });

  return (
    <group position={[burst.pos[0], burst.pos[1] + 0.05, burst.pos[2]]}>
      <mesh ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.85, 1, 64]} />
        <meshBasicMaterial color={color} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <points ref={points} geometry={geo}>
        <pointsMaterial color={color} size={0.09} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

export function Bursts() {
  const bursts = useGame((s) => s.bursts);
  return (
    <>
      {bursts.map((b) => (
        <BurstFx key={b.id} burst={b} />
      ))}
    </>
  );
}

/** Fits the table to the viewport and applies decaying screen shake on impacts. */
export function CameraRig() {
  const { camera, size } = useThree();
  const shake = useGame((s) => s.shake);
  const trauma = useRef(0);
  const last = useRef(shake);

  useFrame((_, dt) => {
    if (shake !== last.current) {
      trauma.current = Math.min(1, trauma.current + (shake - last.current));
      last.current = shake;
    }
    const aspect = size.width / size.height;
    let base: THREE.Vector3;
    let look: number;
    if (aspect < 1) {
      // Phones: a steep view over the arena and your seat; opponent tiles sit at the top.
      const fit = Math.max(1, 0.462 / aspect);
      base = new THREE.Vector3(0, 27 * fit, 5.2 * fit);
      look = -2.3;
    } else {
      // Keep the whole oval in frame: wider screens sit lower and closer.
      const fit = aspect >= 1.6 ? 1 : 1.6 / aspect;
      base = new THREE.Vector3(0, 15.2 * fit, 11.4 * Math.min(fit, 1.35));
      look = 1.9;
    }
    const t = trauma.current;
    const k = reducedMotion() ? 0 : t * t * 0.22;
    const time = performance.now() / 1000;
    camera.position.set(base.x + Math.sin(time * 47) * k, base.y + Math.sin(time * 39) * k, base.z + Math.cos(time * 43) * k);
    camera.lookAt(0, 0, look);
    trauma.current = Math.max(0, t - dt * 1.8);
  });
  return null;
}
