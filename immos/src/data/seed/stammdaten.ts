/**
 * Seed: Mandant, Objekte, Einheiten, Personen, Verträge, Postfächer
 * =============================================================================
 * Sechs Objekte im Kölner Bestand, gemischt aus Miet-, SEV-, WEG- und
 * Gewerbeverwaltung — damit die Modul-Schaltung im Prototyp sichtbar wirkt.
 * Die Einheiten werden deterministisch erzeugt, die fachlich interessanten
 * Fälle (Leerstand, Mieterwechsel, Zahlungsverzug, Gewerbe) sind gesetzt.
 */

import type {
  Bankkonto,
  Einheit,
  Eigentumsverhaeltnis,
  Mandant,
  Mietvertrag,
  Objekt,
  Person,
  Postfach,
  Zaehler,
} from "@/domain";
import { HEUTE, emailVon, name, tageVersetzt, telefon, testIban } from "./basis";

export const mandant: Mandant = {
  id: "mnd-1",
  name: "Rheinquartier Immobilienverwaltung GmbH",
  kurz: "Rheinquartier",
  mailDomain: "rheinquartier.immos.de",
  sitz: "Köln",
  einheitenGesamt: 148,
  mitarbeiter: 5,
  ustIdNr: "DE 812 345 678",
};

export const mitarbeiter: Person[] = [
  {
    id: "ma-1",
    typ: "natuerlich",
    anrede: "Herr",
    name: "Amir Mansour",
    rollen: ["mitarbeiter"],
    email: "a.mansour@rheinquartier.immos.de",
    telefon: "0221 4720100",
  },
  {
    id: "ma-2",
    typ: "natuerlich",
    anrede: "Frau",
    name: "Sandra Kilian",
    rollen: ["mitarbeiter"],
    email: "s.kilian@rheinquartier.immos.de",
    telefon: "0221 4720102",
  },
  {
    id: "ma-3",
    typ: "natuerlich",
    anrede: "Herr",
    name: "Deniz Kaplan",
    rollen: ["mitarbeiter", "hausmeister"],
    email: "d.kaplan@rheinquartier.immos.de",
    telefon: "0170 2288341",
  },
];

interface ObjektVorlage {
  id: string;
  nummer: string;
  bezeichnung: string;
  strasse: string;
  plz: string;
  ort: string;
  verwaltungsarten: Objekt["verwaltungsarten"];
  baujahr: number;
  einheiten: number;
  gewerbeEinheiten: number;
  heizungsart: Objekt["heizungsart"];
  energietraeger: Objekt["energietraeger"];
  lat: number;
  lng: number;
  eigentuemer: { id: string; name: string; typ: Person["typ"] };
  notizen?: string;
}

