/**
 * MVP-Kern, Teil 1: Mandant, Parteien, Bestand, Verträge, Zeitscheiben
 * =============================================================================
 * Zehn Tabellen, die den gesamten Bestand tragen — Miete, SEV, WEG und Gewerbe
 * im selben Modell. Die Verwaltungsart ist ein Attribut, kein Schema.
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  aktuellerMandant,
  cent,
  erfassung,
  immosApp,
  immosDienst,
  mandantPolicy,
  mandantSpalte,
  pk,
  zeitscheibe,
} from "../columns";
import {
  anpassungsart,
  bezugswertArt,
  bezugswertQuelle,
  buchungskreisArt,
  einheitTyp,
  haftungTyp,
  konditionArt,
  nutzungsart,
  parteiTyp,
  rolleTyp,
  rollenKontext,
  vertragArt,
  verwaltungsart,
  zustellkanal,
} from "../enums";

// ===========================================================================
// 1 · mandant — die RLS-Grenze
// ===========================================================================

/**
 * Ein Mandant ist eine Verwaltung (das zahlende Unternehmen), nicht ein Objekt
 * und nicht eine WEG. Er ist die einzige Grenze, die von RLS erzwungen wird.
 */
export const mandant = pgTable(
  "mandant",
  {
    id: pk(),
    name: text("name").notNull(),
    kurz: text("kurz").notNull(),
    /** Basis für objektbezogene Adressen: rechnung@obj-1042.hvm.immos.de */
    mailDomain: text("mail_domain").notNull(),
    sitz: text("sitz").notNull(),
    ustIdNr: text("ust_id_nr"),
    /** § 34c GewO-Erlaubnis und § 26a WEG-Zertifikat als Nachweispflichtfelder. */
    gewerbeerlaubnisAz: text("gewerbeerlaubnis_az"),
    zertifikat26aBis: date("zertifikat_26a_bis", { mode: "string" }),
    /** Voreinstellung; je Buchungskreis überschreibbar. */
    wirtschaftsjahrBeginn: text("wirtschaftsjahr_beginn").notNull().default("01-01"),
    aktiv: boolean("aktiv").notNull().default(true),
    ...erfassung(),
  },
  (t) => [
    uniqueIndex("mandant_kurz_uniq").on(t.kurz),
    uniqueIndex("mandant_mail_domain_uniq").on(t.mailDomain),
    // Der Mandant selbst trägt keine mandant_id — er ist sie.
    pgPolicy("mandant_selbst", {
      as: "permissive",
      for: "all",
      to: [immosApp, immosDienst],
      using: sql`id = ${aktuellerMandant}`,
      withCheck: sql`id = ${aktuellerMandant}`,
    }),
  ],
).enableRLS();

// ===========================================================================
// 2 · buchungskreis — die Geldgrenze (MaBV)
// ===========================================================================

/**
 * Der Rechtsträger, dem das Geld gehört, und damit der Bilanzkreis.
 *
 * Warum getrennt vom Mandanten: Eine Verwaltung verwaltet das Geld von N
 * fremden Rechtsträgern. Jede GdWE ist seit § 9a WEG selbst rechtsfähig, jeder
 * Miet-Eigentümer hat Fremdgeld nach §§ 4 ff. MaBV. Wäre der Mandant die
 * einzige Grenze, wären Fremdgelder technisch mischbar — genau das verbietet
 * § 34c GewO. Umgekehrt darf der Buchungskreis nicht die RLS-Grenze sein, sonst
 * bräuchte "alle Fristen meines Portfolios" N Policy-Prüfungen.
 *
 * Regel im Journal: eine Buchung berührt genau einen Buchungskreis. Verkehr
 * zwischen Kreisen läuft über spiegelbildliche Verrechnungskonten.
 */
