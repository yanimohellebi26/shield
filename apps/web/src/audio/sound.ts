import { useSyncExternalStore } from 'react';

/**
 * Sound effects with the Web Audio API. Files: Kenney CC0 packs (see CREDITS.md) in public/sfx.
 * Each bank holds variants; a random one plays with a slight pitch change so repeats don't sound mechanical.
 * Browsers only allow audio after a user gesture: call unlockAudio() from a click handler.
 */
const BANKS = {
  shuffle: ['shuffle'],
  slide: ['slide-1', 'slide-2', 'slide-3', 'slide-4', 'slide-5', 'slide-6', 'slide-7', 'slide-8'],
  place: ['place-1', 'place-2', 'place-3', 'place-4'],
  shove: ['shove-1', 'shove-2', 'shove-3', 'shove-4'],
  fan: ['fan-1', 'fan-2'],
  hit: ['hit-0', 'hit-1', 'hit-2'],
  block: ['block-0', 'block-1', 'block-2'],
  break: ['break-0', 'break-1', 'break-2'],
  tap: ['tap-0', 'tap-1', 'tap-2'],
  bell: ['bell-0', 'bell-1'],
  chime: ['chime'],
  knock: ['knock'],
} as const;

export type Sound = keyof typeof BANKS;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const lastPlayed = new Map<Sound, number>();

// ---------------------------------------------------------------- preferences

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

let enabled = load('shield.sound', true);
let volume = load('shield.volume', 0.7);
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem('shield.sound', JSON.stringify(on));
  } catch {
    // Not persisted; applies to this session.
  }
  if (master) master.gain.value = on ? volume : 0;
  notify();
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  try {
    localStorage.setItem('shield.volume', JSON.stringify(volume));
  } catch {
    // Not persisted; applies to this session.
  }
  if (master && enabled) master.gain.value = volume;
  notify();
}

const snapshot = () => `${enabled}|${volume}`;
export function useSoundPrefs(): { enabled: boolean; volume: number } {
  useSyncExternalStore((f) => {
    listeners.add(f);
    return () => listeners.delete(f);
  }, snapshot);
  return { enabled, volume };
}

// ---------------------------------------------------------------- playback

/** Creates the audio context on the first user gesture and loads every sound. Safe to call often. */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = enabled ? volume : 0;
    master.connect(ctx.destination);
    const names = Object.values(BANKS).flat();
    for (const name of names) {
      fetch(`${import.meta.env.BASE_URL}sfx/${name}.ogg`)
        .then((r) => r.arrayBuffer())
        .then((data) => ctx!.decodeAudioData(data))
        .then((buf) => buffers.set(name, buf))
        .catch(() => undefined);
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

/** Plays a random variant of `sound`. Silently does nothing before unlock or when muted. */
export function play(sound: Sound, opts: { volume?: number; delay?: number } = {}) {
  if (!ctx || !master || !enabled) return;
  // Bursts of the same sound (e.g. eight cards dealt at once) would just add up into noise.
  const now = performance.now();
  if (now - (lastPlayed.get(sound) ?? 0) < 35) return;
  lastPlayed.set(sound, now);
  const bank = BANKS[sound];
  const buf = buffers.get(bank[Math.floor(Math.random() * bank.length)]!);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.94 + Math.random() * 0.12;
  const gain = ctx.createGain();
  gain.gain.value = opts.volume ?? 1;
  src.connect(gain).connect(master);
  src.start(ctx.currentTime + (opts.delay ?? 0));
}
