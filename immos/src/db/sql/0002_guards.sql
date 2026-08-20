-- ===========================================================================
-- ImmOS · Sicherungsschicht (nach der Drizzle-Migration)
-- ===========================================================================
-- Alles, was Drizzle nicht ausdrücken kann und was zu wichtig ist, um in der
-- Anwendung zu leben: Ausschluss-Constraints, Unveränderbarkeit,
-- Nummernkreise, Hash-Ketten, FORCE RLS, Rechte.
--
-- Leitsatz: Eine Invariante, die nur in TypeScript existiert, ist ein
-- SQL-Skript davon entfernt, nicht zu existieren. Die Verfahrensdokumentation
-- muss behaupten können, dass die Datenbank sie erzwingt.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1 · FORCE RLS und Rechte
-- ---------------------------------------------------------------------------
-- Ohne FORCE umgeht der Tabelleneigentuemer jede Policy. Das ist die haeufigste
-- stille Luecke in RLS-Setups: Migrationen und Wartungsskripte laufen als
-- Eigentuemer und sehen dann alle Mandanten.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'mandant','buchungskreis','partei','partei_rolle','objekt','einheit',
    'einheit_bezugswert','vertrag','vertrag_kondition','nutzungszeitraum',
    'konto','umlageregel','periode','buchung','buchungszeile','sollstellung',
    'eingangsrechnung','bankumsatz','zahlungszuordnung','dokument','bezug',
    'frist','vorschlag','entscheidung','audit_ereignis'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO immos_app, immos_dienst', t);
  END LOOP;
END $$;

-- Unveraenderbare Tabellen: Rechte entziehen. Die restriktiven RLS-Policies
-- verbieten UPDATE/DELETE bereits; der Rechteentzug ist die zweite Instanz,
-- die Trigger unten die dritte. Bei GoBD-relevanten Daten ist eine einzige
-- Verteidigungslinie keine.
REVOKE UPDATE, DELETE ON buchung        FROM immos_app, immos_dienst;
REVOKE UPDATE, DELETE ON buchungszeile  FROM immos_app, immos_dienst;
REVOKE UPDATE, DELETE ON entscheidung   FROM immos_app, immos_dienst;
REVOKE UPDATE, DELETE ON audit_ereignis FROM immos_app, immos_dienst;
-- bankumsatz: Status/offen_cent werden vom Trigger gepflegt, deshalb bleibt
-- UPDATE fuer immos_dienst offen, aber nur ueber die Zuordnungsfunktion.
REVOKE UPDATE, DELETE ON bankumsatz     FROM immos_app;
REVOKE DELETE            ON bankumsatz  FROM immos_dienst;

-- ---------------------------------------------------------------------------
-- 2 · Zeitscheiben: Ausschluss-Constraints
-- ---------------------------------------------------------------------------
-- Der eigentliche Grund, warum rueckwirkende Abrechnungen funktionieren.
-- Ueberlappungen sind ab hier ein Constraint-Verstoss statt eines Supportfalls.

-- Wer nutzte welche Einheit wann. `teilflaeche` ist der bewusste Ausweg fuer
-- geteilte Gewerbeflaechen mit zwei gleichzeitigen Mietern.
ALTER TABLE nutzungszeitraum
  ADD CONSTRAINT nutzungszeitraum_keine_ueberlappung
  EXCLUDE USING gist (
    einheit_id  WITH =,
    teilflaeche WITH =,
    gueltigkeit WITH &&
  );

-- Flaeche, MEA, Personenzahl: je Einheit und Art nur eine gueltige Scheibe.
ALTER TABLE einheit_bezugswert
  ADD CONSTRAINT einheit_bezugswert_keine_ueberlappung
  EXCLUDE USING gist (
    einheit_id  WITH =,
    art         WITH =,
    gueltigkeit WITH &&
  );

-- Mietbetraege: je Vertrag und Art nur eine gueltige Scheibe.
ALTER TABLE vertrag_kondition
  ADD CONSTRAINT vertrag_kondition_keine_ueberlappung
  EXCLUDE USING gist (
    vertrag_id  WITH =,
    art         WITH =,
    gueltigkeit WITH &&
  );

