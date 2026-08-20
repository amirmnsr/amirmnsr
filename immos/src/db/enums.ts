/**
 * Aufzählungstypen
 * =============================================================================
 * Regel: Ein Enum nur dort, wo die Wertemenge vom Gesetz oder von der
 * Buchhaltungslogik vorgegeben ist und Code darauf verzweigt. Alles, was der
 * Mandant selbst pflegt (Kostenarten, Gewerke, Aktenplan, Prozessschlüssel),
 * ist eine Tabelle oder ein `text`-Feld — sonst ist jede Rechtsänderung und
 * jeder neue Mandant eine Migration.
 */

import { pgEnum } from "drizzle-orm/pg-core";

// --- Mandant / Rechtsträger -------------------------------------------------

/**
 * Art des Buchungskreises. Bestimmt, wessen Geld auf dem Konto liegt, und
 * damit die MaBV-Trennung (§ 34c GewO, §§ 4 ff. MaBV).
 *  gdwe          – rechtsfähige Gemeinschaft (§ 9a WEG), eigener Rechtsträger
 *  eigentuemer   – Miet-/SEV-Mandat: Fremdgeld eines Eigentümers
 *  verwalter     – Eigenvermögen der Verwaltung (Honorar, eigene Kosten)
 */
export const buchungskreisArt = pgEnum("buchungskreis_art", ["gdwe", "eigentuemer", "verwalter"]);

/** Verwaltungsart je Objekt/Einheit — Mischbestand ist der Normalfall. */
export const verwaltungsart = pgEnum("verwaltungsart", ["miete", "sev", "weg", "gewerbe"]);

// --- Parteien ---------------------------------------------------------------

export const parteiTyp = pgEnum("partei_typ", ["natuerlich", "juristisch"]);

/** Rolle einer Partei in einem Kontext. Nie ein Attribut der Partei selbst. */
export const rolleTyp = pgEnum("rolle_typ", [
  "mieter",
  "untermieter",
  "eigentuemer",
  "beirat",
  "verwalter",
  "dienstleister",
  "kreditor",
  "versorger",
  "versicherer",
  "behoerde",
  "bank",
  "mitarbeiter",
  "interessent",
  "bevollmaechtigter",
]);

/** Woran die Rolle hängt. Bestimmt die Bedeutung von `kontext_id`. */
export const rollenKontext = pgEnum("rollen_kontext", [
  "mandant",
  "buchungskreis",
  "objekt",
  "einheit",
  "vertrag",
]);

/** Haftung mehrerer Rolleninhaber (mehrere Mieter, Bruchteilseigentum). */
export const haftungTyp = pgEnum("haftung_typ", ["gesamtschuldnerisch", "anteilig", "keine"]);

// --- Objekt / Einheit -------------------------------------------------------

export const einheitTyp = pgEnum("einheit_typ", [
  "wohnung",
  "gewerbe",
  "stellplatz",
  "garage",
  "keller",
  "lager",
  "dachboden",
  "sondernutzung",
]);

/**
 * Art eines Bezugswerts. Das ist die Bemessungsgrundlage der Verteilung —
 * deshalb zeitscheibenbasiert und nicht als Spalte an der Einheit.
 */
export const bezugswertArt = pgEnum("bezugswert_art", [
  "wohnflaeche",
  "nutzflaeche",
  "heizflaeche",
  "mea",
  "personen",
  "einheitenzahl",
  "stimmen",
  "co2_kennwert",
]);

/** Warum ein Bezugswert sich geändert hat — Nachweis für die Abrechnung. */
export const bezugswertQuelle = pgEnum("bezugswert_quelle", [
  "aufmass",
  "teilungserklaerung",
  "bauplan",
  "beschluss",
  "meldung",
  "schaetzung",
  "migration",
]);

// --- Verträge ---------------------------------------------------------------

export const vertragArt = pgEnum("vertrag_art", [
  "miete_wohnraum",
  "miete_gewerbe",
  "miete_stellplatz",
  "verwaltervertrag_weg",
  "verwaltervertrag_miete",
  "verwaltervertrag_sev",
  "dienstleistung",
  "wartung",
  "versorgung",
  "versicherung",
  "darlehen",
]);

/** Mietanpassungsmechanik — steuert, welche Pipeline greifen darf. */
export const anpassungsart = pgEnum("anpassungsart", [
  "vergleichsmiete",
  "index",
  "staffel",
  "umsatz",
  "keine",
]);

