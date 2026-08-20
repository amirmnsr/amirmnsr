/**
 * Datenbankschema (Postgres, Drizzle)
 * =============================================================================
 * Fortschreibung von `src/domain/types.ts` in eine mandantenfähige Datenbank.
 * Der Prototyp läuft noch gegen die Seed-Welt; `src/data/world.ts` ist die Naht,
 * an der getauscht wird.
 *
 * Tragende Entscheidungen:
 *
 *  1. `mandant_id` steht auf jeder Tabelle und ist Teil jedes Index. Mit Row
 *     Level Security ist mandantenübergreifender Zugriff auch bei einem
 *     Programmfehler ausgeschlossen — nicht nur „wenn das WHERE stimmt".
 *  2. Geld ist `bigint` in Cent. Kein numeric, kein float. Gerundet wird
 *     ausschließlich in der Rechenengine, nachvollziehbar und getestet.
 *  3. Alles fachlich Veränderliche ist zeitscheibenbasiert (`gueltig_von`,
 *     `gueltig_bis`). Historie wird abgegrenzt, nicht überschrieben — eine
 *     Abrechnung braucht den Stand des Abrechnungszeitraums.
 *  4. Festgeschriebene Buchungen und Audit-Einträge sind unveränderbar. Das
 *     erzwingen Trigger (siehe `policies.sql`), nicht die Anwendungsschicht.
 *  5. Vorschlag, Entscheidung und Audit sind eigene Tabellen. Ohne sie wäre
 *     keine Autonomiestufe nachweisbar und damit keine vertretbar.
 */

import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Aufzählungen
// ---------------------------------------------------------------------------

export const verwaltungsartEnum = pgEnum("verwaltungsart", ["miete", "sev", "weg", "gewerbe"]);
export const einheitTypEnum = pgEnum("einheit_typ", [
  "wohnung", "gewerbe", "stellplatz", "garage", "keller", "lager", "dachboden",
]);
export const einheitStatusEnum = pgEnum("einheit_status", [
  "vermietet", "leerstand", "eigennutzung", "sanierung",
]);
export const personTypEnum = pgEnum("person_typ", ["natuerlich", "juristisch"]);
export const personRolleEnum = pgEnum("person_rolle", [
  "mieter", "eigentuemer", "beirat", "dienstleister", "versorger", "versicherung",
  "behoerde", "bank", "hausmeister", "interessent", "mitarbeiter",
]);
export const postfachZweckEnum = pgEnum("postfach_zweck", [
  "rechnung", "schaden", "allgemein", "versammlung", "kuendigung", "zaehler",
]);
export const kontoartEnum = pgEnum("kontoart", [
  "ertrag", "aufwand", "forderung", "verbindlichkeit", "bank", "kasse",
  "ruecklage", "kaution", "abgrenzung", "kapital",
]);
export const umlageschluesselEnum = pgEnum("umlageschluessel", [
  "wohnflaeche", "personen", "einheiten", "mea", "verbrauch_waerme",
  "verbrauch_wasser", "direktzuordnung", "nicht_umlegen",
]);
export const sollArtEnum = pgEnum("soll_art", [
  "miete_kalt", "bk_vorauszahlung", "hk_vorauszahlung", "stellplatz", "hausgeld",
  "ruecklage", "sonderumlage", "nachzahlung", "mahngebuehr",
]);
export const rechnungStatusEnum = pgEnum("rechnung_status", [
  "eingegangen", "geprueft", "freigabe_erforderlich", "freigegeben",
  "zahlung_beauftragt", "bezahlt", "abgelehnt", "reklamation",
]);
export const vorgangStatusEnum = pgEnum("vorgang_status", [
  "neu", "in_pruefung", "wartet_auf_entscheidung", "beauftragt",
  "wartet_extern", "erledigt", "abgelehnt",
]);
export const prioritaetEnum = pgEnum("prioritaet", ["notfall", "hoch", "normal", "niedrig"]);
export const vorschlagStatusEnum = pgEnum("vorschlag_status", [
  "offen", "zugestimmt", "abgelehnt", "geaendert_zugestimmt",
  "automatisch_ausgefuehrt", "abgelaufen", "eskaliert",
]);
export const akteurArtEnum = pgEnum("akteur_art", ["mensch", "agent", "system", "extern"]);
export const erfassungsartEnum = pgEnum("erfassungsart", ["mensch", "agent", "system", "import"]);

// ---------------------------------------------------------------------------
// Mandant und Zugriff
// ---------------------------------------------------------------------------

/**
 * Jede Policy prüft gegen `current_setting('immos.mandant_id')`. Die Anwendung
 * setzt diese Variable pro Transaktion aus der Sitzung — niemals aus einem
 * Parameter der Anfrage.
 */
const mandantPolicy = (name: string) =>
  pgPolicy(name, {
    for: "all",
    using: sql`mandant_id = current_setting('immos.mandant_id', true)::uuid`,
    withCheck: sql`mandant_id = current_setting('immos.mandant_id', true)::uuid`,
  });

export const mandanten = pgTable("mandanten", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kurz: text("kurz").notNull(),
  /** Basis-Domain der objektbezogenen Adressen, z. B. rheinquartier.immos.de */
  mailDomain: text("mail_domain").notNull().unique(),
  sitz: text("sitz").notNull(),
  ustIdNr: text("ust_id_nr"),
  angelegtAm: timestamp("angelegt_am", { withTimezone: true }).notNull().defaultNow(),
});

