/**
 * Gemeinsame Spalten, Typen und RLS-Muster
 * =============================================================================
 * Drei Konventionen, die im ganzen Schema gelten:
 *
 * 1. GELD ist `bigint` in Cent. Kein `numeric`, kein `float`. Ein WEG-Darlehen
 *    oder eine Sonderumlage sprengt `integer` (2.147.483.647 Cent = 21,4 Mio €),
 *    deshalb bigint im JS-`number`-Modus (sicher bis 2^53 Cent).
 *
 * 2. ZEITSCHEIBEN haben immer drei Spalten: `gueltig_von` und `gueltig_bis` als
 *    fachlich inklusive DATE (so, wie es im Vertrag steht: "endet 31.12."), plus
 *    eine generierte `gueltigkeit`-daterange in halboffener [von, bis+1)-Form.
 *    Die Range trägt den Ausschluss-Constraint, die DATE-Spalten die Fachlichkeit.
 *    Damit gibt es keine "ist bis inklusive?"-Klasse von Bugs.
 *
 * 3. MANDANTENTRENNUNG ist doppelt gesichert: `mandant_id` auf jeder Zeile für
 *    RLS, und zusammengesetzte Fremdschlüssel `(mandant_id, parent_id)` auf der
 *    Kernhierarchie, damit eine Zeile technisch nicht auf einen fremden Mandanten
 *    zeigen kann. RLS schützt vor dem Leser, der Composite-FK vor dem Schreiber.
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  customType,
  date,
  pgPolicy,
  pgRole,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Rollen
// ---------------------------------------------------------------------------

/**
 * Anwendungsrolle. Hat auf keiner Tabelle BYPASSRLS und auf dem Journal kein
 * UPDATE/DELETE. Wird von der Anwendung nach der Authentifizierung übernommen.
 */
export const immosApp = pgRole("immos_app").existing();

/**
 * Hintergrunddienste (camt-Abruf, Fristenwächter, Abrechnungsläufe). Gleiche
 * Mandantengrenze, darf aber ohne Benutzerkontext schreiben — erkennbar im
 * Audit-Trail als `akteur_art = 'system'`.
 */
export const immosDienst = pgRole("immos_dienst").existing();

/** Migration/DDL. Nie von der Anwendung benutzt. */
export const immosOwner = pgRole("immos_owner").existing();

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

/** Geldbetrag in Cent. */
export const cent = (name: string) => bigint(name, { mode: "number" });

/**
 * Halboffene Datumsspanne. Wird nie direkt geschrieben, sondern immer aus
 * `gueltig_von`/`gueltig_bis` generiert (siehe `zeitscheibe`).
 */
export const daterange = customType<{ data: string; driverData: string }>({
  dataType: () => "daterange",
});

// ---------------------------------------------------------------------------
// Spaltenbausteine
// ---------------------------------------------------------------------------

export const pk = () => uuid("id").primaryKey().defaultRandom();

/** Mandantenspalte. Auf JEDER fachlichen Tabelle, ohne Ausnahme. */
export const mandantSpalte = () => uuid("mandant_id").notNull();

/**
 * Erfassungsspuren. Bewusst ohne `aktualisiert_am`-Automatik: wer eine Zeile
 * ändert, erzeugt ein `audit_ereignis`. Ein stiller `updated_at`-Trigger
 * verführt dazu, die Änderungshistorie für erledigt zu halten.
 */
export const erfassung = () => ({
  erstelltAm: timestamp("erstellt_am", { withTimezone: true }).notNull().defaultNow(),
  erstelltVon: uuid("erstellt_von"),
});

/**
 * Zeitscheibe. `gueltigBis = null` heißt "offen".
 *
 * Die generierte Range ist der Träger des Ausschluss-Constraints:
 *   EXCLUDE USING gist (einheit_id WITH =, gueltigkeit WITH &&)
 * Damit sind Überlappungen ein Constraint-Verstoß statt eines Supportfalls —
 * die Grundlage dafür, dass "wer nutzte Einheit X am 14.03.?" eine totale
 * Funktion ist und rückwirkende Abrechnungen überhaupt möglich sind.
 */
export const zeitscheibe = () => ({
  gueltigVon: date("gueltig_von", { mode: "string" }).notNull(),
  gueltigBis: date("gueltig_bis", { mode: "string" }),
  gueltigkeit: daterange("gueltigkeit")
    .notNull()
    .generatedAlwaysAs(
      sql`daterange(gueltig_von, CASE WHEN gueltig_bis IS NULL THEN NULL ELSE (gueltig_bis + 1) END, '[)')`,
    ),
});