-- Umlageschluessel: je Objekt und Kostenart nur eine gueltige Regel.
-- Das ist INV-5 der WEG-Analyse ("jede Kostenposition hat genau einen aktiven
-- Verteilerschluessel") als Datenbank-Constraint.
ALTER TABLE umlageregel
  ADD CONSTRAINT umlageregel_keine_ueberlappung
  EXCLUDE USING gist (
    objekt_id   WITH =,
    konto_id    WITH =,
    gueltigkeit WITH &&
  );

-- ---------------------------------------------------------------------------
-- 4 · Journal: Nummernkreis, Periodensperre, Hash-Kette
-- Hinweis: digest() stammt aus pgcrypto und liegt in `public`. Alle Aufrufe
-- sind voll qualifiziert. Bei SECURITY DEFINER mit eingeschraenktem
-- search_path scheitert ein unqualifizierter Aufruf sonst zur Laufzeit — und
-- zwar im Trigger, also lautlos genau dann, wenn der Nachweis gebraucht wird.
-- ---------------------------------------------------------------------------

-- Lueckenlose Journalnummer + Kettenkopf aus dem Jahresanker (monat = 0).
-- Bewusst KEINE Sequenz: Sequenzen hinterlassen bei Rollback Luecken, und eine
-- Luecke im Journal ist eine GoBD-Feststellung. Das UPDATE ... RETURNING
-- sperrt die Ankerzeile und serialisiert Nummer und Hash in einem Schritt.
CREATE OR REPLACE FUNCTION immos_sec.buchung_vor_insert() RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  v_nr        integer;
  v_prev      text;
  v_status    periode_status;
  v_payload   text;
BEGIN
  -- Periodensperre: keine Buchung in eine festgeschriebene oder beschlossene
  -- Periode. Korrektur laeuft ueber Storno in der offenen Periode bzw. ueber
  -- eine Nachtragsabrechnung (WEG), nie ueber Rueckaenderung des Altjahres.
  SELECT status INTO v_status
    FROM periode
   WHERE mandant_id       = NEW.mandant_id
     AND buchungskreis_id = NEW.buchungskreis_id
     AND jahr             = extract(year FROM NEW.buchungsdatum)::smallint
     AND monat            = extract(month FROM NEW.buchungsdatum)::smallint;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Periode % / % existiert nicht fuer Buchungskreis %',
      extract(year FROM NEW.buchungsdatum), extract(month FROM NEW.buchungsdatum),
      NEW.buchungskreis_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_status NOT IN ('offen', 'abgestimmt') THEN
    RAISE EXCEPTION 'Periode ist % — Buchung nur per Storno/Nachtrag moeglich', v_status
      USING ERRCODE = 'check_violation';
  END IF;

  -- Nummer und Kettenkopf holen (sperrt die Ankerzeile fuer diese Transaktion).
  UPDATE periode
     SET journal_nr_naechste = journal_nr_naechste + 1
   WHERE mandant_id       = NEW.mandant_id
     AND buchungskreis_id = NEW.buchungskreis_id
     AND jahr             = NEW.jahr
     AND monat            = 0
  RETURNING journal_nr_naechste - 1, hash_letzter INTO v_nr, v_prev;

  IF v_nr IS NULL THEN
    RAISE EXCEPTION 'Kein Jahresanker (monat = 0) fuer % / %',
      NEW.buchungskreis_id, NEW.jahr
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.journal_nr := v_nr;
  NEW.hash_prev  := v_prev;

  -- Kanonische Form des Kopfes. `zeilen_digest` ist enthalten, damit die Kette
  -- auch die Zeilen abdeckt, ohne den Kopf je aendern zu muessen.
  v_payload := concat_ws('|',
    coalesce(v_prev, ''),
    NEW.mandant_id::text, NEW.buchungskreis_id::text,
    NEW.jahr::text, v_nr::text,
    NEW.belegdatum::text, NEW.buchungsdatum::text,
    coalesce(NEW.belegfeld, ''), NEW.buchungstext,
    NEW.quelle::text, coalesce(NEW.storno_von_id::text, ''),
    NEW.zeilen_digest
  );
  NEW.hash := encode(public.digest(v_payload, 'sha256'), 'hex');

  UPDATE periode
     SET hash_letzter = NEW.hash
   WHERE mandant_id       = NEW.mandant_id
     AND buchungskreis_id = NEW.buchungskreis_id
     AND jahr             = NEW.jahr
     AND monat            = 0;

  RETURN NEW;
END $$;

CREATE TRIGGER buchung_vor_insert
  BEFORE INSERT ON buchung
  FOR EACH ROW EXECUTE FUNCTION immos_sec.buchung_vor_insert();

-- Unveraenderbarkeit als dritte Instanz.
CREATE OR REPLACE FUNCTION immos_sec.nur_anfuegen() RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    '% ist unveraenderbar (GoBD, § 146 Abs. 4 AO). Korrektur nur durch neue Zeile.',
    TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER buchung_unveraenderbar
  BEFORE UPDATE OR DELETE ON buchung
  FOR EACH ROW EXECUTE FUNCTION immos_sec.nur_anfuegen();

CREATE TRIGGER buchungszeile_unveraenderbar
  BEFORE UPDATE OR DELETE ON buchungszeile
  FOR EACH ROW EXECUTE FUNCTION immos_sec.nur_anfuegen();

CREATE TRIGGER entscheidung_unveraenderbar
  BEFORE UPDATE OR DELETE ON entscheidung
  FOR EACH ROW EXECUTE FUNCTION immos_sec.nur_anfuegen();

CREATE TRIGGER audit_unveraenderbar
  BEFORE UPDATE OR DELETE ON audit_ereignis
  FOR EACH ROW EXECUTE FUNCTION immos_sec.nur_anfuegen();

-- ---------------------------------------------------------------------------
-- 6 · Journal: Soll = Haben und Zeilendigest, aufgeschoben bis Commit
-- ---------------------------------------------------------------------------
-- Als DEFERRABLE INITIALLY DEFERRED, weil Kopf und Zeilen zwangslaeufig in
-- mehreren Statements entstehen. Geprueft wird am Ende der Transaktion, wenn
-- die Buchung vollstaendig ist.

CREATE OR REPLACE FUNCTION immos_sec.buchung_pruefen() RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  v_soll     bigint;
  v_haben    bigint;
  v_digest   text;
  v_erwartet text;
  v_zeilen   integer;
BEGIN
  SELECT coalesce(sum(CASE WHEN sh = 'S' THEN betrag_cent END), 0),
         coalesce(sum(CASE WHEN sh = 'H' THEN betrag_cent END), 0),
         count(*),
         encode(public.digest(string_agg(
           concat_ws('|', zeilen_nr::text, konto_id::text, sh, betrag_cent::text,
                     coalesce(objekt_id::text, ''), coalesce(einheit_id::text, ''),
                     coalesce(leistung_von::text, ''), coalesce(leistung_bis::text, '')),
           E'\n' ORDER BY zeilen_nr), 'sha256'), 'hex')
    INTO v_soll, v_haben, v_zeilen, v_digest
    FROM buchungszeile
   WHERE buchung_id = NEW.id;

  IF v_zeilen = 0 THEN
    RAISE EXCEPTION 'Buchung % hat keine Zeilen', NEW.journal_nr
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_soll <> v_haben THEN
    RAISE EXCEPTION 'Buchung %: Soll (%) <> Haben (%)', NEW.journal_nr, v_soll, v_haben
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_digest <> NEW.zeilen_digest THEN
    RAISE EXCEPTION
      'Buchung %: Zeilendigest weicht ab — Zeilensatz nicht durch die Hash-Kette gedeckt',
      NEW.journal_nr
      USING ERRCODE = 'check_violation';
  END IF;

  -- Eine Buchung beruehrt genau einen Buchungskreis (MaBV-Fremdgeldtrennung).
  IF EXISTS (
    SELECT 1 FROM buchungszeile z
      JOIN konto k ON k.id = z.konto_id
     WHERE z.buchung_id = NEW.id AND k.mandant_id <> NEW.mandant_id
  ) THEN
    RAISE EXCEPTION 'Buchung % beruehrt einen fremden Mandanten', NEW.journal_nr
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER buchung_ausgeglichen
  AFTER INSERT ON buchung
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION immos_sec.buchung_pruefen();

-- ---------------------------------------------------------------------------
-- 7 · Offene Posten: Restbetraege ausschliesslich per Trigger
-- ---------------------------------------------------------------------------
-- Die Anwendung schreibt `restbetrag_cent` nie. Damit koennen Soll und
-- Zuordnung nicht auseinanderlaufen — der klassische Abstimmungsfehler.

CREATE OR REPLACE FUNCTION immos_sec.zuordnung_nachfuehren() RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE
  v_soll uuid := coalesce(NEW.sollstellung_id, OLD.sollstellung_id);
  v_rech uuid := coalesce(NEW.eingangsrechnung_id, OLD.eingangsrechnung_id);
  v_ums  uuid := coalesce(NEW.bankumsatz_id, OLD.bankumsatz_id);
BEGIN
  IF v_soll IS NOT NULL THEN
    UPDATE sollstellung s
       SET restbetrag_cent = s.betrag_cent - coalesce((
             SELECT sum(z.betrag_cent) FROM zahlungszuordnung z
              WHERE z.sollstellung_id = s.id AND z.aufgehoben_am IS NULL), 0),
           status = CASE
             WHEN s.betrag_cent - coalesce((
                    SELECT sum(z.betrag_cent) FROM zahlungszuordnung z
                     WHERE z.sollstellung_id = s.id AND z.aufgehoben_am IS NULL), 0) <= 0
               THEN 'bezahlt'::op_status
             WHEN coalesce((SELECT sum(z.betrag_cent) FROM zahlungszuordnung z
                     WHERE z.sollstellung_id = s.id AND z.aufgehoben_am IS NULL), 0) > 0
               THEN 'teilbezahlt'::op_status
             ELSE 'offen'::op_status END
     WHERE s.id = v_soll;
  END IF;

  IF v_rech IS NOT NULL THEN
    UPDATE eingangsrechnung r
       SET restbetrag_cent = r.brutto_cent - coalesce((
             SELECT sum(z.betrag_cent) FROM zahlungszuordnung z
              WHERE z.eingangsrechnung_id = r.id AND z.aufgehoben_am IS NULL), 0)
     WHERE r.id = v_rech;
  END IF;

  IF v_ums IS NOT NULL THEN
    UPDATE bankumsatz u
       SET offen_cent = abs(u.betrag_cent) - coalesce((
             SELECT sum(z.betrag_cent) FROM zahlungszuordnung z
              WHERE z.bankumsatz_id = u.id AND z.aufgehoben_am IS NULL), 0)
     WHERE u.id = v_ums;
  END IF;

  RETURN NULL;
END $$;

CREATE TRIGGER zuordnung_nachfuehren
  AFTER INSERT OR UPDATE OR DELETE ON zahlungszuordnung
  FOR EACH ROW EXECUTE FUNCTION immos_sec.zuordnung_nachfuehren();

-- Ueberzuordnung verhindern: nie mehr zuordnen, als der Umsatz hergibt.
CREATE OR REPLACE FUNCTION immos_sec.zuordnung_pruefen() RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE v_umsatz bigint; v_zugeordnet bigint;
BEGIN
  SELECT abs(betrag_cent) INTO v_umsatz FROM bankumsatz WHERE id = NEW.bankumsatz_id;
  SELECT coalesce(sum(betrag_cent), 0) INTO v_zugeordnet
    FROM zahlungszuordnung
   WHERE bankumsatz_id = NEW.bankumsatz_id AND aufgehoben_am IS NULL;

  IF v_zugeordnet > v_umsatz THEN
    RAISE EXCEPTION 'Bankumsatz % ueberzugeordnet: % von %',
      NEW.bankumsatz_id, v_zugeordnet, v_umsatz
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER zuordnung_nicht_ueberzuordnen
  AFTER INSERT OR UPDATE ON zahlungszuordnung
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION immos_sec.zuordnung_pruefen();

-- ---------------------------------------------------------------------------
-- 8 · Audit-Trail: lueckenlose Folgenummer und Hash-Kette
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS immos_sec.audit_anker (
  mandant_id  uuid PRIMARY KEY,
  folge_nr    integer NOT NULL DEFAULT 1,
  hash_letzter text
);

CREATE OR REPLACE FUNCTION immos_sec.audit_vor_insert() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE v_nr integer; v_prev text;
BEGIN
  INSERT INTO immos_sec.audit_anker (mandant_id) VALUES (NEW.mandant_id)
    ON CONFLICT (mandant_id) DO NOTHING;

  UPDATE immos_sec.audit_anker
     SET folge_nr = folge_nr + 1
   WHERE mandant_id = NEW.mandant_id
  RETURNING folge_nr - 1, hash_letzter INTO v_nr, v_prev;

  NEW.folge_nr  := v_nr;
  NEW.hash_prev := v_prev;
  NEW.hash := encode(public.digest(concat_ws('|',
    coalesce(v_prev, ''), NEW.mandant_id::text, v_nr::text,
    NEW.am::text, NEW.akteur_art::text, NEW.akteur_id, NEW.akteur_name,
    NEW.aktion, NEW.entitaet::text, NEW.entitaet_id::text,
    NEW.legitimation::text,
    coalesce(NEW.vorschlag_id::text, ''), coalesce(NEW.entscheidung_id::text, ''),
    coalesce(NEW.ausgefuehrter_plan_hash, ''),
    coalesce(NEW.vorher::text, ''), coalesce(NEW.nachher::text, '')
  ), 'sha256'), 'hex');

  -- Kettenkopf fortschreiben. Ohne diesen Schritt bleibt hash_prev immer NULL
  -- und die Kette ist keine Kette: entfernte Zeilen fielen nicht auf.
  UPDATE immos_sec.audit_anker
     SET hash_letzter = NEW.hash
   WHERE mandant_id = NEW.mandant_id;

  RETURN NEW;
END $$;

CREATE TRIGGER audit_vor_insert
  BEFORE INSERT ON audit_ereignis
  FOR EACH ROW EXECUTE FUNCTION immos_sec.audit_vor_insert();

-- ---------------------------------------------------------------------------
-- 9 · Dokument: Inhalt unveraenderbar, Metadaten pflegbar
-- ---------------------------------------------------------------------------
-- Titel, Aktenplan und Aufbewahrungsfrist muessen aenderbar bleiben. Hash,
-- Blob und Groesse nicht — sonst waere die Ablage keine Ablage.

CREATE OR REPLACE FUNCTION immos_sec.dokument_inhalt_fest() RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sha256 <> OLD.sha256 OR NEW.blob_uri <> OLD.blob_uri
     OR NEW.groesse_bytes <> OLD.groesse_bytes THEN
    RAISE EXCEPTION 'Dokumentinhalt ist unveraenderbar — neue Version anlegen'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF OLD.rechtlicher_halt AND NOT NEW.rechtlicher_halt THEN
    RAISE EXCEPTION 'Rechtlicher Halt darf nur durch die Rechtsabteilung aufgehoben werden'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER dokument_inhalt_fest
  BEFORE UPDATE ON dokument
  FOR EACH ROW EXECUTE FUNCTION immos_sec.dokument_inhalt_fest();

-- ---------------------------------------------------------------------------
-- 10 · Generische Kante: Zielexistenz pruefen
-- ---------------------------------------------------------------------------
-- Postgres kann auf eine polymorphe Kante keine referentielle Integritaet
-- legen. Dieser Trigger holt sie nach. Nebeneffekt und wichtig: er laeuft mit
-- den Rechten des Aufrufers, also unter RLS — eine Kante kann deshalb nicht auf
-- die Zeile eines fremden Mandanten zeigen, selbst wenn die UUID bekannt waere.

CREATE OR REPLACE FUNCTION immos_sec.bezug_ziel_pruefen() RETURNS trigger
  LANGUAGE plpgsql
AS $$
DECLARE v_ok boolean;
BEGIN
  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1 AND mandant_id = $2)',
    NEW.quelle_art::text)
    INTO v_ok USING NEW.quelle_id, NEW.mandant_id;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'bezug: Quelle %/% existiert nicht im Mandanten',
      NEW.quelle_art, NEW.quelle_id USING ERRCODE = 'foreign_key_violation';
  END IF;

  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1 AND mandant_id = $2)',
    NEW.ziel_art::text)
    INTO v_ok USING NEW.ziel_id, NEW.mandant_id;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'bezug: Ziel %/% existiert nicht im Mandanten',
      NEW.ziel_art, NEW.ziel_id USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN NEW;
