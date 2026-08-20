/**
 * MVP-Kern, Teil 2: Kontenrahmen, Umlage, Journal, Debitoren, Kreditoren, Bank
 * =============================================================================
 * Neun Tabellen. Zwei Grundsätze, die alles andere bestimmen:
 *
 *  - Das Journal ist die einzige finanzielle Wahrheit. Sollstellung, Rechnung
 *    und Bankumsatz sind fachliche Ereignisse, die in Buchungen projizieren.
 *    Abrechnungen, Salden und Vermögensberichte sind Sichten auf das Journal,
 *    keine gespeicherten Zustände.
 *  - Das Journal ist append-only. Es gibt im gesamten Schema keinen Codepfad,
 *    der eine festgeschriebene Buchung ändert — Korrektur ist immer eine neue
 *    Zeile (Storno + Neubuchung).
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
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  cent,
  erfassung,
  mandantPolicy,
  mandantSpalte,
  pk,
  unveraenderbarPolicies,
  zeitscheibe,
} from "../columns";
import {
  abgrenzungsprinzip,
  belegFormat,
  buchungsquelle,
  eaKlasse,
  heizkvRelevanz,
  kontoart,
  opStatus,
  p35aKategorie,
  periodeStatus,
  rechnungStatus,
  schluesselTyp,
  sollArt,
  zuordnungStatus,
} from "../enums";
import { buchungskreis, einheit, mandant, objekt, partei, vertrag } from "./stammdaten";

// ===========================================================================
// 11 · konto — Kontenrahmen mit Kostenart-Eigenschaften
// ===========================================================================

/**
 * Sachkonto und Kostenart sind hier eine Tabelle. In der deutschen
 * Immobilienbuchhaltung sind sie es in der Praxis auch: das Aufwandskonto
 * "Hausmeister" IST die Kostenart mit BetrKV-Ziffer 14.
 *
 * Bewusst akzeptierter Preis: ein Konto, dessen Kosten teils umlagefähig und
 * teils nicht sind (klassisch Hausmeister mit Instandhaltungsanteil), braucht
 * zwei Konten statt eines Kontos mit zwei Kostenarten. Das ist buchhalterisch
 * sauberer, weil der Vorwegabzug dann im Journal sichtbar ist statt in der
 * Abrechnungslogik. Wird der Fall zu häufig, ist die Migration klein:
 * `kostenart` abspalten und `konto.kostenart_id` einführen.
 *
 * Alle steuerlichen und mietrechtlichen Merkmale stehen als DATEN hier, nicht
 * als Verzweigung im Code — sonst ist jede BetrKV-/HeizkostenV-Änderung ein
 * Release. Beispiel 2024: der Wegfall des Kabel-TV-Privilegs war so ein
 * Datenupdate (`umlagefaehig_miete = false` ab Stichtag) statt eines Patches.
 */
export const konto = pgTable(
  "konto",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    nummer: text("nummer").notNull(),
    bezeichnung: text("bezeichnung").notNull(),
    art: kontoart("art").notNull(),
    /** Projektion für die WEG-Einnahmen-/Ausgabenrechnung (§ 28 Abs. 2 WEG). */
    eaKlasse: eaKlasse("ea_klasse").notNull(),
    /** § 2 BetrKV Nr. 1–17. NULL = nicht umlagefähig. */
    betrkvZiffer: smallint("betrkv_ziffer"),
    umlagefaehigMiete: boolean("umlagefaehig_miete").notNull().default(false),
    umlagefaehigWeg: boolean("umlagefaehig_weg").notNull().default(false),
    heizkvRelevanz: heizkvRelevanz("heizkv_relevanz").notNull().default("keine"),
    abgrenzungsprinzip: abgrenzungsprinzip("abgrenzungsprinzip").notNull().default("leistung"),
    p35aKategorie: p35aKategorie("p35a_kategorie").notNull().default("keine"),
    /** Zeile der Anlage V für die Werbungskostenaufstellung des Eigentümers. */
    anlageVZeile: text("anlage_v_zeile"),
    /** Trigger für die § 6 Abs. 1 Nr. 1a EStG-Prüfung (15-%-Grenze). */
    aktivierungspruefung: boolean("aktivierungspruefung").notNull().default(false),
    co2Relevant: boolean("co2_relevant").notNull().default(false),
    vorsteuerfaehig: boolean("vorsteuerfaehig").notNull().default(false),
    datevKonto: text("datev_konto"),
    /** Standardschlüssel, wenn keine `umlageregel` etwas anderes sagt. */
    standardSchluessel: schluesselTyp("standard_schluessel"),
    gesperrtAb: date("gesperrt_ab", { mode: "string" }),
    ...erfassung(),
  },
  (t) => [
    unique("konto_mandant_id_uniq").on(t.mandantId, t.id),
    uniqueIndex("konto_nummer_uniq").on(t.mandantId, t.nummer),
    index("konto_art_idx").on(t.mandantId, t.art),
    index("konto_betrkv_idx").on(t.mandantId, t.betrkvZiffer),
    foreignKey({ columns: [t.mandantId], foreignColumns: [mandant.id], name: "konto_mandant_fk" }),
    check(
      "konto_betrkv_chk",
      sql`betrkv_ziffer IS NULL OR (betrkv_ziffer BETWEEN 1 AND 17)`,
    ),
    // Umlagefähig ohne BetrKV-Fundstelle wäre eine unbegründbare Umlage.
    check(
      "konto_umlage_begruendet_chk",
      sql`umlagefaehig_miete = false OR betrkv_ziffer IS NOT NULL OR heizkv_relevanz <> 'keine'`,
    ),
    mandantPolicy("konto"),
  ],
).enableRLS();