const VORLAGEN: ObjektVorlage[] = [
  {
    id: "obj-1042",
    nummer: "1042",
    bezeichnung: "Wohnanlage Aachener Straße",
    strasse: "Aachener Straße 218",
    plz: "50931",
    ort: "Köln",
    verwaltungsarten: ["miete", "sev"],
    baujahr: 1968,
    einheiten: 34,
    gewerbeEinheiten: 2,
    heizungsart: "gas_zentral",
    energietraeger: "erdgas",
    lat: 50.9375,
    lng: 6.9089,
    eigentuemer: { id: "eig-1", name: "Bergfeld Grundbesitz GmbH & Co. KG", typ: "juristisch" },
    notizen:
      "Zentralheizung Baujahr 2009, Austausch im Wirtschaftsplan 2027 vorgesehen. Zwei Ladenlokale im EG mit USt-Option.",
  },
  {
    id: "obj-1088",
    nummer: "1088",
    bezeichnung: "WEG Sülzburgstraße",
    strasse: "Sülzburgstraße 47",
    plz: "50937",
    ort: "Köln",
    verwaltungsarten: ["weg"],
    baujahr: 1994,
    einheiten: 28,
    gewerbeEinheiten: 0,
    heizungsart: "zentral",
    energietraeger: "fernwaerme",
    lat: 50.9218,
    lng: 6.9297,
    eigentuemer: { id: "eig-2", name: "GdWE Sülzburgstraße 47", typ: "juristisch" },
    notizen: "Erhaltungsrücklage 218.400 €. Beschluss 2025-04 zur Dachsanierung in Umsetzung.",
  },
  {
    id: "obj-1104",
    nummer: "1104",
    bezeichnung: "Wohnhaus Ehrenfeldgürtel",
    strasse: "Ehrenfeldgürtel 122",
    plz: "50823",
    ort: "Köln",
    verwaltungsarten: ["miete"],
    baujahr: 2016,
    einheiten: 22,
    gewerbeEinheiten: 0,
    heizungsart: "waermepumpe",
    energietraeger: "strom",
    lat: 50.9503,
    lng: 6.9163,
    eigentuemer: { id: "eig-3", name: "Dr. Beatrice Lindt", typ: "natuerlich" },
  },
  {
    id: "obj-1121",
    nummer: "1121",
    bezeichnung: "Geschäftshaus Hohenzollernring",
    strasse: "Hohenzollernring 84",
    plz: "50672",
    ort: "Köln",
    verwaltungsarten: ["gewerbe"],
    baujahr: 1981,
    einheiten: 11,
    gewerbeEinheiten: 11,
    heizungsart: "fernwaerme",
    energietraeger: "fernwaerme",
    lat: 50.9384,
    lng: 6.9403,
    eigentuemer: { id: "eig-4", name: "Kranhaus Invest AG", typ: "juristisch" },
    notizen:
      "Indexmieten nach VPI, Anpassungsprüfung jährlich zum 01.10. Vorsteuerschlüssel 92 %.",
  },
  {
    id: "obj-1156",
    nummer: "1156",
    bezeichnung: "Wohnanlage Deutzer Freiheit",
    strasse: "Deutzer Freiheit 61",
    plz: "50679",
    ort: "Köln",
    verwaltungsarten: ["miete", "sev"],
    baujahr: 1955,
    einheiten: 26,
    gewerbeEinheiten: 1,
    heizungsart: "etage",
    energietraeger: "erdgas",
    lat: 50.9349,
    lng: 6.9741,
    eigentuemer: { id: "eig-5", name: "Erbengemeinschaft Vogt", typ: "juristisch" },
    notizen: "Etagenheizungen: keine zentrale Heizkostenabrechnung, Mieter beziehen direkt.",
  },
  {
    id: "obj-1173",
    nummer: "1173",
    bezeichnung: "WEG Lindenthalgürtel",
    strasse: "Lindenthalgürtel 9",
    plz: "50935",
    ort: "Köln",
    verwaltungsarten: ["weg", "sev"],
    baujahr: 2003,
    einheiten: 27,
    gewerbeEinheiten: 1,
    heizungsart: "zentral",
    energietraeger: "erdgas",
    lat: 50.9265,
    lng: 6.9059,
    eigentuemer: { id: "eig-6", name: "GdWE Lindenthalgürtel 9", typ: "juristisch" },
  },
];

// ---------------------------------------------------------------------------
// Erzeugung
// ---------------------------------------------------------------------------

const LAGEN = ["EG links", "EG rechts", "1. OG links", "1. OG rechts", "1. OG Mitte",
  "2. OG links", "2. OG rechts", "3. OG links", "3. OG rechts", "4. OG links",
  "4. OG rechts", "DG links", "DG rechts", "Souterrain"];

export const objekte: Objekt[] = [];
export const einheiten: Einheit[] = [];
export const personen: Person[] = [...mitarbeiter];
export const vertraege: Mietvertrag[] = [];
export const postfaecher: Postfach[] = [];
export const bankkonten: Bankkonto[] = [];
export const zaehler: Zaehler[] = [];
export const eigentumsverhaeltnisse: Eigentumsverhaeltnis[] = [];

let personIndex = 0;
let vertragIndex = 0;
let zaehlerIndex = 0;

/** Fachlich gesetzte Sonderfälle, damit die Demo echte Situationen zeigt. */
const SONDERFAELLE: Record<string, { status?: Einheit["status"]; verzug?: boolean; wechsel?: boolean; gewerbe?: boolean }> = {
  "obj-1042-03": { verzug: true },
  "obj-1042-11": { status: "leerstand" },
  "obj-1042-18": { wechsel: true },
  "obj-1042-01": { gewerbe: true },
  "obj-1042-02": { gewerbe: true },
  "obj-1104-07": { status: "leerstand" },
  "obj-1156-09": { verzug: true },
  "obj-1156-14": { status: "sanierung" },
};

