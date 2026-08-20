/**
 * MVP-Kern, Teil 3: Dokumente, Verknüpfung, Fristen, KI-Entscheidungsschleife
 * =============================================================================
 * Sechs Tabellen, die zusammen den Nachweis tragen. Das Produkt ist nicht die
 * Erledigung, sondern der Beweis, dass sie rechtzeitig und befugt erfolgt ist.
 *
 * Die KI-Schleife folgt einem Prinzip:
 *
 *   Der Plan ist Daten. Die Zustimmung ist ein Token auf einen Hash.
 *   Der Executor darf nur schreiben, was der Hash deckt.
 *
 * Damit ist "der Agent hat etwas anderes getan, als ich freigegeben habe"
 * kein Modellrisiko, sondern strukturell ausgeschlossen.
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
} from "../columns";
import {
  akteurArt,
  autonomiestufe,
  bezugEntitaet,
  bezugRolle,
  dokumentArt,
  entscheidungArt,
  fristAnker,
  fristArt,
  fristStatus,
  legitimation,
  rechtsnatur,
  vorschlagKategorie,
  vorschlagStatus,
  zustellkanal,
} from "../enums";
import { buchungskreis, einheit, mandant, objekt, partei } from "./stammdaten";

// ===========================================================================
// 20 · dokument — unveränderbare Ablage mit Aufbewahrung
// ===========================================================================

/**
 * Ein Dokument ist der Inhalt, nicht die Verknüpfung. Wohin es gehört, sagt
 * `bezug` — deshalb hat diese Tabelle keine einzige Fach-Fremdschlüsselspalte
 * außer der Objektzuordnung für die RLS-Sichtbarkeit.
 *
 * Zwei Fassungen sind Pflicht (GoBD-Änderungsschreiben 2025): das Original in
 * dem Format, in dem es einging, und die lesbare Fassung. Bei einer
 * E-Rechnung ist das XML das Original — die PDF-Visualisierung ist es nicht.
 *
 * Aufbewahrung und Löschung: `aufbewahrung_bis` ergibt sich aus der Art
 * (Buchungsbelege 8 Jahre nach § 147 AO i.d.F. BEG IV, übrige Unterlagen 10),
 * `rechtlicher_halt` sperrt jede Löschung während eines Verfahrens. Es gibt
 * kein `deleted_at`: Löschung ist ein echter Vorgang, kein Flag.
 */
export const dokument = pgTable(
  "dokument",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    objektId: uuid("objekt_id"),
    art: dokumentArt("art").notNull(),
    titel: text("titel").notNull(),
    /** Ablageort im Aktenplan, z. B. "04 Verträge / 04.2 Wartung". */
    aktenplan: text("aktenplan").notNull(),
    dateiname: text("dateiname").notNull(),
    mime: text("mime").notNull(),
    groesseBytes: integer("groesse_bytes").notNull(),
    seiten: smallint("seiten"),
    /** Inhaltsadresse: identischer Inhalt wird nie zweimal gespeichert. */
    sha256: text("sha256").notNull(),
    blobUri: text("blob_uri").notNull(),
    /** Zweite Fassung (Visualisierung/OCR), wenn das Original nicht lesbar ist. */
    lesefassungUri: text("lesefassung_uri"),
    istOriginal: boolean("ist_original").notNull().default(true),
    ocrText: text("ocr_text"),
    /** Strukturierte Extraktion mit Konfidenz je Feld. */
    extraktion: jsonb("extraktion"),
    /** Herkunftskanal — Teil der Verfahrensdokumentation. */
    eingangskanal: text("eingangskanal"),
    /** SPF/DKIM/DMARC-Ergebnis bei Mail-Eingang. */
    eingangPruefung: jsonb("eingang_pruefung"),
    aufbewahrungBis: date("aufbewahrung_bis", { mode: "string" }),
    rechtlicherHalt: boolean("rechtlicher_halt").notNull().default(false),
    vertraulich: boolean("vertraulich").notNull().default(false),
    ...erfassung(),
  },
  (t) => [
    unique("dokument_mandant_id_uniq").on(t.mandantId, t.id),
    uniqueIndex("dokument_sha256_uniq").on(t.mandantId, t.sha256),
    index("dokument_objekt_idx").on(t.mandantId, t.objektId, t.art),
    index("dokument_aufbewahrung_idx")
      .on(t.mandantId, t.aufbewahrungBis)
      .where(sql`rechtlicher_halt = false`),
    // Volltextsuche über die Akte.
    index("dokument_ocr_idx").using("gin", sql`to_tsvector('german', coalesce(ocr_text, ''))`),
    foreignKey({
      columns: [t.mandantId],
      foreignColumns: [mandant.id],
      name: "dokument_mandant_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.objektId],
      foreignColumns: [objekt.mandantId, objekt.id],
      name: "dokument_objekt_fk",
    }),
    // Inhalt und Hash sind unveränderbar; Metadaten (Aktenplan, Titel,
    // Aufbewahrung) müssen pflegbar bleiben → normale Mandantenpolicy,
    // Spaltenschutz per Trigger in guards.sql.
    mandantPolicy("dokument"),
  ],
).enableRLS();