export const buchungskreis = pgTable(
  "buchungskreis",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    art: buchungskreisArt("art").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    /** Bei `gdwe`/`eigentuemer`: die Partei, deren Vermögen hier liegt. */
    traegerParteiId: uuid("traeger_partei_id"),
    /** Fremdgeld darf nie auf einem Eigenkonto liegen. Prüfbar, siehe CHECK. */
    fremdgeld: boolean("fremdgeld").notNull(),
    wirtschaftsjahrBeginn: text("wirtschaftsjahr_beginn").notNull().default("01-01"),
    /** Für die SEV: Abflussprinzip, weil die WEG-Abrechnung so kommt. */
    steuernummer: text("steuernummer"),
    aktiv: boolean("aktiv").notNull().default(true),
    ...erfassung(),
  },
  (t) => [
    unique("buchungskreis_mandant_id_uniq").on(t.mandantId, t.id),
    index("buchungskreis_mandant_idx").on(t.mandantId, t.art),
    foreignKey({
      columns: [t.mandantId],
      foreignColumns: [mandant.id],
      name: "buchungskreis_mandant_fk",
    }),
    check("buchungskreis_fremdgeld_chk", sql`(art = 'verwalter') = (fremdgeld = false)`),
    mandantPolicy("buchungskreis"),
  ],
).enableRLS();

// ===========================================================================
// 3 · partei — jede natürliche oder juristische Person, genau einmal
// ===========================================================================

/**
 * Eine Partei ist ein Rechtssubjekt, kein Rolleninhaber. Derselbe Mensch ist
 * Mieter in Objekt A, Eigentümer in B, Beirat in C und als Handwerker Kreditor.
 * Deshalb steht hier kein einziges Rollenfeld — Rollen sind `partei_rolle`.
 *
 * Mitarbeiter sind ebenfalls Parteien (`auth_subject` gesetzt). Das erspart eine
 * Benutzertabelle und hält den Audit-Trail einheitlich: Entscheider und
 * Vertragspartner sind derselbe Typ.
 */
export const partei = pgTable(
  "partei",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    typ: parteiTyp("typ").notNull(),
    /** Anzeigename. Bei Pseudonymisierung wird hier überschrieben. */
    name: text("name").notNull(),
    anrede: text("anrede"),
    email: text("email"),
    telefon: text("telefon"),
    strasse: text("strasse"),
    plz: text("plz"),
    ort: text("ort"),
    land: text("land").notNull().default("DE"),
    iban: text("iban"),
    ustIdNr: text("ust_id_nr"),
    /** Kreditorennummer, nur belegt wenn die Partei Kreditorenrolle hat. */
    kreditorNr: text("kreditor_nr"),
    /** § 48b EStG: ohne gültige Bescheinigung 15 % Bauabzugsteuer einbehalten. */
    freistellung48bBis: date("freistellung_48b_bis", { mode: "string" }),
    /** Verknüpfung zum Identity Provider; nur bei Mitarbeitern gesetzt. */
    authSubject: text("auth_subject"),
    /**
     * DSGVO: Art. 17 vs. § 147 AO. Solange eine Aufbewahrungspflicht besteht,
     * wird nicht gelöscht, sondern pseudonymisiert. Beides wird protokolliert.
     */
    loeschsperreBis: date("loeschsperre_bis", { mode: "string" }),
    pseudonymisiertAm: timestamp("pseudonymisiert_am", { withTimezone: true }),
    ...erfassung(),
  },
  (t) => [
    unique("partei_mandant_id_uniq").on(t.mandantId, t.id),
    uniqueIndex("partei_auth_subject_uniq").on(t.authSubject),
    uniqueIndex("partei_kreditor_nr_uniq").on(t.mandantId, t.kreditorNr),
    // Dublettenerkennung beim Ingest: Name-Trigram + E-Mail.
    index("partei_name_trgm_idx").using("gin", sql`name gin_trgm_ops`),
    index("partei_email_idx").on(t.mandantId, t.email),
    foreignKey({ columns: [t.mandantId], foreignColumns: [mandant.id], name: "partei_mandant_fk" }),
    mandantPolicy("partei"),
  ],
).enableRLS();

// ===========================================================================
// 4 · partei_rolle — Rolle als Zeitscheibe in einem Kontext
// ===========================================================================