/** Aktive Module je Mandant — das Ergebnis der Ersteinrichtung. */
export const modulKonfiguration = pgTable(
  "modul_konfiguration",
  {
    mandantId: uuid("mandant_id").notNull().references(() => mandanten.id, { onDelete: "cascade" }),
    modulId: text("modul_id").notNull(),
    aktiv: boolean("aktiv").notNull().default(false),
    geaendertAm: timestamp("geaendert_am", { withTimezone: true }).notNull().defaultNow(),
    geaendertVon: uuid("geaendert_von"),
  },
  (t) => [primaryKey({ columns: [t.mandantId, t.modulId] }), mandantPolicy("modul_konfiguration_mandant")],
).enableRLS();

export const nutzer = pgTable(
  "nutzer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull().references(() => mandanten.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    rolle: text("rolle").notNull().default("verwalter"),
    /** Zwei-Faktor ist für zahlungsberechtigte Rollen Pflicht. */
    zweiFaktorAktiv: boolean("zwei_faktor_aktiv").notNull().default(false),
    zahlungsberechtigt: boolean("zahlungsberechtigt").notNull().default(false),
    aktiv: boolean("aktiv").notNull().default(true),
  },
  (t) => [unique().on(t.mandantId, t.email), mandantPolicy("nutzer_mandant")],
).enableRLS();

// ---------------------------------------------------------------------------
// Stammdaten
// ---------------------------------------------------------------------------

export const objekte = pgTable(
  "objekte",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull().references(() => mandanten.id, { onDelete: "cascade" }),
    nummer: text("nummer").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    strasse: text("strasse").notNull(),
    plz: text("plz").notNull(),
    ort: text("ort").notNull(),
    verwaltungsarten: verwaltungsartEnum("verwaltungsarten").array().notNull(),
    baujahr: integer("baujahr"),
    heizungsart: text("heizungsart"),
    energietraeger: text("energietraeger"),
    /** CO2-Emission in kg/m²·a — Eingang in das Stufenmodell der Umlage. */
    co2EmissionKgProM2: real("co2_emission_kg_pro_m2"),
    /** Verbrauchsanteil nach HeizkostenV, zulässig 0,50 bis 0,70. */
    heizkostenVerbrauchsanteil: numeric("heizkosten_verbrauchsanteil", { precision: 3, scale: 2 }).default("0.70"),
    abrechnungszeitraumStart: text("abrechnungszeitraum_start").notNull().default("01-01"),
    verwaltungsbeginn: date("verwaltungsbeginn").notNull(),
    verwaltungsende: date("verwaltungsende"),
    lat: real("lat"),
    lng: real("lng"),
    notizen: text("notizen"),
  },
  (t) => [
    unique().on(t.mandantId, t.nummer),
    index("objekte_mandant_idx").on(t.mandantId),
    mandantPolicy("objekte_mandant"),
  ],
).enableRLS();

export const einheiten = pgTable(
  "einheiten",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").notNull().references(() => objekte.id, { onDelete: "restrict" }),
    nummer: text("nummer").notNull(),
    lage: text("lage").notNull(),
    typ: einheitTypEnum("typ").notNull(),
    status: einheitStatusEnum("status").notNull().default("vermietet"),
    zimmer: real("zimmer"),
    balkon: boolean("balkon").notNull().default(false),
    aufzug: boolean("aufzug").notNull().default(false),
    /** Nur Gewerbe: Option zur Umsatzsteuerpflicht nach §9 UStG. */
    ustOption: boolean("ust_option"),
  },
  (t) => [
    unique().on(t.objektId, t.nummer),
    index("einheiten_mandant_objekt_idx").on(t.mandantId, t.objektId),
    mandantPolicy("einheiten_mandant"),
  ],
).enableRLS();

/**
 * Fläche, Personenzahl und Miteigentumsanteil ändern sich (Umbau, Zuzug,
 * geänderte Teilungserklärung). Eine Abrechnung muss den Stand des
 * Abrechnungszeitraums verwenden — deshalb Zeitscheiben statt Spalten. Für
 * überlappungsfreie Zeiträume je Einheit sorgt ein Ausschluss-Constraint
 * (siehe policies.sql).
 */
export const einheitFlaechen = pgTable(
  "einheit_flaechen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    einheitId: uuid("einheit_id").notNull().references(() => einheiten.id, { onDelete: "cascade" }),
    flaecheM2: numeric("flaeche_m2", { precision: 8, scale: 2 }).notNull(),
    personenzahl: integer("personenzahl").notNull().default(1),
    meaTausendstel: numeric("mea_tausendstel", { precision: 7, scale: 3 }),
    gueltigVon: date("gueltig_von").notNull(),
    gueltigBis: date("gueltig_bis"),
    grund: text("grund"),
  },
  (t) => [
    index("einheit_flaechen_einheit_idx").on(t.einheitId, t.gueltigVon),
    mandantPolicy("einheit_flaechen_mandant"),
  ],
).enableRLS();

export const personen = pgTable(
  "personen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    typ: personTypEnum("typ").notNull(),
    anrede: text("anrede"),
    name: text("name").notNull(),
    email: text("email"),
    telefon: text("telefon"),
    mobil: text("mobil"),
    strasse: text("strasse"),
    plz: text("plz"),
    ort: text("ort"),
    iban: text("iban"),
    /** Änderungen an der IBAN sind der häufigste Betrugsvektor — eigener Zeitstempel. */
    ibanGeaendertAm: timestamp("iban_geaendert_am", { withTimezone: true }),
    kreditorNr: text("kreditor_nr"),
    gewerk: text("gewerk"),
    reaktionszeitStunden: integer("reaktionszeit_stunden"),
    bewertung: real("bewertung"),
    bevorzugterKanal: text("bevorzugter_kanal"),
    seit: date("seit"),
    geloeschtAm: timestamp("geloescht_am", { withTimezone: true }),
  },
  (t) => [
    index("personen_mandant_idx").on(t.mandantId),
    index("personen_iban_idx").on(t.mandantId, t.iban),
    mandantPolicy("personen_mandant"),
  ],
).enableRLS();