// ===========================================================================
// 21 · bezug — die typisierte Kante: alles an alles
// ===========================================================================

/**
 * "Dokument-Verknüpfung an alles" gelöst als eine Kantentabelle statt als 30
 * Fremdschlüsselspalten oder 12 Zwischentabellen.
 *
 * Sie trägt vier Beziehungsklassen, die strukturell identisch sind:
 *  - Dokument → Fachentität   (`beleg`, `nachweis`, `anlage`)
 *  - Vorschlag → Fachentität  (`betrifft`)
 *  - Vorschlag → Beleg        (`evidenz`) — die Begründungskette
 *  - Fachentität → Fachentität (`dublette_von`, `ersetzt`, `ursache`)
 *
 * Bewusst akzeptierter Preis: Postgres kann auf eine polymorphe Kante keine
 * referentielle Integrität legen. Gegenmaßnahmen: `bezug_entitaet` ist ein
 * geschlossenes Enum (keine Tippfehler), und ein Trigger prüft die Existenz
 * des Ziels gegen einen Tabellennamen-Mapping (guards.sql). Der Gegenwert ist,
 * dass eine neue Entität keine Schemaänderung an der Verknüpfung braucht —
 * bei einem Modell, das noch zehn Module bekommt, ist das der bessere Handel.
 */
export const bezug = pgTable(
  "bezug",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    quelleArt: bezugEntitaet("quelle_art").notNull(),
    quelleId: uuid("quelle_id").notNull(),
    zielArt: bezugEntitaet("ziel_art").notNull(),
    zielId: uuid("ziel_id").notNull(),
    rolle: bezugRolle("rolle").notNull(),
    /** Wörtliches Zitat/Seitenzahl — macht eine Evidenz prüfbar. */
    zitat: text("zitat"),
    fundstelle: text("fundstelle"),
    ...erfassung(),
  },
  (t) => [
    uniqueIndex("bezug_uniq").on(
      t.mandantId,
      t.quelleArt,
      t.quelleId,
      t.zielArt,
      t.zielId,
      t.rolle,
    ),
    // Beide Richtungen müssen schnell sein: "was hängt an X" und "wo hängt X".
    index("bezug_vorwaerts_idx").on(t.mandantId, t.quelleArt, t.quelleId, t.rolle),
    index("bezug_rueckwaerts_idx").on(t.mandantId, t.zielArt, t.zielId, t.rolle),
    foreignKey({ columns: [t.mandantId], foreignColumns: [mandant.id], name: "bezug_mandant_fk" }),
    check("bezug_kein_selbstbezug_chk", sql`NOT (quelle_art = ziel_art AND quelle_id = ziel_id)`),
    mandantPolicy("bezug"),
  ],
).enableRLS();

// ===========================================================================
// 22 · frist — der Fristenwächter mit Anker und Zugangsnachweis
// ===========================================================================

/**
 * Eine Frist ist niemals ein Kalendereintrag, sondern eine aus einem Ereignis
 * berechnete Ableitung. Ändert sich das Ankerereignis, wird neu gerechnet.
 *
 * `anker_art = 'zustellung'` mit `zugang_ist`/`zugang_vermutet` und dem
 * Nachweisdokument ist der wichtigste Fall: ohne belastbaren Zugangsnachweis
 * existiert eine Frist forensisch nicht. Für den MVP trägt die Frist diese
 * Felder selbst; wenn das Modul für ausgehende Kommunikation dazukommt, wird
 * `zustellung` eine eigene Entität und diese Spalten werden zu einem FK.
 *
 * `norm_fassung` ist der Grund, warum das Regelwerk versioniert sein muss: die
 * Frage "war die Frist damals versäumt?" ist nach dem Recht von damals zu
 * beantworten, nicht nach dem von heute.
 */
