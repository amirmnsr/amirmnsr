"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import type { Vorschlag } from "@/domain";
import { useImmos } from "@/state/immos-store";
import { EntscheidungsKarte } from "./entscheidungs-karte";
import { Karte, Etikett, Plakette } from "@/components/ui/display";
import { Knopf } from "@/components/ui/controls";
import { gsap, reduziertBewegung, TAKT, useGSAP } from "@/components/motion/gsap";
import { formatCent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Entscheidungsstapel
 * =============================================================================
 * Eine Karte im Fokus, der Rest als Vorschau. Bedienbar ohne Maus:
 * ⏎ zustimmen, A ablehnen, S später, J/K blättern.
 *
 * Die Animation ist funktional: Zustimmung fliegt nach rechts, Ablehnung nach
 * links. Nach zwei Sekunden Bearbeitungszeit kennt man die Richtung am
 * Bewegungsmuster, ohne zu lesen — das macht Serienarbeit schneller.
 */

export function EntscheidungsStapel({
  agentNamen,
  objektNamen,
  jetzt,
  hoehe = "voll",
}: {
  agentNamen: Record<string, string>;
  objektNamen: Record<string, string>;
  jetzt: string;
  hoehe?: "voll" | "kompakt";
}) {
  const { vorschlaege, entscheide, gespartMinuten, entschiedenAnzahl, schnellklicks } = useImmos();
  const [index, setIndex] = useState(0);
  const buehne = useRef<HTMLDivElement>(null);

  const offen = useMemo(() => vorschlaege.filter((v) => v.status === "offen"), [vorschlaege]);
  // Der Index wird im Render begrenzt, nicht in einem Effekt korrigiert: nach einer
  // Entscheidung schrumpft die Liste, und der Fokus soll sofort sitzen.
  const sicherIndex = Math.min(index, Math.max(0, offen.length - 1));
  const aktuell: Vorschlag | undefined = offen[sicherIndex];

  const entscheiden = useCallback(
    (
      art: "zustimmen" | "ablehnen" | "aendern" | "zurueckstellen",
      grund?: string,
      dauerSek?: number,
    ) => {
      if (!aktuell) return;

      const abschluss = () => {
        if (art === "zurueckstellen") {
          setIndex((i) => (i + 1) % Math.max(1, offen.length));
          return;
        }
        entscheide(aktuell.id, art, grund, dauerSek);
      };

      const karte = buehne.current?.querySelector<HTMLElement>(`[data-karte="${aktuell.id}"]`);
      if (!karte || reduziertBewegung()) {
        abschluss();
        return;
      }

      const richtung = art === "ablehnen" ? -1 : 1;
      gsap.to(karte, {
        x: richtung * 420,
        rotate: richtung * 4,
        scale: 0.94,
        opacity: 0,
        duration: TAKT.normal,
        ease: "power2.in",
        onComplete: abschluss,
      });
    },
    [aktuell, entscheide, offen.length],
  );

  // Einfliegen der neuen Karte im Fokus.
  useGSAP(
    () => {
      if (!aktuell || reduziertBewegung()) return;
      gsap.fromTo(
        `[data-karte="${aktuell.id}"]`,
        { y: 14, opacity: 0, scale: 0.985 },
        { y: 0, opacity: 1, scale: 1, duration: TAKT.normal, clearProps: "all" },
      );
    },
    { scope: buehne, dependencies: [aktuell?.id] },
  );

  useEffect(() => {
    const aufTaste = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
      ) {
        return;
      }
      if (!aktuell) return;
      const taste = e.key.toLowerCase();
      if (e.key === "Enter") {
        e.preventDefault();
        if (aktuell.risiko === "hoch") return; // Sperre: Belege zuerst öffnen.
        entscheiden("zustimmen", undefined, 4);
      }
      if (taste === "a") {
        e.preventDefault();
        entscheiden("ablehnen", undefined, 4);
      }
      if (taste === "s") {
        e.preventDefault();
        entscheiden("zurueckstellen");
      }
      if (taste === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, offen.length - 1));
      }
      if (taste === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
    };
    document.addEventListener("keydown", aufTaste);
    return () => document.removeEventListener("keydown", aufTaste);
  }, [aktuell, entscheiden, offen.length]);

  const summeOffen = offen.reduce((s, v) => s + (v.betragCent ?? 0), 0);

  if (offen.length === 0) {
    return (
      <Karte className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
        <Icons.CheckCircle2 className="h-7 w-7 text-ok" strokeWidth={1.4} />
        <p className="text-sm font-semibold">Warteschlange leer</p>
        <p className="max-w-sm text-xs text-fg-subtle">
          {entschiedenAnzahl > 0
            ? `${entschiedenAnzahl} Entscheidungen getroffen, ${Math.round(gespartMinuten / 6) / 10} Stunden Arbeit gespart. ImmOS arbeitet weiter und legt neue Vorschläge vor, sobald etwas eintrifft.`
            : "ImmOS legt neue Vorschläge vor, sobald etwas eintrifft."}
        </p>
      </Karte>
    );
  }

  return (
    <div ref={buehne} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Etikett className="mr-auto">
          Entscheidung {Math.min(sicherIndex + 1, offen.length)} von {offen.length}
          {summeOffen > 0 ? ` · ${formatCent(summeOffen)} betroffen` : ""}
        </Etikett>
        <div className="flex items-center gap-1 text-2xs text-fg-subtle">
          <kbd className="rounded border border-line-strong px-1 font-mono">⏎</kbd> zustimmen
          <kbd className="ml-1.5 rounded border border-line-strong px-1 font-mono">A</kbd> ablehnen
          <kbd className="ml-1.5 rounded border border-line-strong px-1 font-mono">S</kbd> später
          <kbd className="ml-1.5 rounded border border-line-strong px-1 font-mono">J/K</kbd> blättern
        </div>
      </div>

      {schnellklicks >= 2 ? (
        <div className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn-wash px-3 py-2 text-2xs text-warn">
          <Icons.ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          <span>
            {schnellklicks} Entscheidungen unter zwei Sekunden bei erhöhtem Risiko. ImmOS
            protokolliert die Entscheidungsdauer — wer zu schnell zustimmt, verliert den Nachweis,
            geprüft zu haben. Die Autonomiestufe wird dadurch nicht erhöht.
          </span>
        </div>
      ) : null}

      {aktuell ? (
        <EntscheidungsKarte
          key={aktuell.id}
          vorschlag={aktuell}
          agentName={agentNamen[aktuell.agentId] ?? aktuell.agentId}
          objektName={aktuell.objektId ? objektNamen[aktuell.objektId] : undefined}
          jetzt={jetzt}
          aufEntscheidung={entscheiden}
        />
      ) : null}

      {hoehe === "voll" ? (
        <div className="min-w-0">
          <Etikett className="mb-1.5">Als Nächstes</Etikett>
          <ul className="space-y-1">
            {offen.slice(sicherIndex + 1, sicherIndex + 6).map((v, i) => (
              <li key={v.id}>
                <button
                  onClick={() => setIndex(sicherIndex + 1 + i)}
                  className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-accent-line"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      v.risiko === "hoch"
                        ? "bg-danger"
                        : v.risiko === "mittel"
                          ? "bg-warn"
                          : "bg-fg-subtle",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-fg-muted">{v.titel}</span>
                  {v.betragCent ? (
                    <span className="text-2xs tabular-nums text-fg-subtle">
                      {formatCent(v.betragCent)}
                    </span>
                  ) : null}
                  <Plakette>{agentNamen[v.agentId] ?? v.agentId}</Plakette>
                </button>
              </li>
            ))}
          </ul>
          {offen.length > sicherIndex + 6 ? (
            <p className="mt-1.5 text-2xs text-fg-subtle">
              und {offen.length - sicherIndex - 6} weitere
            </p>
          ) : null}
        </div>
      ) : null}

      {entschiedenAnzahl > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2 text-2xs text-fg-subtle">
          <Icons.Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />
          <span>
            {entschiedenAnzahl} entschieden · {gespartMinuten} Minuten gespart
          </span>
          <Knopf
            variante="geist"
            klein
            className="ml-auto"
            onClick={() => setIndex(0)}
          >
            Zum Anfang
          </Knopf>
        </div>
      ) : null}
    </div>
  );
}