export const personRollen = pgTable(
  "person_rollen",
  {
    mandantId: uuid("mandant_id").notNull(),
    personId: uuid("person_id").notNull().references(() => personen.id, { onDelete: "cascade" }),
    rolle: personRolleEnum("rolle").notNull(),
  },
  (t) => [primaryKey({ columns: [t.personId, t.rolle] }), mandantPolicy("person_rollen_mandant")],
).enableRLS();

export const mietvertraege = pgTable(
  "mietvertraege",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").notNull().references(() => objekte.id, { onDelete: "restrict" }),
    einheitId: uuid("einheit_id").notNull().references(() => einheiten.id, { onDelete: "restrict" }),
    art: text("art").notNull(),
    beginn: date("beginn").notNull(),
    ende: date("ende"),
    gekuendigtZum: date("gekuendigt_zum"),
    kuendigungEingang: date("kuendigung_eingang"),
    kautionCent: bigint("kaution_cent", { mode: "number" }).notNull().default(0),
    kautionsart: text("kautionsart"),
    kautionEingegangen: boolean("kaution_eingegangen").notNull().default(false),
    anpassungsart: text("anpassungsart").notNull().default("vergleichsmiete"),
    indexBasis: numeric("index_basis", { precision: 6, scale: 2 }),
    ustPflichtig: boolean("ust_pflichtig").notNull().default(false),
    besondereVereinbarungen: jsonb("besondere_vereinbarungen").$type<string[]>().default([]),
  },
  (t) => [
    index("mietvertraege_einheit_idx").on(t.einheitId, t.beginn),
    mandantPolicy("mietvertraege_mandant"),
  ],
).enableRLS();

/** Mehrere Mieter je Vertrag sind der Normalfall, nicht die Ausnahme. */
export const vertragsparteien = pgTable(
  "vertragsparteien",
  {
    mandantId: uuid("mandant_id").notNull(),
    vertragId: uuid("vertrag_id").notNull().references(() => mietvertraege.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => personen.id, { onDelete: "restrict" }),
    hauptmieter: boolean("hauptmieter").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.vertragId, t.personId] }), mandantPolicy("vertragsparteien_mandant")],
).enableRLS();

/**
 * Mietkonditionen als Zeitscheibe: Staffel, Indexanpassung und geänderte
 * Vorauszahlung sind damit Daten statt Sonderfälle im Code. Der
 * Sollstellungslauf liest die zum Monat wirksame Scheibe.
 */
export const mietkonditionen = pgTable(
  "mietkonditionen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    vertragId: uuid("vertrag_id").notNull().references(() => mietvertraege.id, { onDelete: "cascade" }),
    mieteKaltCent: bigint("miete_kalt_cent", { mode: "number" }).notNull(),
    bkVorauszahlungCent: bigint("bk_vorauszahlung_cent", { mode: "number" }).notNull().default(0),
    hkVorauszahlungCent: bigint("hk_vorauszahlung_cent", { mode: "number" }).notNull().default(0),
    stellplatzCent: bigint("stellplatz_cent", { mode: "number" }).notNull().default(0),
    gueltigVon: date("gueltig_von").notNull(),
    gueltigBis: date("gueltig_bis"),
    grund: text("grund").notNull(),
  },
  (t) => [
    index("mietkonditionen_vertrag_idx").on(t.vertragId, t.gueltigVon),
    mandantPolicy("mietkonditionen_mandant"),
  ],
).enableRLS();

export const eigentumsverhaeltnisse = pgTable(
  "eigentumsverhaeltnisse",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    einheitId: uuid("einheit_id").notNull().references(() => einheiten.id, { onDelete: "cascade" }),
    eigentuemerId: uuid("eigentuemer_id").notNull().references(() => personen.id, { onDelete: "restrict" }),
    meaTausendstel: numeric("mea_tausendstel", { precision: 7, scale: 3 }),
    selbstnutzer: boolean("selbstnutzer").notNull().default(false),
    sevAuftrag: boolean("sev_auftrag").notNull().default(false),
    gueltigVon: date("gueltig_von").notNull(),
    gueltigBis: date("gueltig_bis"),
  },
  (t) => [
    index("eigentum_einheit_idx").on(t.einheitId, t.gueltigVon),
    mandantPolicy("eigentumsverhaeltnisse_mandant"),
  ],
).enableRLS();

export const postfaecher = pgTable(
  "postfaecher",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").references(() => objekte.id, { onDelete: "cascade" }),
    zweck: postfachZweckEnum("zweck").notNull(),
    adresse: text("adresse").notNull().unique(),
    aktiv: boolean("aktiv").notNull().default(true),
    fallback: text("fallback").notNull().default("triage"),
    /** Nur diese Absender dürfen buchungsrelevante Belege einliefern. */
    absenderWhitelist: jsonb("absender_whitelist").$type<string[]>().default([]),
  },
  (t) => [
    index("postfaecher_objekt_idx").on(t.mandantId, t.objektId),
    mandantPolicy("postfaecher_mandant"),
  ],
).enableRLS();

export const zaehler = pgTable(
  "zaehler",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").notNull().references(() => objekte.id, { onDelete: "cascade" }),
    einheitId: uuid("einheit_id").references(() => einheiten.id, { onDelete: "set null" }),
    art: text("art").notNull(),
    nummer: text("nummer").notNull(),
    einheit: text("einheit").notNull(),
    fernablesbar: boolean("fernablesbar").notNull().default(false),
    einbau: date("einbau"),
    eichungBis: date("eichung_bis"),
  },
  (t) => [unique().on(t.objektId, t.nummer), mandantPolicy("zaehler_mandant")],
).enableRLS();

