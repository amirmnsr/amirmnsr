import { getBuchhaltung } from "@/data/world";
import { BuchhaltungAnsicht } from "@/components/buchhaltung/buchhaltung-ansicht";
import { SeitenKopf } from "@/components/shell/seiten-kopf";
import { Plakette } from "@/components/ui/display";
import { formatCent } from "@/lib/format";

export const metadata = { title: "Buchhaltung" };

export default async function BuchhaltungSeite() {
  const daten = await getBuchhaltung();
  return (
    <div className="min-h-full">
      <SeitenKopf
        titel="Buchhaltung"
        unterzeile={`Sollstellung ${formatCent(daten.summen.sollMonatCent)} im Monat · ${formatCent(daten.summen.offenCent)} offen · ${formatCent(daten.summen.rechnungenOffenCent)} Rechnungen in Prüfung`}
        aktionen={
          <>
            <Plakette ton="ok" punkt>
              Journal lückenlos
            </Plakette>
            <Plakette>DATEV-Export vorbereitet</Plakette>
          </>
        }
      />
      <div className="px-4 py-5 sm:px-6">
        <BuchhaltungAnsicht
          rechnungen={daten.eingangsrechnungen}
          umsaetze={daten.kontoumsaetze}
          posten={daten.offenePosten}
          journal={daten.buchungen}
          konten={daten.kontenrahmen}
          bankkonten={daten.bankkonten}
          mandate={daten.sepaMandate}
          zahlungsvorschlaege={daten.zahlungsvorschlaege}
          kreditorNamen={daten.kreditorNamen}
          objektNamen={daten.objektNamen}
          einheitNamen={daten.einheitNamen}
        />
      </div>
    </div>
  );
}
