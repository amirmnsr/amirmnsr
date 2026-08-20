import { getObjektListe } from "@/data/world";
import { ObjektBand } from "@/components/cockpit/objekt-band";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Plakette } from "@/components/ui/display";
import { formatArea, formatCent } from "@/lib/format";

export const metadata = { title: "Objekte" };

export default async function ObjekteSeite() {
  const objekte = await getObjektListe();
  const einheiten = objekte.reduce((s, o) => s + o.einheiten, 0);
  const flaeche = objekte.reduce((s, o) => s + o.objekt.wohnflaecheM2 + o.objekt.gewerbeflaecheM2, 0);
  const soll = objekte.reduce((s, o) => s + o.monatsSollCent, 0);

  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Objekte"
        unterzeile={`${objekte.length} Objekte · ${einheiten} Einheiten · ${formatArea(flaeche)} · ${formatCent(soll)} Sollmiete im Monat`}
        aktionen={
          <>
            <Plakette>Miete</Plakette>
            <Plakette>SEV</Plakette>
            <Plakette>WEG</Plakette>
            <Plakette>Gewerbe</Plakette>
          </>
        }
      />
      <div className="px-4 py-5 sm:px-6">
        <ObjektBand objekte={objekte} />
      </div>
    </div>
  );
}