export const zaehlerstaende = pgTable(
  "zaehlerstaende",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    zaehlerId: uuid("zaehler_id").notNull().references(() => zaehler.id, { onDelete: "cascade" }),
    stichtag: date("stichtag").notNull(),
    stand: numeric("stand", { precision: 12, scale: 3 }).notNull(),
    /** Ableseart entscheidet über die Belastbarkeit: fern, vor Ort, geschätzt. */
    quelle: text("quelle").notNull().default("fern"),
    geschaetzt: boolean("geschaetzt").notNull().default(false),
  },
  (t) => [unique().on(t.zaehlerId, t.stichtag), mandantPolicy("zaehlerstaende_mandant")],
).enableRLS();

export const bankkonten = pgTable(
  "bankkonten",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").references(() => objekte.id, { onDelete: "set null" }),
    bezeichnung: text("bezeichnung").notNull(),
    iban: text("iban").notNull(),
    bic: text("bic"),
    bank: text("bank"),
    /** Treuhand, Kaution und Rücklage sind vom Verwaltervermögen zu trennen. */
    art: text("art").notNull(),
    saldoCent: bigint("saldo_cent", { mode: "number" }).notNull().default(0),
    letzterAbruf: timestamp("letzter_abruf", { withTimezone: true }),
  },
  (t) => [unique().on(t.mandantId, t.iban), mandantPolicy("bankkonten_mandant")],
).enableRLS();

// ---------------------------------------------------------------------------
// Buchhaltung
// ---------------------------------------------------------------------------

export const konten = pgTable(
  "konten",
  {
    mandantId: uuid("mandant_id").notNull(),
    nummer: text("nummer").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    art: kontoartEnum("art").notNull(),
    umlagefaehig: boolean("umlagefaehig"),
    standardSchluessel: umlageschluesselEnum("standard_schluessel"),
    /** Fundstelle in der BetrKV — macht die Umlage begründbar. */
    betrkv: text("betrkv"),
    paragraf35a: text("paragraf_35a"),
  },
  (t) => [primaryKey({ columns: [t.mandantId, t.nummer] }), mandantPolicy("konten_mandant")],
).enableRLS();

export const buchungen = pgTable(
  "buchungen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    /** Lückenlose Journalnummer je Mandant und Geschäftsjahr (GoBD). */
    journalNr: bigint("journal_nr", { mode: "number" }).notNull(),
    geschaeftsjahr: integer("geschaeftsjahr").notNull(),
    objektId: uuid("objekt_id").references(() => objekte.id, { onDelete: "restrict" }),
    einheitId: uuid("einheit_id").references(() => einheiten.id, { onDelete: "set null" }),
    belegNr: text("beleg_nr").notNull(),
    dokumentId: uuid("dokument_id"),
    datum: date("datum").notNull(),
    leistungVon: date("leistung_von"),
    leistungBis: date("leistung_bis"),
    sollKonto: text("soll_konto").notNull(),
    habenKonto: text("haben_konto").notNull(),
    betragCent: bigint("betrag_cent", { mode: "number" }).notNull(),
    ustSatz: integer("ust_satz").notNull().default(0),
    ustBetragCent: bigint("ust_betrag_cent", { mode: "number" }).notNull().default(0),
    text: text("text").notNull(),
    festgeschrieben: boolean("festgeschrieben").notNull().default(false),
    stornoVonId: uuid("storno_von_id"),
    erfasstVon: erfassungsartEnum("erfasst_von").notNull(),
    agentId: text("agent_id"),
    nutzerId: uuid("nutzer_id").references(() => nutzer.id, { onDelete: "set null" }),
    erfasstAm: timestamp("erfasst_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.mandantId, t.geschaeftsjahr, t.journalNr),
    index("buchungen_objekt_datum_idx").on(t.mandantId, t.objektId, t.datum),
    mandantPolicy("buchungen_mandant"),
  ],
).enableRLS();

export const sollstellungen = pgTable(
  "sollstellungen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").notNull(),
    einheitId: uuid("einheit_id").notNull(),
    vertragId: uuid("vertrag_id").references(() => mietvertraege.id, { onDelete: "cascade" }),
    periode: text("periode").notNull(),
    art: sollArtEnum("art").notNull(),
    betragCent: bigint("betrag_cent", { mode: "number" }).notNull(),
    bezahltCent: bigint("bezahlt_cent", { mode: "number" }).notNull().default(0),
    faelligAm: date("faellig_am").notNull(),
    mahnstufe: integer("mahnstufe").notNull().default(0),
    buchungId: uuid("buchung_id").references(() => buchungen.id, { onDelete: "set null" }),
    storniertAm: timestamp("storniert_am", { withTimezone: true }),
  },
  (t) => [
    unique().on(t.vertragId, t.periode, t.art),
    index("sollstellungen_offen_idx").on(t.mandantId, t.faelligAm),
    mandantPolicy("sollstellungen_mandant"),
  ],
).enableRLS();

export const kontoumsaetze = pgTable(
  "kontoumsaetze",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    bankkontoId: uuid("bankkonto_id").notNull().references(() => bankkonten.id, { onDelete: "restrict" }),
    /** Fingerprint aus camt.053 — verhindert Doppelimport. */
    importSchluessel: text("import_schluessel").notNull(),
    buchungstag: date("buchungstag").notNull(),
    valuta: date("valuta"),
    betragCent: bigint("betrag_cent", { mode: "number" }).notNull(),
    gegenkontoName: text("gegenkonto_name"),
    gegenkontoIban: text("gegenkonto_iban"),
    verwendungszweck: text("verwendungszweck"),
    endToEndId: text("end_to_end_id"),
    mandatsreferenz: text("mandatsreferenz"),
    zuordnung: text("zuordnung").notNull().default("offen"),
    matchKonfidenz: real("match_konfidenz"),
    matchRegel: text("match_regel"),
    matchBegruendung: text("match_begruendung"),
  },
  (t) => [
    unique().on(t.bankkontoId, t.importSchluessel),
    index("kontoumsaetze_offen_idx").on(t.mandantId, t.zuordnung),
    mandantPolicy("kontoumsaetze_mandant"),
  ],
).enableRLS();

