"use client";

/**
 * GSAP-Einrichtung
 * =============================================================================
 * Zentrale Registrierung, damit Plugins nicht in jedem Client Component erneut
 * angemeldet werden. Alle Animationen laufen über `useGSAP`, das beim Unmount
 * automatisch aufräumt — in einer App mit vielen Navigationen ist das der
 * Unterschied zwischen flüssig und undicht.
 *
 * Regeln für Motion in ImmOS:
 *  1. Nur `transform` und `opacity` animieren (GPU, kein Layout-Reflow).
 *  2. Jede Animation hat eine Funktion: Zustandswechsel zeigen, Aufmerksamkeit
 *     lenken, Kontinuität herstellen. Keine Dekoration.
 *  3. Dauer im Arbeitskontext: 0,15–0,45 s. Nur die Boot-Sequenz darf länger.
 *  4. `prefers-reduced-motion` schaltet auf den Endzustand ohne Bewegung.
 */

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, Flip, ScrollTrigger, Observer);
  gsap.defaults({ ease: "power2.out", duration: 0.32 });
}

export { gsap, useGSAP, Flip, ScrollTrigger, Observer };

export function reduziertBewegung(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Einheitliche Zeitkonstanten, damit sich die App wie ein Gerät anfühlt. */
export const TAKT = {
  sofort: 0.12,
  schnell: 0.2,
  normal: 0.32,
  ruhig: 0.5,
  boot: 1.1,
  stagger: 0.045,
} as const;
