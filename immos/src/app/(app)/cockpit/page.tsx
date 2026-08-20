import { Suspense } from "react";
import * as Icons from "lucide-react";
import { getCockpit, standardModulConfig, BEZUGSZEIT } from "@/data/world";
import { KennzahlenBand } from "@/components/cockpit/kennzahlen-band";
import { EntscheidungsStapel } from "@/components/cockpit/entscheidungs-stapel";
import { Assistent } from "@/components/cockpit/assistent";
import { VerlaufStrom } from "@/components/cockpit/verlauf-strom";
import { FristenListe } from "@/components/cockpit/fristen-liste";
import { ObjektBand } from "@/components/cockpit/objekt-band";
import { FreihaendigKnopf } from "@/components/cockpit/freihaendig-knopf";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Etikett, Karte, KartenKopf, Plakette } from "@/components/ui/display";
import { formatRelative, formatWochentag, stundeBerlin } from "@/lib/format";

export const metadata = { title: "Cockpit" };

function begruessung(iso: string): string {
  const stunde = stundeBerlin(iso);
  if (stunde < 11) return "Guten Morgen";
  if (stunde < 18) return "Guten Tag";
  return "Guten Abend";
}

export default async function CockpitSeite() {
  const config = standardModulConfig();
  const cockpit = await getCockpit(config);
  const { jetzt } = BEZUGSZEIT;

  const agentNamen = Object.fromEntries(cockpit.agenten.map((a) => [a.id, a.name]));
  const objektNamen = Object.fromEntries(
    cockpit.objekte.map((o) => [o.objekt.id, `${o.objekt.nummer} · ${o.objekt.bezeichnung}`]),
  );
  const letzterLauf = cockpit.agentLaeufe[0];
  const tag = formatWochentag(jetzt);

  return (
    <div className="immos-grid-bg min-h-full">
      <SeitenKopf
        titel={`${begruessung(jetzt)}, ${cockpit.nutzer.name.split(" ")[0]}`}
        unterzeile={
          <>
            {tag} · {cockpit.mandant.einheitenGesamt} Einheiten in {cockpit.objekte.length} Objekten
            {letzterLauf ? (
              <>
                {" "}
                · letzter Agentenlauf {formatRelative(letzterLauf.startAm, jetzt)}
              </>
            ) : null}
          </>
        }
        aktionen={
          <>
            <Plakette ton="agent" punkt>
              {cockpit.agenten.length} Agenten aktiv
            </Plakette>
            <Plakette ton="ok" punkt>
              Nachtlauf ohne Fehler
            </Plakette>
            <FreihaendigKnopf agentNamen={agentNamen} />
          </>
        }
      />

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <KennzahlenBand kennzahlen={cockpit.kennzahlen} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <section className="min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <Icons.CheckCircle2 className="h-4 w-4 text-accent" strokeWidth={1.7} />
              <h2 className="text-[13px] font-semibold tracking-tight">Zu entscheiden</h2>
              <span className="text-2xs text-fg-subtle">
                Haftung zuerst, dann Geld, dann Zeitgewinn
              </span>
            </div>
            <Suspense fallback={<Karte className="h-64" />}>
              <EntscheidungsStapel
                agentNamen={agentNamen}
                objektNamen={objektNamen}
                jetzt={jetzt}
              />
            </Suspense>
          <Karte>
            <KartenKopf
              titel="Was ImmOS heute übernommen hat"
              hinweis="Läufe der letzten Stunden mit Ergebnis und Kosten"
            />
            <ul className="divide-y divide-line">
              {cockpit.agentLaeufe.map((lauf) => {
                const agent = cockpit.agenten.find((a) => a.id === lauf.agentId);
                return (
                  <li key={lauf.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                    <Plakette ton="agent">{agent?.name ?? lauf.agentId}</Plakette>
                    <span className="min-w-0 flex-1 truncate text-xs text-fg-muted">
                      {lauf.notiz ?? lauf.ausloeser}
                    </span>
                    <Plakette
                      ton={
                        lauf.ergebnis === "ausgefuehrt"
                          ? "ok"
                          : lauf.ergebnis === "eskaliert"
                            ? "danger"
                            : lauf.ergebnis === "vorschlag"
                              ? "accent"
                              : "neutral"
                      }
                    >
                      {lauf.ergebnis === "ausgefuehrt"
                        ? "ausgeführt"
                        : lauf.ergebnis === "vorschlag"
                          ? "Vorschlag"
                          : lauf.ergebnis === "eskaliert"
                            ? "eskaliert"
                            : lauf.ergebnis}
                    </Plakette>
                    <Etikett className="w-24 text-right">
                      {(lauf.dauerMs / 1000).toFixed(1)} s
                      {lauf.kostenCent ? ` · ${lauf.kostenCent} ct` : ""}
                    </Etikett>
                  </li>
                );
              })}
            </ul>
          </Karte>
          </section>

          <aside className="flex min-w-0 flex-col gap-4">
            {/* Feste Höhe, damit der Chat scrollt statt die Spalte zu dehnen. */}
            <div className="h-[26rem] min-h-0 [&>*]:h-full">
              <Assistent sprachbefehle={cockpit.sprachbefehle} />
            </div>
            <FristenListe
              fristen={cockpit.fristenKritisch}
              jetzt={jetzt}
              objektNamen={objektNamen}
              grenze={4}
            />
            <VerlaufStrom
              ereignisse={cockpit.audit}
              jetzt={jetzt}
              objektNamen={objektNamen}
              grenze={10}
            />
          </aside>
        </div>

        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Icons.Building2 className="h-4 w-4 text-accent" strokeWidth={1.7} />
            <h2 className="text-[13px] font-semibold tracking-tight">Bestand</h2>
          </div>
          <ObjektBand objekte={cockpit.objekte} />
        </section>

      </div>
    </div>
  );
}
