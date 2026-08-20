/**
 * Betriebs- und Heizkostenabrechnung — Rechenengine
 * =============================================================================
 * Vollständig deterministisch, ohne Sprachmodell. Jede Position liefert ihren
 * Rechenweg als Text mit, damit Mieter, Verwalter und Prüfer dieselbe Zahl
 * nachvollziehen können.
 *
 * Fachliche Grundlagen, die hier abgebildet sind:
 *  - §556 Abs. 3 BGB   Abrechnungsfrist: Ende des Folgejahres
 *  - §556a BGB         Umlage nach Fläche, soweit nichts anderes vereinbart
 *  - BetrKV            Katalog der umlagefähigen Kosten (als Daten am Konto)
 *  - HeizkostenV §7/§8 Verbrauchsanteil 50–70 %, Rest Grundkosten
 *  - CO2KostAufG       Stufenmodell zur Aufteilung der CO₂-Kosten
 *
 * Wichtig: Alle Rechtsparameter (Verbrauchsanteil, CO₂-Stufen, Fristen) sind
 * Daten, keine Logik. Ändert sich die Rechtslage, ändert sich eine Tabelle.
 * Die Werte in `CO2_STUFEN` und die Standardquote sind vor produktivem Einsatz
 * gegen die geltende Fassung zu verifizieren.
 */

import type { Cent, IsoDate } from "../types";
import type { UmlageschluesselId } from "../finance";
import { tageImZeitraum, ueberschneidung, verteileCent } from "./verteilung";

// ---------------------------------------------------------------------------
// Eingaben
// ---------------------------------------------------------------------------

export interface UmlageEinheit {
  einheitId: string;
  bezeichnung: string;
  flaecheM2: number;
  meaTausendstel?: number;
  gewerbe: boolean;
}

/** Eine Nutzungszeitscheibe: ein Mieter, ein Leerstand, ein Selbstnutzer. */
export interface UmlageNutzung {
  nutzungId: string;
  einheitId: string;
  nutzerName: string;
  von: IsoDate;
  bis: IsoDate;
  personen: number;
  vorauszahlungCent: Cent;
  /** Erfasste Verbräuche für genau diese Zeitscheibe. */
  verbrauchWaermeKwh?: number;
  verbrauchWarmwasserM3?: number;
  verbrauchKaltwasserM3?: number;
  /** Leerstand: Kosten trägt der Eigentümer, nicht die übrigen Mieter. */
  leerstand?: boolean;
}

export interface KostenpositionInput {
  id: string;
  kontoNr: string;
  bezeichnung: string;
  betragCent: Cent;
  umlagefaehig: boolean;
  schluessel: UmlageschluesselId;
  /** Gewerbeanteil, Instandhaltung, Verwaltungskosten: vorab abziehen. */
  vorwegabzugCent?: Cent;
  vorwegabzugGrund?: string;
  /** §35a EStG begünstigter Lohnanteil. */
  paragraf35aCent?: Cent;
  /** Nur bei Direktzuordnung. */
  einheitId?: string;
  /** Heizkosten: aktiviert die HeizkostenV-Aufteilung. */
  heizkosten?: boolean;
  /** Warmwasser aus verbundener Anlage. */
  warmwasser?: boolean;
  /** Im Betrag enthaltene CO₂-Kosten (BEHG) für das Stufenmodell. */
  co2KostenCent?: Cent;
  betrkv?: string;
  belegIds?: string[];
}

export interface HeizkostenParameter {
  /** Verbrauchsanteil nach HeizkostenV §7 Abs. 1: zulässig 50–70 %. */
  verbrauchsanteil: number;
  /** CO₂-Emission des Gebäudes in kg/m²·a — Eingang ins Stufenmodell. */
  co2EmissionKgProM2?: number;
  /** Nichtwohngebäude: hälftige Teilung statt Stufenmodell. */
  nichtwohngebaeude?: boolean;
}

export interface AbrechnungskontextInput {
  objektId: string;
  jahr: number;
  von: IsoDate;
  bis: IsoDate;
  einheiten: UmlageEinheit[];
  nutzungen: UmlageNutzung[];
  heizkosten: HeizkostenParameter;
}

// ---------------------------------------------------------------------------
// Ausgaben
// ---------------------------------------------------------------------------

export interface PositionAnteil {
  positionId: string;
  bezeichnung: string;
  kontoNr: string;
  schluessel: UmlageschluesselId;
  gesamtkostenCent: Cent;
  vorwegabzugCent: Cent;
  verteilbarCent: Cent;
  anteilEinheit: number;
  anteilGesamt: number;
  zeitanteilTage: number;
  zeitanteilGesamtTage: number;
  anteilCent: Cent;
  paragraf35aCent: Cent;
  rechenweg: string;
  betrkv?: string;
}