/**
 * Die zentrale Auflösung von "Person vs. Rolle vs. Vertragspartei".
 *
 * Ersetzt vier Tabellen, die andere Modelle getrennt führen: Mieter,
 * Eigentumsverhältnis, Vertragspartei und Benutzerrolle. Alle vier sind
 * dasselbe: eine Partei hat in einem Kontext für einen Zeitraum eine Rolle.
 *
 * Zeitscheibe ist Pflicht, weil Rollenwechsel Geld bewegen:
 *  - Eigentümerwechsel bestimmt, wer die Abrechnungsspitze schuldet
 *    (Schuldner ist der Eigentümer im Zeitpunkt der Beschlussfassung).
 *  - § 566 BGB: Kauf bricht nicht Miete — der Mietvertrag bleibt, die
 *    Vermieterrolle wandert.
 *  - Mieterwechsel innerhalb eines Vertrags (Auszug eines von zwei Mietern).
 *
 * Kein pauschaler Ausschluss-Constraint: mehrere gleichzeitige Mieter eines
 * Vertrags und Bruchteilseigentum sind der Normalfall. Die Invariante
 * "Eigentumsanteile je Einheit summieren pro Tag auf 1" ist deshalb ein
 * geprüfter Job (siehe guards.sql), kein Constraint.
 */
export const parteiRolle = pgTable(
  "partei_rolle",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    parteiId: uuid("partei_id").notNull(),
    rolle: rolleTyp("rolle").notNull(),
    kontextArt: rollenKontext("kontext_art").notNull(),
    /** Zeigt je nach `kontext_art` auf objekt/einheit/vertrag/buchungskreis. */
    kontextId: uuid("kontext_id"),
    /** Bruchteilseigentum bzw. Stimmanteil. 1.0 = allein. */
    anteil: numeric("anteil", { precision: 12, scale: 9 }),
    haftung: haftungTyp("haftung").notNull().default("gesamtschuldnerisch"),
    /** Zustellweg + Zustimmung — Voraussetzung für wirksame E-Mail-Zustellung. */
    zustellweg: zustellkanal("zustellweg"),
    zustellungZustimmungAm: date("zustellung_zustimmung_am", { mode: "string" }),
    /** Bei Mitarbeitern: Fachrolle für die Sichtbarkeits- und Freigabelogik. */
    berechtigung: text("berechtigung"),
    ...zeitscheibe(),
    ...erfassung(),
  },
  (t) => [
    unique("partei_rolle_mandant_id_uniq").on(t.mandantId, t.id),
    // Der Arbeitspferd-Index: "wer war am Tag X in Kontext Y welche Rolle?"
    index("partei_rolle_kontext_idx").on(t.mandantId, t.kontextArt, t.kontextId, t.rolle),
    index("partei_rolle_partei_idx").on(t.mandantId, t.parteiId, t.rolle),
    index("partei_rolle_gueltigkeit_idx").using("gist", t.gueltigkeit),
    foreignKey({
      columns: [t.mandantId, t.parteiId],
      foreignColumns: [partei.mandantId, partei.id],
      name: "partei_rolle_partei_fk",
    }),
    check("partei_rolle_zeitraum_chk", sql`gueltig_bis IS NULL OR gueltig_bis >= gueltig_von`),
    check("partei_rolle_anteil_chk", sql`anteil IS NULL OR (anteil > 0 AND anteil <= 1)`),
    mandantPolicy("partei_rolle"),
  ],
).enableRLS();

// ===========================================================================
// 5 · objekt — Wirtschaftseinheit
// ===========================================================================