/** Zuordnung Zahlung zu offenem Posten — mehrfach möglich (Teilzahlungen). */
export const zahlungszuordnungen = pgTable(
  "zahlungszuordnungen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    umsatzId: uuid("umsatz_id").notNull().references(() => kontoumsaetze.id, { onDelete: "cascade" }),
    sollstellungId: uuid("sollstellung_id").notNull().references(() => sollstellungen.id, { onDelete: "restrict" }),
    betragCent: bigint("betrag_cent", { mode: "number" }).notNull(),
    quelle: erfassungsartEnum("quelle").notNull(),
    erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("zahlungszuordnungen_soll_idx").on(t.sollstellungId),
    mandantPolicy("zahlungszuordnungen_mandant"),
  ],
).enableRLS();

export const sepaMandate = pgTable(
  "sepa_mandate",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    vertragId: uuid("vertrag_id").references(() => mietvertraege.id, { onDelete: "cascade" }),
    personId: uuid("person_id").references(() => personen.id, { onDelete: "restrict" }),
    mandatsreferenz: text("mandatsreferenz").notNull(),
    iban: text("iban").notNull(),
    art: text("art").notNull().default("core"),
    unterschriftAm: date("unterschrift_am").notNull(),
    letzteNutzung: date("letzte_nutzung"),
    aktiv: boolean("aktiv").notNull().default(true),
    ungueltigGrund: text("ungueltig_grund"),
  },
  (t) => [unique().on(t.mandantId, t.mandatsreferenz), mandantPolicy("sepa_mandate_mandant")],
).enableRLS();

export const eingangsrechnungen = pgTable(
  "eingangsrechnungen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").references(() => objekte.id, { onDelete: "set null" }),
    einheitId: uuid("einheit_id").references(() => einheiten.id, { onDelete: "set null" }),
    postfachId: uuid("postfach_id").references(() => postfaecher.id, { onDelete: "set null" }),
    nachrichtId: uuid("nachricht_id"),
    dokumentId: uuid("dokument_id"),
    format: text("format").notNull(),
    kreditorId: uuid("kreditor_id").references(() => personen.id, { onDelete: "set null" }),
    kreditorNameRoh: text("kreditor_name_roh").notNull(),
    rechnungsNr: text("rechnungs_nr").notNull(),
    rechnungsdatum: date("rechnungsdatum").notNull(),
    leistungVon: date("leistung_von"),
    leistungBis: date("leistung_bis"),
    faelligAm: date("faellig_am"),
    skontoBis: date("skonto_bis"),
    skontoProzent: real("skonto_prozent"),
    bruttoCent: bigint("brutto_cent", { mode: "number" }).notNull(),
    nettoCent: bigint("netto_cent", { mode: "number" }).notNull(),
    ustCent: bigint("ust_cent", { mode: "number" }).notNull(),
    ustSatz: integer("ust_satz").notNull().default(19),
    iban: text("iban"),
    kontoVorschlag: text("konto_vorschlag"),
    umlagefaehigVorschlag: boolean("umlagefaehig_vorschlag"),
    auftragId: uuid("auftrag_id"),
    status: rechnungStatusEnum("status").notNull().default("eingegangen"),
    /** Prüfergebnis als Struktur, damit jeder Punkt einzeln begründbar bleibt. */
    pruefung: jsonb("pruefung").notNull(),
    extraktionsKonfidenz: real("extraktions_konfidenz"),
    eingangAm: timestamp("eingang_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.mandantId, t.kreditorId, t.rechnungsNr),
    index("eingangsrechnungen_status_idx").on(t.mandantId, t.status),
    mandantPolicy("eingangsrechnungen_mandant"),
  ],
).enableRLS();

export const kostenpositionen = pgTable(
  "kostenpositionen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").notNull().references(() => objekte.id, { onDelete: "cascade" }),
    jahr: integer("jahr").notNull(),
    kontoNr: text("konto_nr").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    betragCent: bigint("betrag_cent", { mode: "number" }).notNull(),
    umlagefaehig: boolean("umlagefaehig").notNull(),
    schluessel: umlageschluesselEnum("schluessel").notNull(),
    vorwegabzugCent: bigint("vorwegabzug_cent", { mode: "number" }).notNull().default(0),
    vorwegabzugGrund: text("vorwegabzug_grund"),
    paragraf35aCent: bigint("paragraf_35a_cent", { mode: "number" }).notNull().default(0),
    /** Im Betrag enthaltene CO2-Kosten für das Stufenmodell. */
    co2KostenCent: bigint("co2_kosten_cent", { mode: "number" }).notNull().default(0),
    heizkosten: boolean("heizkosten").notNull().default(false),
    belegIds: jsonb("beleg_ids").$type<string[]>().default([]),
  },
  (t) => [
    index("kostenpositionen_objekt_jahr_idx").on(t.mandantId, t.objektId, t.jahr),
    mandantPolicy("kostenpositionen_mandant"),
  ],
).enableRLS();

export const abrechnungslaeufe = pgTable(
  "abrechnungslaeufe",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").notNull().references(() => objekte.id, { onDelete: "cascade" }),
    jahr: integer("jahr").notNull(),
    art: text("art").notNull(),
    status: text("status").notNull().default("vorbereitung"),
    /** §556 Abs. 3 BGB bei Mietverhältnissen. */
    fristAm: date("frist_am").notNull(),
    /** Vollständiges Rechenergebnis inklusive Rechenweg je Position. */
    ergebnis: jsonb("ergebnis"),
    auffaelligkeiten: jsonb("auffaelligkeiten").$type<string[]>().default([]),
    berechnetAm: timestamp("berechnet_am", { withTimezone: true }),
    versendetAm: timestamp("versendet_am", { withTimezone: true }),
  },
  (t) => [unique().on(t.objektId, t.jahr, t.art), mandantPolicy("abrechnungslaeufe_mandant")],
).enableRLS();