for (const v of VORLAGEN) {
  const eigentuemer: Person = {
    id: v.eigentuemer.id,
    typ: v.eigentuemer.typ,
    anrede: v.eigentuemer.typ === "juristisch" ? "Firma" : "Frau",
    name: v.eigentuemer.name,
    rollen: ["eigentuemer"],
    email: emailVon(v.eigentuemer.name.split(" ").slice(0, 2).join(" "), "eigentuemer.example"),
    telefon: telefon(personIndex++),
    iban: testIban(personIndex),
    seit: "2019-01-01",
  };
  personen.push(eigentuemer);

  const konto: Bankkonto = {
    id: `kto-${v.nummer}`,
    objektId: v.id,
    bezeichnung: `Treuhandkonto Objekt ${v.nummer}`,
    iban: testIban(900 + Number(v.nummer)),
    bic: "COLSDE33XXX",
    bank: "Sparkasse KölnBonn",
    art: "treuhand",
    saldoCent: 0,
    letzterAbrufIso: `${HEUTE}T06:15:00+02:00`,
  };
  bankkonten.push(konto);

  const zwecke: Postfach["zweck"][] = v.verwaltungsarten.includes("weg")
    ? ["rechnung", "schaden", "allgemein", "versammlung"]
    : ["rechnung", "schaden", "allgemein", "zaehler"];

  const objektPostfaecher = zwecke.map<Postfach>((zweck, i) => ({
    id: `pf-${v.nummer}-${zweck}`,
    objektId: v.id,
    zweck,
    adresse: `${zweck}.${v.nummer}@${mandant.mailDomain}`,
    aktiv: true,
    fallback: zweck === "rechnung" ? "triage" : "verwalter",
    absenderWhitelist: zweck === "rechnung" ? ["*.handwerk.example", "rechnung@rheinenergie.example"] : [],
    eingaengeMonat: [64, 23, 41, 9][i] ?? 12,
    autoQuote: [0.82, 0.61, 0.47, 0.93][i] ?? 0.5,
  }));
  postfaecher.push(...objektPostfaecher);

  let wohnflaecheSumme = 0;
  let gewerbeflaecheSumme = 0;

  for (let n = 1; n <= v.einheiten; n++) {
    const key = `${v.id}-${String(n).padStart(2, "0")}`;
    const sonder = SONDERFAELLE[key] ?? {};
    const istGewerbe = sonder.gewerbe ?? n <= v.gewerbeEinheiten;
    const flaeche = istGewerbe
      ? 60 + ((n * 37) % 180)
      : 38 + ((n * 23) % 72);
    const einheitId = `${v.id}-e${String(n).padStart(2, "0")}`;
    const status: Einheit["status"] = sonder.status ?? "vermietet";

    if (istGewerbe) gewerbeflaecheSumme += flaeche;
    else wohnflaecheSumme += flaeche;

    const zaehlerIds: string[] = [];
    if (v.heizungsart !== "etage") {
      const z: Zaehler = {
        id: `z-${zaehlerIndex++}`,
        objektId: v.id,
        einheitId,
        art: "waerme",
        nummer: `WMZ-${v.nummer}-${String(n).padStart(3, "0")}`,
        fernablesbar: v.baujahr > 2000 || n % 3 !== 0,
        einbau: v.baujahr > 2000 ? "2019-05-14" : "2022-11-08",
        eichungBis: v.baujahr > 2000 ? "2029-12-31" : "2027-12-31",
        letzterStand: 3400 + ((n * 811) % 6000),
        einheit: "kWh",
      };
      zaehler.push(z);
      zaehlerIds.push(z.id);
    }
    const zw: Zaehler = {
      id: `z-${zaehlerIndex++}`,
      objektId: v.id,
      einheitId,
      art: "kaltwasser",
      nummer: `KW-${v.nummer}-${String(n).padStart(3, "0")}`,
      fernablesbar: v.baujahr > 2010,
      einbau: "2021-03-02",
      eichungBis: "2027-03-01",
      letzterStand: 120 + ((n * 17) % 260),
      einheit: "m³",
    };
    zaehler.push(zw);
    zaehlerIds.push(zw.id);

    einheiten.push({
      id: einheitId,
      objektId: v.id,
      nummer: String(n).padStart(2, "0"),
      lage: istGewerbe ? `EG Ladenlokal ${n}` : LAGEN[(n - 1) % LAGEN.length],
      typ: istGewerbe ? "gewerbe" : "wohnung",
      wohnflaecheM2: flaeche,
      zimmer: istGewerbe ? 0 : 1 + (n % 4),
      meaTausendstel: v.verwaltungsarten.includes("weg")
        ? Math.round((1000 / v.einheiten) * 10) / 10
        : undefined,
      ustOption: istGewerbe ? true : undefined,
      balkon: !istGewerbe && n % 3 !== 0,
      aufzug: v.baujahr > 1990,
      status,
      personenzahl: status === "vermietet" ? 1 + (n % 3) : 0,
      zaehlerIds,
    });

    // Eigentumsverhältnis: bei WEG je Einheit ein Eigentümer, sonst der Objekteigentümer.
    if (v.verwaltungsarten.includes("weg")) {
      const eigName = name(personIndex + 200);
      const eig: Person = {
        id: `pers-eig-${personIndex}`,
        typ: "natuerlich",
        anrede: personIndex % 2 === 0 ? "Frau" : "Herr",
        name: eigName,
        rollen: ["eigentuemer"],
        email: emailVon(eigName, "eigentuemer.example"),
        telefon: telefon(personIndex),
        iban: testIban(personIndex),
        kanal: "email",
        seit: "2020-06-01",
      };
      personen.push(eig);
      eigentumsverhaeltnisse.push({
        id: `ev-${einheitId}`,
        einheitId,
        eigentuemerId: eig.id,
        meaTausendstel: Math.round((1000 / v.einheiten) * 10) / 10,
        selbstnutzer: n % 3 === 0,
        sevAuftrag: v.verwaltungsarten.includes("sev") && n % 4 === 0,
        gueltigVon: "2020-06-01",
        gueltigBis: null,
      });
      personIndex++;
    } else {
      eigentumsverhaeltnisse.push({
        id: `ev-${einheitId}`,
        einheitId,
        eigentuemerId: eigentuemer.id,
        selbstnutzer: false,
        sevAuftrag: v.verwaltungsarten.includes("sev"),
        gueltigVon: "2019-01-01",
        gueltigBis: null,
      });
    }

    // Mietvertrag nur, wenn vermietet oder Wechsel ansteht.
    if (status === "vermietet" || sonder.wechsel) {
      const mieterName = name(personIndex);
      const mieter: Person = {
        id: `pers-m-${personIndex}`,
        typ: istGewerbe ? "juristisch" : "natuerlich",
        anrede: istGewerbe ? "Firma" : personIndex % 2 === 0 ? "Frau" : "Herr",
        name: istGewerbe ? `${mieterName.split(" ")[1]} Handels GmbH` : mieterName,
        rollen: ["mieter"],
        email: emailVon(mieterName),
        telefon: telefon(personIndex),
        mobil: `0151 ${String(2200000 + personIndex * 613).slice(0, 7)}`,
        strasse: v.strasse,
        plz: v.plz,
        ort: v.ort,
        iban: testIban(personIndex),
        kanal: personIndex % 5 === 0 ? "telefon" : "email",
        seit: tageVersetzt(-(400 + personIndex * 11)),
      };
      personen.push(mieter);

      const kaltProM2 = istGewerbe ? 1450 : 980 + ((n * 31) % 340);
      const mieteKalt = Math.round((flaeche * kaltProM2) / 100) * 100;
      const vertragId = `vtr-${vertragIndex++}`;

      vertraege.push({
        id: vertragId,
        einheitId,
        objektId: v.id,
        art: istGewerbe ? "gewerbe" : "wohnraum",
        mieterIds: [mieter.id],
        beginn: tageVersetzt(-(365 + personIndex * 13)),
        ende: istGewerbe ? tageVersetzt(1460) : null,
        gekuendigtZum: sonder.wechsel ? tageVersetzt(41) : null,
        kuendigungEingang: sonder.wechsel ? tageVersetzt(-11) : null,
        mieteKaltCent: mieteKalt,
        bkVorauszahlungCent: Math.round((flaeche * 210) / 100) * 100,
        hkVorauszahlungCent:
          v.heizungsart === "etage" ? 0 : Math.round((flaeche * 165) / 100) * 100,
        stellplatzCent: n % 4 === 0 ? 4500 : 0,
        kautionCent: istGewerbe ? mieteKalt * 3 : mieteKalt * 3,
        kautionsart: istGewerbe ? "buergschaft" : "verpfaendetes_konto",
        kautionEingegangen: true,
        anpassungsart: istGewerbe ? "index" : n % 6 === 0 ? "staffel" : "vergleichsmiete",
        indexBasis: istGewerbe ? 118.4 : undefined,
        letzteAnpassung: tageVersetzt(-(300 + personIndex * 9)),
        naechsteStaffelAm: n % 6 === 0 ? tageVersetzt(120) : undefined,
        naechsteStaffelCent: n % 6 === 0 ? mieteKalt + 3000 : undefined,
        sepaMandatId: personIndex % 7 === 0 ? undefined : `mnd-${vertragId}`,
        ustPflichtig: istGewerbe,
        besondereVereinbarungen: sonder.verzug
          ? ["Ratenvereinbarung vom 12.05.2026 über 3 Raten, 2. Rate offen"]
          : n % 8 === 0
            ? ["Haltung einer Katze gestattet (Nachtrag vom 04.03.2024)"]
            : [],
      });
      personIndex++;
    }
  }

  objekte.push({
    id: v.id,
    nummer: v.nummer,
    bezeichnung: v.bezeichnung,
    strasse: v.strasse,
    plz: v.plz,
    ort: v.ort,
    verwaltungsarten: v.verwaltungsarten,
    baujahr: v.baujahr,
    einheitenAnzahl: v.einheiten,
    wohnflaecheM2: wohnflaecheSumme,
    gewerbeflaecheM2: gewerbeflaecheSumme,
    eigentuemerId: v.eigentuemer.id,
    verwalterId: v.einheiten > 25 ? "ma-1" : "ma-2",
    postfachIds: objektPostfaecher.map((p) => p.id),
    heizungsart: v.heizungsart,
    energietraeger: v.energietraeger,
    abrechnungszeitraumStart: "01-01",
    verwaltungsbeginn: "2019-01-01",
    hausmeisterId: "ma-3",
    bankkontoId: konto.id,
    notizen: v.notizen,
    lat: v.lat,
    lng: v.lng,
  });
}

