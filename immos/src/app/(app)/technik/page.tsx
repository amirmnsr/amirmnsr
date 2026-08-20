import * as Icons from "lucide-react";
import { BEZUGSZEIT, getTechnik } from "@/data/world";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Karte, KartenKopf, Merkmal, Plakette, Zeile } from "@/components/ui/display";
import { daysUntil, formatCent, formatDate, formatDeadline } from "@/lib/format";

export const metadata = { title: "Technik & Pflichten" };

export default async function TechnikSeite() {
  const daten = await getTechnik();
  const { jetzt } = BEZUGSZEIT;
  const ueberfaellig = daten.pruefpflichten.filter((p) => p.status === "ueberfaellig");
  const faellig = daten.pruefpflichten.filter((p) => p.status === "faellig");

  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Technik & Betreiberpflichten"
        unterzeile="Prüfpflichten mit Rechtsgrundlage, Intervall und Haftungsrisiko. Der Wächter eskaliert vor Ablauf, nicht danach."
        aktionen={
          <>
            {ueberfaellig.length > 0 ? (
              <Plakette ton="danger" punkt>
                {ueberfaellig.length} überfällig
              </Plakette>
            ) : null}
            <Plakette ton="warn">{faellig.length} fällig</Plakette>
            <Plakette>{daten.anlagen.length} Anlagen</Plakette>
          </>
        }
      />

      <div className="space-y-4 px-4 py-5 sm:px-6">
        <Karte className="overflow-x-auto">
          <KartenKopf
            titel="Prüf- und Betreiberpflichten"
            hinweis="Rechtsangaben sind Arbeitsstand und vor produktivem Einsatz zu verifizieren"
          />
          <table className="w-full min-w-[60rem] text-xs">
            <thead>
              <tr className="border-b border-line text-left">
                {["Pflicht", "Objekt", "Rechtsgrundlage", "Intervall", "Letzte", "Nächste", "Risiko", "Status"].map(
                  (h) => (
                    <th key={h} className="label-caps px-3 py-2">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {daten.pruefpflichten.map((p) => {
                const tage = daysUntil(p.naechstePruefung, jetzt);
                return (
                  <tr key={p.id} className="hover:bg-surface-2">
                    <td className="px-3 py-2 font-medium">{p.bezeichnung}</td>
                    <td className="px-3 py-2 text-fg-subtle">{daten.objektNamen[p.objektId]}</td>
                    <td className="max-w-[18rem] px-3 py-2 font-mono text-[10px] text-fg-subtle">
                      {p.rechtsgrundlage}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-fg-subtle">
                      {p.intervallMonate} Mon.
                    </td>
                    <td className="px-3 py-2 tabular-nums text-fg-subtle">
                      {p.letztePruefung ? formatDate(p.letztePruefung) : "unbekannt"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatDate(p.naechstePruefung)}</td>
                    <td className="px-3 py-2">
                      <Plakette
                        ton={
                          p.haftungsrisiko === "hoch"
                            ? "danger"
                            : p.haftungsrisiko === "mittel"
                              ? "warn"
                              : "neutral"
                        }
                      >
                        {p.haftungsrisiko}
                      </Plakette>
                    </td>
                    <td className="px-3 py-2">
                      <Plakette
                        ton={tage < 0 ? "danger" : tage < 30 ? "warn" : "ok"}
                        punkt
                      >
                        {formatDeadline(p.naechstePruefung, jetzt)}
                      </Plakette>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Karte>

        <div className="grid gap-3 lg:grid-cols-2">
          <Karte>
            <KartenKopf titel="Anlagenregister" hinweis="Zustand und Restnutzungsdauer als Planungsgrundlage" />
            <ul className="divide-y divide-line">
              {daten.anlagen.map((a) => (
                <li key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {a.bezeichnung}
                    </span>
                    <Plakette
                      ton={a.zustand === "gut" ? "ok" : a.zustand === "mittel" ? "warn" : "danger"}
                    >
                      {a.zustand}
                    </Plakette>
                  </div>
                  <p className="mt-0.5 text-2xs text-fg-subtle">
                    {daten.objektNamen[a.objektId]} · {a.standort}
                    {a.baujahr ? ` · Baujahr ${a.baujahr}` : ""}
                    {a.restnutzungsdauerJahre
                      ? ` · Restnutzungsdauer ca. ${a.restnutzungsdauerJahre} Jahre`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Karte>

          <Karte>
            <KartenKopf
              titel="Aufträge"
              hinweis="mit Budget, Angebot, Rechnung und Gewährleistungsende"
            />
            <ul className="divide-y divide-line">
              {daten.auftraege.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Merkmal>{a.nummer}</Merkmal>
                    <span className="text-xs font-medium">{daten.dienstleisterNamen[a.dienstleisterId]}</span>
                    <Plakette
                      ton={
                        a.status === "abgenommen"
                          ? "ok"
                          : a.status === "reklamation"
                            ? "danger"
                            : "accent"
                      }
                    >
                      {a.status.replace(/_/g, " ")}
                    </Plakette>
                    {a.beschlussId ? <Plakette ton="info">durch Beschluss gedeckt</Plakette> : null}
                    {a.versicherungsfallId ? (
                      <Plakette ton="info">Versicherungsfall {a.versicherungsfallId}</Plakette>
                    ) : null}
                  </div>
                  <p className="mt-1 text-2xs leading-relaxed text-fg-muted">{a.beschreibung}</p>
                  <div className="mt-1.5">
                    {a.budgetCent ? <Zeile label="Budget">{formatCent(a.budgetCent)}</Zeile> : null}
                    {a.angebotCent ? <Zeile label="Angebot">{formatCent(a.angebotCent)}</Zeile> : null}
                    {a.rechnungCent ? (
                      <Zeile label="Rechnung">{formatCent(a.rechnungCent)}</Zeile>
                    ) : null}
                    {a.gewaehrleistungBis ? (
                      <Zeile label="Gewährleistung bis">
                        <span
                          className={
                            daysUntil(a.gewaehrleistungBis, jetzt) < 90 ? "text-warn" : undefined
                          }
                        >
                          {formatDate(a.gewaehrleistungBis)}
                        </span>
                      </Zeile>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Karte>
        </div>

        <Karte className="border-info/30">
          <div className="flex items-start gap-3 px-4 py-3">
            <Icons.Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={1.8} />
            <p className="text-2xs leading-relaxed text-fg-muted">
              Der Pflichtenkatalog ist als Datensatz je Anlage gepflegt, nicht als Programmlogik.
              Ändert sich eine Vorschrift, ändert sich ein Intervall in einer Tabelle — kein
              Software-Release. Landesrecht (etwa Rauchwarnmelderpflichten) wird dabei je Objekt
              geführt, weil es sich zwischen Bundesländern unterscheidet.
            </p>
          </div>
        </Karte>
      </div>
    </div>
  );
}