export const frist = pgTable(
  "frist",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    objektId: uuid("objekt_id"),
    einheitId: uuid("einheit_id"),
    bezeichnung: text("bezeichnung").notNull(),
    art: fristArt("art").notNull(),
    /** Prozessschlüssel für Priorisierung und Statistik, z. B. "M-14". */
    prozess: text("prozess"),
    rechtsgrundlage: text("rechtsgrundlage"),
    /** Fassungsstand der Norm zum Berechnungszeitpunkt. */
    normFassung: text("norm_fassung"),
    ankerArt: fristAnker("anker_art").notNull(),
    /** Zeigt auf die Zustellung/das Ereignis/den Beschluss. */
    ankerRef: uuid("anker_ref"),
    ankerAm: date("anker_am", { mode: "string" }).notNull(),
    /** Berechnungsregel als Daten: {"monate":12,"ab":"periodenende"}. */
    berechnung: jsonb("berechnung"),
    ablaufAm: date("ablauf_am", { mode: "string" }).notNull(),
    /** Vorwarnstufen in Tagen, z. B. {60,30,7}. */
    vorwarnungTage: smallint("vorwarnung_tage").array(),
    status: fristStatus("status").notNull().default("laufend"),
    eskalationsstufe: smallint("eskalationsstufe").notNull().default(0),
    hemmungVon: date("hemmung_von", { mode: "string" }),
    hemmungBis: date("hemmung_bis", { mode: "string" }),
    /** Zustellung/Zugang — Voraussetzung dafür, dass die Frist trägt. */
    zustellkanal: zustellkanal("zustellkanal"),
    zugangIst: date("zugang_ist", { mode: "string" }),
    zugangVermutet: date("zugang_vermutet", { mode: "string" }),
    nachweisDokumentId: uuid("nachweis_dokument_id"),
    /** Was passiert, wenn sie reißt — Grundlage der Priorisierung. */
    konsequenz: text("konsequenz").notNull(),
    risikoCent: cent("risiko_cent"),
    verantwortlicherParteiId: uuid("verantwortlicher_partei_id"),
    erledigtAm: timestamp("erledigt_am", { withTimezone: true }),
    ...erfassung(),
  },
  (t) => [
    unique("frist_mandant_id_uniq").on(t.mandantId, t.id),
    // Der Index, der das Cockpit trägt: was reißt als Nächstes?
    index("frist_wache_idx")
      .on(t.mandantId, t.ablaufAm, t.eskalationsstufe)
      .where(sql`status IN ('laufend', 'vorwarnung', 'kritisch')`),
    index("frist_objekt_idx").on(t.mandantId, t.objektId, t.status),
    index("frist_anker_idx").on(t.mandantId, t.ankerArt, t.ankerRef),
    foreignKey({ columns: [t.mandantId], foreignColumns: [mandant.id], name: "frist_mandant_fk" }),
    foreignKey({
      columns: [t.mandantId, t.objektId],
      foreignColumns: [objekt.mandantId, objekt.id],
      name: "frist_objekt_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.einheitId],
      foreignColumns: [einheit.mandantId, einheit.id],
      name: "frist_einheit_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.nachweisDokumentId],
      foreignColumns: [dokument.mandantId, dokument.id],
      name: "frist_nachweis_fk",
    }),
    check("frist_ablauf_chk", sql`ablauf_am >= anker_am`),
    mandantPolicy("frist"),
  ],
).enableRLS();

// ===========================================================================
// 23 · vorschlag — der Plan des Agenten
// ===========================================================================

/**
 * Das zentrale Produktobjekt: das Cockpit rendert nichts anderes als eine
 * priorisierte Liste von Vorschlägen.
 *
 * `plan` enthält die geplanten Aktionen als vollständigen Diff — nicht eine
 * Beschreibung, sondern die Schreibabsicht: Konto, Betrag, Empfänger,
 * Feldänderungen vorher/nachher. `plan_hash` ist der Fingerabdruck über die
 * kanonische Form dieses Plans.
 *
 * Warum der Hash der Kern der Architektur ist: die Zustimmung referenziert den
 * Hash, nicht die Vorschlags-ID. Der Executor rechnet den Hash vor dem
 * Schreiben neu und bricht bei Abweichung ab. Ein nachträglich veränderter
 * Plan ist damit nicht ausführbar — die Freigabe deckt exakt das, was der
 * Mensch gesehen hat, und nichts sonst. Genau das muss die
 * GoBD-Verfahrensdokumentation über eine KI-Kontierung behaupten können.
 *
 * `rechtsnatur` ist der stärkste Prädiktor der zulässigen Autonomie —
 * stärker als Betrag oder Konfidenz. Eine Wissenserklärung (Abrechnung,
 * Auskunft) ist automatisierbar, ein Gestaltungsrecht (Kündigung, Verzicht)
 * bleibt beim Menschen, unabhängig davon, wie sicher das Modell ist.
 */