export interface NutzungsAbrechnung {
  nutzungId: string;
  einheitId: string;
  einheitBezeichnung: string;
  nutzerName: string;
  leerstand: boolean;
  von: IsoDate;
  bis: IsoDate;
  tage: number;
  positionen: PositionAnteil[];
  summeUmlageCent: Cent;
  vorauszahlungCent: Cent;
  /** Positiv = Nachzahlung des Nutzers, negativ = Guthaben. */
  saldoCent: Cent;
  paragraf35aCent: Cent;
}

export interface AbrechnungsErgebnis {
  objektId: string;
  jahr: number;
  von: IsoDate;
  bis: IsoDate;
  gesamtkostenCent: Cent;
  nichtUmlagefaehigCent: Cent;
  vorwegabzuegeCent: Cent;
  umgelegtCent: Cent;
  /** Anteil, der beim Eigentümer bleibt (Leerstand + CO₂-Vermieteranteil). */
  eigentuemeranteilCent: Cent;
  co2VermieteranteilCent: Cent;
  co2Stufe?: string;
  nutzungen: NutzungsAbrechnung[];
  /** Prüfpfad: Abweichungen, die ein Mensch ansehen sollte. */
  hinweise: string[];
  /** Kontrolle: umgelegt + nicht umlagefähig + Vorwegabzüge = Gesamtkosten. */
  summenkontrolleOk: boolean;
}

// ---------------------------------------------------------------------------
// CO₂-Kostenaufteilung (Stufenmodell Wohngebäude)
// ---------------------------------------------------------------------------

/**
 * Aufteilung der CO₂-Kosten zwischen Vermieter und Mieter nach der
 * Gebäudeemission in kg CO₂/m²·a. Bei Nichtwohngebäuden gilt bis zur Einführung
 * eines eigenen Stufenmodells die hälftige Teilung.
 */
export const CO2_STUFEN: readonly { bisKgProM2: number; vermieterAnteil: number; label: string }[] =
  [
    { bisKgProM2: 12, vermieterAnteil: 0.0, label: "< 12 kg/m²·a" },
    { bisKgProM2: 17, vermieterAnteil: 0.1, label: "12 bis < 17 kg/m²·a" },
    { bisKgProM2: 22, vermieterAnteil: 0.2, label: "17 bis < 22 kg/m²·a" },
    { bisKgProM2: 27, vermieterAnteil: 0.3, label: "22 bis < 27 kg/m²·a" },
    { bisKgProM2: 32, vermieterAnteil: 0.4, label: "27 bis < 32 kg/m²·a" },
    { bisKgProM2: 37, vermieterAnteil: 0.5, label: "32 bis < 37 kg/m²·a" },
    { bisKgProM2: 42, vermieterAnteil: 0.6, label: "37 bis < 42 kg/m²·a" },
    { bisKgProM2: 47, vermieterAnteil: 0.7, label: "42 bis < 47 kg/m²·a" },
    { bisKgProM2: 52, vermieterAnteil: 0.8, label: "47 bis < 52 kg/m²·a" },
    { bisKgProM2: Number.POSITIVE_INFINITY, vermieterAnteil: 0.95, label: "≥ 52 kg/m²·a" },
  ];

