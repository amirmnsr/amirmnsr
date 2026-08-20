import * as Icons from "lucide-react";
import type { AuditEreignis } from "@/domain";
import { Karte, KartenKopf, Merkmal, Plakette } from "@/components/ui/display";
import { formatRelative } from "@/lib/format";

/**
 * Verlauf
 * =============================================================================
 * Was hat das System zuletzt getan — und mit welcher Legitimation. Genau diese
 * Spalte macht Autonomie vertretbar: nichts passiert unsichtbar.
 */

const AKTEUR_TON = {
  agent: "agent",
  mensch: "accent",
  system: "neutral",
  extern: "info",
} as const;

const LEGITIMATION_TEXT: Record<string, string> = {
  entscheidung: "durch Zustimmung gedeckt",
  autonomie_stufe: "durch Autonomiestufe gedeckt",
  gesetzlich: "gesetzliche Pflicht",
  beschluss: "durch Beschluss gedeckt",
};

export function VerlaufStrom({
  ereignisse,
  jetzt,
  objektNamen,
  grenze = 8,
}: {
  ereignisse: AuditEreignis[];
  jetzt: string;
  objektNamen: Record<string, string>;
  grenze?: number;
}) {
  return (
    <Karte className="flex min-h-0 flex-col">
      <KartenKopf
        titel="Verlauf"
        hinweis="Jede Ausführung mit Akteur und Legitimation"
        aktion={
          <a href="/audit" className="text-2xs text-accent hover:underline">
            vollständiger Nachweis
          </a>
        }
      />
      <ol className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {ereignisse.slice(0, grenze).map((e) => (
          <li key={e.id} className="flex gap-2.5 px-4 py-2.5">
            <span className="mt-0.5">
              {e.akteurArt === "agent" ? (
                <Icons.Bot className="h-3.5 w-3.5 text-agent" strokeWidth={1.7} />
              ) : e.akteurArt === "mensch" ? (
                <Icons.Users className="h-3.5 w-3.5 text-accent" strokeWidth={1.7} />
              ) : e.akteurArt === "extern" ? (
                <Icons.Mail className="h-3.5 w-3.5 text-info" strokeWidth={1.7} />
              ) : (
                <Icons.Zap className="h-3.5 w-3.5 text-fg-subtle" strokeWidth={1.7} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug text-fg-muted">{e.aktion}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Plakette ton={AKTEUR_TON[e.akteurArt]}>{e.akteurName}</Plakette>
                {e.objektId && objektNamen[e.objektId] ? (
                  <Merkmal>{objektNamen[e.objektId]}</Merkmal>
                ) : null}
                <span className="text-2xs text-fg-subtle">{formatRelative(e.am, jetzt)}</span>
                {e.legitimation ? (
                  <span className="text-2xs text-fg-subtle">
                    · {LEGITIMATION_TEXT[e.legitimation] ?? e.legitimation}
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Karte>
  );
}