export const vorschlag = pgTable(
  "vorschlag",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    buchungskreisId: uuid("buchungskreis_id"),
    objektId: uuid("objekt_id"),
    einheitId: uuid("einheit_id"),
    // --- Herkunft ---
    agentId: text("agent_id").notNull(),
    agentVersion: text("agent_version").notNull(),
    modellVersion: text("modell_version").notNull(),
    /** Hash über Prompt + Kontextdokumente: macht den Lauf reproduzierbar. */
    promptHash: text("prompt_hash"),
    /** Prozessschlüssel der Autonomiematrix, z. B. "M-16.kontierung". */
    prozess: text("prozess").notNull(),
    kategorie: vorschlagKategorie("kategorie").notNull(),
    // --- Inhalt ---
    titel: text("titel").notNull(),
    /** Der Satz auf der Karte: was ist zu entscheiden? */
    kurzfassung: text("kurzfassung").notNull(),
    begruendung: text("begruendung").notNull(),
    /** Die Schreibabsicht als Diff. Einzige Quelle der Ausführung. */
    plan: jsonb("plan").notNull(),
    planHash: text("plan_hash").notNull(),
    /** Alternativen mit Folge — damit in Sekunden entschieden werden kann. */
    alternativen: jsonb("alternativen"),
    // --- Bewertung ---
    rechtsnatur: rechtsnatur("rechtsnatur").notNull(),
    rechtsgrundlagen: text("rechtsgrundlagen").array(),
    betragCent: cent("betrag_cent"),
    konfidenz: numeric("konfidenz", { precision: 4, scale: 3 }).notNull(),
    risiko: text("risiko").notNull(),
    reversibel: boolean("reversibel").notNull(),
    /** Anzahl betroffener Verträge/Einheiten — Batch-Vorschläge sichtbar machen. */
    blastRadius: integer("blast_radius").notNull().default(1),
    // --- Autonomie ---
    autonomiestufe: autonomiestufe("autonomiestufe").notNull(),
    /** Ergebnis des Policy-Gates mit Begründung, warum vorgelegt oder nicht. */
    policyEntscheid: jsonb("policy_entscheid"),
    vorlageGrund: text("vorlage_grund"),
    /** Nur Stufe 2: Ausführung nach Ablauf des Widerspruchsfensters. */
    ausfuehrungAm: timestamp("ausfuehrung_am", { withTimezone: true }),
    entscheidenBis: timestamp("entscheiden_bis", { withTimezone: true }),
    /** Sortiergewicht der Queue: Gefahr > Haftung/Frist > Geld > Zeit. */
    prioritaet: integer("prioritaet").notNull().default(0),
    zeitersparnisMinuten: smallint("zeitersparnis_minuten"),
    status: vorschlagStatus("status").notNull().default("erzeugt"),
    ...erfassung(),
  },
  (t) => [
    unique("vorschlag_mandant_id_uniq").on(t.mandantId, t.id),
    // Idempotenz: derselbe Agent darf denselben Plan nicht zweimal vorlegen.
    uniqueIndex("vorschlag_plan_uniq").on(t.mandantId, t.agentId, t.planHash),
    // Die Cockpit-Queue.
    index("vorschlag_queue_idx")
      .on(t.mandantId, t.prioritaet, t.entscheidenBis)
      .where(sql`status IN ('erzeugt', 'vorgelegt')`),
    // Der Scheduler für Stufe-2-Vorschläge.
    index("vorschlag_faellig_idx")
      .on(t.mandantId, t.ausfuehrungAm)
      .where(sql`status = 'vorgelegt' AND ausfuehrung_am IS NOT NULL`),
    index("vorschlag_objekt_idx").on(t.mandantId, t.objektId, t.status),
    index("vorschlag_prozess_idx").on(t.mandantId, t.prozess, t.status),
    foreignKey({
      columns: [t.mandantId],
      foreignColumns: [mandant.id],
      name: "vorschlag_mandant_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.objektId],
      foreignColumns: [objekt.mandantId, objekt.id],
      name: "vorschlag_objekt_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.buchungskreisId],
      foreignColumns: [buchungskreis.mandantId, buchungskreis.id],
      name: "vorschlag_buchungskreis_fk",
    }),
    check("vorschlag_konfidenz_chk", sql`konfidenz BETWEEN 0 AND 1`),
    check("vorschlag_risiko_chk", sql`risiko IN ('niedrig', 'mittel', 'hoch')`),
    // Ein Gestaltungsrecht darf nie autonom ausgeführt werden — im Schema,
    // nicht in der Anwendungslogik.
    check(
      "vorschlag_gestaltungsrecht_chk",
      sql`rechtsnatur <> 'gestaltungsrecht' OR autonomiestufe IN ('s0', 's1')`,
    ),
    mandantPolicy("vorschlag"),
  ],
).enableRLS();

