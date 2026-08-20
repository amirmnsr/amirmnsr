import { notFound } from "next/navigation";
import { BEZUGSZEIT, getAutonomie, getObjektAkte, standardModulConfig } from "@/data/world";
import { ObjektAkteAnsicht } from "@/components/objekte/objekt-akte";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Plakette } from "@/components/ui/display";

export default async function ObjektAkteSeite(props: PageProps<"/objekte/[objektId]">) {
  const { objektId } = await props.params;
  const config = standardModulConfig();
  const [akte, autonomie] = await Promise.all([getObjektAkte(objektId, config), getAutonomie()]);
  if (!akte) notFound();

  const agentNamen = Object.fromEntries(autonomie.agenten.map((a) => [a.id, a.name]));

  return (
    <div className="min-h-full">
      <SeitenKopf
        titel={akte.objekt.bezeichnung}
        unterzeile={`Objekt ${akte.objekt.nummer} · ${akte.objekt.strasse}, ${akte.objekt.plz} ${akte.objekt.ort} · Eigentümer ${akte.eigentuemerName}`}
        aktionen={akte.objekt.verwaltungsarten.map((a) => (
          <Plakette key={a}>{a}</Plakette>
        ))}
      />
      <div className="px-4 py-5 sm:px-6">
        <ObjektAkteAnsicht
          akte={akte}
          agentNamen={agentNamen}
          jetzt={BEZUGSZEIT.jetzt}
          wegAktiv={config.weg}
        />
      </div>
    </div>
  );
}
