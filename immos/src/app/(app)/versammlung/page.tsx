import * as Icons from "lucide-react";
import { BEZUGSZEIT, getVersammlung } from "@/data/world";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Balken, Etikett, Karte, KartenKopf, Leer, Merkmal, Plakette, Zeile } from "@/components/ui/display";
import { daysUntil, formatCent, formatDate, formatDateTime, formatNumber } from "@/lib/format";

export const metadata = { title: "Versammlung" };

export default async function VersammlungSeite() {
  const daten = await getVersammlung();
  const { jetzt } = BEZUGSZEIT;

  if (!daten) {
    return (
      <div className="min-h-full">
        <SeitenKopf titel="Versammlung" />
        <Leer titel="Keine Versammlung geplant" text="Das Modul WEG ist aktiv, aber es liegt kein Termin vor." />
      </div>
    );
  }

  const { versammlung, objekt, stimmen, meaSumme, beschluesse } = daten;
  const tageBisEinladung = daysUntil(versammlung.einladungBis, jetzt);
  const beschlussTops = versammlung.tagesordnung.filter((t) => t.art === "beschluss");
  const risiken = versammlung.tagesordnung.filter((t) => t.risiko);

  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Eigentümerversammlung"
        unterzeile={`${objekt?.bezeichnung} · ${formatDateTime(versammlung.termin)} · ${versammlung.ort} · ${versammlung.art}`}
        aktionen={
          <>
            <Plakette ton={tageBisEinladung < 7 ? "warn" : "accent"} punkt>
              Einladung bis {formatDate(versammlung.einladungBis)}
            </Plakette>
            <Plakette>{versammlung.eigentuemerAnzahl} Eigentümer</Plakette>
          </>
        }
      />

      <div className="space-y-4 px-4 py-5 sm:px-6">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <Karte className="p-4">
            <Etikett>Einberufungsfrist</Etikett>
            <p className="mt-1 text-xl font-semibold tabular-nums">{tageBisEinladung} Tage</p>
            <p className="mt-1 text-2xs leading-relaxed text-fg-subtle">
              §24 Abs. 4 WEG: drei Wochen in Textform. Bei Postversand drei Werktage Zustellung
              einrechnen.
            </p>
          </Karte>
          <Karte className="p-4">
            <Etikett>Stimmkraft erfasst</Etikett>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {formatNumber(meaSumme, 1)} / 1000
            </p>
            <Balken className="mt-2" anteil={meaSumme / 1000} ton={meaSumme > 999 ? "ok" : "warn"} />
            <p className="mt-1 text-2xs text-fg-subtle">
              Miteigentumsanteile aller {stimmen.length} Einheiten
            </p>
          </Karte>
          <Karte className="p-4">
            <Etikett>Vollmachten</Etikett>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {versammlung.vollmachtenErhalten}
            </p>
            <p className="mt-1 text-2xs text-fg-subtle">
              werden vor Beginn auf Form und Umfang geprüft
            </p>
          </Karte>
          <Karte className="p-4">
            <Etikett>Beschlussanträge</Etikett>
            <p className="mt-1 text-xl font-semibold tabular-nums">{beschlussTops.length}</p>
            <p className={`mt-1 text-2xs ${risiken.length > 0 ? "text-warn" : "text-fg-subtle"}`}>
              {risiken.length > 0
                ? `${risiken.length} mit Hinweis des Beschluss-Prüfers`
                : "keine Auffälligkeiten"}
            </p>
          </Karte>
        </div>

        <Karte>
          <KartenKopf
            titel="Tagesordnung"
            hinweis="Beschlussvorschläge im Wortlaut, geprüft auf Beschlusskompetenz und Anfechtungsrisiko"
          />
          <ol className="divide-y divide-line">
            {versammlung.tagesordnung.map((top) => (
              <li key={top.nummer} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Merkmal>TOP {top.nummer}</Merkmal>
                  <span className="text-xs font-semibold text-fg">{top.titel}</span>
                  <Plakette
                    ton={top.art === "beschluss" ? "accent" : "neutral"}
                  >
                    {top.art}
                  </Plakette>
                  {top.erforderlicheMehrheit !== "—" ? (
                    <Plakette>{top.erforderlicheMehrheit}e Mehrheit</Plakette>
                  ) : null}
                  {top.budgetCent ? (
                    <span className="ml-auto text-xs font-medium tabular-nums">
                      {formatCent(top.budgetCent)}
                    </span>
                  ) : null}
                </div>
                {top.beschlussvorschlag ? (
                  <p className="mt-1.5 border-l-2 border-line-strong pl-2.5 text-2xs leading-relaxed text-fg-muted italic">
                    {top.beschlussvorschlag}
                  </p>
                ) : null}
                {top.risiko ? (
                  <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-warn/30 bg-warn-wash px-2.5 py-2 text-2xs leading-relaxed text-warn">
                    <Icons.ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
                    {top.risiko}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </Karte>

        <div className="grid gap-3 lg:grid-cols-2">
          <Karte className="overflow-x-auto">
            <KartenKopf
              titel="Stimmkraft je Einheit"
              hinweis="Grundlage der Abstimmung — Selbstnutzer sind markiert"
            />
            <table className="w-full min-w-[32rem] text-xs">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Einheit", "Eigentümer", "MEA", "Nutzung"].map((h) => (
                    <th key={h} className="label-caps px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stimmen.map((s) => (
                  <tr key={s.einheitId} className="hover:bg-surface-2">
                    <td className="px-3 py-1.5">{s.bezeichnung}</td>
                    <td className="px-3 py-1.5 text-fg-muted">{s.eigentuemer}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {formatNumber(s.meaTausendstel, 1)}
                    </td>
                    <td className="px-3 py-1.5">
                      {s.selbstnutzer ? (
                        <Plakette ton="info">selbst genutzt</Plakette>
                      ) : (
                        <span className="text-fg-subtle">vermietet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Karte>

          <Karte>
            <KartenKopf
              titel="Beschluss-Sammlung"
              hinweis="§24 Abs. 7 WEG — fortlaufend geführt, mit Umsetzungsstand"
            />
            <ul className="divide-y divide-line">
              {beschluesse.map((b) => (
                <li key={b.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Merkmal>
                      {b.datum.slice(0, 4)}-{String(b.laufendeNr).padStart(2, "0")}
                    </Merkmal>
                    <span className="text-xs font-medium">{b.gegenstand}</span>
                    <Plakette ton={b.ergebnis === "angenommen" ? "ok" : "danger"}>
                      {b.ergebnis}
                    </Plakette>
                  </div>
                  <Zeile label="Stimmen">
                    {b.jaStimmen} : {b.neinStimmen} : {b.enthaltungen}
                  </Zeile>
                  <Zeile label="Anfechtungsfrist">{formatDate(b.anfechtungsfristBis)}</Zeile>
                  <Zeile label="Umsetzung">{b.umsetzungStatus.replace(/_/g, " ")}</Zeile>
                </li>
              ))}
            </ul>
          </Karte>
        </div>

        <Karte className="border-info/30">
          <div className="flex items-start gap-3 px-4 py-3">
            <Icons.Info className="mt-0.5 h-4 w-4 shrink-0 text-info" strokeWidth={1.8} />
            <p className="text-2xs leading-relaxed text-fg-muted">
              Der Versammlungs-Assistent erzeugt Einladung, Vollmachtsformular und Anlagen, prüft
              die Frist gegen den Versandweg, berechnet während der Versammlung die Stimmkraft je
              Antrag und schreibt das Protokoll mit. Beschlüsse landen unmittelbar in der
              Beschluss-Sammlung, samt Anfechtungsfrist und Umsetzungsauftrag. Was er nicht tut:
              Beschlüsse formulieren, die eine Kostenverteilung mitbeschließen müssten, ohne darauf
              hinzuweisen.
            </p>
          </div>
        </Karte>
      </div>
    </div>
  );
}