export const objekt = pgTable(
  "objekt",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    /**
     * Der Buchungskreis, in dem die Bewirtschaftung dieses Objekts gebucht wird.
     * Bei WEG die GdWE, bei Mietverwaltung der Eigentümer.
     */
    buchungskreisId: uuid("buchungskreis_id").notNull(),
    nummer: text("nummer").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    strasse: text("strasse").notNull(),
    plz: text("plz").notNull(),
    ort: text("ort").notNull(),
    /** Amtlicher Gemeindeschlüssel — Schlüssel zu kommunalem Recht. */
    ags: text("ags"),
    bundesland: text("bundesland").notNull(),
    /** Mischbestand: ein Objekt kann WEG und SEV gleichzeitig sein. */
    verwaltungsarten: verwaltungsart("verwaltungsarten").array().notNull(),
    baujahr: integer("baujahr"),
    /** Asbestvermutung nach GefStoffV bei Errichtung vor dem 31.10.1993. */
    denkmalschutz: boolean("denkmalschutz").notNull().default(false),
    /** Abweichender Abrechnungszeitraum als MM-DD. */
    abrechnungsbeginn: text("abrechnungsbeginn").notNull().default("01-01"),
    verwaltungsbeginn: date("verwaltungsbeginn", { mode: "string" }).notNull(),
    verwaltungsende: date("verwaltungsende", { mode: "string" }),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    ...erfassung(),
  },
  (t) => [
    unique("objekt_mandant_id_uniq").on(t.mandantId, t.id),
    uniqueIndex("objekt_nummer_uniq").on(t.mandantId, t.nummer),
    index("objekt_buchungskreis_idx").on(t.mandantId, t.buchungskreisId),
    index("objekt_ort_idx").on(t.mandantId, t.plz),
    foreignKey({ columns: [t.mandantId], foreignColumns: [mandant.id], name: "objekt_mandant_fk" }),
    foreignKey({
      columns: [t.mandantId, t.buchungskreisId],
      foreignColumns: [buchungskreis.mandantId, buchungskreis.id],
      name: "objekt_buchungskreis_fk",
    }),
    mandantPolicy("objekt"),
  ],
).enableRLS();

// ===========================================================================
// 6 · einheit — der physische Anker
// ===========================================================================

/**
 * Die Einheit ist das physisch/rechtlich abgegrenzte Objekt aus dem
 * Aufteilungsplan bzw. der Vertragsbeschreibung. Bewusst NICHT unterschieden in
 * "Sondereigentum" und "Mietobjekt":
 *
 *  - Sondereigentum ist kein Typ, sondern eine Konstellation: Einheit + MEA
 *    (als Bezugswert) + Zugehörigkeit zu einem GdWE-Buchungskreis. Die für die
 *    Kostentragung entscheidende Grenze Gemeinschafts-/Sondereigentum verläuft
 *    an Anlagen und Maßnahmen, nicht an der Einheit.
 *  - Ein Mietobjekt ist keine Entität, sondern die Menge der Einheiten, die ein
 *    Vertrag über einen Zeitraum bündelt (Wohnung + Stellplatz + Keller = ein
 *    Vertrag, drei Einheiten). Das trägt `nutzungszeitraum`.
 *
 * Keine Flächen- und keine MEA-Spalte hier: beides ist zeitscheibenbasiert.
 */
export const einheit = pgTable(
  "einheit",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    objektId: uuid("objekt_id").notNull(),
    nummer: text("nummer").notNull(),
    /** Lagebezeichnung wie im Vertrag: "3. OG links". */
    lage: text("lage").notNull(),
    typ: einheitTyp("typ").notNull(),
    zimmer: numeric("zimmer", { precision: 4, scale: 1 }),
    /** § 9 UStG-Option, nur Gewerbe. Steuert den Vorsteuerschlüssel. */
    ustOption: boolean("ust_option").notNull().default(false),
    /** Lebenszyklus statt Soft Delete: Teilung/Zusammenlegung ist historisch. */
    stillgelegtAm: date("stillgelegt_am", { mode: "string" }),
    entstandenAus: uuid("entstanden_aus"),
    ...erfassung(),
  },
  (t) => [
    unique("einheit_mandant_id_uniq").on(t.mandantId, t.id),
    uniqueIndex("einheit_nummer_uniq").on(t.mandantId, t.objektId, t.nummer),
    index("einheit_objekt_idx").on(t.mandantId, t.objektId, t.typ),
    foreignKey({
      columns: [t.mandantId, t.objektId],
      foreignColumns: [objekt.mandantId, objekt.id],
      name: "einheit_objekt_fk",
    }),
    mandantPolicy("einheit"),
  ],
).enableRLS();