END $$;

CREATE CONSTRAINT TRIGGER bezug_ziel_pruefen
  AFTER INSERT OR UPDATE ON bezug
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION immos_sec.bezug_ziel_pruefen();

-- ---------------------------------------------------------------------------
-- 11 · Invarianten als pruefbare Funktionen (Job, nicht Constraint)
-- ---------------------------------------------------------------------------
-- Bewusst keine Constraints: Bruchteilseigentum wird zeilenweise aufgebaut,
-- eine Zwischenzeile mit Summe 0,5 ist waehrend der Transaktion legitim. Der
-- Job laeuft nach jedem Onboarding und naechtlich; Verstoesse werden zu
-- Vorschlaegen der Kategorie `stammdaten`.

-- INV: Eigentumsanteile je Einheit summieren an jedem Tag auf 1.
CREATE OR REPLACE FUNCTION immos_sec.pruef_eigentumsanteile(p_mandant uuid)
  RETURNS TABLE (einheit_id uuid, stichtag date, summe numeric)
  LANGUAGE sql STABLE
AS $$
  WITH grenzen AS (
    SELECT DISTINCT r.kontext_id AS einheit_id, r.gueltig_von AS stichtag
      FROM partei_rolle r
     WHERE r.mandant_id = p_mandant
       AND r.rolle = 'eigentuemer' AND r.kontext_art = 'einheit'
  )
  SELECT g.einheit_id, g.stichtag, sum(r.anteil)
    FROM grenzen g
    JOIN partei_rolle r
      ON r.kontext_id = g.einheit_id
     AND r.rolle = 'eigentuemer' AND r.kontext_art = 'einheit'
     AND r.mandant_id = p_mandant
     AND r.gueltigkeit @> g.stichtag
   GROUP BY g.einheit_id, g.stichtag
  HAVING sum(r.anteil) <> 1;