// ===========================================================================
// 24 · entscheidung — die menschliche Freigabe, unveränderbar
// ===========================================================================

/**
 * Eigene Tabelle statt Spalten am Vorschlag, aus drei Gründen:
 *
 *  1. Vier-Augen-Prinzip: ein Vorschlag braucht ab einer Betragsgrenze zwei
 *     Freigaben von verschiedenen Personen (`stufe` 1 und 2). Als Spalten am
 *     Vorschlag wäre das nicht darstellbar.
 *  2. Die Entscheidung muss unveränderbar sein, während der Vorschlagsstatus
 *     weiterläuft (vorgelegt → zugestimmt → ausgeführt).
 *  3. `plan_hash` hält fest, WAS der Mensch gesehen hat. Weicht der Plan
 *     später ab, deckt die Freigabe ihn nicht. Bei "ändern und zustimmen"
 *     trägt die Entscheidung den geänderten Plan und dessen Hash — der
 *     Executor führt dann diesen aus, nicht den Vorschlag des Agenten.
 *
 * `dauer_sek` ist keine Metrik fürs Dashboard, sondern eine Kontrolle: eine
 * Freigabequote von 100 % bei 0,8 Sekunden mittlerer Entscheidungsdauer ist
 * Blindklicken und entzieht der Autonomiestufe ihre Rechtfertigung.
 */
export const entscheidung = pgTable(
  "entscheidung",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    vorschlagId: uuid("vorschlag_id").notNull(),
    /** Freigabestufe: 1 = erste, 2 = zweite (Vier-Augen). */
    stufe: smallint("stufe").notNull().default(1),
    entscheiderParteiId: uuid("entscheider_partei_id").notNull(),
    art: entscheidungArt("art").notNull(),
    /** Der Hash, auf den sich die Freigabe bezieht. */
    planHash: text("plan_hash").notNull(),
    /** Bei "ändern und zustimmen": der tatsächlich freigegebene Plan. */
    geaenderterPlan: jsonb("geaenderter_plan"),
    geaenderterPlanHash: text("geaenderter_plan_hash"),
    /** Ablehnungsgrund ist Trainingssignal und Revisionsnachweis. */
    grund: text("grund"),
    delegiertAnParteiId: uuid("delegiert_an_partei_id"),
    dauerSek: integer("dauer_sek"),
    /** Kanal der Freigabe (Cockpit, Sprache, Mobil) und Kontext. */
    kanal: text("kanal"),
    ipHash: text("ip_hash"),
    am: timestamp("am", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("entscheidung_mandant_id_uniq").on(t.mandantId, t.id),
    // Eine Person kann pro Stufe nur einmal entscheiden.
    uniqueIndex("entscheidung_stufe_uniq").on(t.mandantId, t.vorschlagId, t.stufe),
    index("entscheidung_vorschlag_idx").on(t.mandantId, t.vorschlagId),
    index("entscheidung_entscheider_idx").on(t.mandantId, t.entscheiderParteiId, t.am),
    foreignKey({
      columns: [t.mandantId, t.vorschlagId],
      foreignColumns: [vorschlag.mandantId, vorschlag.id],
      name: "entscheidung_vorschlag_fk",
    }),
    foreignKey({
      columns: [t.mandantId, t.entscheiderParteiId],
      foreignColumns: [partei.mandantId, partei.id],
      name: "entscheidung_entscheider_fk",
    }),
    check("entscheidung_stufe_chk", sql`stufe IN (1, 2)`),
    check(
      "entscheidung_aenderung_chk",
      sql`art <> 'aendern_zustimmen' OR geaenderter_plan_hash IS NOT NULL`,
    ),
    ...unveraenderbarPolicies("entscheidung"),
  ],
).enableRLS();