// ---------------------------------------------------------------------------
// RLS-Muster
// ---------------------------------------------------------------------------

/**
 * Der aktuelle Mandant aus dem Sitzungskontext.
 *
 * Die Anwendung setzt pro Anfrage `SET LOCAL immos.mandant_id = '<uuid>'`.
 * Ist nichts gesetzt, liefert die Funktion NULL, und jede Policy schlägt fehl
 * (NULL = NULL ist nicht true) — "kein Mandant" bedeutet also "keine Zeile",
 * nicht "alle Zeilen". Das ist die wichtigste Eigenschaft des ganzen Musters.
 *
 * Zum `(select ...)` in den Policies, gemessen an PostgreSQL 16: weil
 * `immos_sec.mandant()` eine schlichte `sql STABLE`-Funktion ist, inlined der
 * Planner sie ohnehin in die Index-Bedingung — beide Schreibweisen ergeben hier
 * einen Index Scan. Der Nutzen der Klammer ist die Garantie, nicht die
 * Reparatur: sie erzwingt eine einmalige Auswertung als InitPlan und bleibt
 * damit auch dann korrekt, wenn eine Policy später etwas Nicht-Inlinebares
 * aufruft (plpgsql, Rollenauflösung, Unterabfrage). Als einheitliche Form
 * kostet sie nichts und nimmt eine Fußangel dauerhaft aus dem Weg.
 */
export const aktuellerMandant = sql`(select immos_sec.mandant())`;

/**
 * Standard-Mandantenisolation: lesen und schreiben nur im eigenen Mandanten.
 * `withCheck` ist entscheidend — ohne es könnte man Zeilen in einen fremden
 * Mandanten hinein schreiben, obwohl man sie nicht lesen kann.
 */
export const mandantPolicy = (tabelle: string) =>
  pgPolicy(`${tabelle}_mandant`, {
    as: "permissive",
    for: "all",
    to: [immosApp, immosDienst],
    using: sql`mandant_id = ${aktuellerMandant}`,
    withCheck: sql`mandant_id = ${aktuellerMandant}`,
  });

/**
 * Unveränderbarkeit als Policy (GoBD, § 146 Abs. 4 AO).
 *
 * Bewusst `restrictive`: restriktive Policies werden mit UND verknüpft. Eine
 * später hinzugefügte permissive ALL-Policy kann die Sperre also nicht
 * aufheben — anders als bei einer bloß fehlenden UPDATE-Policy. Zusätzlich
 * werden die Rechte in `guards.sql` entzogen; eine Invariante, die nur an einer
 * Stelle hängt, ist keine.
 */
export const unveraenderbarPolicies = (tabelle: string) => [
  pgPolicy(`${tabelle}_lesen`, {
    as: "permissive",
    for: "select",
    to: [immosApp, immosDienst],
    using: sql`mandant_id = ${aktuellerMandant}`,
  }),
  pgPolicy(`${tabelle}_anlegen`, {
    as: "permissive",
    for: "insert",
    to: [immosApp, immosDienst],
    withCheck: sql`mandant_id = ${aktuellerMandant}`,
  }),
  pgPolicy(`${tabelle}_kein_update`, {
    as: "restrictive",
    for: "update",
    to: [immosApp, immosDienst],
    using: sql`false`,
  }),
  pgPolicy(`${tabelle}_kein_delete`, {
    as: "restrictive",
    for: "delete",
    to: [immosApp, immosDienst],
    using: sql`false`,
  }),
];

/**
 * Objektbezogene Sichtbarkeit für Rollen, die nur Teilbestände sehen dürfen
 * (Beirat, Eigentümer im Portal, externer Buchhalter). Kommt als zusätzliche
 * restriktive Policy auf Tabellen mit `objekt_id`.
 */
export const objektScopePolicy = (tabelle: string, spalte = "objekt_id") =>
  pgPolicy(`${tabelle}_objekt_scope`, {
    as: "restrictive",
    for: "all",
    to: [immosApp],
    using: sql`immos_sec.objekt_sichtbar(${sql.raw(spalte)})`,
  });

/** Selbstreferenz-Helfer für Drizzle (z. B. Storno zeigt auf Buchung). */
export type Selbst = () => AnyPgColumn;