// ===========================================================================
// 7 · einheit_bezugswert — Bemessungsgrundlagen als Zeitscheibe
// ===========================================================================

/**
 * Jede Zahl, mit der verteilt wird: Wohnfläche, Heizfläche, MEA, Personenzahl,
 * Stimmen, CO2-Kennwert. Eine Tabelle statt Spalten an der Einheit, weil:
 *
 *  1. Flächenänderungen wirken rückwirkend nicht. Wer die Fläche überschreibt,
 *     macht jede frühere Abrechnung unreproduzierbar und jede Nachprüfung
 *     unmöglich (BGH: Mieterhöhung nur nach tatsächlicher Fläche).
 *  2. Die Personenzahl ändert sich mehrmals im Jahr und muss zeitanteilig
 *     gewichtet werden.
 *  3. Die Verteilungsengine liest so eine einzige Tabelle statt sechs Spalten
 *     mit Sonderlogik — der Schlüssel dazu, dass Umlageschlüssel Daten sind.
 *
 * `quelle` und `nachweis` sind nicht Kosmetik: eine Flächenangabe ohne Herkunft
 * ist in der Auseinandersetzung mit dem Mieter wertlos.
 */
export const einheitBezugswert = pgTable(
  "einheit_bezugswert",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    einheitId: uuid("einheit_id").notNull(),
    art: bezugswertArt("art").notNull(),
    /** Fläche in m², MEA in Tausendstel, Personen als Kopfzahl. */
    wert: numeric("wert", { precision: 14, scale: 4 }).notNull(),
    quelle: bezugswertQuelle("quelle").notNull(),
    /** Bei Änderung durch Beschluss: Pflichtbezug (§ 16 Abs. 2 WEG). */
    beschlussRef: uuid("beschluss_ref"),
    bemerkung: text("bemerkung"),
    ...zeitscheibe(),
    ...erfassung(),
  },
  (t) => [
    unique("einheit_bezugswert_mandant_id_uniq").on(t.mandantId, t.id),
    index("einheit_bezugswert_lookup_idx").on(t.mandantId, t.einheitId, t.art),
    index("einheit_bezugswert_gueltigkeit_idx").using("gist", t.gueltigkeit),
    foreignKey({
      columns: [t.mandantId, t.einheitId],
      foreignColumns: [einheit.mandantId, einheit.id],
      name: "einheit_bezugswert_einheit_fk",
    }),
    check("einheit_bezugswert_wert_chk", sql`wert >= 0`),
    check(
      "einheit_bezugswert_zeitraum_chk",
      sql`gueltig_bis IS NULL OR gueltig_bis >= gueltig_von`,
    ),
    // EXCLUDE (einheit_id, art, gueltigkeit) → guards.sql
    mandantPolicy("einheit_bezugswert"),
  ],
).enableRLS();

// ===========================================================================
// 8 · vertrag — ein Vertragstyp für alle Vertragsarten
// ===========================================================================

/**
 * Miet-, Verwalter-, Wartungs-, Versorgungs- und Versicherungsvertrag in einer
 * Tabelle. Sie teilen dieselben Fragen: Laufzeit, Kündigungsfrist,
 * Verlängerungsautomatik, Preisanpassungsmechanik, Parteien, Dokumente.
 *
 * Der Verwaltervertrag ist bewusst hier und nicht in einer Konfigurationsdatei:
 * `vollmacht` (Betragsgrenzen, Vier-Augen-Schwellen, Sondervergütungen) ist der
 * rechtliche Ursprung jeder Autonomiegrenze der KI. Damit ist die
 * Policy-Engine an eine Vertragsurkunde gebunden statt an eine Einstellung.
 */