// ---------------------------------------------------------------------------
// Betrieb
// ---------------------------------------------------------------------------

export const vorgaenge = pgTable(
  "vorgaenge",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    nummer: text("nummer").notNull(),
    objektId: uuid("objekt_id").notNull().references(() => objekte.id, { onDelete: "restrict" }),
    einheitId: uuid("einheit_id").references(() => einheiten.id, { onDelete: "set null" }),
    titel: text("titel").notNull(),
    kategorie: text("kategorie").notNull(),
    kanal: text("kanal").notNull(),
    prioritaet: prioritaetEnum("prioritaet").notNull().default("normal"),
    status: vorgangStatusEnum("status").notNull().default("neu"),
    melderId: uuid("melder_id").references(() => personen.id, { onDelete: "set null" }),
    bearbeiterId: uuid("bearbeiter_id").references(() => nutzer.id, { onDelete: "set null" }),
    zusammenfassung: text("zusammenfassung"),
    /** Sammelvorgang, wenn mehrere Meldungen dieselbe Ursache haben. */
    gruppeId: uuid("gruppe_id"),
    playbookId: text("playbook_id"),
    schrittIndex: integer("schritt_index"),
    slaStunden: integer("sla_stunden"),
    kostenSchaetzungCent: bigint("kosten_schaetzung_cent", { mode: "number" }),
    faelligAm: date("faellig_am"),
    erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
    erledigtAm: timestamp("erledigt_am", { withTimezone: true }),
  },
  (t) => [
    unique().on(t.mandantId, t.nummer),
    index("vorgaenge_status_idx").on(t.mandantId, t.status, t.faelligAm),
    mandantPolicy("vorgaenge_mandant"),
  ],
).enableRLS();

export const auftraege = pgTable(
  "auftraege",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    nummer: text("nummer").notNull(),
    vorgangId: uuid("vorgang_id").references(() => vorgaenge.id, { onDelete: "set null" }),
    objektId: uuid("objekt_id").notNull(),
    einheitId: uuid("einheit_id"),
    dienstleisterId: uuid("dienstleister_id").notNull().references(() => personen.id, { onDelete: "restrict" }),
    gewerk: text("gewerk").notNull(),
    beschreibung: text("beschreibung").notNull(),
    status: text("status").notNull().default("angefragt"),
    budgetCent: bigint("budget_cent", { mode: "number" }),
    angebotCent: bigint("angebot_cent", { mode: "number" }),
    rechnungCent: bigint("rechnung_cent", { mode: "number" }),
    beauftragtAm: date("beauftragt_am"),
    terminAm: timestamp("termin_am", { withTimezone: true }),
    /** Der teuerste vergessene Termin der Branche. */
    gewaehrleistungBis: date("gewaehrleistung_bis"),
    beschlussId: uuid("beschluss_id"),
    versicherungsfall: text("versicherungsfall"),
  },
  (t) => [
    unique().on(t.mandantId, t.nummer),
    index("auftraege_gewaehrleistung_idx").on(t.mandantId, t.gewaehrleistungBis),
    mandantPolicy("auftraege_mandant"),
  ],
).enableRLS();

export const anlagen = pgTable(
  "anlagen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").notNull().references(() => objekte.id, { onDelete: "cascade" }),
    bezeichnung: text("bezeichnung").notNull(),
    art: text("art").notNull(),
    hersteller: text("hersteller"),
    baujahr: integer("baujahr"),
    standort: text("standort"),
    zustand: text("zustand").notNull().default("gut"),
    restnutzungsdauerJahre: integer("restnutzungsdauer_jahre"),
  },
  (t) => [index("anlagen_objekt_idx").on(t.mandantId, t.objektId), mandantPolicy("anlagen_mandant")],
).enableRLS();

export const pruefpflichten = pgTable(
  "pruefpflichten",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").notNull(),
    anlageId: uuid("anlage_id").references(() => anlagen.id, { onDelete: "cascade" }),
    bezeichnung: text("bezeichnung").notNull(),
    /** Rechtsgrundlage als Text am Datensatz: Rechtsänderung = Datenänderung. */
    rechtsgrundlage: text("rechtsgrundlage").notNull(),
    intervallMonate: integer("intervall_monate").notNull(),
    letztePruefung: date("letzte_pruefung"),
    naechstePruefung: date("naechste_pruefung").notNull(),
    haftungsrisiko: text("haftungsrisiko").notNull().default("mittel"),
    zustaendigerId: uuid("zustaendiger_id").references(() => nutzer.id, { onDelete: "set null" }),
    nachweisDokumentId: uuid("nachweis_dokument_id"),
  },
  (t) => [
    index("pruefpflichten_faellig_idx").on(t.mandantId, t.naechstePruefung),
    mandantPolicy("pruefpflichten_mandant"),
  ],
).enableRLS();

export const fristen = pgTable(
  "fristen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    art: text("art").notNull(),
    rechtsgrundlage: text("rechtsgrundlage"),
    objektId: uuid("objekt_id").references(() => objekte.id, { onDelete: "cascade" }),
    einheitId: uuid("einheit_id"),
    vorgangId: uuid("vorgang_id").references(() => vorgaenge.id, { onDelete: "cascade" }),
    ablaufAm: date("ablauf_am").notNull(),
    vorlaufTage: integer("vorlauf_tage").notNull().default(14),
    status: text("status").notNull().default("offen"),
    /** Was passiert, wenn die Frist reißt — Grundlage der Priorisierung. */
    konsequenz: text("konsequenz").notNull(),
    eskalationsstufe: integer("eskalationsstufe").notNull().default(0),
    verantwortlicherId: uuid("verantwortlicher_id").references(() => nutzer.id, { onDelete: "set null" }),
  },
  (t) => [
    index("fristen_ablauf_idx").on(t.mandantId, t.status, t.ablaufAm),
    mandantPolicy("fristen_mandant"),
  ],
).enableRLS();

