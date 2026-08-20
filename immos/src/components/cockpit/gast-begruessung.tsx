"use client";

import { useSyncExternalStore } from "react";
import * as Icons from "lucide-react";
import { Karte } from "@/components/ui/display";
import { gsap, reduziertBewegung, useGSAP } from "@/components/motion/gsap";

/**
 * Gastbegrüßung
 * =============================================================================
 * Wenn die Vorführung über `/hallo?name=…` gestartet wurde, spricht das Cockpit
 * den Gast weiter mit Namen an. Ohne gespeicherten Namen erscheint nichts —
 * eine leere Begrüßung wäre schlechter als keine.
 */

/** Der gespeicherte Name ist externer Zustand — deshalb kein Effekt, der Zustand setzt. */
function abonnieren(neuLaden: () => void) {
  window.addEventListener("storage", neuLaden);
  return () => window.removeEventListener("storage", neuLaden);
}

function gastLesen(): string | null {
  try {
    return localStorage.getItem("immos.gast");
  } catch {
    return null;
  }
}

const keinGast = () => null;

export function GastBegruessung({ offeneEntscheidungen }: { offeneEntscheidungen: number }) {
  const gast = useSyncExternalStore(abonnieren, gastLesen, keinGast);

  useGSAP(
    () => {
      if (!gast || reduziertBewegung()) return;
      gsap.fromTo(
        "[data-gast]",
        { y: -8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, clearProps: "all" },
      );
    },
    { dependencies: [gast] },
  );

  if (!gast) return null;

  return (
    <Karte data-gast className="flex flex-wrap items-center gap-3 border-accent-line px-4 py-3">
      <Icons.Sparkles className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.8} />
      <p className="min-w-0 flex-1 text-sm leading-relaxed">
        <span className="font-semibold">Hallo {gast}, ich bin ImmOS.</span>{" "}
        <span className="text-fg-muted">
          Hier ist der Stand von heute. {offeneEntscheidungen} Entscheidungen warten auf dich —
          jede mit Begründung, Belegen und der Angabe, was ich ausführen würde. Alles andere habe
          ich schon erledigt.
        </span>
      </p>
    </Karte>
  );
}