export const vertrag = pgTable(
  "vertrag",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    buchungskreisId: uuid("buchungskreis_id").notNull(),
    objektId: uuid("objekt_id"),
    art: vertragArt("art").notNull(),
    nummer: text("nummer").notNull(),
    beginn: date("beginn", { mode: "string" }).notNull(),
    /** Befristung. Bei unbefristetem Wohnraum NULL. */
    endeVereinbart: date("ende_vereinbart", { mode: "string" }),
    kuendigungEingangAm: date("kuendigung_eingang_am", { mode: "string" }),
    beendetZum: date("beendet_zum", { mode: "string" }),
    /** Rückgabedatum: Ankerdatum der § 548 BGB-Verjährung (6 Monate). */
    rueckgabeAm: date("rueckgabe_am", { mode: "string" }),
    kuendigungsfristMonate: smallint("kuendigungsfrist_monate"),
    verlaengerungAutomatisch: boolean("verlaengerung_automatisch").notNull().default(false),
    anpassungsart: anpassungsart("anpassungsart").notNull().default("keine"),
    /** Index-/Staffelparameter, Preisgleitklausel als strukturierte Daten. */
    anpassungParameter: jsonb("anpassung_parameter"),
    letzteAnpassungAm: date("letzte_anpassung_am", { mode: "string" }),
    ustPflichtig: boolean("ust_pflichtig").notNull().default(false),
    /**
     * Klauselinventar mit Wirksamkeitsbewertung (Schönheitsreparaturen,
     * Kleinreparaturen, Untermiete, Tierhaltung). Beim Onboarding aus dem PDF
     * extrahiert; treibt den Klausel-Linter und den Portfolio-Risikoreport.
     */
    klauseln: jsonb("klauseln"),
    /** Nur Verwaltervertrag: Vollmachtsgrenzen und Vergütung. */
    vollmacht: jsonb("vollmacht"),
    ...erfassung(),
  },
  (t) => [
    unique("vertrag_mandant_id_uniq").on(t.mandantId, t.id),
    uniqueIndex("vertrag_nummer_uniq").on(t.mandantId, t.nummer),
    index("vertrag_objekt_idx").on(t.mandantId, t.objektId, t.art),
    index("vertrag_buchungskreis_idx").on(t.mandantId, t.buchungskreisId),
    // Kandidatensuche der Anpassungs-Pipelines (§ 558, § 557a/b).
    index("vertrag_anpassung_idx").on(t.mandantId, t.anpassungsart, t.letzteAnpassungAm),
    foreignKey({
      columns: [t.mandantId, t.buchungskreisId],
      foreignColumns: [buchungskreis.mandantId, buchungskreis.id],
      name: "vertrag_buchungskreis_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.objektId],
      foreignColumns: [objekt.mandantId, objekt.id],
      name: "vertrag_objekt_fk",
    }),
    mandantPolicy("vertrag"),
  ],
).enableRLS();

// ===========================================================================
// 9 · vertrag_kondition — Beträge als Zeitscheibe
// ===========================================================================

/**
 * Kaltmiete, BK-/HK-Vorauszahlung, Zuschläge, Hausgeldvorschuss — nie
 * überschreibend. Eine Mieterhöhung ist eine neue Scheibe, keine Änderung.
 *
 * Der Grund ist nicht Ordnungsliebe: eine Betriebskostenabrechnung für 2025,
 * die 2027 geprüft wird, muss die Vorauszahlungen von 2025 sehen. Wer den
 * Betrag überschreibt, kann § 556 Abs. 3 BGB-Einwendungen nicht beantworten.
 *
 * `grundlage` trägt die Rechtsgrundlage der Änderung — bei § 558 BGB der
 * Zustimmungsnachweis, bei § 559 die Erklärung, bei Staffel die Klausel.
 */
export const vertragKondition = pgTable(
  "vertrag_kondition",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    vertragId: uuid("vertrag_id").notNull(),
    art: konditionArt("art").notNull(),
    betragCent: cent("betrag_cent").notNull(),
    ustSatz: numeric("ust_satz", { precision: 4, scale: 2 }).notNull().default("0"),
    /** § 558 / § 559 / § 557a / § 557b / Beschluss § 28 WEG. */
    grundlage: text("grundlage"),
    /** Zustellung, die die Erhöhung wirksam gemacht hat. */
    zustellungRef: uuid("zustellung_ref"),
    ...zeitscheibe(),
    ...erfassung(),
  },
  (t) => [
    unique("vertrag_kondition_mandant_id_uniq").on(t.mandantId, t.id),
    index("vertrag_kondition_lookup_idx").on(t.mandantId, t.vertragId, t.art),
    index("vertrag_kondition_gueltigkeit_idx").using("gist", t.gueltigkeit),
    foreignKey({
      columns: [t.mandantId, t.vertragId],
      foreignColumns: [vertrag.mandantId, vertrag.id],
      name: "vertrag_kondition_vertrag_fk",
    }),
    check(
      "vertrag_kondition_zeitraum_chk",
      sql`gueltig_bis IS NULL OR gueltig_bis >= gueltig_von`,
    ),
    // EXCLUDE (vertrag_id, art, gueltigkeit) → guards.sql
    mandantPolicy("vertrag_kondition"),
  ],
).enableRLS();

