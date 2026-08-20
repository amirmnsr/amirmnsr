import { BEZUGSZEIT, getVorgaenge } from "@/data/world";
import { VorgangsAnsicht } from "@/components/aufgaben/vorgangs-ansicht";
import { SeitenKopf } from "@/components/shell/seiten-kopf";

export const metadata = { title: "Vorgänge" };

export default async function AufgabenSeite() {
  const daten = await getVorgaenge();
  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Vorgänge"
        unterzeile="Jeder Eingang wird ein Vorgang — unabhängig davon, ob er per Mail, Anruf, Portal oder Sensor kam. Zusammengehörige Meldungen führt ImmOS zusammen."
      />
      <div className="px-4 py-5 sm:px-6">
        <VorgangsAnsicht
          vorgaenge={daten.vorgaenge}
          auftraege={daten.auftraege}
          objektNamen={daten.objektNamen}
          bearbeiter={daten.bearbeiter}
          jetzt={BEZUGSZEIT.jetzt}
        />
      </div>
    </div>
  );
}
