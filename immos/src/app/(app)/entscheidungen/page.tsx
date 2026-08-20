import { BEZUGSZEIT, getCockpit, standardModulConfig } from "@/data/world";
import { QueueAnsicht } from "@/components/entscheidungen/queue-ansicht";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Plakette } from "@/components/ui/display";

export const metadata = { title: "Entscheidungen" };

export default async function EntscheidungenSeite() {
  const config = standardModulConfig();
  const cockpit = await getCockpit(config);
  const agentNamen = Object.fromEntries(cockpit.agenten.map((a) => [a.id, a.name]));
  const objektNamen = Object.fromEntries(
    cockpit.objekte.map((o) => [o.objekt.id, `${o.objekt.nummer} · ${o.objekt.bezeichnung}`]),
  );

  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Entscheidungen"
        unterzeile="Jeder Vorschlag nennt Begründung, Belege, geplante Aktionen und die Alternative. Bei hohem Risiko ist die Zustimmung erst nach Öffnen der Belege möglich."
        aktionen={
          <Plakette ton="agent" punkt>
            {cockpit.agenten.length} Agenten liefern zu
          </Plakette>
        }
      />
      <div className="px-4 py-5 sm:px-6">
        <QueueAnsicht
          agentNamen={agentNamen}
          objektNamen={objektNamen}
          jetzt={BEZUGSZEIT.jetzt}
        />
      </div>
    </div>
  );
}