// Kontostände nachträglich plausibel setzen (Hausgeld/Miete eines Monats + Puffer).
for (const konto of bankkonten) {
  const objekt = objekte.find((o) => o.bankkontoId === konto.id)!;
  const monatssoll = vertraege
    .filter((v) => v.objektId === objekt.id)
    .reduce((s, v) => s + v.mieteKaltCent + v.bkVorauszahlungCent + v.hkVorauszahlungCent, 0);
  konto.saldoCent = Math.round(monatssoll * 1.4);
}

export const dienstleister: Person[] = [
  {
    id: "dl-1",
    typ: "juristisch",
    anrede: "Firma",
    name: "Bergmann Elektrotechnik GmbH",
    rollen: ["dienstleister"],
    email: "auftrag@bergmann-elektro.handwerk.example",
    telefon: "0221 5511230",
    gewerk: "elektro",
    reaktionszeitStunden: 8,
    bewertung: 4.6,
    kreditorNr: "70012",
    iban: testIban(701),
    kanal: "email",
    seit: "2019-04-01",
  },
  {
    id: "dl-2",
    typ: "juristisch",
    anrede: "Firma",
    name: "Sanitär Nowak & Söhne",
    rollen: ["dienstleister"],
    email: "buero@nowak-sanitaer.handwerk.example",
    telefon: "0221 6642890",
    gewerk: "sanitaer_heizung",
    reaktionszeitStunden: 4,
    bewertung: 4.2,
    kreditorNr: "70034",
    iban: testIban(702),
    kanal: "telefon",
    seit: "2018-09-01",
  },
  {
    id: "dl-3",
    typ: "juristisch",
    anrede: "Firma",
    name: "Kölner Aufzugsservice GmbH",
    rollen: ["dienstleister"],
    email: "service@koelner-aufzug.handwerk.example",
    telefon: "0221 9080770",
    gewerk: "aufzug",
    reaktionszeitStunden: 2,
    bewertung: 3.8,
    kreditorNr: "70051",
    iban: testIban(703),
    kanal: "email",
    seit: "2020-01-01",
  },
  {
    id: "dl-4",
    typ: "juristisch",
    anrede: "Firma",
    name: "GrünWerk Gartenpflege",
    rollen: ["dienstleister"],
    email: "info@gruenwerk.handwerk.example",
    telefon: "0221 3348812",
    gewerk: "garten",
    reaktionszeitStunden: 48,
    bewertung: 4.8,
    kreditorNr: "70063",
    iban: testIban(704),
    kanal: "email",
    seit: "2021-03-01",
  },
  {
    id: "dl-5",
    typ: "juristisch",
    anrede: "Firma",
    name: "Aqua Control Trinkwasseranalytik",
    rollen: ["dienstleister"],
    email: "labor@aquacontrol.handwerk.example",
    telefon: "0221 7712400",
    gewerk: "sanitaer_heizung",
    reaktionszeitStunden: 72,
    bewertung: 4.4,
    kreditorNr: "70077",
    iban: testIban(705),
    kanal: "email",
    seit: "2022-05-01",
  },
  {
    id: "dl-6",
    typ: "juristisch",
    anrede: "Firma",
    name: "Dachdeckerei Vogt GmbH",
    rollen: ["dienstleister"],
    email: "kontakt@dach-vogt.handwerk.example",
    telefon: "0221 2290155",
    gewerk: "dach",
    reaktionszeitStunden: 24,
    bewertung: 4.1,
    kreditorNr: "70089",
    iban: testIban(706),
    kanal: "email",
    seit: "2019-11-01",
  },
  {
    id: "vers-1",
    typ: "juristisch",
    anrede: "Firma",
    name: "RheinEnergie AG",
    rollen: ["versorger"],
    email: "rechnung@rheinenergie.example",
    telefon: "0221 1780",
    kreditorNr: "60011",
    iban: testIban(601),
    kanal: "email",
    seit: "2015-01-01",
  },
  {
    id: "vers-2",
    typ: "juristisch",
    anrede: "Firma",
    name: "AWB Abfallwirtschaftsbetriebe Köln",
    rollen: ["versorger"],
    email: "buchhaltung@awb-koeln.example",
    kreditorNr: "60024",
    iban: testIban(602),
    kanal: "post",
    seit: "2015-01-01",
  },
  {
    id: "vsg-1",
    typ: "juristisch",
    anrede: "Firma",
    name: "Nordwest Sachversicherung AG",
    rollen: ["versicherung"],
    email: "schaden@nordwest-vers.example",
    telefon: "0211 4400900",
    kreditorNr: "65010",
    kanal: "portal",
    seit: "2017-01-01",
  },
];

personen.push(...dienstleister);

export const zentralePostfaecher: Postfach[] = [
  {
    id: "pf-zentral",
    objektId: null,
    zweck: "allgemein",
    adresse: `info@${mandant.mailDomain}`,
    aktiv: true,
    fallback: "triage",
    absenderWhitelist: [],
    eingaengeMonat: 312,
    autoQuote: 0.38,
  },
  {
    id: "pf-zentral-rechnung",
    objektId: null,
    zweck: "rechnung",
    adresse: `rechnung@${mandant.mailDomain}`,
    aktiv: true,
    fallback: "triage",
    absenderWhitelist: [],
    eingaengeMonat: 87,
    autoQuote: 0.64,
  },
];

postfaecher.push(...zentralePostfaecher);

export function personById(id: string | undefined): Person | undefined {
  return id ? personen.find((p) => p.id === id) : undefined;
}

export function objektById(id: string | null | undefined): Objekt | undefined {
  return id ? objekte.find((o) => o.id === id) : undefined;
}

export function einheitById(id: string | undefined): Einheit | undefined {
  return id ? einheiten.find((e) => e.id === id) : undefined;
}
