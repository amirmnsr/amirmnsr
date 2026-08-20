/**
 * Seed: Buchhaltung, Zahlungen, Rechnungseingang, Abrechnung
 * =============================================================================
 * Die Sollstellungen des laufenden Monats werden mit der echten Engine erzeugt
 * (nicht von Hand geschrieben) — so zeigt die Demo dieselben Zahlen, die das
 * Produktiv-System rechnen würde. Offene Posten, Zahlungseingänge und
 * Rechnungsfälle sind bewusst gesetzt, damit alle interessanten Zustände
 * mindestens einmal vorkommen.
 */

import type {
  Abrechnungslauf,
  Buchung,
  Eingangsrechnung,
  Kontoumsatz,
  Kostenposition,
  SepaMandat,
  Sollstellung,
  Zahlungsvorschlag,
} from "@/domain";
import { erzeugeSollstellungenMonat, type VertragFuerSoll } from "@/domain/accounting/sollstellung";
import { HEUTE, JETZT, stundenVersetzt, tageVersetzt, testIban } from "./basis";
import { einheiten, objekte, personen, vertraege } from "./stammdaten";

const MONAT = 8;
const JAHR = 2026;

function alsSollVertrag(v: (typeof vertraege)[number]): VertragFuerSoll {
  return {
    vertragId: v.id,
    objektId: v.objektId,
    einheitId: v.einheitId,
    beginn: v.beginn,
    ende: v.ende,
    gekuendigtZum: v.gekuendigtZum,
    mieteKaltCent: v.mieteKaltCent,
    bkVorauszahlungCent: v.bkVorauszahlungCent,
    hkVorauszahlungCent: v.hkVorauszahlungCent,
    stellplatzCent: v.stellplatzCent,
    anpassungen: v.naechsteStaffelAm && v.naechsteStaffelCent
      ? [{ abIso: v.naechsteStaffelAm, mieteKaltCent: v.naechsteStaffelCent, grund: "Staffelmiete" }]
      : undefined,
  };
}

/** Verträge mit gesetztem Zahlungsverzug — steuert die Demo-Fälle im Mahnwesen. */
const VERZUG_EINHEITEN = ["obj-1042-e03", "obj-1156-e09"];

export const sollstellungen: Sollstellung[] = [];
export const offenePosten: Sollstellung[] = [];

for (const v of vertraege) {
  const positionen = erzeugeSollstellungenMonat(alsSollVertrag(v), JAHR, MONAT);
  const imVerzug = VERZUG_EINHEITEN.includes(v.einheitId);

  for (const p of positionen) {
    const soll: Sollstellung = {
      id: p.sollId,
      objektId: p.objektId,
      einheitId: p.einheitId,
      vertragId: p.vertragId,
      periode: p.periode,
      art: p.art,
      betragCent: p.betragCent,
      faelligAm: p.faelligAm,
      bezahltCent: imVerzug ? 0 : p.betragCent,
      status: imVerzug ? "offen" : "bezahlt",
      mahnstufe: imVerzug ? 1 : 0,
    };
    sollstellungen.push(soll);
    if (soll.status !== "bezahlt") offenePosten.push(soll);
  }

  // Rückstände aus Vormonaten für die Verzugsfälle.
  if (imVerzug) {
    for (const monat of [6, 7]) {
      for (const p of erzeugeSollstellungenMonat(alsSollVertrag(v), JAHR, monat)) {
        const teilzahlung = monat === 6 && p.art === "miete_kalt" ? Math.round(p.betragCent / 2) : 0;
        const soll: Sollstellung = {
          id: p.sollId,
          objektId: p.objektId,
          einheitId: p.einheitId,
          vertragId: p.vertragId,
          periode: p.periode,
          art: p.art,
          betragCent: p.betragCent,
          faelligAm: p.faelligAm,
          bezahltCent: teilzahlung,
          status: teilzahlung > 0 ? "teilbezahlt" : "offen",
          mahnstufe: monat === 6 ? 2 : 1,
        };
        sollstellungen.push(soll);
        offenePosten.push(soll);
      }
    }
  }
}

