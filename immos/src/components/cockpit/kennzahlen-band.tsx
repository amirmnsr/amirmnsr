"use client";

import { useRef } from "react";
import type { KennzahlSnapshot } from "@/domain";
import { gsap, reduziertBewegung, TAKT, useGSAP } from "@/components/motion/gsap";
import { Fliese, type Ton } from "@/components/ui/display";
import { formatCentCompact, formatNumber, formatPercent } from "@/lib/format";
import { useImmos } from "@/state/immos-store";

/**
 * Kennzahlenband
 * =============================================================================
 * Die Zahlen zählen beim Öffnen hoch. Das ist der einzige dekorative Anteil im
 * Cockpit und hat einen Zweck: Der Blick bleibt kurz an der Zahl, die sich
 * bewegt — und bewegt hat sich, was seit dem letzten Blick passiert ist.
 */

function formatiert(k: KennzahlSnapshot, wert: number): string {
  switch (k.einheit) {
    case "eur":
      return formatCentCompact(Math.round(wert));
    case "prozent":
      return formatPercent(wert);
    case "stunden":
      return formatNumber(wert, 1);
    default:
      return formatNumber(wert, 0);
  }
}

const RICHTUNG_TON: Record<KennzahlSnapshot["richtung"], Ton> = {
  gut: "neutral",
  neutral: "neutral",
  schlecht: "danger",
};

export function KennzahlenBand({ kennzahlen }: { kennzahlen: KennzahlSnapshot[] }) {
  const wurzel = useRef<HTMLDivElement>(null);
  const { offeneVorschlaege, gespartMinuten } = useImmos();

  // Zwei Kennzahlen sind live: offene Entscheidungen und gesparte Zeit reagieren
  // unmittelbar auf das, was der Nutzer gerade entscheidet.
  const werte = kennzahlen.map((k) => {
    if (k.id === "k-entscheidungen") return { ...k, wert: offeneVorschlaege.length };
    if (k.id === "k-zeit") return { ...k, wert: k.wert + gespartMinuten / 60 };
    return k;
  });

  useGSAP(
    () => {
      if (reduziertBewegung()) return;
      const felder = gsap.utils.toArray<HTMLElement>("[data-zahl]");
      felder.forEach((feld) => {
        const ziel = Number(feld.dataset.zahl);
        const einheit = feld.dataset.einheit as KennzahlSnapshot["einheit"];
        const zwischen = { wert: 0 };
        gsap.to(zwischen, {
          wert: ziel,
          duration: TAKT.ruhig,
          ease: "power1.out",
          onUpdate: () => {
            feld.textContent = formatiert(
              { einheit } as KennzahlSnapshot,
              zwischen.wert,
            );
          },
        });
      });
      gsap.from("[data-fliese]", {
        y: 8,
        opacity: 0,
        duration: TAKT.normal,
        stagger: TAKT.stagger,
        clearProps: "all",
      });
    },
    { scope: wurzel },
  );

  return (
    <div
      ref={wurzel}
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5"
    >
      {werte.map((k) => (
        <div key={k.id} data-fliese>
          <Fliese
            label={k.bezeichnung}
            wert={formatiert(k, k.wert)}
            hinweis={k.hinweis}
            ton={RICHTUNG_TON[k.richtung]}
            trend={
              k.trend !== 0
                ? {
                    text: `${k.trend > 0 ? "+" : ""}${formatPercent(k.trend)}`,
                    ton:
                      (k.trend > 0 && k.richtung === "gut") || (k.trend < 0 && k.richtung === "gut")
                        ? "ok"
                        : k.richtung === "schlecht"
                          ? "danger"
                          : "neutral",
                  }
                : undefined
            }
          />
          <span
            data-zahl={k.wert}
            data-einheit={k.einheit}
            className="hidden"
            aria-hidden
          />
        </div>
      ))}
    </div>
  );
}