// ===========================================================================
// 25 · audit_ereignis — der lückenlose Nachweis
// ===========================================================================

/**
 * Ein append-only Protokoll für ALLE schreibenden Vorgänge: Mensch im Formular,
 * Agent per Plan, Hintergrunddienst, externer Import. Nicht zwei Logs für
 * Mensch und KI — die Frage im Prüfungsfall ist "wer hat das getan und wodurch
 * war er befugt", und die muss aus einer Quelle beantwortbar sein.
 *
 * Drei Entwurfsentscheidungen, die den Unterschied machen:
 *
 *  - `akteur_name` ist eine KOPIE, kein Join. Ein Protokoll, dessen Aussage
 *    sich ändert, wenn jemand seinen Namen ändert oder pseudonymisiert wird,
 *    ist als Nachweis wertlos.
 *  - `legitimation` beantwortet die eigentliche Prüffrage: gedeckt durch
 *    Entscheidung, Vier-Augen, Autonomieregel, Gesetz, Beschluss oder
 *    Vollmacht. Ohne dieses Feld ist ein Audit-Trail nur eine Änderungsliste.
 *  - Hash-Kette je Mandant, damit nachträgliches Entfernen einzelner Zeilen
 *    auffällt. Der Trail ist selbst manipulationssicher, nicht nur die
 *    Buchhaltung.
 */
export const auditEreignis = pgTable(
  "audit_ereignis",
  {
    id: pk(),
    mandantId: mandantSpalte(),
    am: timestamp("am", { withTimezone: true }).notNull().defaultNow(),
    /** Lückenlose Folgenummer je Mandant für die Kette. */
    folgeNr: integer("folge_nr").notNull(),
    // --- Akteur ---
    akteurArt: akteurArt("akteur_art").notNull(),
    akteurId: text("akteur_id").notNull(),
    /** Momentaufnahme des Namens. Absichtlich denormalisiert. */
    akteurName: text("akteur_name").notNull(),
    /** Bei Agenten: Version und Modell zum Zeitpunkt der Handlung. */
    akteurVersion: text("akteur_version"),
    // --- Handlung ---
    aktion: text("aktion").notNull(),
    entitaet: bezugEntitaet("entitaet").notNull(),
    entitaetId: uuid("entitaet_id").notNull(),
    objektId: uuid("objekt_id"),
    /** Diff. Personenbezogene Inhalte werden bei Pseudonymisierung ersetzt. */
    vorher: jsonb("vorher"),
    nachher: jsonb("nachher"),
    // --- Befugnis ---
    legitimation: legitimation("legitimation").notNull(),
    vorschlagId: uuid("vorschlag_id"),
    entscheidungId: uuid("entscheidung_id"),
    /** Welche Aktion des Plans ausgeführt wurde (Index im `plan`-Array). */
    planAktionId: text("plan_aktion_id"),
    /** Der Hash, gegen den der Executor geprüft hat. */
    ausgefuehrterPlanHash: text("ausgefuehrter_plan_hash"),
    /** Idempotenzschlüssel: verhindert doppelte Ausführung bei Retry. */
    idempotenzSchluessel: text("idempotenz_schluessel"),
    ergebnis: text("ergebnis"),
    fehler: text("fehler"),
    // --- Kontext ---
    requestId: text("request_id"),
    hashPrev: text("hash_prev"),
    hash: text("hash").notNull(),
  },
  (t) => [
    uniqueIndex("audit_folge_uniq").on(t.mandantId, t.folgeNr),
    uniqueIndex("audit_hash_uniq").on(t.mandantId, t.hash),
    // Verhindert doppelte Ausführung derselben Planaktion.
    uniqueIndex("audit_idempotenz_uniq").on(t.mandantId, t.idempotenzSchluessel),
    // Die Akte einer Entität: "was ist mit dieser Rechnung passiert?"
    index("audit_entitaet_idx").on(t.mandantId, t.entitaet, t.entitaetId, t.am),
    index("audit_vorschlag_idx").on(t.mandantId, t.vorschlagId),
    index("audit_akteur_idx").on(t.mandantId, t.akteurArt, t.akteurId, t.am),
    index("audit_zeit_idx").on(t.mandantId, t.am),
    foreignKey({ columns: [t.mandantId], foreignColumns: [mandant.id], name: "audit_mandant_fk" }),
    ...unveraenderbarPolicies("audit_ereignis"),
  ],
).enableRLS();