export const sepaMandate: SepaMandat[] = vertraege
  .filter((v) => v.sepaMandatId)
  .map((v, i) => ({
    id: v.sepaMandatId!,
    vertragId: v.id,
    personId: v.mieterIds[0],
    mandatsreferenz: `MND-${v.objektId.slice(-4)}-${v.einheitId.slice(-2)}`,
    iban: personen.find((p) => p.id === v.mieterIds[0])?.iban ?? testIban(i),
    unterschriftAm: v.beginn,
    art: v.art === "gewerbe" ? "b2b" : "core",
    letzteNutzung: tageVersetzt(-15),
    // Ein bewusst abgelaufenes Mandat: 36 Monate ohne Nutzung (Core).
    aktiv: i !== 12,
  }));

// ---------------------------------------------------------------------------
// Kontoumsätze
// ---------------------------------------------------------------------------

const hauptkonto = "kto-1042";

export const kontoumsaetze: Kontoumsatz[] = [
  {
    id: "ums-1",
    bankkontoId: hauptkonto,
    objektId: "obj-1042",
    buchungstag: tageVersetzt(-1),
    valuta: tageVersetzt(-1),
    betragCent: 118400,
    gegenkontoName: "Miriam Grabowski",
    gegenkontoIban: testIban(14),
    verwendungszweck: "Miete August 2026 Aachener Str. 218 WE 14",
    endToEndId: "REF-2026-08-1042-14",
    zuordnung: "zugeordnet",
    zugeordneteSollIds: [],
    matchKonfidenz: 0.99,
    matchBegruendung: "SEPA-Referenz identisch mit Sollstellung 2026-08.",
  },
  {
    id: "ums-2",
    bankkontoId: hauptkonto,
    objektId: "obj-1042",
    buchungstag: tageVersetzt(-1),
    valuta: tageVersetzt(-1),
    betragCent: 62000,
    gegenkontoName: "Ferhat Yilmaz",
    verwendungszweck: "Teilzahlung Miete 1042-03-L",
    zuordnung: "vorgeschlagen",
    zugeordneteSollIds: [],
    matchKonfidenz: 0.78,
    matchBegruendung:
      "Objektkennung im Verwendungszweck erkannt, Betrag deckt die offenen Posten nicht vollständig — Verrechnung nach §366/§367 BGB vorgeschlagen.",
  },
  {
    id: "ums-3",
    bankkontoId: hauptkonto,
    objektId: null,
    buchungstag: tageVersetzt(-2),
    valuta: tageVersetzt(-2),
    betragCent: 95000,
    gegenkontoName: "M. Sander",
    verwendungszweck: "Ueberweisung",
    zuordnung: "unklar",
    zugeordneteSollIds: [],
    matchKonfidenz: 0.44,
    matchBegruendung:
      "Keine IBAN im Stammdatensatz, kein Verwendungszweckbezug. Drei Mietverhältnisse mit ähnlichem Namen — Zuordnung nur manuell möglich.",
  },
  {
    id: "ums-4",
    bankkontoId: hauptkonto,
    objektId: "obj-1042",
    buchungstag: tageVersetzt(-3),
    valuta: tageVersetzt(-3),
    betragCent: -284900,
    gegenkontoName: "RheinEnergie AG",
    gegenkontoIban: testIban(601),
    verwendungszweck: "Abschlag Fernwaerme 08/2026 Kd. 4471288",
    zuordnung: "zugeordnet",
    zugeordneteSollIds: [],
    matchKonfidenz: 0.96,
    matchBegruendung: "Kreditor und Betrag entsprechen dem Zahlungsvorschlag ZV-2026-08-3.",
  },
  {
    id: "ums-5",
    bankkontoId: hauptkonto,
    objektId: "obj-1042",
    buchungstag: tageVersetzt(-4),
    valuta: tageVersetzt(-4),
    betragCent: -8400,
    gegenkontoName: "Rücklastschrift Bank",
    verwendungszweck: "Rueckgabe SEPA-Basislastschrift MND-1042-27 / Grund: AC04 Konto geschlossen",
    zuordnung: "rueckbuchung",
    zugeordneteSollIds: [],
    matchKonfidenz: 1,
    matchBegruendung:
      "Rücklastschrift erkannt (AC04). Sollstellung wird wieder geöffnet, Mandat als ungültig markiert.",
  },
];