// ===========================================================================
// 12 · umlageregel — Umlageschlüssel als Daten, mit Beschlusszwang
// ===========================================================================

/**
 * Der Verteilungsschlüssel je Kostenart, Objekt und Zeitraum.
 *
 * Die Engine liest ausschließlich diese Zeile plus die Bezugswerte der
 * Einheiten. Nirgends im Code steht ein Kostenartenname. Damit ist ein
 * Schlüsselwechsel ein INSERT mit neuer Zeitscheibe, kein Deployment.
 *
 * Der CHECK ist die wirksamste Einzelmaßnahme gegen anfechtbare Abrechnungen:
 * eine Abweichung vom gesetzlichen Regelfall (MEA in der WEG nach § 16 Abs. 2
 * S. 1, Wohnfläche im Mietrecht, HeizkostenV-Rahmen 50–70 %) ist nur mit
 * Beschluss- oder Vereinbarungsbezug speicherbar. Wer ohne Beschluss umstellt,
 * bekommt einen Constraint-Verstoß statt einer Anfechtung im nächsten Frühjahr.
 *
 * `grundkosten_prozent` trägt § 7 HeizkostenV, `vorwegabzug` die Gewerbe- und
 * Leerstandsabzüge als Regel statt als Handrechnung.
 */
export const umlageregel = pgTable(
  "umlageregel",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    objektId: uuid("objekt_id").notNull(),
    kontoId: uuid("konto_id").notNull(),
    schluessel: schluesselTyp("schluessel").notNull(),
    /** § 7 HeizkostenV: Grundkostenanteil, zulässig 30–50 % (Verbrauch 50–70 %). */
    grundkostenProzent: smallint("grundkosten_prozent"),
    /** Vorwegabzug (Gewerbe, Leerstand, Vermieteranteil) als strukturierte Regel. */
    vorwegabzug: jsonb("vorwegabzug"),
    /** Zeitanteilige Gewichtung bei Nutzerwechsel. */
    zeitanteilig: boolean("zeitanteilig").notNull().default(true),
    /** Abweichung vom gesetzlichen Default nur mit Rechtsgrund. */
    istGesetzlicherDefault: boolean("ist_gesetzlicher_default").notNull().default(true),
    beschlussRef: uuid("beschluss_ref"),
    vereinbarungRef: uuid("vereinbarung_ref"),
    /** Risikobewertung nach BGH 14.02.2025 zu objektbezogenen Schlüsseln. */
    risikoscore: smallint("risikoscore"),
    ...zeitscheibe(),
    ...erfassung(),
  },
  (t) => [
    unique("umlageregel_mandant_id_uniq").on(t.mandantId, t.id),
    index("umlageregel_lookup_idx").on(t.mandantId, t.objektId, t.kontoId),
    index("umlageregel_gueltigkeit_idx").using("gist", t.gueltigkeit),
    foreignKey({
      columns: [t.mandantId, t.objektId],
      foreignColumns: [objekt.mandantId, objekt.id],
      name: "umlageregel_objekt_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.kontoId],
      foreignColumns: [konto.mandantId, konto.id],
      name: "umlageregel_konto_fk",
    }),
    check(
      "umlageregel_rechtsgrund_chk",
      sql`ist_gesetzlicher_default = true OR beschluss_ref IS NOT NULL OR vereinbarung_ref IS NOT NULL`,
    ),
    check(
      "umlageregel_heizkv_chk",
      sql`grundkosten_prozent IS NULL OR (grundkosten_prozent BETWEEN 30 AND 50)`,
    ),
    check("umlageregel_zeitraum_chk", sql`gueltig_bis IS NULL OR gueltig_bis >= gueltig_von`),
    // EXCLUDE (objekt_id, konto_id, gueltigkeit) → guards.sql
    mandantPolicy("umlageregel"),
  ],
).enableRLS();

