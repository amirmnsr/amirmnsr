import { getEinrichtung } from "@/data/world";
import { EinrichtungsAssistent } from "@/components/einrichtung/einrichtungs-assistent";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Plakette } from "@/components/ui/display";

export const metadata = { title: "Einrichtung" };

export default async function EinrichtungSeite() {
  const daten = await getEinrichtung();
  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Einrichtung"
        unterzeile="ImmOS wird hier zusammengesteckt. Änderungen wirken sofort auf Menü, Agenten und Vorschläge — auch im laufenden Betrieb."
        aktionen={
          <Plakette ton="accent" punkt>
            Auswahl wird lokal gespeichert
          </Plakette>
        }
      />
      <div className="px-4 py-5 sm:px-6">
        <EinrichtungsAssistent
          mandantName={daten.mandant.name}
          mailDomain={daten.mandant.mailDomain}
          objekte={daten.objekte}
        />
      </div>
    </div>
  );
}
