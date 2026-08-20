"use client";

import * as Icons from "lucide-react";
import type { AgentDefinition, Autonomiestufe } from "@/domain";
import { AUTONOMIE_LABELS } from "@/domain/ai";
import { MODULE_MAP } from "@/domain/modules";
import { useImmos } from "@/state/immos-store";
import { Balken, Etikett, Karte, KartenKopf, Merkmal, Plakette } from "@/components/ui/display";
import { formatCent, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Autonomie-Matrix
 * =============================================================================
 * Die wichtigste Einstellungsseite des Systems. Hier entscheidet die Verwaltung,
 * wie viel Verantwortung sie abgibt — pro Prozess und pro Betrag, nicht global.
 *
 * Zwei Dinge sind bewusst nicht verhandelbar:
 *  - Prozesse mit einer Höchststufe können nicht darüber gestellt werden. Die
 *    Begründung steht daneben, damit niemand raten muss.
 *  - Zahlungen bleiben freigabepflichtig; ab Betragsgrenze gilt Vier-Augen.
 */

const STUFEN: Autonomiestufe[] = [0, 1, 2, 3];

export function AutonomieMatrix({ agenten }: { agenten: AgentDefinition[] }) {
  const { autonomie, setzeStufe, setzeGrenze, modulAktiv } = useImmos();
  const sichtbar = autonomie.filter((r) => modulAktiv(r.modulId));

  const verteilung = STUFEN.map((s) => ({
    stufe: s,
    anzahl: sichtbar.filter((r) => r.stufe === s).length,
  }));
  const faelle = sichtbar.reduce((s, r) => s + r.faelle30Tage, 0);
  const autonomAnteil =
    faelle > 0
      ? sichtbar.filter((r) => r.stufe >= 2).reduce((s, r) => s + r.faelle30Tage, 0) / faelle
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {verteilung.map((v) => (
          <Karte key={v.stufe} className="p-4">
            <Etikett>
              Stufe {v.stufe} · {AUTONOMIE_LABELS[v.stufe].kurz}
            </Etikett>
            <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">{v.anzahl}</p>
            <p className="mt-1 text-2xs leading-relaxed text-fg-subtle">
              {AUTONOMIE_LABELS[v.stufe].lang}
            </p>
          </Karte>
        ))}
      </div>

      <Karte>
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Etikett>Anteil autonom erledigter Fälle</Etikett>
            <div className="mt-1.5 flex items-center gap-3">
              <Balken anteil={autonomAnteil} ton="agent" className="max-w-md" />
              <span className="text-sm font-semibold tabular-nums">
                {formatPercent(autonomAnteil)}
              </span>
            </div>
            <p className="mt-1 text-2xs text-fg-subtle">
              {faelle.toLocaleString("de-DE")} Fälle in 30 Tagen über {sichtbar.length} Prozesse
            </p>
          </div>
          <p className="max-w-md text-2xs leading-relaxed text-fg-subtle">
            Eine Stufe wird erst empfohlen, wenn genügend Fälle vorliegen, die Zustimmungsquote
            hoch und die Korrekturquote niedrig ist. Blindes Durchklicken zählt nicht als
            Zustimmung — die Entscheidungsdauer geht in die Bewertung ein.
          </p>
        </div>
      </Karte>

      <Karte className="overflow-x-auto">
        <KartenKopf
          titel="Prozesse"
          hinweis="Stufe und Betragsgrenze sind je Prozess einstellbar. Änderungen wirken sofort auf neue Vorschläge."
        />
        <table className="w-full min-w-[68rem] text-xs">
          <thead>
            <tr className="border-b border-line text-left">
              {["Prozess", "Modul", "Stufe", "Betragsgrenze", "Fälle 30 T.", "Zustimmung", "Korrektur", "Empfehlung"].map(
                (h) => (
                  <th key={h} className="label-caps px-3 py-2">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sichtbar.map((r) => (
              <tr key={r.prozess} className="align-top hover:bg-surface-2">
                <td className="px-3 py-3">
                  <span className="block font-medium">{r.bezeichnung}</span>
                  <Merkmal>{r.prozess}</Merkmal>
                  {r.maxStufeGrund ? (
                    <span className="mt-1 flex max-w-sm items-start gap-1.5 text-2xs text-warn">
                      <Icons.Lock className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
                      Höchststufe {r.maxStufe}: {r.maxStufeGrund}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-fg-subtle">{MODULE_MAP[r.modulId]?.name}</td>
                <td className="px-3 py-3">
                  <div className="inline-flex overflow-hidden rounded-lg border border-line">
                    {STUFEN.map((s) => {
                      const gesperrt = s > r.maxStufe;
                      return (
                        <button
                          key={s}
                          disabled={gesperrt}
                          onClick={() => setzeStufe(r.prozess, s)}
                          title={
                            gesperrt
                              ? `Nicht zulässig: ${r.maxStufeGrund ?? "Höchststufe erreicht"}`
                              : AUTONOMIE_LABELS[s].lang
                          }
                          className={cn(
                            "px-2 py-1 text-2xs transition-colors",
                            r.stufe === s
                              ? "bg-accent text-fg-inverse font-semibold"
                              : gesperrt
                                ? "cursor-not-allowed text-fg-subtle/40"
                                : "text-fg-subtle hover:bg-surface-3 hover:text-fg",
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                  <span className="mt-1 block text-2xs text-fg-subtle">
                    {AUTONOMIE_LABELS[r.stufe].kurz}
                    {r.stufe === 2 ? ` · ${r.widerspruchsfensterMinuten} Min. Widerspruch` : ""}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={r.betragsgrenzeCent === null ? "" : r.betragsgrenzeCent / 100}
                    placeholder="ohne Grenze"
                    onChange={(e) =>
                      setzeGrenze(
                        r.prozess,
                        e.target.value === "" ? null : Math.round(Number(e.target.value) * 100),
                      )
                    }
                    className="w-28 rounded-lg border border-line bg-surface px-2 py-1 text-2xs tabular-nums outline-none focus:border-accent-line"
                  />
                  <span className="mt-1 block text-2xs text-fg-subtle">
                    {r.betragsgrenzeCent === null
                      ? "keine Betragsprüfung"
                      : `über ${formatCent(r.betragsgrenzeCent)} immer vorlegen`}
                  </span>
                </td>
                <td className="px-3 py-3 tabular-nums">{r.faelle30Tage}</td>
                <td className="w-28 px-3 py-3">
                  <Balken
                    anteil={r.zustimmungsquote}
                    ton={r.zustimmungsquote > 0.95 ? "ok" : r.zustimmungsquote > 0.85 ? "accent" : "warn"}
                  />
                  <span className="mt-1 block text-2xs tabular-nums text-fg-subtle">
                    {formatPercent(r.zustimmungsquote)}
                  </span>
                </td>
                <td className="w-28 px-3 py-3">
                  <Balken
                    anteil={r.korrekturquote}
                    ton={r.korrekturquote < 0.05 ? "ok" : r.korrekturquote < 0.15 ? "warn" : "danger"}
                  />
                  <span className="mt-1 block text-2xs tabular-nums text-fg-subtle">
                    {formatPercent(r.korrekturquote)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {r.aufstiegEmpfohlen && r.stufe < r.maxStufe ? (
                    <button
                      onClick={() => setzeStufe(r.prozess, Math.min(r.stufe + 1, r.maxStufe) as Autonomiestufe)}
                      className="inline-flex items-center gap-1 rounded-full border border-accent-line bg-accent-wash px-2 py-0.5 text-2xs text-accent hover:bg-accent/15"
                    >
                      <Icons.TrendingUp className="h-3 w-3" strokeWidth={2} />
                      auf Stufe {r.stufe + 1}
                    </button>
                  ) : r.stufe >= r.maxStufe ? (
                    <Plakette ton="neutral">Höchststufe</Plakette>
                  ) : (
                    <span className="text-2xs text-fg-subtle">noch nicht belastbar</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Karte>

      <Karte>
        <KartenKopf
          titel="Agenten"
          hinweis="Wirkungskreis, Trigger, Eskalationsregel und Erfolgsmaß je Agent"
        />
        <div className="grid gap-2.5 p-4 md:grid-cols-2 xl:grid-cols-3">
          {agenten.map((a) => (
            <div key={a.id} className="rounded-lg border border-line bg-surface-2 p-3">
              <div className="flex items-center gap-2">
                <Icons.Bot className="h-3.5 w-3.5 text-agent" strokeWidth={1.8} />
                <span className="text-xs font-semibold">{a.name}</span>
              </div>
              <p className="mt-1.5 text-2xs leading-relaxed text-fg-muted">{a.rolle}</p>
              <dl className="mt-2 space-y-1 text-2xs">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-fg-subtle">Auslöser</dt>
                  <dd className="text-fg-muted">{a.trigger}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-fg-subtle">Entscheidet</dt>
                  <dd className="text-fg-muted">{a.entscheidet}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-fg-subtle">Eskaliert</dt>
                  <dd className="text-fg-muted">{a.eskalation}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-fg-subtle">Erfolgsmaß</dt>
                  <dd className="text-fg-muted">{a.kpi}</dd>
                </div>
              </dl>
              <div className="mt-2 flex flex-wrap gap-1">
                {a.werkzeuge.map((w) => (
                  <Merkmal key={w} className="rounded bg-surface-3 px-1.5 py-0.5">
                    {w}
                  </Merkmal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Karte>
    </div>
  );
}