export function co2Vermieteranteil(
  emissionKgProM2: number | undefined,
  nichtwohngebaeude?: boolean,
): { anteil: number; label: string } {
  if (nichtwohngebaeude) return { anteil: 0.5, label: "Nichtwohngebäude: hälftige Teilung" };
  if (emissionKgProM2 === undefined) {
    return { anteil: 0, label: "keine Emissionsdaten — Aufteilung nicht möglich" };
  }
  const stufe = CO2_STUFEN.find((s) => emissionKgProM2 < s.bisKgProM2) ?? CO2_STUFEN.at(-1)!;
  return { anteil: stufe.vermieterAnteil, label: stufe.label };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

interface BezugsGewicht {
  nutzungId: string;
  gewicht: number;
  bezugEinheit: number;
  tage: number;
}

function tageDerNutzung(n: UmlageNutzung, von: IsoDate, bis: IsoDate): number {
  return ueberschneidung(n.von, n.bis, von, bis)?.tage ?? 0;
}

/**
 * Gewichte je Umlageschlüssel. Zeitabhängige Schlüssel werden mit
 * "Bezugsgröße × Tage" gewichtet — so trägt jeder Nutzer genau den Anteil
 * seiner Nutzungsdauer, und Leerstandszeiten fallen dem Eigentümer zu.
 * Verbrauchsschlüssel sind bereits periodenscharf gemessen und werden nicht
 * zusätzlich zeitgewichtet.
 */
function gewichte(
  schluessel: UmlageschluesselId,
  kontext: AbrechnungskontextInput,
): BezugsGewicht[] {
  const einheitMap = new Map(kontext.einheiten.map((e) => [e.einheitId, e]));

  return kontext.nutzungen.map((n) => {
    const einheit = einheitMap.get(n.einheitId);
    const tage = tageDerNutzung(n, kontext.von, kontext.bis);
    let bezug = 0;
    let zeitgewichtet = true;

    switch (schluessel) {
      case "wohnflaeche":
        bezug = einheit?.flaecheM2 ?? 0;
        break;
      case "personen":
        bezug = n.leerstand ? 1 : n.personen;
        break;
      case "einheiten":
        bezug = 1;
        break;
      case "mea":
        bezug = einheit?.meaTausendstel ?? 0;
        break;
      case "verbrauch_waerme":
        bezug = n.verbrauchWaermeKwh ?? 0;
        zeitgewichtet = false;
        break;
      case "verbrauch_wasser":
        bezug = (n.verbrauchKaltwasserM3 ?? 0) + (n.verbrauchWarmwasserM3 ?? 0);
        zeitgewichtet = false;
        break;
      case "direktzuordnung":
      case "nicht_umlegen":
        bezug = 0;
        break;
    }

    return {
      nutzungId: n.nutzungId,
      bezugEinheit: bezug,
      tage,
      gewicht: zeitgewichtet ? bezug * tage : bezug,
    };
  });
}

const SCHLUESSEL_TEXT: Record<UmlageschluesselId, string> = {
  wohnflaeche: "Wohnfläche",
  personen: "Personenzahl",
  einheiten: "Anzahl Einheiten",
  mea: "Miteigentumsanteil",
  verbrauch_waerme: "Wärmeverbrauch",
  verbrauch_wasser: "Wasserverbrauch",
  direktzuordnung: "Direktzuordnung",
  nicht_umlegen: "nicht umlagefähig",
};

const EINHEIT_TEXT: Partial<Record<UmlageschluesselId, string>> = {
  wohnflaeche: "m²",
  personen: "Pers.",
  einheiten: "Einh.",
  mea: "/1000",
  verbrauch_waerme: "kWh",
  verbrauch_wasser: "m³",
};

function fmt(n: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(n);
}

function fmtEur(cent: Cent): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cent / 100);
}

interface TeilPosition extends KostenpositionInput {
  /** Sichtbarer Name der Teilposition (z. B. "Heizung — Grundkosten 30 %"). */
  anzeige: string;
  effektiverSchluessel: UmlageschluesselId;
  effektiverBetragCent: Cent;
  zusatzHinweis?: string;
}

/**
 * Zerlegt Heizkostenpositionen nach HeizkostenV in Grund- und Verbrauchskosten
 * und zieht vorher den CO₂-Vermieteranteil ab. Alle anderen Positionen bleiben
 * unverändert.
 */