// ---------------------------------------------------------------------------
// Eingangsrechnungen
// ---------------------------------------------------------------------------

export const eingangsrechnungen: Eingangsrechnung[] = [
  {
    id: "er-1",
    objektId: "obj-1042",
    postfachId: "pf-1042-rechnung",
    nachrichtId: "msg-3",
    format: "zugferd",
    kreditorId: "dl-1",
    kreditorNameRoh: "Bergmann Elektrotechnik GmbH",
    rechnungsNr: "2026-4471",
    rechnungsdatum: tageVersetzt(-2),
    leistungVon: tageVersetzt(-9),
    leistungBis: tageVersetzt(-9),
    faelligAm: tageVersetzt(12),
    skontoBis: tageVersetzt(4),
    skontoProzent: 2,
    bruttoCent: 128490,
    nettoCent: 107975,
    ustCent: 20515,
    ustSatz: 19,
    iban: testIban(701),
    kontoVorschlag: "4600",
    umlagefaehigVorschlag: false,
    auftragId: "auf-1",
    status: "freigabe_erforderlich",
    pruefung: {
      formalOk: true,
      ustAngabenOk: true,
      rechnerischOk: true,
      sachlichOk: true,
      duplikatVerdacht: false,
      ibanAbweichung: false,
      preisAbweichungProzent: 3.2,
      hinweise: [
        "Auftrag AUF-2026-0311 vorhanden, Leistung durch Hausmeister am 12.08. abgenommen.",
        "Position 3 (Anfahrtspauschale 48,00 €) liegt 3,2 % über dem Rahmenvertrag.",
      ],
    },
    extraktionsKonfidenz: 0.98,
    dokumentId: "dok-er-1",
    eingangAm: stundenVersetzt(-19),
  },
  {
    id: "er-2",
    objektId: "obj-1156",
    postfachId: "pf-1156-rechnung",
    nachrichtId: "msg-7",
    format: "pdf_ocr",
    kreditorId: "dl-2",
    kreditorNameRoh: "Sanitär Nowak & Söhne",
    rechnungsNr: "R-2026-8812",
    rechnungsdatum: tageVersetzt(-1),
    faelligAm: tageVersetzt(13),
    bruttoCent: 486200,
    nettoCent: 408571,
    ustCent: 77629,
    ustSatz: 19,
    iban: "DE29500105179876543210",
    kontoVorschlag: "4600",
    umlagefaehigVorschlag: false,
    status: "freigabe_erforderlich",
    pruefung: {
      formalOk: true,
      ustAngabenOk: true,
      rechnerischOk: true,
      sachlichOk: null,
      duplikatVerdacht: false,
      ibanAbweichung: true,
      hinweise: [
        "IBAN weicht vom Kreditorenstamm ab (bisher DE…702, jetzt DE…3210).",
        "Absenderdomain nowak-sanitaer.handwerk.example stimmt, aber Antwortadresse zeigt auf eine Freemail-Adresse.",
        "Kein Auftrag im System, der diese Leistung deckt.",
      ],
    },
    extraktionsKonfidenz: 0.91,
    dokumentId: "dok-er-2",
    eingangAm: stundenVersetzt(-5),
  },
  {
    id: "er-3",
    objektId: "obj-1088",
    postfachId: "pf-1088-rechnung",
    format: "xrechnung",
    kreditorId: "vers-1",
    kreditorNameRoh: "RheinEnergie AG",
    rechnungsNr: "FW-2026-08-4471288",
    rechnungsdatum: tageVersetzt(-3),
    leistungVon: "2026-08-01",
    leistungBis: "2026-08-31",
    faelligAm: tageVersetzt(11),
    bruttoCent: 284900,
    nettoCent: 239412,
    ustCent: 45488,
    ustSatz: 19,
    iban: testIban(601),
    kontoVorschlag: "4300",
    umlagefaehigVorschlag: true,
    status: "bezahlt",
    pruefung: {
      formalOk: true,
      ustAngabenOk: true,
      rechnerischOk: true,
      sachlichOk: true,
      duplikatVerdacht: false,
      ibanAbweichung: false,
      preisAbweichungProzent: -1.4,
      hinweise: ["Abschlag entspricht dem Vorjahresniveau (−1,4 %)."],
    },
    extraktionsKonfidenz: 1,
    dokumentId: "dok-er-3",
    eingangAm: stundenVersetzt(-71),
  },
  {
    id: "er-4",
    objektId: "obj-1042",
    postfachId: "pf-1042-rechnung",
    format: "pdf_ocr",
    kreditorId: "dl-4",
    kreditorNameRoh: "GrünWerk Gartenpflege",
    rechnungsNr: "GW-2026-0771",
    rechnungsdatum: tageVersetzt(-6),
    leistungVon: "2026-07-01",
    leistungBis: "2026-07-31",
    faelligAm: tageVersetzt(8),
    bruttoCent: 63410,
    nettoCent: 53286,
    ustCent: 10124,
    ustSatz: 19,
    iban: testIban(704),
    kontoVorschlag: "4450",
    umlagefaehigVorschlag: true,
    status: "eingegangen",
    pruefung: {
      formalOk: true,
      ustAngabenOk: true,
      rechnerischOk: true,
      sachlichOk: true,
      duplikatVerdacht: true,
      duplikatVon: "er-5",
      ibanAbweichung: false,
      hinweise: [
        "Gleicher Kreditor, gleicher Betrag und gleicher Leistungszeitraum wie Rechnung GW-2026-0768 vom 04.08.",
        "Rechnungsnummer weicht ab — Mahnung oder Doppelstellung, Rückfrage erforderlich.",
      ],
    },
    extraktionsKonfidenz: 0.87,
    dokumentId: "dok-er-4",
    eingangAm: stundenVersetzt(-144),
  },
  {
    id: "er-5",
    objektId: "obj-1042",
    postfachId: "pf-1042-rechnung",
    format: "pdf_ocr",
    kreditorId: "dl-4",
    kreditorNameRoh: "GrünWerk Gartenpflege",
    rechnungsNr: "GW-2026-0768",
    rechnungsdatum: tageVersetzt(-16),
    leistungVon: "2026-07-01",
    leistungBis: "2026-07-31",
    faelligAm: tageVersetzt(-2),
    bruttoCent: 63410,
    nettoCent: 53286,
    ustCent: 10124,
    ustSatz: 19,
    iban: testIban(704),
    kontoVorschlag: "4450",
    umlagefaehigVorschlag: true,
    status: "bezahlt",
    pruefung: {
      formalOk: true,
      ustAngabenOk: true,
      rechnerischOk: true,
      sachlichOk: true,
      duplikatVerdacht: false,
      ibanAbweichung: false,
      hinweise: [],
    },
    extraktionsKonfidenz: 0.95,
    dokumentId: "dok-er-5",
    eingangAm: stundenVersetzt(-384),
  },
  {
    id: "er-6",
    objektId: "obj-1121",
    postfachId: "pf-1121-rechnung",
    format: "zugferd",
    kreditorId: "dl-3",
    kreditorNameRoh: "Kölner Aufzugsservice GmbH",
    rechnungsNr: "KAS-26-3391",
    rechnungsdatum: tageVersetzt(-4),
    leistungVon: "2026-07-01",
    leistungBis: "2026-09-30",
    faelligAm: tageVersetzt(10),
    bruttoCent: 214200,
    nettoCent: 180000,
    ustCent: 34200,
    ustSatz: 19,
    iban: testIban(703),
    kontoVorschlag: "4400",
    umlagefaehigVorschlag: true,
    status: "freigabe_erforderlich",
    pruefung: {
      formalOk: true,
      ustAngabenOk: true,
      rechnerischOk: true,
      sachlichOk: false,
      duplikatVerdacht: false,
      ibanAbweichung: false,
      preisAbweichungProzent: 18.7,
      hinweise: [
        "Wartungsvertrag vom 01.01.2024 sieht 1.804,00 € brutto je Quartal vor, berechnet wurden 2.142,00 €.",
        "Preisgleitklausel im Vertrag verlangt schriftliche Ankündigung — im Dokumentenarchiv nicht vorhanden.",
      ],
    },
    extraktionsKonfidenz: 0.99,
    dokumentId: "dok-er-6",
    eingangAm: stundenVersetzt(-96),
  },
  {
    id: "er-7",
    objektId: "obj-1042",
    postfachId: "pf-1042-rechnung",
    format: "zugferd",
    kreditorId: "dl-5",
    kreditorNameRoh: "Aqua Control Trinkwasseranalytik",
    rechnungsNr: "AC-2026-1180",
    rechnungsdatum: tageVersetzt(-8),
    faelligAm: tageVersetzt(6),
    bruttoCent: 47600,
    nettoCent: 40000,
    ustCent: 7600,
    ustSatz: 19,
    iban: testIban(705),
    kontoVorschlag: "4500",
    umlagefaehigVorschlag: true,
    status: "freigegeben",
    pruefung: {
      formalOk: true,
      ustAngabenOk: true,
      rechnerischOk: true,
      sachlichOk: true,
      duplikatVerdacht: false,
      ibanAbweichung: false,
      hinweise: ["Prüfbericht als Anhang erkannt und der Prüfpflicht PP-1042-TW zugeordnet."],
    },
    extraktionsKonfidenz: 0.97,
    dokumentId: "dok-er-7",
    eingangAm: stundenVersetzt(-192),
  },
];