export const nachrichten = pgTable(
  "nachrichten",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    richtung: text("richtung").notNull(),
    kanal: text("kanal").notNull(),
    postfachId: uuid("postfach_id").references(() => postfaecher.id, { onDelete: "set null" }),
    objektId: uuid("objekt_id").references(() => objekte.id, { onDelete: "set null" }),
    einheitId: uuid("einheit_id"),
    vorgangId: uuid("vorgang_id").references(() => vorgaenge.id, { onDelete: "set null" }),
    /** Message-ID beziehungsweise Provider-Referenz — Grundlage der Idempotenz. */
    externeId: text("externe_id"),
    threadId: text("thread_id"),
    absender: text("absender").notNull(),
    absenderName: text("absender_name"),
    empfaenger: jsonb("empfaenger").$type<string[]>().default([]),
    betreff: text("betreff"),
    /** Der Body liegt im Objektspeicher; hier nur Verweis und Vorschau. */
    speicherSchluessel: text("speicher_schluessel"),
    vorschau: text("vorschau"),
    intent: text("intent"),
    intentKonfidenz: real("intent_konfidenz"),
    stimmung: text("stimmung"),
    /** Ergebnis der Eingangsprüfung: SPF, DKIM, DMARC, Injektionsverdacht. */
    sicherheit: jsonb("sicherheit").notNull(),
    gelesen: boolean("gelesen").notNull().default(false),
    eingangAm: timestamp("eingang_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.mandantId, t.externeId),
    index("nachrichten_postfach_idx").on(t.mandantId, t.postfachId, t.eingangAm),
    mandantPolicy("nachrichten_mandant"),
  ],
).enableRLS();

export const dokumente = pgTable(
  "dokumente",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").references(() => objekte.id, { onDelete: "set null" }),
    einheitId: uuid("einheit_id"),
    vorgangId: uuid("vorgang_id").references(() => vorgaenge.id, { onDelete: "set null" }),
    titel: text("titel").notNull(),
    art: text("art").notNull(),
    aktenplan: text("aktenplan").notNull(),
    dateiname: text("dateiname").notNull(),
    mime: text("mime").notNull(),
    groesseBytes: bigint("groesse_bytes", { mode: "number" }).notNull(),
    seiten: integer("seiten"),
    /** Hash des unveränderten Originals — Grundlage der Belegkette. */
    sha256: text("sha256").notNull(),
    speicherSchluessel: text("speicher_schluessel").notNull(),
    ocrText: text("ocr_text"),
    vertraulich: boolean("vertraulich").notNull().default(false),
    aufbewahrungBis: date("aufbewahrung_bis"),
    erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.mandantId, t.sha256),
    index("dokumente_objekt_idx").on(t.mandantId, t.objektId),
    mandantPolicy("dokumente_mandant"),
  ],
).enableRLS();

export const beschluesse = pgTable(
  "beschluesse",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    objektId: uuid("objekt_id").notNull().references(() => objekte.id, { onDelete: "cascade" }),
    versammlungId: uuid("versammlung_id"),
    laufendeNr: integer("laufende_nr").notNull(),
    datum: date("datum").notNull(),
    gegenstand: text("gegenstand").notNull(),
    wortlaut: text("wortlaut").notNull(),
    ergebnis: text("ergebnis").notNull(),
    jaStimmen: integer("ja_stimmen").notNull().default(0),
    neinStimmen: integer("nein_stimmen").notNull().default(0),
    enthaltungen: integer("enthaltungen").notNull().default(0),
    umlaufbeschluss: boolean("umlaufbeschluss").notNull().default(false),
    /** §45 WEG: einmonatige Anfechtungsfrist ab Beschlussfassung. */
    anfechtungsfristBis: date("anfechtungsfrist_bis").notNull(),
    budgetCent: bigint("budget_cent", { mode: "number" }),
    umsetzungStatus: text("umsetzung_status").notNull().default("offen"),
  },
  (t) => [unique().on(t.objektId, t.datum, t.laufendeNr), mandantPolicy("beschluesse_mandant")],
).enableRLS();

// ---------------------------------------------------------------------------
// Agenten, Vorschläge, Nachweis
// ---------------------------------------------------------------------------

export const autonomieRegeln = pgTable(
  "autonomie_regeln",
  {
    mandantId: uuid("mandant_id").notNull(),
    prozess: text("prozess").notNull(),
    modulId: text("modul_id").notNull(),
    stufe: integer("stufe").notNull().default(1),
    betragsgrenzeCent: bigint("betragsgrenze_cent", { mode: "number" }),
    widerspruchsfensterMinuten: integer("widerspruchsfenster_minuten").notNull().default(0),
    /** Nicht überschreitbar; die Begründung steht am Datensatz. */
    maxStufe: integer("max_stufe").notNull().default(3),
    maxStufeGrund: text("max_stufe_grund"),
    geaendertAm: timestamp("geaendert_am", { withTimezone: true }).notNull().defaultNow(),
    geaendertVon: uuid("geaendert_von").references(() => nutzer.id, { onDelete: "set null" }),
  },
  (t) => [primaryKey({ columns: [t.mandantId, t.prozess] }), mandantPolicy("autonomie_regeln_mandant")],
).enableRLS();