// ===========================================================================
// 13 · periode — Periodensperre, Nummernkreis und Hash-Kette
// ===========================================================================

/**
 * Drei Aufgaben in einer Tabelle, weil alle drei denselben Zeilensperre
 * brauchen:
 *
 *  1. Periodenstatus je Monat (offen → abgestimmt → festgeschrieben →
 *     beschlossen). `festgeschrieben` sperrt nach USt-Voranmeldung,
 *     `beschlossen` nach dem WEG-Beschluss über die Jahresabrechnung
 *     (§ 28 Abs. 2 WEG) — danach nur noch Nachtragsabrechnung, nie Rückänderung.
 *  2. Lückenloser Journal-Nummernkreis. Bewusst KEINE Sequenz: Sequenzen
 *     hinterlassen bei Rollback Lücken, und eine Lücke im Journal ist eine
 *     GoBD-Feststellung. Ein Zähler in einer Zeile mit `FOR UPDATE`
 *     serialisiert korrekt.
 *  3. Kopf der Hash-Kette. Da Nummer und Hash aus derselben gesperrten Zeile
 *     kommen, ist die Kette ohne zusätzliche Synchronisation konsistent.
 *
 * Die Zeile mit `monat = 0` ist der Jahresanker: sie trägt Zähler und
 * Kettenkopf, die Zeilen 1–12 tragen den Status.
 */
export const periode = pgTable(
  "periode",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    buchungskreisId: uuid("buchungskreis_id").notNull(),
    jahr: smallint("jahr").notNull(),
    /** 1–12 = Monat, 0 = Jahresanker. */
    monat: smallint("monat").notNull(),
    status: periodeStatus("status").notNull().default("offen"),
    ustVaAbgegebenAm: date("ust_va_abgegeben_am", { mode: "string" }),
    gesperrtAm: timestamp("gesperrt_am", { withTimezone: true }),
    gesperrtVon: uuid("gesperrt_von"),
    /** Nur Jahresanker: nächste Journalnummer. */
    journalNrNaechste: integer("journal_nr_naechste"),
    /** Nur Jahresanker: letzter Hash der Kette. */
    hashLetzter: text("hash_letzter"),
    /** Nur Jahresanker: signierter Tagesabschluss als Nachweis nach § 146 AO. */
    ankerSignatur: text("anker_signatur"),
    ankerAm: timestamp("anker_am", { withTimezone: true }),
    ...erfassung(),
  },
  (t) => [
    uniqueIndex("periode_uniq").on(t.mandantId, t.buchungskreisId, t.jahr, t.monat),
    unique("periode_mandant_id_uniq").on(t.mandantId, t.id),
    foreignKey({
      columns: [t.mandantId, t.buchungskreisId],
      foreignColumns: [buchungskreis.mandantId, buchungskreis.id],
      name: "periode_buchungskreis_fk",
    }),
    check("periode_monat_chk", sql`monat BETWEEN 0 AND 12`),
    check(
      "periode_anker_chk",
      sql`(monat = 0) = (journal_nr_naechste IS NOT NULL)`,
    ),
    mandantPolicy("periode"),
  ],
).enableRLS();

// ===========================================================================
// 14 · buchung — Journalkopf, unveränderbar
// ===========================================================================

/**
 * Unveränderbarkeit ist hier nicht Konvention, sondern erzwungen — dreifach:
 *  1. restriktive RLS-Policies für UPDATE und DELETE (`using false`),
 *  2. entzogene Tabellenrechte für die Anwendungsrolle (guards.sql),
 *  3. Trigger als letzte Instanz.
 *
 * Es gibt bewusst KEINE Spalte `storniert_durch_id` und keine
 * `festgeschrieben_am`. Beides wäre ein Update-Pfad auf eine unveränderbare
 * Zeile. Stattdessen:
 *  - Die Storno-Buchung zeigt per `storno_von_id` auf das Original. Die
 *    Rückrichtung wird abgefragt, nicht gespeichert.
 *  - Ob eine Buchung festgeschrieben ist, ist eine Eigenschaft ihrer Periode.
 * Damit hat das Journal null Schreibpfade außer INSERT.
 *
 * Die KI-Felder sind keine Telemetrie: die GoBD verlangt bei maschineller
 * Kontierung die Nachvollziehbarkeit, wer mit welchem Verfahrensstand gebucht
 * hat. `modell_version` und `prompt_hash` machen ein Modellupdate zu einem
 * dokumentierten Ereignis der Verfahrensdokumentation.
 */