export const zahlungsvorschlaege: Zahlungsvorschlag[] = [
  {
    id: "zv-2026-08-4",
    rechnungIds: ["er-1", "er-7"],
    bankkontoId: hauptkonto,
    summeCent: 176090,
    ausfuehrungAm: tageVersetzt(1),
    skontoErsparnisCent: 2570,
    status: "vorgeschlagen",
    zweiteFreigabeErforderlich: false,
  },
];

// ---------------------------------------------------------------------------
// Kostenpositionen und Abrechnungsläufe (Abrechnungsjahr 2025)
// ---------------------------------------------------------------------------

export const kostenpositionen2025: Kostenposition[] = [
  { id: "kp-1", objektId: "obj-1042", jahr: 2025, kontoNr: "4200", bezeichnung: "Grundsteuer", betragCent: 1284000, umlagefaehig: true, schluessel: "wohnflaeche", vorwegabzugCent: 0, paragraf35aCent: 0, belegIds: ["dok-1"] },
  { id: "kp-2", objektId: "obj-1042", jahr: 2025, kontoNr: "4210", bezeichnung: "Wasserversorgung", betragCent: 874500, umlagefaehig: true, schluessel: "verbrauch_wasser", vorwegabzugCent: 0, paragraf35aCent: 0, belegIds: ["dok-2"] },
  { id: "kp-3", objektId: "obj-1042", jahr: 2025, kontoNr: "4215", bezeichnung: "Entwässerung", betragCent: 612300, umlagefaehig: true, schluessel: "verbrauch_wasser", vorwegabzugCent: 0, paragraf35aCent: 0, belegIds: ["dok-2"] },
  { id: "kp-4", objektId: "obj-1042", jahr: 2025, kontoNr: "4300", bezeichnung: "Heizung und Warmwasser", betragCent: 3421800, umlagefaehig: true, schluessel: "verbrauch_waerme", vorwegabzugCent: 0, paragraf35aCent: 0, belegIds: ["dok-3"] },
  { id: "kp-5", objektId: "obj-1042", jahr: 2025, kontoNr: "4430", bezeichnung: "Müllbeseitigung", betragCent: 498700, umlagefaehig: true, schluessel: "personen", vorwegabzugCent: 0, paragraf35aCent: 0, belegIds: ["dok-4"] },
  { id: "kp-6", objektId: "obj-1042", jahr: 2025, kontoNr: "4440", bezeichnung: "Gebäudereinigung", betragCent: 764400, umlagefaehig: true, schluessel: "wohnflaeche", vorwegabzugCent: 84000, paragraf35aCent: 611520, belegIds: ["dok-5"] },
  { id: "kp-7", objektId: "obj-1042", jahr: 2025, kontoNr: "4450", bezeichnung: "Gartenpflege", betragCent: 388900, umlagefaehig: true, schluessel: "wohnflaeche", vorwegabzugCent: 0, paragraf35aCent: 311120, belegIds: ["dok-6"] },
  { id: "kp-8", objektId: "obj-1042", jahr: 2025, kontoNr: "4460", bezeichnung: "Allgemeinstrom", betragCent: 211400, umlagefaehig: true, schluessel: "wohnflaeche", vorwegabzugCent: 0, paragraf35aCent: 0, belegIds: ["dok-7"] },
  { id: "kp-9", objektId: "obj-1042", jahr: 2025, kontoNr: "4470", bezeichnung: "Gebäudeversicherung", betragCent: 592800, umlagefaehig: true, schluessel: "wohnflaeche", vorwegabzugCent: 0, paragraf35aCent: 0, belegIds: ["dok-8"] },
  { id: "kp-10", objektId: "obj-1042", jahr: 2025, kontoNr: "4480", bezeichnung: "Hausmeisterdienst", betragCent: 1104000, umlagefaehig: true, schluessel: "wohnflaeche", vorwegabzugCent: 220800, paragraf35aCent: 706560, belegIds: ["dok-9"] },
  { id: "kp-11", objektId: "obj-1042", jahr: 2025, kontoNr: "4400", bezeichnung: "Aufzugswartung", betragCent: 721600, umlagefaehig: true, schluessel: "einheiten", vorwegabzugCent: 0, paragraf35aCent: 577280, belegIds: ["dok-10"] },
  { id: "kp-12", objektId: "obj-1042", jahr: 2025, kontoNr: "4500", bezeichnung: "Trinkwasseruntersuchung", betragCent: 142800, umlagefaehig: true, schluessel: "wohnflaeche", vorwegabzugCent: 0, paragraf35aCent: 114240, belegIds: ["dok-11"] },
  { id: "kp-13", objektId: "obj-1042", jahr: 2025, kontoNr: "4600", bezeichnung: "Instandhaltung (Dachrinne, Türanlage)", betragCent: 1876500, umlagefaehig: false, schluessel: "nicht_umlegen", vorwegabzugCent: 0, paragraf35aCent: 0, belegIds: ["dok-12"] },
  { id: "kp-14", objektId: "obj-1042", jahr: 2025, kontoNr: "4610", bezeichnung: "Verwaltervergütung", betragCent: 1142400, umlagefaehig: false, schluessel: "nicht_umlegen", vorwegabzugCent: 0, paragraf35aCent: 0, belegIds: ["dok-13"] },
];