$$;

-- INV: Summe der MEA je Objekt ergibt den Gesamtwert (1000/1000 o. Ae.).
CREATE OR REPLACE FUNCTION immos_sec.pruef_mea_summe(p_mandant uuid, p_stichtag date)
  RETURNS TABLE (objekt_id uuid, summe numeric)
  LANGUAGE sql STABLE
AS $$
  SELECT e.objekt_id, sum(b.wert)
    FROM einheit_bezugswert b
    JOIN einheit e ON e.id = b.einheit_id
   WHERE b.mandant_id = p_mandant
     AND b.art = 'mea'
     AND b.gueltigkeit @> p_stichtag
   GROUP BY e.objekt_id;
$$;

-- INV: Keine Luecke in der Nutzungshistorie einer Einheit (Leerstand zaehlt mit).
-- Der Ausschluss-Constraint verhindert Ueberlappungen, aber nicht Luecken —
-- und eine Luecke bedeutet nicht umgelegte Kosten. Deshalb dieser Job.
CREATE OR REPLACE FUNCTION immos_sec.pruef_nutzungsluecken(p_mandant uuid)
  RETURNS TABLE (einheit_id uuid, luecke_von date, luecke_bis date)
  LANGUAGE sql STABLE
AS $$
  WITH folge AS (
    SELECT n.einheit_id,
           n.gueltig_von,
           n.gueltig_bis,
           lag(n.gueltig_bis) OVER (
             PARTITION BY n.einheit_id ORDER BY n.gueltig_von
           ) AS vorheriges_ende
      FROM nutzungszeitraum n
     WHERE n.mandant_id = p_mandant
  )
  SELECT f.einheit_id,
         (f.vorheriges_ende + 1)::date,
         (f.gueltig_von - 1)::date
    FROM folge f
   WHERE f.vorheriges_ende IS NOT NULL
     AND f.gueltig_von > f.vorheriges_ende + 1;