export const buchung = pgTable(
  "buchung",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    buchungskreisId: uuid("buchungskreis_id").notNull(),
    jahr: smallint("jahr").notNull(),
    /** Lückenlos je (buchungskreis, jahr). Aus dem Jahresanker, nie aus Sequenz. */
    journalNr: integer("journal_nr").notNull(),
    belegdatum: date("belegdatum", { mode: "string" }).notNull(),
    /** Zufluss/Abfluss — maßgeblich für die E/A-Rechnung der WEG. */
    buchungsdatum: date("buchungsdatum", { mode: "string" }).notNull(),
    belegfeld: text("belegfeld"),
    buchungstext: text("buchungstext").notNull(),
    quelle: buchungsquelle("quelle").notNull(),
    /** Storno zeigt auf das Original; das Original bleibt unberührt. */
    stornoVonId: uuid("storno_von_id"),
    /** Nachweis der KI-Kontierung (GoBD-Verfahrensdokumentation). */
    agentId: text("agent_id"),
    modellVersion: text("modell_version"),
    kiKonfidenz: numeric("ki_konfidenz", { precision: 4, scale: 3 }),
    promptHash: text("prompt_hash"),
    /** Die Entscheidung, die diese Buchung legitimiert. */
    vorschlagId: uuid("vorschlag_id"),
    entscheidungId: uuid("entscheidung_id"),
    /**
     * Digest über die kanonische Form ALLER Zeilen dieser Buchung, von der
     * Anwendung berechnet und beim Commit von einem aufgeschobenen
     * Constraint-Trigger gegen die tatsächlich eingefügten Zeilen geprüft.
     *
     * Der Umweg über die Anwendung ist Absicht: so deckt die Hash-Kette Kopf
     * UND Zeilen ab, obwohl der Kopf zuerst eingefügt werden muss (FK) und
     * danach nie mehr geändert werden darf. Ein nachträglich veränderter oder
     * hinzugefügter Zeilensatz lässt die Transaktion beim Commit scheitern.
     */
    zeilenDigest: text("zeilen_digest").notNull(),
    /** Hash-Kette je (buchungskreis, jahr): sha256(hash_prev || kanonischer Kopf). */
    hashPrev: text("hash_prev"),
    hash: text("hash").notNull(),
    erfasstVon: uuid("erfasst_von"),
    erfasstAm: timestamp("erfasst_am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("buchung_mandant_id_uniq").on(t.mandantId, t.id),
    uniqueIndex("buchung_journal_nr_uniq").on(t.mandantId, t.buchungskreisId, t.jahr, t.journalNr),
    uniqueIndex("buchung_hash_uniq").on(t.mandantId, t.hash),
    index("buchung_datum_idx").on(t.mandantId, t.buchungskreisId, t.buchungsdatum),
    index("buchung_storno_idx").on(t.mandantId, t.stornoVonId),
    index("buchung_vorschlag_idx").on(t.mandantId, t.vorschlagId),
    foreignKey({
      columns: [t.mandantId, t.buchungskreisId],
      foreignColumns: [buchungskreis.mandantId, buchungskreis.id],
      name: "buchung_buchungskreis_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.stornoVonId],
      foreignColumns: [t.mandantId, t.id],
      name: "buchung_storno_fk",
    }),
    ...unveraenderbarPolicies("buchung"),
  ],
).enableRLS();

// ===========================================================================
// 15 · buchungszeile — Journalzeile mit allen Dimensionen
// ===========================================================================

/**
 * Soll/Haben getrennt je Zeile statt Soll- und Habenkonto am Kopf: nur so sind
 * mehrzeilige Buchungen (eine Zahlung tilgt sieben Forderungen) und
 * Steueraufteilungen darstellbar. Die Invariante SUM(soll) = SUM(haben) je
 * Buchung ist ein aufgeschobener Constraint-Trigger, siehe guards.sql.
 *
 * `leistung_von/bis` ist Pflicht bei umlagefähigen Kostenarten — ohne
 * Leistungszeitraum ist keine periodengerechte Umlage möglich und die
 * Abrechnung ist formell angreifbar. Der CHECK erzwingt das.
 */