export const abrechnungslaeufe: Abrechnungslauf[] = [
  {
    id: "abr-1042-2025",
    objektId: "obj-1042",
    jahr: 2025,
    art: "betriebskosten",
    status: "berechnet",
    fristAm: "2026-12-31",
    einheitenGesamt: 34,
    einheitenGeprueft: 31,
    gesamtkostenCent: kostenpositionen2025.reduce((s, k) => s + k.betragCent, 0),
    umlagefaehigCent: kostenpositionen2025
      .filter((k) => k.umlagefaehig)
      .reduce((s, k) => s + k.betragCent - k.vorwegabzugCent, 0),
    nachzahlungenCent: 1874300,
    guthabenCent: -642100,
    auffaelligkeiten: [
      "Wasserkosten +18,4 % gegenüber 2024 — Verbrauch WE 22 verdreifacht, Rohrbruchverdacht.",
      "Hausmeisterkosten enthalten 2.208,00 € Gartenarbeiten, die bereits über Konto 4450 abgerechnet wurden.",
      "Für 3 Einheiten fehlen Zwischenzählerstände zum Mieterwechsel 01.07.2025.",
    ],
  },
  {
    id: "abr-1156-2025",
    objektId: "obj-1156",
    jahr: 2025,
    art: "betriebskosten",
    status: "versendet",
    fristAm: "2026-12-31",
    einheitenGesamt: 26,
    einheitenGeprueft: 26,
    gesamtkostenCent: 7841200,
    umlagefaehigCent: 6122400,
    nachzahlungenCent: 1122800,
    guthabenCent: -418900,
    auffaelligkeiten: ["2 Widersprüche eingegangen (WE 4, WE 19) — Zählerstände werden geprüft."],
  },
  {
    id: "abr-1088-2025",
    objektId: "obj-1088",
    jahr: 2025,
    art: "weg_jahresabrechnung",
    status: "beschlossen",
    fristAm: "2026-06-30",
    einheitenGesamt: 28,
    einheitenGeprueft: 28,
    gesamtkostenCent: 9214700,
    umlagefaehigCent: 9214700,
    nachzahlungenCent: 2214100,
    guthabenCent: -884300,
    auffaelligkeiten: [],
  },
];

