import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Deterministischer Pseudo-Zufall — Seed-Daten müssen bei jedem Build gleich sein. */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length) % items.length];
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Zentbeträge: alle Geldbeträge im System sind Integer in Cent. Kein Float in der Buchhaltung. */
export function euroToCent(euro: number) {
  return Math.round(euro * 100);
}
