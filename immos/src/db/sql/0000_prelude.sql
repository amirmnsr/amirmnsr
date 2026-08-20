-- ===========================================================================
-- ImmOS · Prelude — laeuft VOR der Drizzle-Migration
-- ===========================================================================
-- Erweiterungen und Rollen muessen existieren, bevor das Schema angelegt wird:
-- gin_trgm_ops wird von einem Index gebraucht, die Rollen von jeder Policy.
-- ===========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid, digest
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- EXCLUDE mit uuid = und range &&
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- Dublettensuche auf Namen

-- Keine dieser Rollen hat BYPASSRLS. Auch der Tabelleneigentuemer ist durch
-- FORCE ROW LEVEL SECURITY gebunden (siehe 0002_guards.sql).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'immos_owner') THEN
    CREATE ROLE immos_owner NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'immos_app') THEN
    CREATE ROLE immos_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'immos_dienst') THEN
    CREATE ROLE immos_dienst NOLOGIN;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Sitzungskontext — von jeder RLS-Policy aufgerufen, muss zuerst existieren
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS immos_sec;
REVOKE ALL ON SCHEMA immos_sec FROM PUBLIC;
GRANT USAGE ON SCHEMA immos_sec TO immos_app, immos_dienst;

-- Der aktuelle Mandant. Fehlt der Kontext, liefert die Funktion NULL und JEDE
-- Policy schlaegt fehl (NULL = NULL ist nicht true). "Kein Mandant gesetzt"
-- bedeutet also "keine Zeile sichtbar", nicht "alle Zeilen sichtbar".
-- Das ist die wichtigste Einzeleigenschaft des gesamten RLS-Entwurfs.
CREATE OR REPLACE FUNCTION immos_sec.mandant() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT nullif(current_setting('immos.mandant_id', true), '')::uuid
$$;

-- Objektbezogene Sichtbarkeit fuer Rollen mit Teilbestand (Beirat, Eigentuemer
-- im Portal, externer Buchhalter). Leerer Scope = '*' = ganzer Mandant.
CREATE OR REPLACE FUNCTION immos_sec.objekt_sichtbar(p_objekt uuid) RETURNS boolean
  LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT coalesce(nullif(current_setting('immos.objekt_scope', true), ''), '*') = '*'
      OR p_objekt IS NULL
      OR p_objekt::text = ANY (
           string_to_array(current_setting('immos.objekt_scope', true), ',')
         )
$$;
