import { useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Vec3 } from '../game/layout';

/**
 * DOM elements pinned to 3D points. One projector moves them all each frame,
 * which keeps text crisp and avoids mounting a React root per label.
 */
const anchors = new Map<HTMLElement, Vec3>();

export function useAnchor(pos: Vec3) {
  const [x, y, z] = pos;
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      anchors.set(el, [x, y, z]);
      return () => {
        anchors.delete(el);
      };
    },
    [x, y, z],
  );
}

const v = new THREE.Vector3();

export function AnchorProjector() {
  useFrame(({ camera, size }) => {
    for (const [el, p] of anchors) {
      v.set(p[0], p[1], p[2]).project(camera);
      const sx = ((v.x + 1) / 2) * size.width;
      const sy = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      el.style.visibility = 'visible';
    }
  });
  return null;
}
