"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { useImmos } from "@/state/immos-store";
import { useSprache } from "@/hooks/use-sprache";
import { Knopf } from "@/components/ui/controls";
import { Etikett, Plakette } from "@/components/ui/display";
import { gsap, reduziertBewegung, useGSAP } from "@/components/motion/gsap";
import { formatCent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Freihändiger Modus
 * =============================================================================
 * Für die Situationen, in denen der Verwalter nicht am Bildschirm sitzt: im
 * Auto, auf dem Weg zum Objekt, mit Werkzeug in der Hand. ImmOS liest den
 * Vorschlag vor und hört auf „zustimmen", „ablehnen", „weiter", „warum".
 *
 * Zwei Grenzen sind bewusst gesetzt:
 *  - Vorschläge mit hohem Risiko sind per Sprache nicht freigebbar. Wer eine
 *    gefälschte Rechnung sperrt oder eine Kündigung vorbereitet, muss die
 *    Belege gesehen haben.
 *  - Kein Wake Word. Der Modus wird bewusst betreten und verlassen; im
 *    Großraumbüro ist ein dauerhaft offenes Mikrofon nicht vermittelbar.
 */

type Befehl = "zustimmen" | "ablehnen" | "weiter" | "warum" | "beenden" | "unbekannt";

export function erkenneBefehl(text: string): Befehl {
  const t = text.toLowerCase();
  const enthaelt = (...w: string[]) => w.some((x) => t.includes(x));
  if (enthaelt("zustimm", "freigeb", "genehmig", "einverstanden", "mach das", "ja bitte", "jawohl"))
    return "zustimmen";
  if (enthaelt("ablehn", "nein", "nicht machen", "verwerf", "lass das")) return "ablehnen";
  if (enthaelt("weiter", "nächst", "naechst", "später", "spaeter", "überspring", "ueberspring"))
    return "weiter";
  if (enthaelt("warum", "begründ", "begruend", "erklär", "erklaer", "beleg")) return "warum";
  if (enthaelt("beenden", "schließen", "schliessen", "aufhören", "aufhoeren", "fertig")) 
    return "beenden";
  return "unbekannt";
}

export function Freihaendig({
  schliessen,
  agentNamen,
}: {
  schliessen: () => void;
  agentNamen: Record<string, string>;
}) {
  const { vorschlaege, entscheide } = useImmos();
  const offen = useMemo(() => vorschlaege.filter((v) => v.status === "offen"), [vorschlaege]);
  const [index, setIndex] = useState(0);
  const [letzterBefehl, setLetzterBefehl] = useState<string | null>(null);
  const buehne = useRef<HTMLDivElement>(null);
  const vorgelesen = useRef<string | null>(null);

  const aktuell = offen[Math.min(index, Math.max(0, offen.length - 1))];

  // Der Sprachbefehl trifft asynchron ein. Damit er immer auf den gerade
  // angezeigten Vorschlag wirkt, laufen beide Werte über Refs, die in Effekten
  // gesetzt werden — ein Schreibzugriff im Render wäre unrein.
  const aktuellRef = useRef(aktuell);
  const verarbeitenRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    aktuellRef.current = aktuell;
  }, [aktuell]);

  const sprache = useSprache({
    tonAus: false,
    aufBefehl: (text) => verarbeitenRef.current(text),
  });
  const { sprechen, starten, stoppen, schweigen, spricht, hoert, verfuegbar, transkript, fehler } =
    sprache;

  const verarbeite = useCallback(
    (text: string) => {
      const befehl = erkenneBefehl(text);
      setLetzterBefehl(`„${text}" → ${befehl}`);
      const vorschlag = aktuellRef.current;
      if (!vorschlag) return;

      switch (befehl) {
        case "zustimmen":
          if (vorschlag.risiko === "hoch") {
            sprechen(
              "Dieser Vorschlag hat ein hohes Risiko. Den gebe ich nur am Bildschirm frei, " +
                "nachdem du die Belege gesehen hast.",
            );
            return;
          }
          entscheide(vorschlag.id, "zustimmen", "freihändig per Sprache freigegeben", 8);
          sprechen("Erledigt.");
          break;
        case "ablehnen":
          entscheide(vorschlag.id, "ablehnen", "freihändig per Sprache abgelehnt", 8);
          sprechen("Abgelehnt, ich habe nichts ausgeführt.");
          break;
        case "weiter":
          setIndex((i) => (offen.length > 1 ? (i + 1) % offen.length : i));
          break;
        case "warum":
          sprechen(vorschlag.begruendung);
          break;
        case "beenden":
          sprechen("Bis später.");
          schliessen();
          break;
        default:
          sprechen("Das habe ich nicht verstanden. Sag zustimmen, ablehnen, weiter oder warum.");
      }
    },
    [entscheide, offen.length, schliessen, sprechen],
  );

  useEffect(() => {
    verarbeitenRef.current = verarbeite;
  }, [verarbeite]);

  // Neuen Vorschlag vorlesen, sobald er in den Fokus kommt.
  useEffect(() => {
    if (!aktuell || vorgelesen.current === aktuell.id) return;
    vorgelesen.current = aktuell.id;
    const agent = agentNamen[aktuell.agentId] ?? "ImmOS";
    const betrag = aktuell.betragCent ? ` Betrag ${formatCent(aktuell.betragCent)}.` : "";
    const risiko =
      aktuell.risiko === "hoch" ? " Achtung, hohes Risiko — Freigabe nur am Bildschirm." : "";
    sprechen(
      `${agent}: ${aktuell.titel}. ${aktuell.kurzfassung}${betrag}${risiko} ` +
        `Zustimmen, ablehnen oder weiter?`,
    );
  }, [aktuell, agentNamen, sprechen]);

  // In diesem Modus wird nach jeder Ausgabe automatisch wieder zugehört.
  useEffect(() => {
    if (spricht || hoert || !verfuegbar) return;
    const id = setTimeout(() => starten(), 350);
    return () => clearTimeout(id);
  }, [spricht, hoert, verfuegbar, starten, letzterBefehl, aktuell?.id]);

  const beenden = useCallback(() => {
    schweigen();
    stoppen();
    schliessen();
  }, [schliessen, schweigen, stoppen]);

  useEffect(() => {
    const aufTaste = (e: KeyboardEvent) => {
      if (e.key === "Escape") beenden();
    };
    document.addEventListener("keydown", aufTaste);
    return () => document.removeEventListener("keydown", aufTaste);
  }, [beenden]);

  useGSAP(
    () => {
      if (reduziertBewegung()) return;
      gsap.killTweensOf("[data-welle]");
      const aktiv = spricht || hoert;
      gsap.to("[data-welle]", {
        scale: aktiv ? 1.45 : 1.12,
        opacity: aktiv ? 0.12 : 0.3,
        duration: aktiv ? 0.7 : 2.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.18,
      });
    },
    { scope: buehne, dependencies: [spricht, hoert] },
  );

  useGSAP(
    () => {
      if (reduziertBewegung() || !aktuell) return;
      gsap.fromTo(
        "[data-fh-text]",
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.07, clearProps: "all" },
      );
    },
    { scope: buehne, dependencies: [aktuell?.id] },
  );

  const ringFarbe = hoert
    ? "border-accent"
    : spricht
      ? "border-info"
      : "border-line-strong";

  return (
    <div
      ref={buehne}
      role="dialog"
      aria-label="Freihändiger Modus"
      className="immos-grid-bg fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-bg-deep/96 px-6 py-10 backdrop-blur-md"
    >
      <button
        onClick={beenden}
        className="absolute top-5 right-5 flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
      >
        Beenden <kbd className="font-mono text-[10px]">esc</kbd>
      </button>

      <div className="relative mb-7 flex h-32 w-32 shrink-0 items-center justify-center">
        <span data-welle className={cn("absolute inset-0 rounded-full border", ringFarbe)} />
        <span data-welle className={cn("absolute inset-5 rounded-full border", ringFarbe)} />
        <span data-welle className={cn("absolute inset-10 rounded-full border", ringFarbe)} />
        <span
          className={cn(
            "h-4 w-4 rounded-full transition-colors",
            hoert ? "bg-accent" : spricht ? "bg-info" : "bg-accent/60",
          )}
        />
      </div>

      <Etikett>
        {!verfuegbar
          ? "Spracherkennung in diesem Browser nicht verfügbar"
          : spricht
            ? "liest vor"
            : hoert
              ? "hört zu"
              : "bereit"}
      </Etikett>

      {aktuell ? (
        <div className="mt-5 max-w-2xl text-center">
          <div data-fh-text className="flex flex-wrap items-center justify-center gap-2">
            <Plakette ton="agent">{agentNamen[aktuell.agentId] ?? aktuell.agentId}</Plakette>
            {aktuell.risiko === "hoch" ? (
              <Plakette ton="danger" punkt>
                nur am Bildschirm freigebbar
              </Plakette>
            ) : null}
            {aktuell.betragCent ? (
              <span className="text-sm font-semibold tabular-nums">
                {formatCent(aktuell.betragCent)}
              </span>
            ) : null}
          </div>
          <h2 data-fh-text className="mt-3 text-2xl leading-tight font-semibold tracking-tight">
            {aktuell.titel}
          </h2>
          <p data-fh-text className="mt-3 text-sm leading-relaxed text-fg-muted">
            {aktuell.kurzfassung}
          </p>
          <p data-fh-text className="mt-4 text-2xs text-fg-subtle">
            Entscheidung {Math.min(index + 1, offen.length)} von {offen.length}
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-fg-muted">
          Nichts mehr offen. Ich melde mich, sobald etwas eintrifft.
        </p>
      )}

      {transkript ? (
        <p className="mt-6 rounded-lg border border-accent-line bg-accent-wash px-3 py-2 text-sm text-accent">
          {transkript}
        </p>
      ) : null}
      {letzterBefehl ? (
        <p className="mt-3 font-mono text-2xs text-fg-subtle">{letzterBefehl}</p>
      ) : null}
      {fehler ? <p className="mt-3 text-2xs text-warn">{fehler}</p> : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Knopf
          variante="erfolg"
          disabled={!aktuell || aktuell.risiko === "hoch"}
          onClick={() =>
            aktuell && entscheide(aktuell.id, "zustimmen", "freihändig freigegeben", 8)
          }
        >
          <Icons.Check className="h-3.5 w-3.5" strokeWidth={2.2} /> „Zustimmen“
        </Knopf>
        <Knopf
          variante="gefahr"
          disabled={!aktuell}
          onClick={() => aktuell && entscheide(aktuell.id, "ablehnen", "freihändig abgelehnt", 8)}
        >
          <Icons.X className="h-3.5 w-3.5" strokeWidth={2.2} /> „Ablehnen“
        </Knopf>
        <Knopf
          variante="sekundaer"
          onClick={() => setIndex((i) => (offen.length > 1 ? (i + 1) % offen.length : i))}
        >
          „Weiter“
        </Knopf>
        <Knopf
          variante="sekundaer"
          disabled={!aktuell}
          onClick={() => aktuell && sprechen(aktuell.begruendung)}
        >
          „Warum?“
        </Knopf>
      </div>

      <p className="mt-6 max-w-xl text-center text-2xs leading-relaxed text-fg-subtle">
        Befehle: zustimmen · ablehnen · weiter · warum · beenden. Die Erkennung läuft im Prototyp
        über die Web Speech API des Browsers, im Produktivbetrieb serverseitig mit
        EU-Verarbeitung. Vorschläge mit hohem Risiko bleiben dem Bildschirm vorbehalten.
      </p>
    </div>
  );
}
