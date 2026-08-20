"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import type { Vorschlag } from "@/domain";
import { AUTONOMIE_LABELS } from "@/domain/ai";
import { Etikett, Karte, Merkmal, Plakette, Risiko } from "@/components/ui/display";
import { Knopf } from "@/components/ui/controls";
import { formatCent, formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Entscheidungskarte
 * =============================================================================
 * Der Bildschirm, an dem der Verwalter den Großteil seines Tages verbringt.
 * Aufbau von oben nach unten: Was steht an, warum, was passiert genau, welche
 * Alternative gibt es, was kostet Nichtstun.
 *
 * Schutz vor Blindklicken: Bei hohem Risiko ist „Zustimmen" gesperrt, bis die
 * Belege geöffnet wurden. Das ist kein Gängeln, sondern die Bedingung dafür,
 * dass Autonomiestufen überhaupt vertretbar sind — die Zustimmung muss eine
 * Entscheidung sein, kein Reflex.
 */

const KATEGORIE_LABEL: Record<Vorschlag["kategorie"], string> = {
  zahlung: "Zahlung",
  buchung: "Buchung",
  kommunikation: "Kommunikation",
  beauftragung: "Beauftragung",
  frist: "Frist",
  vertrag: "Vertrag",
  abrechnung: "Abrechnung",
  eskalation: "Eskalation",
  stammdaten: "Stammdaten",
};

const AKTION_ICON: Record<string, string> = {
  mail_senden: "Mail",
  buchen: "Calculator",
  zahlung_einreichen: "Euro",
  auftrag_erteilen: "Wrench",
  frist_setzen: "CalendarClock",
  status_aendern: "CircleDot",
  dokument_erzeugen: "FileText",
  stammdaten_aendern: "Users",
  termin_vereinbaren: "Clock",
};

function Symbol({ name, className }: { name: string; className?: string }) {
  const K = (Icons as unknown as Record<string, Icons.LucideIcon>)[name];
  return K ? <K className={className} strokeWidth={1.6} /> : null;
}

export function EntscheidungsKarte({
  vorschlag,
  agentName,
  objektName,
  jetzt,
  aufEntscheidung,
  kompakt,
  automatischGeoeffnet,
}: {
  vorschlag: Vorschlag;
  agentName: string;
  objektName?: string;
  jetzt: string;
  aufEntscheidung: (
    entscheidung: "zustimmen" | "ablehnen" | "aendern" | "zurueckstellen",
    grund?: string,
    dauerSek?: number,
  ) => void;
  kompakt?: boolean;
  automatischGeoeffnet?: boolean;
}) {
  const [offen, setOffen] = useState<"belege" | "aktionen" | "alternativen" | null>(
    automatischGeoeffnet ? "aktionen" : null,
  );
  const [belegeGesehen, setBelegeGesehen] = useState(false);
  const [ablehnungOffen, setAblehnungOffen] = useState(false);
  const [grund, setGrund] = useState("");
  const angezeigtSeit = useRef(0);

  // Startzeitpunkt erst nach dem Rendern setzen: Date.now() im Render wäre
  // unrein und würde bei jedem Re-Render einen anderen Wert liefern.
  useEffect(() => {
    angezeigtSeit.current = Date.now();
  }, [vorschlag.id]);

  const gesperrt = vorschlag.risiko === "hoch" && !belegeGesehen;
  const erledigt = vorschlag.status !== "offen";

  const dauer = () =>
    angezeigtSeit.current === 0
      ? 5
      : Math.max(1, Math.round((Date.now() - angezeigtSeit.current) / 1000));

  const fristText = useMemo(() => {
    if (vorschlag.ausfuehrungAm) {
      return `führt ${formatRelative(vorschlag.ausfuehrungAm, jetzt)} selbst aus`;
    }
    if (vorschlag.entscheidenBis) {
      return `entscheiden bis ${formatDateTime(vorschlag.entscheidenBis)}`;
    }
    return undefined;
  }, [vorschlag.ausfuehrungAm, vorschlag.entscheidenBis, jetzt]);

  const abschnitt = (
    schluessel: "belege" | "aktionen" | "alternativen",
    label: string,
    anzahl: number,
  ) => (
    <button
      onClick={() => {
        setOffen((o) => (o === schluessel ? null : schluessel));
        if (schluessel === "belege") setBelegeGesehen(true);
      }}
      disabled={anzahl === 0}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-medium transition-colors disabled:opacity-40",
        offen === schluessel
          ? "bg-accent-wash text-accent"
          : "text-fg-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      <Icons.ChevronRight
        className={cn("h-3 w-3 transition-transform", offen === schluessel && "rotate-90")}
        strokeWidth={2}
      />
      {anzahl} {label}
    </button>
  );

  return (
    <Karte
      data-karte={vorschlag.id}
      className={cn(
        "flex flex-col overflow-hidden",
        erledigt && "opacity-60",
        vorschlag.risiko === "hoch" && !erledigt && "border-danger/35",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3.5">
        <Plakette ton="agent">
          <Icons.Bot className="h-3 w-3" strokeWidth={1.8} /> {agentName}
        </Plakette>
        <Plakette>{KATEGORIE_LABEL[vorschlag.kategorie]}</Plakette>
        {vorschlag.risiko !== "niedrig" ? <Risiko stufe={vorschlag.risiko} /> : null}
        {objektName ? <Merkmal>{objektName}</Merkmal> : null}
        <span className="ml-auto flex items-center gap-2">
          {vorschlag.betragCent && vorschlag.betragCent > 0 ? (
            <span className="text-sm font-semibold tabular-nums">
              {formatCent(vorschlag.betragCent)}
            </span>
          ) : null}
        </span>
      </div>

      <div className="px-4 pt-2 pb-3">
        <h3 className="text-[15px] leading-snug font-semibold tracking-tight text-fg">
          {vorschlag.titel}
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{vorschlag.kurzfassung}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-2 text-2xs text-fg-subtle">
        <span className="flex items-center gap-1">
          <Icons.Activity className="h-3 w-3" strokeWidth={1.8} />
          Konfidenz {Math.round(vorschlag.konfidenz * 100)} %
        </span>
        <span className="flex items-center gap-1">
          <Icons.Clock className="h-3 w-3" strokeWidth={1.8} />
          spart {vorschlag.zeitersparnisMinuten} Min.
        </span>
        <span className="flex items-center gap-1">
          {vorschlag.reversibel ? (
            <>
              <Icons.Undo2 className="h-3 w-3" strokeWidth={1.8} /> umkehrbar
            </>
          ) : (
            <>
              <Icons.Lock className="h-3 w-3" strokeWidth={1.8} /> nicht umkehrbar
            </>
          )}
        </span>
        <span className="flex items-center gap-1">
          Stufe {vorschlag.autonomiestufe} · {AUTONOMIE_LABELS[vorschlag.autonomiestufe].kurz}
        </span>
        {fristText ? (
          <span
            className={cn(
              "flex items-center gap-1",
              vorschlag.ausfuehrungAm ? "text-info" : "text-warn",
            )}
          >
            <Icons.CalendarClock className="h-3 w-3" strokeWidth={1.8} />
            {fristText}
          </span>
        ) : null}
      </div>

      {!kompakt ? (
        <div className="border-t border-line px-4 py-3">
          <Etikett>Warum</Etikett>
          <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{vorschlag.begruendung}</p>
          {vorschlag.vorlageGrund ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-2xs text-fg-subtle">
              <Icons.Info className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
              {vorschlag.vorlageGrund}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 border-t border-line px-3 py-2">
        {abschnitt("belege", vorschlag.belege.length === 1 ? "Beleg" : "Belege", vorschlag.belege.length)}
        {abschnitt("aktionen", "Aktionen", vorschlag.aktionen.length)}
        {abschnitt(
          "alternativen",
          vorschlag.alternativen.length === 1 ? "Alternative" : "Alternativen",
          vorschlag.alternativen.length,
        )}
      </div>

      {offen === "belege" ? (
        <ul className="space-y-2 border-t border-line bg-surface-2/60 px-4 py-3">
          {vorschlag.belege.map((beleg, i) => (
            <li key={i} className="text-2xs">
              <div className="flex items-center gap-2">
                <Plakette ton={beleg.art === "gesetz" ? "info" : "neutral"}>{beleg.art}</Plakette>
                <span className="font-medium text-fg">{beleg.titel}</span>
                <Merkmal className="ml-auto">{beleg.ref}</Merkmal>
              </div>
              <p className="mt-1 border-l-2 border-line-strong pl-2.5 text-fg-muted italic">
                {beleg.zitat}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {offen === "aktionen" ? (
        <ul className="divide-y divide-line border-t border-line bg-surface-2/60">
          {vorschlag.aktionen.map((aktion, i) => (
            <li key={i} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <Symbol
                  name={AKTION_ICON[aktion.art] ?? "CircleDot"}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-2xs font-medium text-fg">{aktion.beschreibung}</p>
                  {aktion.empfaenger ? (
                    <p className="mt-0.5 text-2xs text-fg-subtle">an {aktion.empfaenger}</p>
                  ) : null}
                  {aktion.betragCent ? (
                    <p className="mt-0.5 text-2xs font-medium tabular-nums text-fg-muted">
                      {formatCent(aktion.betragCent)}
                    </p>
                  ) : null}
                  {aktion.aenderungen?.length ? (
                    <table className="mt-2 w-full text-2xs">
                      <tbody>
                        {aktion.aenderungen.map((a, k) => (
                          <tr key={k} className="align-top">
                            <td className="w-1/3 py-0.5 pr-2 text-fg-subtle">{a.feld}</td>
                            <td className="py-0.5 pr-2 text-danger/90 line-through">{a.vorher}</td>
                            <td className="py-0.5 text-ok">{a.nachher}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {aktion.entwurf ? (
                    <p className="mt-2 rounded-lg border border-line bg-surface px-2.5 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-fg-muted">
                      {aktion.entwurf}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {offen === "alternativen" ? (
        <ul className="divide-y divide-line border-t border-line bg-surface-2/60">
          {vorschlag.alternativen.map((alt, i) => (
            <li key={i} className="px-4 py-2.5">
              <p className="text-2xs font-medium text-fg">{alt.titel}</p>
              <p className="mt-0.5 text-2xs text-fg-subtle">{alt.begruendung}</p>
              <p className="mt-1 flex items-start gap-1.5 text-2xs text-warn">
                <Icons.ArrowRight className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
                {alt.folge}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {erledigt ? (
        <div className="flex items-center gap-2 border-t border-line bg-surface-2 px-4 py-2.5 text-2xs">
          <Plakette
            ton={
              vorschlag.status === "abgelehnt"
                ? "danger"
                : vorschlag.status === "automatisch_ausgefuehrt"
                  ? "agent"
                  : "ok"
            }
            punkt
          >
            {vorschlag.status === "zugestimmt"
              ? "zugestimmt"
              : vorschlag.status === "geaendert_zugestimmt"
                ? "geändert zugestimmt"
                : vorschlag.status === "abgelehnt"
                  ? "abgelehnt"
                  : vorschlag.status === "automatisch_ausgefuehrt"
                    ? "autonom ausgeführt"
                    : vorschlag.status}
          </Plakette>
          {vorschlag.entscheidung?.grund ? (
            <span className="text-fg-subtle">Grund: {vorschlag.entscheidung.grund}</span>
          ) : null}
          {vorschlag.entscheidung?.entscheidungsdauerSek ? (
            <span className="ml-auto text-fg-subtle">
              entschieden in {vorschlag.entscheidung.entscheidungsdauerSek} s
            </span>
          ) : null}
        </div>
      ) : ablehnungOffen ? (
        <div className="border-t border-line bg-surface-2 px-4 py-3">
          <Etikett>Ablehnungsgrund</Etikett>
          <p className="mt-1 text-2xs text-fg-subtle">
            Der Grund fließt in die Regeln zurück und senkt die Autonomiestufe dieses Prozesses,
            wenn er sich wiederholt.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Sachlich falsch", "Nicht jetzt", "Zu teuer", "Rechtlich riskant", "Mache ich selbst"].map(
              (vorlage) => (
                <button
                  key={vorlage}
                  onClick={() => setGrund(vorlage)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-2xs transition-colors",
                    grund === vorlage
                      ? "border-accent-line bg-accent-wash text-accent"
                      : "border-line text-fg-subtle hover:text-fg",
                  )}
                >
                  {vorlage}
                </button>
              ),
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={grund}
              onChange={(e) => setGrund(e.target.value)}
              placeholder="Grund (optional präzisieren)"
              className="flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-accent-line"
            />
            <Knopf
              variante="gefahr"
              klein
              onClick={() => aufEntscheidung("ablehnen", grund || undefined, dauer())}
            >
              Ablehnen
            </Knopf>
            <Knopf variante="geist" klein onClick={() => setAblehnungOffen(false)}>
              Zurück
            </Knopf>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <Knopf
            variante="erfolg"
            kuerzel="⏎"
            disabled={gesperrt}
            title={
              gesperrt
                ? "Bei hohem Risiko zuerst die Belege öffnen"
                : "Vorschlag annehmen und ausführen"
            }
            onClick={() => aufEntscheidung("zustimmen", undefined, dauer())}
          >
            <Icons.Check className="h-3.5 w-3.5" strokeWidth={2.2} /> Zustimmen
          </Knopf>
          <Knopf variante="gefahr" kuerzel="A" onClick={() => setAblehnungOffen(true)}>
            <Icons.X className="h-3.5 w-3.5" strokeWidth={2.2} /> Ablehnen
          </Knopf>
          <Knopf
            variante="sekundaer"
            klein
            onClick={() => aufEntscheidung("aendern", "vor Ausführung angepasst", dauer())}
          >
            Ändern und zustimmen
          </Knopf>
          <Knopf
            variante="geist"
            klein
            onClick={() => aufEntscheidung("zurueckstellen", undefined, dauer())}
          >
            Später
          </Knopf>
          {gesperrt ? (
            <span className="ml-auto flex items-center gap-1.5 text-2xs text-warn">
              <Icons.ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.8} />
              Belege öffnen, dann freigeben
            </span>
          ) : null}
        </div>
      )}
    </Karte>
  );
}
