import type { ReactNode } from "react";
import { AppShell, type SchnellZiel } from "@/components/shell/app-shell";
import { ImmosProvider } from "@/state/immos-store";
import { getAutonomie, getCockpit, standardModulConfig } from "@/data/world";

/**
 * Anwendungsrahmen
 * =============================================================================
 * Diese Ebene lädt die Daten serverseitig und übergibt an den Sitzungszustand,
 * der die Entscheidungen des Nutzers hält. Die Landingpage liegt bewusst
 * außerhalb dieser Gruppe — sie hat keinen Rahmen und keinen Zustand.
 */

export default async function AnwendungsLayout({ children }: { children: ReactNode }) {
  const config = standardModulConfig();
  const [cockpit, autonomie] = await Promise.all([getCockpit(config), getAutonomie()]);

  const ziele: SchnellZiel[] = [
    ...cockpit.objekte.map((o) => ({
      href: `/objekte/${o.objekt.id}`,
      titel: `${o.objekt.nummer} · ${o.objekt.bezeichnung}`,
      unterzeile: `${o.objekt.strasse}, ${o.objekt.plz} ${o.objekt.ort} · ${o.einheiten} Einheiten`,
      art: "Objekt" as const,
    })),
    ...cockpit.queue
      .filter((v) => v.status === "offen")
      .map((v) => ({
        href: `/entscheidungen#${v.id}`,
        titel: v.titel,
        unterzeile: v.kurzfassung,
        art: "Entscheidung" as const,
      })),
    ...cockpit.sprachbefehle.map((b) => ({
      href: "/cockpit",
      titel: b.satz,
      unterzeile: b.aktion,
      art: "Sprachbefehl" as const,
    })),
  ];

  return (
    <ImmosProvider
      vorschlaege={cockpit.queue}
      moduleConfig={config}
      autonomie={autonomie.regeln}
      chat={cockpit.chat}
    >
      <AppShell
        ziele={ziele}
        posteingangNeu={cockpit.posteingangNeu}
        nutzerName={cockpit.nutzer.name}
        mandantName={cockpit.mandant.name}
      >
        {children}
      </AppShell>
    </ImmosProvider>
  );
}
