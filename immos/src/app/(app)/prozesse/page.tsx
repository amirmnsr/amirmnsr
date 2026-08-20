import * as Icons from "lucide-react";
import { PLAYBOOKS, bilanz, type Verantwortung } from "@/domain/playbooks";
import { MODULE_MAP } from "@/domain/modules";
import { standardModulConfig } from "@/data/world";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Balken, Etikett, Karte, KartenKopf, Merkmal, Plakette } from "@/components/ui/display";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Prozesse" };

const VERANTWORTUNG_LABEL: Record<Verantwortung, string> = {
  auto: "ImmOS führt aus",
  vorschlag: "ImmOS schlägt vor",
  mensch: "Mensch entscheidet",
};

const VERANTWORTUNG_TON: Record<Verantwortung, "agent" | "accent" | "warn"> = {
  auto: "agent",
  vorschlag: "accent",
  mensch: "warn",
};

const VERANTWORTUNG_STRICH: Record<Verantwortung, string> = {
  auto: "border-agent/50 bg-agent-wash",
  vorschlag: "border-accent-line bg-accent-wash",
  mensch: "border-warn/40 bg-warn-wash",
};

export default async function ProzesseSeite() {
  const config = standardModulConfig();
  const sichtbar = PLAYBOOKS.filter((p) => config[p.modulId]);
  const b = bilanz(sichtbar);

  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Betriebsabläufe"
        unterzeile="Jeder Ablauf Schritt für Schritt — mit der einzigen Angabe, die zählt: wer macht ihn. Die menschlichen Schritte sind bewusst benannt, nicht versteckt."
        aktionen={
          <>
            <Plakette ton="agent" punkt>
              {b.auto} automatisch
            </Plakette>
            <Plakette ton="accent" punkt>
              {b.vorschlag} als Vorschlag
            </Plakette>
            <Plakette ton="warn" punkt>
              {b.mensch} beim Menschen
            </Plakette>
          </>
        }
      />

      <div className="space-y-4 px-4 py-5 sm:px-6">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <Karte className="p-4">
            <Etikett>Abgebildete Abläufe</Etikett>
            <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">
              {sichtbar.length}
            </p>
            <p className="mt-1 text-2xs text-fg-subtle">{b.schritteGesamt} Schritte insgesamt</p>
          </Karte>
          <Karte className="p-4">
            <Etikett>Ohne menschlichen Eingriff</Etikett>
            <p className="mt-1 text-2xl leading-none font-semibold tabular-nums text-agent">
              {formatPercent(b.auto / b.schritteGesamt)}
            </p>
            <Balken className="mt-2" anteil={b.auto / b.schritteGesamt} ton="agent" />
          </Karte>
          <Karte className="p-4">
            <Etikett>Bearbeitungszeit je Durchlauf</Etikett>
            <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">
              {formatNumber(b.aufwandNachherMinuten, 0)}
              <span className="text-sm text-fg-subtle">
                {" "}
                statt {formatNumber(b.aufwandVorherMinuten, 0)} Min.
              </span>
            </p>
            <p className="mt-1 text-2xs text-fg-subtle">
              Summe über alle Abläufe, Erfahrungswerte einer Verwaltung mit rund 150 Einheiten
            </p>
          </Karte>
          <Karte className="p-4">
            <Etikett>Ersparnis</Etikett>
            <p className="mt-1 text-2xl leading-none font-semibold tabular-nums text-ok">
              {formatPercent(b.ersparnisAnteil)}
            </p>
            <p className="mt-1 text-2xs text-fg-subtle">
              der Bearbeitungszeit — nicht der Verantwortung
            </p>
          </Karte>
        </div>

        {sichtbar.map((playbook) => (
          <Karte key={playbook.id}>
            <KartenKopf
              titel={playbook.name}
              hinweis={`${playbook.ausloeser} · ${playbook.haeufigkeit}`}
              aktion={
                <div className="flex flex-wrap items-center gap-2">
                  <Merkmal>{MODULE_MAP[playbook.modulId]?.name}</Merkmal>
                  <Plakette ton="ok">
                    {playbook.aufwandNachherMinuten} statt {playbook.aufwandVorherMinuten} Min.
                  </Plakette>
                </div>
              }
            />
            <ol className="divide-y divide-line">
              {playbook.schritte.map((schritt, i) => (
                <li key={i} className="flex gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums",
                      VERANTWORTUNG_STRICH[schritt.verantwortung],
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-fg">{schritt.titel}</span>
                      <Plakette ton={VERANTWORTUNG_TON[schritt.verantwortung]} punkt>
                        {VERANTWORTUNG_LABEL[schritt.verantwortung]}
                      </Plakette>
                      {schritt.frist ? (
                        <span className="flex items-center gap-1 text-2xs text-fg-subtle">
                          <Icons.CalendarClock className="h-3 w-3" strokeWidth={1.8} />
                          {schritt.frist}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-2xs leading-relaxed text-fg-muted">
                      {schritt.beschreibung}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      {schritt.artefakt ? (
                        <span className="flex items-center gap-1 text-2xs text-fg-subtle">
                          <Icons.FileText className="h-3 w-3" strokeWidth={1.8} />
                          {schritt.artefakt}
                        </span>
                      ) : null}
                      {schritt.agentId ? (
                        <span className="flex items-center gap-1 text-2xs text-agent">
                          <Icons.Bot className="h-3 w-3" strokeWidth={1.8} />
                          {schritt.agentId}
                        </span>
                      ) : null}
                      {schritt.grund ? (
                        <span className="text-2xs text-warn">Warum Mensch: {schritt.grund}</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Karte>
        ))}

        <Karte className="border-info/30">
          <div className="flex items-start gap-3 px-4 py-3">
            <Icons.Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={1.8} />
            <p className="text-2xs leading-relaxed text-fg-muted">
              Diese Abläufe sind Daten, nicht Programmlogik: neue Schritte, andere Reihenfolgen und
              geänderte Verantwortlichkeiten sind eine Konfigurationsänderung. Was hier als
              „Mensch entscheidet“ steht, bleibt auch bei höchster Autonomiestufe beim Menschen —
              die Autonomie-Matrix kann diese Schritte nicht überschreiben.
            </p>
          </div>
        </Karte>
      </div>
    </div>
  );
}