export const vorschlaege = pgTable(
  "vorschlaege",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    agentId: text("agent_id").notNull(),
    prozess: text("prozess").notNull(),
    kategorie: text("kategorie").notNull(),
    objektId: uuid("objekt_id").references(() => objekte.id, { onDelete: "cascade" }),
    einheitId: uuid("einheit_id"),
    vorgangId: uuid("vorgang_id").references(() => vorgaenge.id, { onDelete: "cascade" }),
    titel: text("titel").notNull(),
    kurzfassung: text("kurzfassung").notNull(),
    begruendung: text("begruendung").notNull(),
    betragCent: bigint("betrag_cent", { mode: "number" }),
    /** Belege, Aktionen und Alternativen als Struktur — der Diff, der ausgeführt wird. */
    belege: jsonb("belege").notNull(),
    aktionen: jsonb("aktionen").notNull(),
    alternativen: jsonb("alternativen").notNull(),
    risiko: text("risiko").notNull(),
    reversibel: boolean("reversibel").notNull().default(true),
    konfidenz: real("konfidenz").notNull(),
    autonomiestufe: integer("autonomiestufe").notNull(),
    prioritaet: integer("prioritaet").notNull().default(50),
    zeitersparnisMinuten: integer("zeitersparnis_minuten").notNull().default(0),
    vorlageGrund: text("vorlage_grund"),
    status: vorschlagStatusEnum("status").notNull().default("offen"),
    ausfuehrungAm: timestamp("ausfuehrung_am", { withTimezone: true }),
    entscheidenBis: timestamp("entscheiden_bis", { withTimezone: true }),
    erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vorschlaege_offen_idx").on(t.mandantId, t.status, t.prioritaet),
    mandantPolicy("vorschlaege_mandant"),
  ],
).enableRLS();

export const entscheidungen = pgTable(
  "entscheidungen",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    vorschlagId: uuid("vorschlag_id").notNull().references(() => vorschlaege.id, { onDelete: "cascade" }),
    entscheiderId: uuid("entscheider_id").references(() => nutzer.id, { onDelete: "set null" }),
    entscheidung: text("entscheidung").notNull(),
    grund: text("grund"),
    aenderungen: jsonb("aenderungen"),
    /** Sekunden zwischen Anzeige und Entscheidung: erkennt Blindfreigaben. */
    entscheidungsdauerSek: integer("entscheidungsdauer_sek"),
    am: timestamp("am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("entscheidungen_vorschlag_idx").on(t.vorschlagId), mandantPolicy("entscheidungen_mandant")],
).enableRLS();

export const agentLaeufe = pgTable(
  "agent_laeufe",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    agentId: text("agent_id").notNull(),
    ausloeser: text("ausloeser").notNull(),
    ergebnis: text("ergebnis").notNull(),
    vorschlagId: uuid("vorschlag_id").references(() => vorschlaege.id, { onDelete: "set null" }),
    dauerMs: integer("dauer_ms"),
    tokens: integer("tokens"),
    kostenCent: integer("kosten_cent"),
    modell: text("modell"),
    notiz: text("notiz"),
    startAm: timestamp("start_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("agent_laeufe_agent_idx").on(t.mandantId, t.agentId, t.startAm),
    mandantPolicy("agent_laeufe_mandant"),
  ],
).enableRLS();

/**
 * Nachweis über alles. Diese Tabelle ist nur einfügbar: Änderungen und
 * Löschungen unterbindet ein Trigger (siehe policies.sql). Ohne sie ist keine
 * Autonomiestufe verantwortbar.
 */
export const auditEreignisse = pgTable(
  "audit_ereignisse",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandantId: uuid("mandant_id").notNull(),
    am: timestamp("am", { withTimezone: true }).notNull().defaultNow(),
    akteurArt: akteurArtEnum("akteur_art").notNull(),
    akteurId: text("akteur_id").notNull(),
    akteurName: text("akteur_name").notNull(),
    aktion: text("aktion").notNull(),
    entitaet: text("entitaet").notNull(),
    entitaetId: text("entitaet_id").notNull(),
    objektId: uuid("objekt_id"),
    vorschlagId: uuid("vorschlag_id"),
    aenderungen: jsonb("aenderungen"),
    /** Woraus sich die Berechtigung ergibt: Zustimmung, Stufe, Gesetz, Beschluss. */
    legitimation: text("legitimation"),
  },
  (t) => [
    index("audit_zeit_idx").on(t.mandantId, t.am),
    index("audit_entitaet_idx").on(t.mandantId, t.entitaet, t.entitaetId),
    mandantPolicy("audit_mandant"),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// Beziehungen für typisierte Abfragen
// ---------------------------------------------------------------------------

export const objekteRelations = relations(objekte, ({ many, one }) => ({
  einheiten: many(einheiten),
  postfaecher: many(postfaecher),
  vorgaenge: many(vorgaenge),
  mandant: one(mandanten, { fields: [objekte.mandantId], references: [mandanten.id] }),
}));

export const einheitenRelations = relations(einheiten, ({ many, one }) => ({
  objekt: one(objekte, { fields: [einheiten.objektId], references: [objekte.id] }),
  flaechen: many(einheitFlaechen),
  vertraege: many(mietvertraege),
  eigentum: many(eigentumsverhaeltnisse),
}));

export const mietvertraegeRelations = relations(mietvertraege, ({ many, one }) => ({
  einheit: one(einheiten, { fields: [mietvertraege.einheitId], references: [einheiten.id] }),
  parteien: many(vertragsparteien),
  konditionen: many(mietkonditionen),
  sollstellungen: many(sollstellungen),
}));

export const vorschlaegeRelations = relations(vorschlaege, ({ many }) => ({
  entscheidungen: many(entscheidungen),
  laeufe: many(agentLaeufe),
}));