// ---------------------------------------------------------------------------
// Journal (Auszug)
// ---------------------------------------------------------------------------

export const buchungen: Buchung[] = [
  {
    id: "bu-1",
    journalNr: 20260801,
    objektId: "obj-1042",
    belegNr: "ER-2026-4471",
    datum: tageVersetzt(-2),
    leistungVon: tageVersetzt(-9),
    leistungBis: tageVersetzt(-9),
    sollKonto: "4600",
    habenKonto: "1600",
    betragCent: 128490,
    ustSatz: 19,
    ustBetragCent: 20515,
    text: "Bergmann Elektrotechnik — Störung Treppenhausbeleuchtung",
    festgeschrieben: false,
    erfasstVon: "agent",
    agentId: "kontierer",
    erfasstAm: stundenVersetzt(-19),
  },
  {
    id: "bu-2",
    journalNr: 20260802,
    objektId: "obj-1042",
    einheitId: "obj-1042-e14",
    belegNr: "SOLL-2026-08-14",
    datum: "2026-08-05",
    sollKonto: "1400",
    habenKonto: "8100",
    betragCent: 84000,
    ustSatz: 0,
    ustBetragCent: 0,
    text: "Sollstellung Miete 08/2026 WE 14",
    festgeschrieben: true,
    erfasstVon: "system",
    erfasstAm: "2026-08-01T02:00:00+02:00",
  },
  {
    id: "bu-3",
    journalNr: 20260803,
    objektId: "obj-1088",
    belegNr: "FW-2026-08",
    datum: tageVersetzt(-3),
    leistungVon: "2026-08-01",
    leistungBis: "2026-08-31",
    sollKonto: "4300",
    habenKonto: "1600",
    betragCent: 284900,
    ustSatz: 19,
    ustBetragCent: 45488,
    text: "RheinEnergie Fernwärme Abschlag 08/2026",
    festgeschrieben: true,
    erfasstVon: "agent",
    agentId: "kontierer",
    erfasstAm: stundenVersetzt(-71),
  },
];

export const objektSalden = objekte.map((o) => {
  const objektVertraege = vertraege.filter((v) => v.objektId === o.id);
  const monatsSoll = objektVertraege.reduce(
    (s, v) => s + v.mieteKaltCent + v.bkVorauszahlungCent + v.hkVorauszahlungCent + v.stellplatzCent,
    0,
  );
  const offen = offenePosten
    .filter((p) => p.objektId === o.id)
    .reduce((s, p) => s + (p.betragCent - p.bezahltCent), 0);
  const leerstand = einheiten.filter((e) => e.objektId === o.id && e.status === "leerstand").length;
  return {
    objektId: o.id,
    monatsSollCent: monatsSoll,
    offenCent: offen,
    leerstandEinheiten: leerstand,
    leerstandsquote: leerstand / o.einheitenAnzahl,
    stand: HEUTE,
    aktualisiertAm: JETZT,
  };
});