$$;

-- INV: Fremdgeld liegt nie auf einem Eigenkonto (MaBV).
CREATE OR REPLACE FUNCTION immos_sec.pruef_fremdgeldtrennung(p_mandant uuid)
  RETURNS TABLE (buchung_id uuid, journal_nr integer, befund text)
  LANGUAGE sql STABLE
AS $$
  SELECT b.id, b.journal_nr, 'Kautionskonto in Sammelbuchung'
    FROM buchung b
    JOIN buchungszeile z ON z.buchung_id = b.id
    JOIN konto k ON k.id = z.konto_id
   WHERE b.mandant_id = p_mandant
     AND k.art = 'kaution'
     AND EXISTS (
       SELECT 1 FROM buchungszeile z2
         JOIN konto k2 ON k2.id = z2.konto_id
        WHERE z2.buchung_id = b.id AND k2.art NOT IN ('kaution', 'bank', 'forderung')
     );
$$;

-- ---------------------------------------------------------------------------
-- 12 · DSGVO: Pseudonymisierung statt Loeschung, wo Aufbewahrung gilt
-- ---------------------------------------------------------------------------
-- Art. 17 DSGVO trifft auf § 147 AO. Aufloesung: buchungsrelevante Daten
-- bleiben, die personenbezogenen Merkmale werden an der Stelle ersetzt, an der
-- sie stehen. Der Vorgang ist selbst ein Audit-Ereignis — Loeschen ohne
-- Protokoll waere gegenueber der Aufsicht nicht nachweisbar.

