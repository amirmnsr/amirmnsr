import { getAutonomie } from "@/data/world";
import { AutonomieMatrix } from "@/components/automationen/autonomie-matrix";
import { SeitenKopf } from "@/components/shell/seiten-kopf";

export const metadata = { title: "Automationen" };

export default async function AutomationenSeite() {
  const daten = await getAutonomie();
  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Automationen"
        unterzeile="Wie viel ImmOS selbst entscheidet, legst du hier fest — je Prozess, je Betrag. Was rechtlich beim Menschen bleiben muss, lässt sich nicht höher stellen."
      />
      <div className="px-4 py-5 sm:px-6">
        <AutonomieMatrix agenten={daten.agenten} />
      </div>
    </div>
  );
}