/** Art eines zeitscheibenbasierten Betrags am Vertrag. */
export const konditionArt = pgEnum("kondition_art", [
  "miete_kalt",
  "bk_vorauszahlung",
  "hk_vorauszahlung",
  "stellplatz",
  "zuschlag_moebliert",
  "zuschlag_untermiete",
  "hausgeld_vorschuss",
  "ruecklage_vorschuss",
  "kaution",
]);

/** Warum eine Einheit in einem Zeitraum wie genutzt wurde. */
export const nutzungsart = pgEnum("nutzungsart", [
  "miete",
  "leerstand",
  "eigennutzung",
  "sanierung",
  "gewerblich_eigen",
]);

// --- Buchhaltung ------------------------------------------------------------

export const kontoart = pgEnum("kontoart", [
  "ertrag",
  "aufwand",
  "forderung",
  "verbindlichkeit",
  "bank",
  "kasse",
  "ruecklage",
  "kaution",
  "abgrenzung",
  "kapital",
  "verrechnung",
]);

/** Einnahmen-/Ausgabenklasse für die WEG-Projektion (§ 28 Abs. 2 WEG). */
export const eaKlasse = pgEnum("ea_klasse", ["einnahme", "ausgabe", "neutral", "vermoegen"]);

/**
 * Periodenabgrenzung. Für die SEV faktisch Pflicht auf `abfluss`, weil die
 * WEG-Jahresabrechnung nach Abflussprinzip kommt.
 */
export const abgrenzungsprinzip = pgEnum("abgrenzungsprinzip", ["leistung", "abfluss"]);

export const p35aKategorie = pgEnum("p35a_kategorie", ["keine", "haushaltsnah", "handwerker"]);

export const heizkvRelevanz = pgEnum("heizkv_relevanz", [
  "keine",
  "heizung",
  "warmwasser",
  "verbunden",
]);

/** Verteilungsschlüssel. Werte sind vom Gesetz vorgegeben, Parameter sind Daten. */
export const schluesselTyp = pgEnum("schluessel_typ", [
  "flaeche",
  "personen",
  "einheiten",
  "mea",
  "verbrauch",
  "umsatz",
  "fest",
  "direktzuordnung",
  "nicht_umlegen",
]);

export const periodeStatus = pgEnum("periode_status", [
  "offen",
  "abgestimmt",
  "festgeschrieben",
  "beschlossen",
]);

/** Wer die Buchung erzeugt hat. GoBD-pflichtige Angabe bei KI-Kontierung. */
export const buchungsquelle = pgEnum("buchungsquelle", [
  "mensch",
  "agent",
  "regel",
  "import_camt",
  "import_datev",
  "migration",
]);

export const sollArt = pgEnum("soll_art", [
  "miete_kalt",
  "bk_vorauszahlung",
  "hk_vorauszahlung",
  "stellplatz",
  "hausgeld",
  "ruecklage",
  "sonderumlage",
  "nachzahlung",
  "abrechnungsspitze",
  "mahngebuehr",
  "zinsen",
  "kaution",
]);

export const opStatus = pgEnum("op_status", [
  "offen",
  "teilbezahlt",
  "bezahlt",
  "storniert",
  "ausgebucht",
]);

export const belegFormat = pgEnum("beleg_format", [
  "xrechnung_ubl",
  "xrechnung_cii",
  "zugferd",
  "pdf_ocr",
  "papier_scan",
  "manuell",
]);

export const rechnungStatus = pgEnum("rechnung_status", [
  "eingegangen",
  "formal_geprueft",
  "formal_mangel",
  "sachlich_geprueft",
  "freigabe_erforderlich",
  "beschluss_erforderlich",
  "freigegeben",
  "zahlung_gesperrt",
  "zahlung_beauftragt",
  "bezahlt",
  "abgelehnt",
  "reklamation",
]);

export const zuordnungStatus = pgEnum("zuordnung_status", [
  "neu",
  "vorgeschlagen",
  "zugeordnet",
  "klaerfall",
  "ignoriert",
  "rueckbuchung",
]);

// --- Dokumente / Verknüpfung ------------------------------------------------

/**
 * Entitätstypen, die in der generischen Kante `bezug` vorkommen dürfen.
 * Bewusst geschlossen: eine offene Textspalte macht die Kante unprüfbar.
 */
