import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { seatLayouts } from '../game/layout';
import { LOCAL_ID, useGame } from '../game/store';
import { AnchorProjector } from './anchors';
import { Bursts, CameraRig, Flyers } from './Effects';
import { Seat } from './Seat';
import { Piles, TableSurface } from './Table';

function Seats() {
  const shown = useGame((s) => s.shown);
  useGame((s) => s.portrait);
  if (!shown) return null;
  const localIndex = Math.max(0, shown.players.findIndex((p) => p.id === LOCAL_ID));
  const layouts = seatLayouts(shown.players.length, localIndex);
  return (
    <>
      {shown.players.map((p, i) => (layouts[i]!.tile ? null : <Seat key={p.id} player={p} seat={layouts[i]!} />))}
    </>
  );
}

/** Debug switches: ?off=bloom,bursts,shadows to isolate rendering issues. */
const OFF = new Set((new URLSearchParams(location.search).get('off') ?? '').split(','));


/** Records frame durations for performance tests (read by window.__perf). */
function PerfProbe() {
  useFrame(({ gl }, dt) => {
    const w = window as unknown as { __perf?: { frames: number[]; worst: number; calls?: number; tris?: number; programs?: number } };
    w.__perf ??= { frames: [], worst: 0 };
    w.__perf.calls = Math.max(w.__perf.calls ?? 0, gl.info.render.calls);
    w.__perf.tris = Math.max(w.__perf.tris ?? 0, gl.info.render.triangles);
    w.__perf.programs = gl.info.programs?.length ?? 0;
    const ms = dt * 1000;
    w.__perf.frames.push(ms);
    if (w.__perf.frames.length > 4000) w.__perf.frames.shift();
    w.__perf.worst = Math.max(w.__perf.worst, ms);
  });
  return null;
}



export function Scene() {
  const setTargeting = useGame((s) => s.setTargeting);
  return (
    <Canvas
      shadows={!OFF.has('shadows')}
      dpr={[1, 2]}
      camera={{ fov: 38, near: 0.1, far: 100, position: [0, 14, 10] }}
      gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.92 }}
      onPointerMissed={() => setTargeting(null)}
    >
      <color attach="background" args={['#06080c']} />

      <ambientLight intensity={0.35} />
      <spotLight
        position={[0, 16, 4]}
        angle={0.62}
        penumbra={0.75}
        intensity={240}
        color="#ffe7c2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <pointLight position={[-10, 5, -6]} intensity={60} color="#4a7dff" />
      <pointLight position={[10, 5, -6]} intensity={50} color="#ff8a4a" />

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={0.9} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[12, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#88aaff" position={[-8, 3, 4]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffb070" position={[8, 3, 4]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
      </Environment>

      <PerfProbe />
      <CameraRig />
      <TableSurface />
      <Piles />
      <Seats />
      <Flyers />
      {!OFF.has('bursts') && <Bursts />}
      <AnchorProjector />

      {!OFF.has('bloom') && (
      <EffectComposer multisampling={0}>
        <SMAA />
        {/* Threshold above 1: only deliberate effects (sparks, rings) glow, never the card paper. */}
        <Bloom intensity={0.7} luminanceThreshold={1.05} luminanceSmoothing={0.15} mipmapBlur />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
      )}
    </Canvas>
  );
}