export const buchungszeile = pgTable(
  "buchungszeile",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    buchungId: uuid("buchung_id").notNull(),
    zeilenNr: smallint("zeilen_nr").notNull(),
    kontoId: uuid("konto_id").notNull(),
    /** 'S' oder 'H'. */
    sh: text("sh").notNull(),
    betragCent: cent("betrag_cent").notNull(),
    steuerbetragCent: cent("steuerbetrag_cent").notNull().default(0),
    ustSatz: numeric("ust_satz", { precision: 4, scale: 2 }).notNull().default("0"),
    /** § 13b UStG Steuerschuldumkehr. */
    reverseCharge: boolean("reverse_charge").notNull().default(false),
    // --- Dimensionen ---
    objektId: uuid("objekt_id"),
    einheitId: uuid("einheit_id"),
    vertragId: uuid("vertrag_id"),
    /** Debitor/Kreditor bei Personenkonten. */
    parteiId: uuid("partei_id"),
    leistungVon: date("leistung_von", { mode: "string" }),
    leistungBis: date("leistung_bis", { mode: "string" }),
    /** Umlagejahr, wenn es vom Leistungszeitraum abweicht (Abflussprinzip). */
    umlagejahr: smallint("umlagejahr"),
    /** Finanzierungsquelle: Rücklagenentnahme braucht Beschlussbezug. */
    finanzierung: text("finanzierung"),
    p35aLohnanteilCent: cent("p35a_lohnanteil_cent"),
    co2AnteilVermieterCent: cent("co2_anteil_vermieter_cent"),
    kostenstelle: text("kostenstelle"),
  },
  (t) => [
    unique("buchungszeile_mandant_id_uniq").on(t.mandantId, t.id),
    uniqueIndex("buchungszeile_nr_uniq").on(t.mandantId, t.buchungId, t.zeilenNr),
    // Der Index, der die Betriebskostenabrechnung trägt.
    index("buchungszeile_umlage_idx").on(
      t.mandantId,
      t.objektId,
      t.kontoId,
      t.leistungVon,
      t.leistungBis,
    ),
    index("buchungszeile_konto_idx").on(t.mandantId, t.kontoId),
    index("buchungszeile_partei_idx").on(t.mandantId, t.parteiId),
    index("buchungszeile_vertrag_idx").on(t.mandantId, t.vertragId),
    foreignKey({
      columns: [t.mandantId, t.buchungId],
      foreignColumns: [buchung.mandantId, buchung.id],
      name: "buchungszeile_buchung_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.kontoId],
      foreignColumns: [konto.mandantId, konto.id],
      name: "buchungszeile_konto_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.einheitId],
      foreignColumns: [einheit.mandantId, einheit.id],
      name: "buchungszeile_einheit_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.parteiId],
      foreignColumns: [partei.mandantId, partei.id],
      name: "buchungszeile_partei_fk",
    }),
    check("buchungszeile_sh_chk", sql`sh IN ('S', 'H')`),
    check("buchungszeile_betrag_chk", sql`betrag_cent > 0`),
    check(
      "buchungszeile_leistungszeitraum_chk",
      sql`leistung_bis IS NULL OR leistung_von IS NULL OR leistung_bis >= leistung_von`,
    ),
    ...unveraenderbarPolicies("buchungszeile"),
  ],
).enableRLS();

// ===========================================================================
// 16 · sollstellung — die Forderung (Debitorenseite)
// ===========================================================================

/**
 * Warum die Sollstellung nicht in der Buchung aufgeht:
 *
 *  - Sie existiert als Anspruch aus Vertrag oder Beschluss, unabhängig von
 *    jeder Zahlung, und ist die SOLL-Größe, die das WEG-Recht ausdrücklich
 *    verlangt: die Abrechnungsspitze ist IST-Kosten minus SOLL-Vorschüsse
 *    (§ 28 Abs. 2 WEG), nie minus geleistete Zahlungen.
 *  - Sie trägt den Mahnzustand und die Verjährung, die eine Buchung nicht hat.
 *  - Sie ist die Bezugsgröße der § 560 Abs. 4 BGB-Anpassung.
 *
 * `restbetrag_cent` wird ausschließlich vom Trigger auf `zahlungszuordnung`
 * gepflegt — nie von der Anwendung. Damit kann Soll und Zuordnung nicht
 * auseinanderlaufen.
 */
