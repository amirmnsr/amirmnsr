import Link from "next/link";
import type { ObjektKarte } from "@/data/world";
import { Balken, Etikett, Karte, Merkmal, Plakette } from "@/components/ui/display";
import { formatCent, formatPercent } from "@/lib/format";

/**
 * Objektband
 * =============================================================================
 * Der Bestand auf einen Blick: Vermietungsstand, offene Forderungen, offene
 * Vorgänge, kritische Fristen. Die Farbe entsteht ausschließlich aus Problemen.
 */

const ART_LABEL: Record<string, string> = {
  miete: "Miete",
  sev: "SEV",
  weg: "WEG",
  gewerbe: "Gewerbe",
};

export function ObjektBand({ objekte }: { objekte: ObjektKarte[] }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {objekte.map((o) => {
        const quote = o.einheiten > 0 ? o.vermietet / o.einheiten : 0;
        return (
          <Link key={o.objekt.id} href={`/objekte/${o.objekt.id}`} className="group">
            <Karte className="h-full p-4 transition-colors group-hover:border-accent-line">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold tracking-tight">
                    {o.objekt.bezeichnung}
                  </p>
                  <p className="mt-0.5 truncate text-2xs text-fg-subtle">
                    {o.objekt.strasse} · {o.objekt.plz} {o.objekt.ort}
                  </p>
                </div>
                <Merkmal>{o.objekt.nummer}</Merkmal>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {o.objekt.verwaltungsarten.map((a) => (
                  <Plakette key={a}>{ART_LABEL[a] ?? a}</Plakette>
                ))}
                {o.kritischeFristen > 0 ? (
                  <Plakette ton="danger" punkt>
                    {o.kritischeFristen} kritische Frist{o.kritischeFristen > 1 ? "en" : ""}
                  </Plakette>
                ) : null}
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-baseline justify-between text-2xs">
                  <span className="text-fg-subtle">
                    {o.vermietet} von {o.einheiten} vermietet
                  </span>
                  <span className="font-medium tabular-nums">{formatPercent(quote)}</span>
                </div>
                <Balken anteil={quote} ton={quote > 0.95 ? "ok" : quote > 0.9 ? "accent" : "warn"} />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2.5">
                <div>
                  <Etikett>Soll/Monat</Etikett>
                  <p className="mt-0.5 text-xs font-medium tabular-nums">
                    {formatCent(o.monatsSollCent)}
                  </p>
                </div>
                <div>
                  <Etikett>Offen</Etikett>
                  <p
                    className={`mt-0.5 text-xs font-medium tabular-nums ${
                      o.offenCent > 0 ? "text-warn" : "text-fg-muted"
                    }`}
                  >
                    {formatCent(o.offenCent)}
                  </p>
                </div>
                <div>
                  <Etikett>Vorgänge</Etikett>
                  <p className="mt-0.5 text-xs font-medium tabular-nums">{o.offeneVorgaenge}</p>
                </div>
              </div>
            </Karte>
          </Link>
        );
      })}
    </div>
  );
}
