-- =============================================================================
-- Regeln, die das Schema allein nicht ausdrücken kann
-- =============================================================================
-- Diese Datei gehört in die erste Migration nach `drizzle-kit generate`. Alles
-- hier Beschriebene ist Fachlichkeit, die nicht in der Anwendungsschicht liegen
-- darf: was die Datenbank garantiert, gilt auch bei einem Programmfehler, in
-- einem Hintergrundjob und bei direktem Zugriff.

-- -----------------------------------------------------------------------------
-- 1. Mandantentrennung erzwingen
-- -----------------------------------------------------------------------------
-- RLS gilt sonst nicht für den Eigentümer der Tabelle. Ohne FORCE genügt eine
-- Verbindung mit der falschen Rolle, um die Trennung auszuhebeln.

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> 'mandanten'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Die Anwendung setzt den Mandanten je Transaktion:
--   SELECT set_config('immos.mandant_id', $1, true);
-- Niemals aus einem Parameter der Anfrage, immer aus der geprüften Sitzung.

-- -----------------------------------------------------------------------------
-- 2. Festgeschriebene Buchungen sind unveränderbar (GoBD)
-- -----------------------------------------------------------------------------
-- Korrektur erfolgt ausschließlich durch eine Storno-Buchung, die auf die
-- ursprüngliche verweist. Damit bleibt das Journal vollständig nachvollziehbar.

CREATE OR REPLACE FUNCTION buchung_unveraenderbar() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Buchungen werden nicht gelöscht. Storno anlegen (Beleg %).', OLD.beleg_nr;
  END IF;
  IF OLD.festgeschrieben THEN
    RAISE EXCEPTION 'Buchung % ist festgeschrieben und unveränderbar. Storno anlegen.', OLD.journal_nr;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER buchungen_unveraenderbar
  BEFORE UPDATE OR DELETE ON buchungen
  FOR EACH ROW EXECUTE FUNCTION buchung_unveraenderbar();

-- Lückenlosigkeit der Journalnummer je Mandant und Geschäftsjahr.
CREATE OR REPLACE FUNCTION journal_nummer_setzen() RETURNS trigger AS $$
BEGIN
  IF NEW.journal_nr IS NULL OR NEW.journal_nr = 0 THEN
    SELECT COALESCE(MAX(journal_nr), 0) + 1 INTO NEW.journal_nr
    FROM buchungen
    WHERE mandant_id = NEW.mandant_id AND geschaeftsjahr = NEW.geschaeftsjahr;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER buchungen_journal_nummer
  BEFORE INSERT ON buchungen
  FOR EACH ROW EXECUTE FUNCTION journal_nummer_setzen();

-- -----------------------------------------------------------------------------
-- 3. Der Nachweis ist nur einfügbar
-- -----------------------------------------------------------------------------
-- Ein Audit-Trail, den man ändern kann, ist kein Nachweis.

CREATE OR REPLACE FUNCTION audit_nur_einfuegen() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit-Ereignisse sind unveränderbar.';
END $$ LANGUAGE plpgsql;

CREATE TRIGGER audit_unveraenderbar
  BEFORE UPDATE OR DELETE ON audit_ereignisse
  FOR EACH ROW EXECUTE FUNCTION audit_nur_einfuegen();

-- -----------------------------------------------------------------------------
-- 4. Zeitscheiben dürfen sich nicht überlappen
-- -----------------------------------------------------------------------------
-- Zwei gültige Flächen für dieselbe Einheit zum selben Datum machen jede
-- Abrechnung angreifbar. Die Datenbank verhindert das, nicht ein Codepfad.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE einheit_flaechen
  ADD CONSTRAINT einheit_flaechen_ohne_ueberlappung
  EXCLUDE USING gist (
    einheit_id WITH =,
    daterange(gueltig_von, COALESCE(gueltig_bis, 'infinity'::date), '[]') WITH &&
  );