export const sollstellung = pgTable(
  "sollstellung",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    buchungskreisId: uuid("buchungskreis_id").notNull(),
    objektId: uuid("objekt_id").notNull(),
    einheitId: uuid("einheit_id"),
    vertragId: uuid("vertrag_id"),
    /** Wer schuldet. Bei Eigentümerwechsel aus `partei_rolle` zum Stichtag. */
    schuldnerParteiId: uuid("schuldner_partei_id").notNull(),
    art: sollArt("art").notNull(),
    /** Abrechnungsperiode als YYYY-MM. */
    periode: text("periode").notNull(),
    betragCent: cent("betrag_cent").notNull(),
    faelligAm: date("faellig_am", { mode: "string" }).notNull(),
    /** Vom Trigger gepflegt. */
    restbetragCent: cent("restbetrag_cent").notNull(),
    status: opStatus("status").notNull().default("offen"),
    mahnstufe: smallint("mahnstufe").notNull().default(0),
    letzterMahnlaufAm: date("letzter_mahnlauf_am", { mode: "string" }),
    verzugAb: date("verzug_ab", { mode: "string" }),
    verjaehrungAm: date("verjaehrung_am", { mode: "string" }),
    /** Sperrt die Verrechnung bei Ratenvereinbarung oder Streit. */
    tilgungssperre: boolean("tilgungssperre").notNull().default(false),
    /** Rechtsgrund: Vertrag, Beschluss oder Abrechnungslauf. */
    grundlageRef: uuid("grundlage_ref"),
    buchungId: uuid("buchung_id"),
    ...erfassung(),
  },
  (t) => [
    unique("sollstellung_mandant_id_uniq").on(t.mandantId, t.id),
    // Idempotenz des monatlichen Sollstellungslaufs.
    uniqueIndex("sollstellung_lauf_uniq").on(
      t.mandantId,
      t.vertragId,
      t.art,
      t.periode,
      t.einheitId,
    ),
    // Der Index des Mahnwesens: offene Posten nach Fälligkeit.
    index("sollstellung_offen_idx")
      .on(t.mandantId, t.faelligAm, t.mahnstufe)
      .where(sql`status IN ('offen', 'teilbezahlt')`),
    index("sollstellung_schuldner_idx").on(t.mandantId, t.schuldnerParteiId, t.status),
    index("sollstellung_objekt_idx").on(t.mandantId, t.objektId, t.periode),
    foreignKey({
      columns: [t.mandantId, t.buchungskreisId],
      foreignColumns: [buchungskreis.mandantId, buchungskreis.id],
      name: "sollstellung_buchungskreis_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.objektId],
      foreignColumns: [objekt.mandantId, objekt.id],
      name: "sollstellung_objekt_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.vertragId],
      foreignColumns: [vertrag.mandantId, vertrag.id],
      name: "sollstellung_vertrag_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.schuldnerParteiId],
      foreignColumns: [partei.mandantId, partei.id],
      name: "sollstellung_schuldner_fk",
    }),
    check("sollstellung_rest_chk", sql`restbetrag_cent BETWEEN 0 AND betrag_cent`),
    check("sollstellung_mahnstufe_chk", sql`mahnstufe BETWEEN 0 AND 3`),
    mandantPolicy("sollstellung"),
  ],
).enableRLS();

// ===========================================================================
// 17 · eingangsrechnung — die Verbindlichkeit (Kreditorenseite)
// ===========================================================================

/**
 * Spiegelbild der Sollstellung. Trägt zusätzlich das Prüfergebnis, weil die
 * Prüfung selbst der Wertbeitrag ist: formelle § 14 UStG-Prüfung, Duplikat,
 * 3-Way-Match, Wartungsvertragsabgleich, Steuerflags.
 *
 * `iban_abweichung` ist bewusst eine eigene Spalte und nicht ein Hinweis im
 * JSONB: sie ist das einzige Feld im Schema, das eine harte Zahlungssperre
 * auslöst. Rechnungsbetrug über geänderte Bankverbindung ist der einzige
 * Vorgang mit sofortigem, nicht rückholbarem Vermögensschaden — dort ist
 * Automatisierung unabhängig von der Modellqualität ökonomisch falsch.
 */