export const bezugEntitaet = pgEnum("bezug_entitaet", [
  "objekt",
  "einheit",
  "partei",
  "vertrag",
  "nutzungszeitraum",
  "buchung",
  "buchungszeile",
  "sollstellung",
  "eingangsrechnung",
  "bankumsatz",
  "dokument",
  "frist",
  "vorschlag",
  "entscheidung",
  "umlageregel",
  "periode",
  "buchungskreis",
]);

/** Bedeutung der Kante. Ohne Rolle ist eine Verknüpfung wertlos. */
export const bezugRolle = pgEnum("bezug_rolle", [
  "beleg",
  "nachweis",
  "anlage",
  "evidenz",
  "betrifft",
  "dublette_von",
  "ersetzt",
  "storniert",
  "ursache",
  "zugangsnachweis",
  "vollmacht",
  "beschlussgrundlage",
]);

export const dokumentArt = pgEnum("dokument_art", [
  "mietvertrag",
  "verwaltervertrag",
  "rechnung",
  "angebot",
  "auftrag",
  "protokoll",
  "beschluss",
  "abrechnung",
  "wirtschaftsplan",
  "kontoauszug",
  "gutachten",
  "pruefnachweis",
  "korrespondenz",
  "zustellnachweis",
  "foto",
  "plan",
  "teilungserklaerung",
  "versicherung",
  "sonstiges",
]);

// --- Fristen ----------------------------------------------------------------

export const fristArt = pgEnum("frist_art", [
  "gesetzlich",
  "vertraglich",
  "behoerdlich",
  "gerichtlich",
  "selbst_gesetzt",
]);

/** Woraus die Frist berechnet wurde. Eine Frist ohne Anker ist forensisch wertlos. */
export const fristAnker = pgEnum("frist_anker", [
  "zustellung",
  "ereignis",
  "beschluss",
  "abnahme",
  "periodenende",
  "vertragsbeginn",
  "faelligkeit",
  "manuell",
]);

export const fristStatus = pgEnum("frist_status", [
  "laufend",
  "vorwarnung",
  "kritisch",
  "gehemmt",
  "gewahrt",
  "versaeumt",
  "entfallen",
]);

/** Nachweiswert des Zugangs — bestimmt, ob die Frist vor Gericht trägt. */
export const zustellkanal = pgEnum("zustellkanal", [
  "email",
  "portal",
  "post_einfach",
  "einwurf_einschreiben",
  "bote_mit_zeuge",
  "pzu",
  "uebergabe_persoenlich",
]);

// --- KI ---------------------------------------------------------------------

/**
 * 0 beobachten · 1 vorschlagen · 2 handeln mit Widerspruchsfenster · 3 autonom.
 * Als Enum, weil die Policy-Engine darauf verzweigt.
 */
export const autonomiestufe = pgEnum("autonomiestufe", ["s0", "s1", "s2", "s3"]);

export const vorschlagKategorie = pgEnum("vorschlag_kategorie", [
  "zahlung",
  "buchung",
  "kommunikation",
  "beauftragung",
  "frist",
  "vertrag",
  "abrechnung",
  "eskalation",
  "stammdaten",
  "beschluss",
]);

export const vorschlagStatus = pgEnum("vorschlag_status", [
  "erzeugt",
  "vorgelegt",
  "zugestimmt",
  "geaendert_zugestimmt",
  "abgelehnt",
  "abgelaufen",
  "eskaliert",
  "ausgefuehrt",
  "teilausgefuehrt",
  "fehlgeschlagen",
  "zurueckgenommen",
]);

/**
 * Rechtsnatur der vorgeschlagenen Handlung. Der stärkste Prädiktor für die
 * zulässige Autonomie — stärker als Betrag oder Konfidenz.
 */
export const rechtsnatur = pgEnum("rechtsnatur", [
  "prozessschritt",
  "wissenserklaerung",
  "willenserklaerung",
  "gestaltungsrecht",
]);

export const entscheidungArt = pgEnum("entscheidung_art", [
  "zustimmen",
  "aendern_zustimmen",
  "ablehnen",
  "delegieren",
  "zurueckstellen",
]);

export const akteurArt = pgEnum("akteur_art", ["mensch", "agent", "system", "extern"]);

/** Woraus sich die Befugnis der Ausführung ableitet. Kernfeld des Nachweises. */
export const legitimation = pgEnum("legitimation", [
  "entscheidung",
  "vier_augen",
  "autonomie_regel",
  "gesetzlich",
  "beschluss",
  "vollmacht",
  "migration",
]);