CREATE OR REPLACE FUNCTION immos_sec.partei_pseudonymisieren(
  p_partei uuid, p_akteur text, p_akteur_name text
) RETURNS void
  LANGUAGE plpgsql
AS $$
DECLARE v_mandant uuid; v_sperre date; v_alt jsonb;
BEGIN
  SELECT mandant_id, loeschsperre_bis,
         jsonb_build_object('name', name, 'email', email, 'telefon', telefon)
    INTO v_mandant, v_sperre, v_alt
    FROM partei WHERE id = p_partei;

  IF v_sperre IS NOT NULL AND v_sperre > current_date THEN
    RAISE EXCEPTION 'Loeschsperre bis % — Pseudonymisierung erst danach', v_sperre
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE partei
     SET name    = 'Geloescht ' || left(p_partei::text, 8),
         email   = NULL, telefon = NULL, strasse = NULL, plz = NULL,
         iban    = NULL, anrede  = NULL,
         pseudonymisiert_am = now()
   WHERE id = p_partei;

  INSERT INTO audit_ereignis (
    mandant_id, akteur_art, akteur_id, akteur_name, aktion,
    entitaet, entitaet_id, vorher, nachher, legitimation, hash
  ) VALUES (
    v_mandant, 'mensch', p_akteur, p_akteur_name, 'partei.pseudonymisiert',
    'partei', p_partei, v_alt, '{"pseudonymisiert": true}'::jsonb,
    'gesetzlich', 'wird-vom-trigger-gesetzt'
  );
END $$;

-- ---------------------------------------------------------------------------
-- 13 · Standardrechte
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION immos_sec.mandant()               TO immos_app, immos_dienst;
GRANT EXECUTE ON FUNCTION immos_sec.objekt_sichtbar(uuid)   TO immos_app, immos_dienst;
GRANT EXECUTE ON FUNCTION immos_sec.partei_pseudonymisieren(uuid, text, text) TO immos_dienst;
REVOKE ALL ON immos_sec.audit_anker FROM immos_app, immos_dienst;