function zerlege(
  position: KostenpositionInput,
  kontext: AbrechnungskontextInput,
): { teile: TeilPosition[]; co2VermieterCent: Cent; hinweise: string[] } {
  const hinweise: string[] = [];
  let betrag = position.betragCent - (position.vorwegabzugCent ?? 0);
  let co2VermieterCent = 0;

  if (position.co2KostenCent && position.co2KostenCent > 0) {
    const { anteil, label } = co2Vermieteranteil(
      kontext.heizkosten.co2EmissionKgProM2,
      kontext.heizkosten.nichtwohngebaeude,
    );
    co2VermieterCent = Math.round(position.co2KostenCent * anteil);
    betrag -= co2VermieterCent;
    hinweise.push(
      `CO₂-Kosten ${fmtEur(position.co2KostenCent)}: Stufe ${label} → Vermieteranteil ` +
        `${Math.round(anteil * 100)} % (${fmtEur(co2VermieterCent)}) nicht umlagefähig.`,
    );
  }

  if (!position.heizkosten) {
    return {
      teile: [
        {
          ...position,
          anzeige: position.bezeichnung,
          effektiverSchluessel: position.schluessel,
          effektiverBetragCent: betrag,
        },
      ],
      co2VermieterCent,
      hinweise,
    };
  }

  const verbrauchsanteil = Math.min(0.7, Math.max(0.5, kontext.heizkosten.verbrauchsanteil));
  if (verbrauchsanteil !== kontext.heizkosten.verbrauchsanteil) {
    hinweise.push(
      `Verbrauchsanteil ${Math.round(kontext.heizkosten.verbrauchsanteil * 100)} % liegt außerhalb ` +
        `des nach HeizkostenV §7 zulässigen Rahmens 50–70 % und wurde auf ` +
        `${Math.round(verbrauchsanteil * 100)} % begrenzt.`,
    );
  }

  const verbrauchCent = Math.round(betrag * verbrauchsanteil);
  const grundCent = betrag - verbrauchCent;
  const grundProzent = Math.round((1 - verbrauchsanteil) * 100);
  const verbrauchProzent = Math.round(verbrauchsanteil * 100);
  const verbrauchsSchluessel: UmlageschluesselId = position.warmwasser
    ? "verbrauch_wasser"
    : "verbrauch_waerme";

  return {
    teile: [
      {
        ...position,
        anzeige: `${position.bezeichnung} — Grundkosten ${grundProzent} %`,
        effektiverSchluessel: "wohnflaeche",
        effektiverBetragCent: grundCent,
        paragraf35aCent: 0,
        zusatzHinweis: `HeizkostenV §7: ${grundProzent} % Grundkosten nach Fläche`,
      },
      {
        ...position,
        anzeige: `${position.bezeichnung} — Verbrauch ${verbrauchProzent} %`,
        effektiverSchluessel: verbrauchsSchluessel,
        effektiverBetragCent: verbrauchCent,
        zusatzHinweis: `HeizkostenV §7: ${verbrauchProzent} % nach erfasstem Verbrauch`,
      },
    ],
    co2VermieterCent,
    hinweise,
  };
}