export const eingangsrechnung = pgTable(
  "eingangsrechnung",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    buchungskreisId: uuid("buchungskreis_id").notNull(),
    objektId: uuid("objekt_id"),
    einheitId: uuid("einheit_id"),
    /** Postfach des Eingangs — Grundlage der eindeutigen Objektzuordnung. */
    postfachAdresse: text("postfach_adresse"),
    format: belegFormat("format").notNull(),
    kreditorParteiId: uuid("kreditor_partei_id"),
    kreditorNameRoh: text("kreditor_name_roh").notNull(),
    rechnungsNr: text("rechnungs_nr").notNull(),
    rechnungsdatum: date("rechnungsdatum", { mode: "string" }).notNull(),
    leistungVon: date("leistung_von", { mode: "string" }),
    leistungBis: date("leistung_bis", { mode: "string" }),
    faelligAm: date("faellig_am", { mode: "string" }).notNull(),
    skontoBis: date("skonto_bis", { mode: "string" }),
    skontoProzent: numeric("skonto_prozent", { precision: 5, scale: 2 }),
    bruttoCent: cent("brutto_cent").notNull(),
    nettoCent: cent("netto_cent").notNull(),
    ustCent: cent("ust_cent").notNull(),
    iban: text("iban"),
    /** Vom Trigger gepflegt (Zahlungszuordnung). */
    restbetragCent: cent("restbetrag_cent").notNull(),
    status: rechnungStatus("status").notNull().default("eingegangen"),
    /** Strukturierte Extraktion (EN 16931) bzw. OCR-Ergebnis. */
    strukturiert: jsonb("strukturiert"),
    /** Prüfergebnis, jeder Punkt einzeln begründet. */
    pruefung: jsonb("pruefung"),
    extraktionsKonfidenz: numeric("extraktions_konfidenz", { precision: 4, scale: 3 }),
    duplikatVonId: uuid("duplikat_von_id"),
    /** Harte Zahlungssperre. Nie durch einen Agenten aufhebbar. */
    ibanAbweichung: boolean("iban_abweichung").notNull().default(false),
    /** § 48 EStG: ohne Freistellung 15 % Einbehalt, Anmeldung bis 10. Folgemonat. */
    bauabzugsteuerPflicht: boolean("bauabzugsteuer_pflicht").notNull().default(false),
    /** Bei WEG: Beschluss, der die Ausgabe deckt. */
    beschlussRef: uuid("beschluss_ref"),
    auftragRef: uuid("auftrag_ref"),
    eingangAm: timestamp("eingang_am", { withTimezone: true }).notNull().defaultNow(),
    ...erfassung(),
  },
  (t) => [
    unique("eingangsrechnung_mandant_id_uniq").on(t.mandantId, t.id),
    // Duplikatsperre: derselbe Kreditor kann eine Rechnungsnummer nur einmal haben.
    uniqueIndex("eingangsrechnung_dublette_uniq").on(
      t.mandantId,
      t.kreditorParteiId,
      t.rechnungsNr,
    ),
    index("eingangsrechnung_faellig_idx")
      .on(t.mandantId, t.faelligAm)
      .where(sql`status NOT IN ('bezahlt', 'abgelehnt')`),
    index("eingangsrechnung_status_idx").on(t.mandantId, t.status),
    index("eingangsrechnung_objekt_idx").on(t.mandantId, t.objektId),
    index("eingangsrechnung_skonto_idx").on(t.mandantId, t.skontoBis),
    foreignKey({
      columns: [t.mandantId, t.buchungskreisId],
      foreignColumns: [buchungskreis.mandantId, buchungskreis.id],
      name: "eingangsrechnung_buchungskreis_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.kreditorParteiId],
      foreignColumns: [partei.mandantId, partei.id],
      name: "eingangsrechnung_kreditor_fk",
    }),
    check("eingangsrechnung_summe_chk", sql`brutto_cent = netto_cent + ust_cent`),
    check("eingangsrechnung_rest_chk", sql`restbetrag_cent BETWEEN 0 AND brutto_cent`),
    mandantPolicy("eingangsrechnung"),
  ],
).enableRLS();

// ===========================================================================
// 18 · bankumsatz — die unveränderbare Banktatsache
// ===========================================================================

/**
 * Rohdaten aus camt.053/.054, append-only. Der Bankumsatz ist eine Tatsache,
 * keine Meinung: er wird nie korrigiert, nur anders zugeordnet.
 *
 * `camt_raw` bleibt vollständig erhalten, weil die Zuordnungslogik sich
 * weiterentwickelt und alte Fälle nachgerechnet werden müssen. Die
 * strukturierten SEPA-Referenzen (`end_to_end_id`, `mandatsreferenz`) sind die
 * beste Matching-Grundlage und liefern Konfidenz 1,0 — deshalb eigene Spalten
 * statt JSONB-Zugriff.
 */
export const bankumsatz = pgTable(
  "bankumsatz",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    buchungskreisId: uuid("buchungskreis_id").notNull(),
    /** IBAN des eigenen Kontos. Kaution und Miete dürfen nie dasselbe sein. */
    kontoIban: text("konto_iban").notNull(),
    buchungstag: date("buchungstag", { mode: "string" }).notNull(),
    valuta: date("valuta", { mode: "string" }).notNull(),
    /** Vorzeichenbehaftet: Eingang positiv, Ausgang negativ. */
    betragCent: cent("betrag_cent").notNull(),
    gegenIban: text("gegen_iban"),
    gegenName: text("gegen_name"),
    verwendungszweck: text("verwendungszweck"),
    endToEndId: text("end_to_end_id"),
    mandatsreferenz: text("mandatsreferenz"),
    /** Bank Transaction Code — erkennt Rücklastschriften und Gebühren sicher. */
    btcFamily: text("btc_family"),
    btcSubfamily: text("btc_subfamily"),
    camtRaw: jsonb("camt_raw"),
    /** Deduplizierung des Abrufs. */
    importHash: text("import_hash").notNull(),
    status: zuordnungStatus("status").notNull().default("neu"),
    /** Vom Trigger gepflegt: noch nicht zugeordneter Rest. */
    offenCent: cent("offen_cent").notNull(),
    ...erfassung(),
  },
  (t) => [
    unique("bankumsatz_mandant_id_uniq").on(t.mandantId, t.id),
    uniqueIndex("bankumsatz_import_uniq").on(t.mandantId, t.importHash),
    index("bankumsatz_offen_idx")
      .on(t.mandantId, t.buchungstag)
      .where(sql`status IN ('neu', 'vorgeschlagen', 'klaerfall')`),
    index("bankumsatz_e2e_idx").on(t.mandantId, t.endToEndId),
    index("bankumsatz_mandat_idx").on(t.mandantId, t.mandatsreferenz),
    index("bankumsatz_konto_idx").on(t.mandantId, t.kontoIban, t.buchungstag),
    foreignKey({
      columns: [t.mandantId, t.buchungskreisId],
      foreignColumns: [buchungskreis.mandantId, buchungskreis.id],
      name: "bankumsatz_buchungskreis_fk",
    }),
    ...unveraenderbarPolicies("bankumsatz"),
  ],
).enableRLS();

