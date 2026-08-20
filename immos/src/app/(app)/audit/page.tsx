import { BEZUGSZEIT, getAudit } from "@/data/world";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Karte, KartenKopf, Merkmal, Plakette } from "@/components/ui/display";
import { formatDateTime, formatRelative } from "@/lib/format";

export const metadata = { title: "Nachweis" };

const LEGITIMATION: Record<string, string> = {
  entscheidung: "Zustimmung eines Menschen",
  autonomie_stufe: "Autonomiestufe",
  gesetzlich: "gesetzliche Pflicht",
  beschluss: "Beschluss der Gemeinschaft",
};

export default async function AuditSeite() {
  const daten = await getAudit();
  const { jetzt } = BEZUGSZEIT;
  const vonAgenten = daten.ereignisse.filter((e) => e.akteurArt === "agent").length;

  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Nachweis"
        unterzeile="Jede Ausführung mit Akteur, Zeitpunkt, Änderung und Legitimation. Ohne diese Spalte wäre Automatisierung in einer Verwaltung nicht vertretbar."
        aktionen={
          <>
            <Plakette ton="agent" punkt>
              {vonAgenten} von Agenten
            </Plakette>
            <Plakette>{daten.ereignisse.length - vonAgenten} von Menschen und System</Plakette>
          </>
        }
      />
      <div className="px-4 py-5 sm:px-6">
        <Karte className="overflow-x-auto">
          <KartenKopf
            titel="Ereignisse"
            hinweis="unveränderbar, absteigend nach Zeitpunkt — im Produktivbetrieb revisionssicher gespeichert"
          />
          <table className="w-full min-w-[64rem] text-xs">
            <thead>
              <tr className="border-b border-line text-left">
                {["Zeitpunkt", "Akteur", "Aktion", "Objekt", "Entität", "Änderung", "Legitimation"].map(
                  (h) => (
                    <th key={h} className="label-caps px-3 py-2">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {daten.ereignisse.map((e) => (
                <tr key={e.id} className="align-top hover:bg-surface-2">
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                    <span className="block">{formatDateTime(e.am)}</span>
                    <span className="block text-[10px] text-fg-subtle">
                      {formatRelative(e.am, jetzt)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Plakette
                      ton={
                        e.akteurArt === "agent"
                          ? "agent"
                          : e.akteurArt === "mensch"
                            ? "accent"
                            : e.akteurArt === "extern"
                              ? "info"
                              : "neutral"
                      }
                    >
                      {e.akteurName}
                    </Plakette>
                  </td>
                  <td className="max-w-[24rem] px-3 py-2 text-fg-muted">{e.aktion}</td>
                  <td className="px-3 py-2 text-fg-subtle">
                    {e.objektId ? daten.objektNamen[e.objektId] : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Merkmal>
                      {e.entitaet} · {e.entitaetId}
                    </Merkmal>
                  </td>
                  <td className="px-3 py-2">
                    {e.aenderungen?.length ? (
                      <ul className="space-y-0.5">
                        {e.aenderungen.map((a, i) => (
                          <li key={i} className="text-2xs">
                            <span className="text-fg-subtle">{a.feld}: </span>
                            <span className="text-danger/90 line-through">{a.vorher}</span>
                            <span className="text-fg-subtle"> → </span>
                            <span className="text-ok">{a.nachher}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-fg-subtle">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-2xs text-fg-subtle">
                    {e.legitimation ? LEGITIMATION[e.legitimation] : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Karte>
      </div>
    </div>
  );
}
