import { useSyncExternalStore } from 'react';
import { getLang, onLangChange } from './i18n';

/**
 * Player preferences kept in this browser: reduced motion (no shake, flash, slow motion or
 * camera lean). Defaults to the operating system's "reduce motion" setting.
 */
export type Motion = 'full' | 'reduced';

function initialMotion(): Motion {
  try {
    const saved = localStorage.getItem('shield.motion');
    if (saved === 'full' || saved === 'reduced') return saved;
  } catch {
    // Storage unavailable: use the system preference.
  }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full';
}

let motion: Motion = initialMotion();
const listeners = new Set<() => void>();

export function getMotion(): Motion {
  return motion;
}

export function setMotion(m: Motion) {
  motion = m;
  try {
    localStorage.setItem('shield.motion', m);
  } catch {
    // Not persisted; still applies now.
  }
  listeners.forEach((f) => f());
}

function onMotionChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

export const reducedMotion = () => motion === 'reduced';

export function useMotion(): Motion {
  return useSyncExternalStore(onMotionChange, getMotion);
}

/** Re-renders the component when the interface language changes. */
export function useLang() {
  return useSyncExternalStore(onLangChange, getLang);
}