// ===========================================================================
// 10 · nutzungszeitraum — wer nutzte welche Einheit wann
// ===========================================================================

/**
 * Die wichtigste Tabelle des Abrechnungsteils und gleichzeitig die n:m-Relation
 * Vertrag ↔ Einheit über Zeit. Sie leistet drei Dinge auf einmal:
 *
 *  1. Ein Vertrag bündelt mehrere Einheiten (Wohnung, Stellplatz, Keller).
 *  2. Eine Einheit wird über die Jahre von wechselnden Verträgen genutzt.
 *  3. Leerstand ist eine eigene Zeile mit `vertrag_id IS NULL`. Ohne das gibt es
 *     keine Leerstandskostenverteilung und keinen Vermieteranteil.
 *
 * Der Ausschluss-Constraint über (einheit_id, teilflaeche, gueltigkeit) macht
 * Lücken und Überlappungen unmöglich. `teilflaeche` ist der bewusste Ausweg für
 * geteilte Gewerbeflächen mit zwei gleichzeitigen Mietern — ohne diese Spalte
 * müsste man für den Sonderfall den Constraint aufgeben.
 */
export const nutzungszeitraum = pgTable(
  "nutzungszeitraum",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    einheitId: uuid("einheit_id").notNull(),
    /** NULL = Leerstand / Eigennutzung / Sanierung. */
    vertragId: uuid("vertrag_id"),
    art: nutzungsart("art").notNull(),
    /** '' = ganze Einheit. Sonst Bezeichnung der Teilfläche. */
    teilflaeche: text("teilflaeche").notNull().default(""),
    /** Anteil der Einheitsfläche, wenn nur ein Teil genutzt wird. */
    flaechenanteil: numeric("flaechenanteil", { precision: 6, scale: 5 })
      .notNull()
      .default("1"),
    /** Zählerstände zum Nutzerwechsel — Basis von § 9b HeizkostenV. */
    ablesungEinzug: jsonb("ablesung_einzug"),
    ablesungAuszug: jsonb("ablesung_auszug"),
    ...zeitscheibe(),
    ...erfassung(),
  },
  (t) => [
    unique("nutzungszeitraum_mandant_id_uniq").on(t.mandantId, t.id),
    index("nutzungszeitraum_einheit_idx").on(t.mandantId, t.einheitId),
    index("nutzungszeitraum_vertrag_idx").on(t.mandantId, t.vertragId),
    index("nutzungszeitraum_gueltigkeit_idx").using("gist", t.gueltigkeit),
    foreignKey({
      columns: [t.mandantId, t.einheitId],
      foreignColumns: [einheit.mandantId, einheit.id],
      name: "nutzungszeitraum_einheit_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.vertragId],
      foreignColumns: [vertrag.mandantId, vertrag.id],
      name: "nutzungszeitraum_vertrag_fk",
    }),
    check(
      "nutzungszeitraum_leerstand_chk",
      sql`(art = 'miete') = (vertrag_id IS NOT NULL)`,
    ),
    check(
      "nutzungszeitraum_zeitraum_chk",
      sql`gueltig_bis IS NULL OR gueltig_bis >= gueltig_von`,
    ),
    // EXCLUDE (einheit_id, teilflaeche, gueltigkeit) → guards.sql
    mandantPolicy("nutzungszeitraum"),
  ],
).enableRLS();