// ===========================================================================
// 19 · zahlungszuordnung — die Verrechnung, n:m
// ===========================================================================

/**
 * Hier liegt die eigentliche Schwierigkeit des Zahlungsverkehrs, und deshalb
 * ist es eine eigene Tabelle:
 *
 *  - Eine Zahlung tilgt mehrere Forderungen (Miete + BK + Mahngebühr).
 *  - Eine Forderung wird von mehreren Zahlungen getilgt (Ratenzahlung).
 *  - Die Reihenfolge ist gesetzlich vorgegeben (§ 366 Abs. 2, § 367 BGB:
 *    Kosten, dann Zinsen, dann Hauptforderung; unter mehreren die ältere).
 *    `tilgungsrang` macht diese Reihenfolge prüfbar statt implizit.
 *  - Sie ist auflösbar, ohne die Banktatsache zu berühren: eine falsche
 *    Zuordnung wird storniert (`aufgehoben_am`), der Umsatz bleibt.
 *
 * Würde man die Zuordnung als Spalte am Bankumsatz oder an der Sollstellung
 * führen, wären Teilzahlungen und Sammelzahlungen nicht darstellbar — der
 * häufigste tödliche Modellfehler in diesem Bereich.
 */
export const zahlungszuordnung = pgTable(
  "zahlungszuordnung",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    bankumsatzId: uuid("bankumsatz_id").notNull(),
    /** Genau eines von beiden: Debitor- oder Kreditorseite. */
    sollstellungId: uuid("sollstellung_id"),
    eingangsrechnungId: uuid("eingangsrechnung_id"),
    betragCent: cent("betrag_cent").notNull(),
    /** Gesetzliche Tilgungsreihenfolge, 1 = zuerst. */
    tilgungsrang: smallint("tilgungsrang").notNull().default(1),
    /** Matching-Nachweis: Score, Merkmale, Modellversion. */
    konfidenz: numeric("konfidenz", { precision: 4, scale: 3 }),
    merkmale: jsonb("merkmale"),
    modellVersion: text("modell_version"),
    buchungId: uuid("buchung_id"),
    vorschlagId: uuid("vorschlag_id"),
    /** Aufhebung statt Löschung: die Zuordnungshistorie bleibt nachvollziehbar. */
    aufgehobenAm: timestamp("aufgehoben_am", { withTimezone: true }),
    aufgehobenGrund: text("aufgehoben_grund"),
    ...erfassung(),
  },
  (t) => [
    unique("zahlungszuordnung_mandant_id_uniq").on(t.mandantId, t.id),
    index("zahlungszuordnung_umsatz_idx").on(t.mandantId, t.bankumsatzId),
    index("zahlungszuordnung_soll_idx").on(t.mandantId, t.sollstellungId),
    index("zahlungszuordnung_rechnung_idx").on(t.mandantId, t.eingangsrechnungId),
    foreignKey({
      columns: [t.mandantId, t.bankumsatzId],
      foreignColumns: [bankumsatz.mandantId, bankumsatz.id],
      name: "zahlungszuordnung_bankumsatz_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.sollstellungId],
      foreignColumns: [sollstellung.mandantId, sollstellung.id],
      name: "zahlungszuordnung_sollstellung_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.eingangsrechnungId],
      foreignColumns: [eingangsrechnung.mandantId, eingangsrechnung.id],
      name: "zahlungszuordnung_rechnung_fk",
    }),
    check("zahlungszuordnung_betrag_chk", sql`betrag_cent > 0`),
    check(
      "zahlungszuordnung_ziel_chk",
      sql`(sollstellung_id IS NOT NULL) <> (eingangsrechnung_id IS NOT NULL)`,
    ),
    mandantPolicy("zahlungszuordnung"),
  ],
).enableRLS();
