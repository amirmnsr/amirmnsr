import { BEZUGSZEIT, getPosteingang } from "@/data/world";
import { PosteingangAnsicht } from "@/components/posteingang/posteingang-ansicht";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Plakette } from "@/components/ui/display";

export const metadata = { title: "Posteingang" };

export default async function PosteingangSeite() {
  const daten = await getPosteingang();
  const neu = daten.nachrichten.filter((n) => n.richtung === "eingang" && !n.gelesen).length;
  const auffaellig = daten.nachrichten.filter((n) => n.sicherheit.promptInjektionVerdacht).length;

  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Posteingang"
        unterzeile="Objektbezogene Adressen, automatische Zuordnung, Absichtserkennung — und eine Sicherheitsprüfung je Eingang."
        aktionen={
          <>
            <Plakette ton="accent" punkt>
              {neu} neu
            </Plakette>
            {auffaellig > 0 ? (
              <Plakette ton="danger" punkt>
                {auffaellig} gefährlich
              </Plakette>
            ) : null}
            <Plakette>{daten.postfaecher.length} Adressen</Plakette>
          </>
        }
      />
      <div className="px-4 py-5 sm:px-6">
        <PosteingangAnsicht
          nachrichten={daten.nachrichten}
          postfaecher={daten.postfaecher}
          objektNamen={daten.objektNamen}
          vorschlagZuNachricht={daten.vorschlagZuNachricht}
          jetzt={BEZUGSZEIT.jetzt}
        />
      </div>
    </div>
  );
}