ALTER TABLE mietkonditionen
  ADD CONSTRAINT mietkonditionen_ohne_ueberlappung
  EXCLUDE USING gist (
    vertrag_id WITH =,
    daterange(gueltig_von, COALESCE(gueltig_bis, 'infinity'::date), '[]') WITH &&
  );

ALTER TABLE eigentumsverhaeltnisse
  ADD CONSTRAINT eigentum_ohne_ueberlappung
  EXCLUDE USING gist (
    einheit_id WITH =,
    daterange(gueltig_von, COALESCE(gueltig_bis, 'infinity'::date), '[]') WITH &&
  );

-- Ein Mietvertrag darf sich für dieselbe Einheit nicht mit einem anderen
-- überschneiden — sonst wären zwei Mieter gleichzeitig zahlungspflichtig.
ALTER TABLE mietvertraege
  ADD CONSTRAINT mietvertraege_ohne_ueberlappung
  EXCLUDE USING gist (
    einheit_id WITH =,
    daterange(beginn, COALESCE(gekuendigt_zum, ende, 'infinity'::date), '[]') WITH &&
  );

-- -----------------------------------------------------------------------------
-- 5. Fachliche Grenzen als Prüfbedingung
-- -----------------------------------------------------------------------------

-- HeizkostenV §7: Verbrauchsanteil zwischen 50 und 70 Prozent.
ALTER TABLE objekte
  ADD CONSTRAINT objekte_verbrauchsanteil_zulaessig
  CHECK (heizkosten_verbrauchsanteil IS NULL
         OR heizkosten_verbrauchsanteil BETWEEN 0.50 AND 0.70);

-- Autonomiestufe kann die Höchststufe des Prozesses nicht überschreiten.
ALTER TABLE autonomie_regeln
  ADD CONSTRAINT autonomie_stufe_im_rahmen
  CHECK (stufe BETWEEN 0 AND 3 AND stufe <= max_stufe);

-- Zahlungen sind nie autonom: für diese Prozesse gilt Höchststufe 1.
ALTER TABLE autonomie_regeln
  ADD CONSTRAINT autonomie_zahlung_nie_autonom
  CHECK (prozess NOT IN ('zahlung_freigeben', 'stammdaten_bank', 'kuendigung_zahlungsverzug')
         OR max_stufe <= 1);

-- Eine Zahlung kann nicht mehr zuordnen, als der Posten offen hat.
ALTER TABLE sollstellungen
  ADD CONSTRAINT sollstellungen_nicht_ueberzahlt
  CHECK (bezahlt_cent <= betrag_cent);

-- Umsatzsteuer muss zur Summe passen (Cent-Toleranz für Rundung je Position).
ALTER TABLE eingangsrechnungen
  ADD CONSTRAINT rechnung_summe_stimmt
  CHECK (abs(netto_cent + ust_cent - brutto_cent) <= 2);

-- -----------------------------------------------------------------------------
-- 6. Nachweispflicht bei Ausführung
-- -----------------------------------------------------------------------------
-- Ein Vorschlag im Status „zugestimmt" ohne Entscheidungsdatensatz wäre eine
-- Ausführung ohne Legitimation. Die Prüfung läuft als deferrable Constraint
-- Trigger am Transaktionsende, damit Vorschlag und Entscheidung gemeinsam
-- geschrieben werden können.

CREATE OR REPLACE FUNCTION vorschlag_braucht_entscheidung() RETURNS trigger AS $$
BEGIN
  IF NEW.status IN ('zugestimmt', 'geaendert_zugestimmt', 'abgelehnt')
     AND NOT EXISTS (SELECT 1 FROM entscheidungen e WHERE e.vorschlag_id = NEW.id) THEN
    RAISE EXCEPTION 'Vorschlag % ohne Entscheidungsdatensatz — keine Legitimation.', NEW.id;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER vorschlaege_legitimation
  AFTER INSERT OR UPDATE ON vorschlaege
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION vorschlag_braucht_entscheidung();
