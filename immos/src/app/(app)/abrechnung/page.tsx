import Link from "next/link";
import { getAbrechnung, getAbrechnungsLauf } from "@/data/world";
import { AbrechnungsAnsicht } from "@/components/abrechnung/abrechnungs-ansicht";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Karte, KartenKopf, Plakette } from "@/components/ui/display";
import { formatCent, formatDate } from "@/lib/format";

export const metadata = { title: "Abrechnung" };

export default async function AbrechnungSeite() {
  const [uebersicht, lauf] = await Promise.all([
    getAbrechnung(),
    getAbrechnungsLauf("obj-1042", 2025),
  ]);

  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Abrechnung"
        unterzeile="Betriebs- und Heizkosten, WEG-Jahresabrechnung, Eigentümerabrechnung. Gerechnet wird deterministisch — das Sprachmodell formuliert nur die Erläuterung."
        aktionen={
          <Plakette ton="ok" punkt>
            Engine mit Testabdeckung
          </Plakette>
        }
      />

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <Karte className="overflow-x-auto">
          <KartenKopf titel="Läufe" hinweis="alle Objekte und Abrechnungsarten" />
          <table className="w-full min-w-[52rem] text-xs">
            <thead>
              <tr className="border-b border-line text-left">
                {["Objekt", "Jahr", "Art", "Status", "Frist", "Gesamtkosten", "Umlagefähig", "Geprüft"].map(
                  (h) => (
                    <th key={h} className="label-caps px-3 py-2">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {uebersicht.laeufe
                // Für den gerechneten Lauf die Zahlen aus der Engine zeigen, damit
                // Übersicht und Detail identisch sind.
                .map((l) => (lauf && l.id === lauf.lauf.id ? lauf.lauf : l))
                .map((l) => (
                <tr key={l.id} className="hover:bg-surface-2">
                  <td className="px-3 py-2">
                    <Link href={`/objekte/${l.objektId}`} className="hover:text-accent">
                      {uebersicht.objektNamen[l.objektId]}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{l.jahr}</td>
                  <td className="px-3 py-2 text-fg-subtle">{l.art.replace(/_/g, " ")}</td>
                  <td className="px-3 py-2">
                    <Plakette
                      ton={
                        l.status === "beschlossen" || l.status === "versendet"
                          ? "ok"
                          : l.status === "berechnet"
                            ? "accent"
                            : "neutral"
                      }
                    >
                      {l.status}
                    </Plakette>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatDate(l.fristAm)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCent(l.gesamtkostenCent)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCent(l.umlagefaehigCent)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-fg-subtle">
                    {l.einheitenGeprueft}/{l.einheitenGesamt}
                  </td>
                </tr>
                ))}
            </tbody>
          </table>
        </Karte>

        {lauf ? (
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                {lauf.objekt.bezeichnung} · Betriebskosten {lauf.ergebnis.jahr}
              </h2>
              <p className="mt-0.5 text-2xs text-fg-subtle">
                {lauf.einheitenAnzahl} Einheiten, {lauf.ergebnis.nutzungen.length}{" "}
                Nutzungszeitscheiben. Alle Beträge auf dieser Seite werden bei jedem Aufruf neu
                gerechnet.
              </p>
            </div>
            <AbrechnungsAnsicht
              lauf={lauf.lauf}
              ergebnis={lauf.ergebnis}
              positionen={lauf.positionen}
              auffaelligkeiten={lauf.lauf.auffaelligkeiten}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