export function berechneAbrechnung(
  kontext: AbrechnungskontextInput,
  positionen: readonly KostenpositionInput[],
): AbrechnungsErgebnis {
  const gesamtTage = tageImZeitraum(kontext.von, kontext.bis);
  const einheitMap = new Map(kontext.einheiten.map((e) => [e.einheitId, e]));
  const hinweise: string[] = [];

  const abrechnungen = new Map<string, NutzungsAbrechnung>(
    kontext.nutzungen.map((n) => {
      const einheit = einheitMap.get(n.einheitId);
      return [
        n.nutzungId,
        {
          nutzungId: n.nutzungId,
          einheitId: n.einheitId,
          einheitBezeichnung: einheit?.bezeichnung ?? n.einheitId,
          nutzerName: n.nutzerName,
          leerstand: Boolean(n.leerstand),
          von: n.von,
          bis: n.bis,
          tage: tageDerNutzung(n, kontext.von, kontext.bis),
          positionen: [],
          summeUmlageCent: 0,
          vorauszahlungCent: n.vorauszahlungCent,
          saldoCent: 0,
          paragraf35aCent: 0,
        },
      ];
    }),
  );

  let gesamtkosten = 0;
  let nichtUmlagefaehig = 0;
  let vorwegabzuege = 0;
  let umgelegt = 0;
  let co2Vermieter = 0;
  let co2Label: string | undefined;

  for (const position of positionen) {
    gesamtkosten += position.betragCent;

    if (!position.umlagefaehig || position.schluessel === "nicht_umlegen") {
      nichtUmlagefaehig += position.betragCent;
      continue;
    }

    vorwegabzuege += position.vorwegabzugCent ?? 0;

    const { teile, co2VermieterCent, hinweise: posHinweise } = zerlege(position, kontext);
    co2Vermieter += co2VermieterCent;
    hinweise.push(...posHinweise);
    if (position.co2KostenCent) {
      co2Label = co2Vermieteranteil(
        kontext.heizkosten.co2EmissionKgProM2,
        kontext.heizkosten.nichtwohngebaeude,
      ).label;
    }

    for (const teil of teile) {
      if (teil.effektiverBetragCent === 0) continue;

      // Direktzuordnung: eine Einheit trägt die Kosten vollständig, aufgeteilt
      // auf ihre Nutzungszeitscheiben.
      const relevante =
        teil.effektiverSchluessel === "direktzuordnung"
          ? kontext.nutzungen.filter((n) => n.einheitId === teil.einheitId)
          : kontext.nutzungen;

      const alleGewichte = gewichte(
        teil.effektiverSchluessel === "direktzuordnung"
          ? "wohnflaeche"
          : teil.effektiverSchluessel,
        { ...kontext, nutzungen: relevante },
      );

      const summeGewichte = alleGewichte.reduce((s, g) => s + g.gewicht, 0);
      if (summeGewichte <= 0) {
        hinweise.push(
          `${teil.anzeige}: keine Bezugsgröße für Schlüssel "${SCHLUESSEL_TEXT[teil.effektiverSchluessel]}" ` +
            `vorhanden — ${fmtEur(teil.effektiverBetragCent)} konnten nicht umgelegt werden.`,
        );
        nichtUmlagefaehig += teil.effektiverBetragCent;
        continue;
      }

      const verteilung = verteileCent(
        teil.effektiverBetragCent,
        alleGewichte.map((g) => ({ key: g.nutzungId, gewicht: g.gewicht })),
      );
      const p35aVerteilung = verteileCent(
        teil.paragraf35aCent ?? 0,
        alleGewichte.map((g) => ({ key: g.nutzungId, gewicht: g.gewicht })),
      );

      const summeBezug = alleGewichte.reduce((s, g) => s + g.bezugEinheit, 0);
      const einheitText = EINHEIT_TEXT[teil.effektiverSchluessel] ?? "";

      verteilung.forEach((v, i) => {
        const abrechnung = abrechnungen.get(v.key);
        const gw = alleGewichte.find((g) => g.nutzungId === v.key);
        if (!abrechnung || !gw) return;

        const zeitanteilText =
          gw.tage < gesamtTage && teil.effektiverSchluessel !== "verbrauch_waerme"
            ? ` · zeitanteilig ${gw.tage}/${gesamtTage} Tage`
            : "";

        const rechenweg =
          teil.effektiverSchluessel === "direktzuordnung"
            ? `Direktzuordnung an ${abrechnung.einheitBezeichnung}: ${fmtEur(v.anteilCent)}`
            : `${fmtEur(teil.effektiverBetragCent)} × ${fmt(gw.bezugEinheit)} ${einheitText} / ` +
              `${fmt(summeBezug)} ${einheitText}${zeitanteilText} = ${fmtEur(v.anteilCent)}` +
              (teil.zusatzHinweis ? ` (${teil.zusatzHinweis})` : "");

        abrechnung.positionen.push({
          positionId: `${teil.id}:${teil.anzeige}`,
          bezeichnung: teil.anzeige,
          kontoNr: teil.kontoNr,
          schluessel: teil.effektiverSchluessel,
          gesamtkostenCent: teil.betragCent,
          vorwegabzugCent: teil.vorwegabzugCent ?? 0,
          verteilbarCent: teil.effektiverBetragCent,
          anteilEinheit: gw.bezugEinheit,
          anteilGesamt: summeBezug,
          zeitanteilTage: gw.tage,
          zeitanteilGesamtTage: gesamtTage,
          anteilCent: v.anteilCent,
          paragraf35aCent: p35aVerteilung[i]?.anteilCent ?? 0,
          rechenweg,
          betrkv: teil.betrkv,
        });
        abrechnung.summeUmlageCent += v.anteilCent;
        abrechnung.paragraf35aCent += p35aVerteilung[i]?.anteilCent ?? 0;
        umgelegt += v.anteilCent;
      });
    }
  }

  const nutzungen = [...abrechnungen.values()].map((a) => ({
    ...a,
    saldoCent: a.summeUmlageCent - a.vorauszahlungCent,
  }));

  const eigentuemeranteil =
    nutzungen.filter((n) => n.leerstand).reduce((s, n) => s + n.summeUmlageCent, 0) + co2Vermieter;

  const kontrolle = umgelegt + nichtUmlagefaehig + vorwegabzuege + co2Vermieter;
  const summenkontrolleOk = kontrolle === gesamtkosten;
  if (!summenkontrolleOk) {
    hinweise.push(
      `Summenkontrolle: umgelegt ${fmtEur(umgelegt)} + nicht umlagefähig ${fmtEur(nichtUmlagefaehig)} ` +
        `+ Vorwegabzüge ${fmtEur(vorwegabzuege)} + CO₂-Vermieteranteil ${fmtEur(co2Vermieter)} ` +
        `= ${fmtEur(kontrolle)}, erwartet ${fmtEur(gesamtkosten)}.`,
    );
  }

  return {
    objektId: kontext.objektId,
    jahr: kontext.jahr,
    von: kontext.von,
    bis: kontext.bis,
    gesamtkostenCent: gesamtkosten,
    nichtUmlagefaehigCent: nichtUmlagefaehig,
    vorwegabzuegeCent: vorwegabzuege,
    umgelegtCent: umgelegt,
    eigentuemeranteilCent: eigentuemeranteil,
    co2VermieteranteilCent: co2Vermieter,
    co2Stufe: co2Label,
    nutzungen,
    hinweise,
    summenkontrolleOk,
  };
}
