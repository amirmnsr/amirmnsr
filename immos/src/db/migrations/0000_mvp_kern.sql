CREATE TYPE "public"."abgrenzungsprinzip" AS ENUM('leistung', 'abfluss');--> statement-breakpoint
CREATE TYPE "public"."akteur_art" AS ENUM('mensch', 'agent', 'system', 'extern');--> statement-breakpoint
CREATE TYPE "public"."anpassungsart" AS ENUM('vergleichsmiete', 'index', 'staffel', 'umsatz', 'keine');--> statement-breakpoint
CREATE TYPE "public"."autonomiestufe" AS ENUM('s0', 's1', 's2', 's3');--> statement-breakpoint
CREATE TYPE "public"."beleg_format" AS ENUM('xrechnung_ubl', 'xrechnung_cii', 'zugferd', 'pdf_ocr', 'papier_scan', 'manuell');--> statement-breakpoint
CREATE TYPE "public"."bezug_entitaet" AS ENUM('objekt', 'einheit', 'partei', 'vertrag', 'nutzungszeitraum', 'buchung', 'buchungszeile', 'sollstellung', 'eingangsrechnung', 'bankumsatz', 'dokument', 'frist', 'vorschlag', 'entscheidung', 'umlageregel', 'periode', 'buchungskreis');--> statement-breakpoint
CREATE TYPE "public"."bezug_rolle" AS ENUM('beleg', 'nachweis', 'anlage', 'evidenz', 'betrifft', 'dublette_von', 'ersetzt', 'storniert', 'ursache', 'zugangsnachweis', 'vollmacht', 'beschlussgrundlage');--> statement-breakpoint
CREATE TYPE "public"."bezugswert_art" AS ENUM('wohnflaeche', 'nutzflaeche', 'heizflaeche', 'mea', 'personen', 'einheitenzahl', 'stimmen', 'co2_kennwert');--> statement-breakpoint
CREATE TYPE "public"."bezugswert_quelle" AS ENUM('aufmass', 'teilungserklaerung', 'bauplan', 'beschluss', 'meldung', 'schaetzung', 'migration');--> statement-breakpoint
CREATE TYPE "public"."buchungskreis_art" AS ENUM('gdwe', 'eigentuemer', 'verwalter');--> statement-breakpoint
CREATE TYPE "public"."buchungsquelle" AS ENUM('mensch', 'agent', 'regel', 'import_camt', 'import_datev', 'migration');--> statement-breakpoint
CREATE TYPE "public"."dokument_art" AS ENUM('mietvertrag', 'verwaltervertrag', 'rechnung', 'angebot', 'auftrag', 'protokoll', 'beschluss', 'abrechnung', 'wirtschaftsplan', 'kontoauszug', 'gutachten', 'pruefnachweis', 'korrespondenz', 'zustellnachweis', 'foto', 'plan', 'teilungserklaerung', 'versicherung', 'sonstiges');--> statement-breakpoint
CREATE TYPE "public"."ea_klasse" AS ENUM('einnahme', 'ausgabe', 'neutral', 'vermoegen');--> statement-breakpoint
CREATE TYPE "public"."einheit_typ" AS ENUM('wohnung', 'gewerbe', 'stellplatz', 'garage', 'keller', 'lager', 'dachboden', 'sondernutzung');--> statement-breakpoint
CREATE TYPE "public"."entscheidung_art" AS ENUM('zustimmen', 'aendern_zustimmen', 'ablehnen', 'delegieren', 'zurueckstellen');--> statement-breakpoint
CREATE TYPE "public"."frist_anker" AS ENUM('zustellung', 'ereignis', 'beschluss', 'abnahme', 'periodenende', 'vertragsbeginn', 'faelligkeit', 'manuell');--> statement-breakpoint
CREATE TYPE "public"."frist_art" AS ENUM('gesetzlich', 'vertraglich', 'behoerdlich', 'gerichtlich', 'selbst_gesetzt');--> statement-breakpoint
CREATE TYPE "public"."frist_status" AS ENUM('laufend', 'vorwarnung', 'kritisch', 'gehemmt', 'gewahrt', 'versaeumt', 'entfallen');--> statement-breakpoint
CREATE TYPE "public"."haftung_typ" AS ENUM('gesamtschuldnerisch', 'anteilig', 'keine');--> statement-breakpoint
CREATE TYPE "public"."heizkv_relevanz" AS ENUM('keine', 'heizung', 'warmwasser', 'verbunden');--> statement-breakpoint
CREATE TYPE "public"."kondition_art" AS ENUM('miete_kalt', 'bk_vorauszahlung', 'hk_vorauszahlung', 'stellplatz', 'zuschlag_moebliert', 'zuschlag_untermiete', 'hausgeld_vorschuss', 'ruecklage_vorschuss', 'kaution');--> statement-breakpoint
CREATE TYPE "public"."kontoart" AS ENUM('ertrag', 'aufwand', 'forderung', 'verbindlichkeit', 'bank', 'kasse', 'ruecklage', 'kaution', 'abgrenzung', 'kapital', 'verrechnung');--> statement-breakpoint
CREATE TYPE "public"."legitimation" AS ENUM('entscheidung', 'vier_augen', 'autonomie_regel', 'gesetzlich', 'beschluss', 'vollmacht', 'migration');--> statement-breakpoint
CREATE TYPE "public"."nutzungsart" AS ENUM('miete', 'leerstand', 'eigennutzung', 'sanierung', 'gewerblich_eigen');--> statement-breakpoint
CREATE TYPE "public"."op_status" AS ENUM('offen', 'teilbezahlt', 'bezahlt', 'storniert', 'ausgebucht');--> statement-breakpoint
CREATE TYPE "public"."p35a_kategorie" AS ENUM('keine', 'haushaltsnah', 'handwerker');--> statement-breakpoint
CREATE TYPE "public"."partei_typ" AS ENUM('natuerlich', 'juristisch');--> statement-breakpoint
CREATE TYPE "public"."periode_status" AS ENUM('offen', 'abgestimmt', 'festgeschrieben', 'beschlossen');--> statement-breakpoint
CREATE TYPE "public"."rechnung_status" AS ENUM('eingegangen', 'formal_geprueft', 'formal_mangel', 'sachlich_geprueft', 'freigabe_erforderlich', 'beschluss_erforderlich', 'freigegeben', 'zahlung_gesperrt', 'zahlung_beauftragt', 'bezahlt', 'abgelehnt', 'reklamation');--> statement-breakpoint
CREATE TYPE "public"."rechtsnatur" AS ENUM('prozessschritt', 'wissenserklaerung', 'willenserklaerung', 'gestaltungsrecht');--> statement-breakpoint
CREATE TYPE "public"."rolle_typ" AS ENUM('mieter', 'untermieter', 'eigentuemer', 'beirat', 'verwalter', 'dienstleister', 'kreditor', 'versorger', 'versicherer', 'behoerde', 'bank', 'mitarbeiter', 'interessent', 'bevollmaechtigter');--> statement-breakpoint
CREATE TYPE "public"."rollen_kontext" AS ENUM('mandant', 'buchungskreis', 'objekt', 'einheit', 'vertrag');--> statement-breakpoint
CREATE TYPE "public"."schluessel_typ" AS ENUM('flaeche', 'personen', 'einheiten', 'mea', 'verbrauch', 'umsatz', 'fest', 'direktzuordnung', 'nicht_umlegen');--> statement-breakpoint
CREATE TYPE "public"."soll_art" AS ENUM('miete_kalt', 'bk_vorauszahlung', 'hk_vorauszahlung', 'stellplatz', 'hausgeld', 'ruecklage', 'sonderumlage', 'nachzahlung', 'abrechnungsspitze', 'mahngebuehr', 'zinsen', 'kaution');--> statement-breakpoint
CREATE TYPE "public"."vertrag_art" AS ENUM('miete_wohnraum', 'miete_gewerbe', 'miete_stellplatz', 'verwaltervertrag_weg', 'verwaltervertrag_miete', 'verwaltervertrag_sev', 'dienstleistung', 'wartung', 'versorgung', 'versicherung', 'darlehen');--> statement-breakpoint
CREATE TYPE "public"."verwaltungsart" AS ENUM('miete', 'sev', 'weg', 'gewerbe');--> statement-breakpoint
CREATE TYPE "public"."vorschlag_kategorie" AS ENUM('zahlung', 'buchung', 'kommunikation', 'beauftragung', 'frist', 'vertrag', 'abrechnung', 'eskalation', 'stammdaten', 'beschluss');--> statement-breakpoint
CREATE TYPE "public"."vorschlag_status" AS ENUM('erzeugt', 'vorgelegt', 'zugestimmt', 'geaendert_zugestimmt', 'abgelehnt', 'abgelaufen', 'eskaliert', 'ausgefuehrt', 'teilausgefuehrt', 'fehlgeschlagen', 'zurueckgenommen');--> statement-breakpoint
CREATE TYPE "public"."zuordnung_status" AS ENUM('neu', 'vorgeschlagen', 'zugeordnet', 'klaerfall', 'ignoriert', 'rueckbuchung');--> statement-breakpoint
CREATE TYPE "public"."zustellkanal" AS ENUM('email', 'portal', 'post_einfach', 'einwurf_einschreiben', 'bote_mit_zeuge', 'pzu', 'uebergabe_persoenlich');--> statement-breakpoint
CREATE TABLE "buchungskreis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"art" "buchungskreis_art" NOT NULL,
	"bezeichnung" text NOT NULL,
	"traeger_partei_id" uuid,
	"fremdgeld" boolean NOT NULL,
	"wirtschaftsjahr_beginn" text DEFAULT '01-01' NOT NULL,
	"steuernummer" text,
	"aktiv" boolean DEFAULT true NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "buchungskreis_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "buchungskreis_fremdgeld_chk" CHECK ((art = 'verwalter') = (fremdgeld = false))
);
--> statement-breakpoint
ALTER TABLE "buchungskreis" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "einheit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"nummer" text NOT NULL,
	"lage" text NOT NULL,
	"typ" "einheit_typ" NOT NULL,
	"zimmer" numeric(4, 1),
	"ust_option" boolean DEFAULT false NOT NULL,
	"stillgelegt_am" date,
	"entstanden_aus" uuid,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "einheit_mandant_id_uniq" UNIQUE("mandant_id","id")
);
--> statement-breakpoint
ALTER TABLE "einheit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "einheit_bezugswert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"einheit_id" uuid NOT NULL,
	"art" "bezugswert_art" NOT NULL,
	"wert" numeric(14, 4) NOT NULL,
	"quelle" "bezugswert_quelle" NOT NULL,
	"beschluss_ref" uuid,
	"bemerkung" text,
	"gueltig_von" date NOT NULL,
	"gueltig_bis" date,
	"gueltigkeit" daterange GENERATED ALWAYS AS (daterange(gueltig_von, CASE WHEN gueltig_bis IS NULL THEN NULL ELSE (gueltig_bis + 1) END, '[)')) STORED NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "einheit_bezugswert_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "einheit_bezugswert_wert_chk" CHECK (wert >= 0),
	CONSTRAINT "einheit_bezugswert_zeitraum_chk" CHECK (gueltig_bis IS NULL OR gueltig_bis >= gueltig_von)
);
--> statement-breakpoint
ALTER TABLE "einheit_bezugswert" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mandant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kurz" text NOT NULL,
	"mail_domain" text NOT NULL,
	"sitz" text NOT NULL,
	"ust_id_nr" text,
	"gewerbeerlaubnis_az" text,
	"zertifikat_26a_bis" date,
	"wirtschaftsjahr_beginn" text DEFAULT '01-01' NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid
);
--> statement-breakpoint
ALTER TABLE "mandant" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "nutzungszeitraum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"einheit_id" uuid NOT NULL,
	"vertrag_id" uuid,
	"art" "nutzungsart" NOT NULL,
	"teilflaeche" text DEFAULT '' NOT NULL,
	"flaechenanteil" numeric(6, 5) DEFAULT '1' NOT NULL,
	"ablesung_einzug" jsonb,
	"ablesung_auszug" jsonb,
	"gueltig_von" date NOT NULL,
	"gueltig_bis" date,
	"gueltigkeit" daterange GENERATED ALWAYS AS (daterange(gueltig_von, CASE WHEN gueltig_bis IS NULL THEN NULL ELSE (gueltig_bis + 1) END, '[)')) STORED NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "nutzungszeitraum_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "nutzungszeitraum_leerstand_chk" CHECK ((art = 'miete') = (vertrag_id IS NOT NULL)),
	CONSTRAINT "nutzungszeitraum_zeitraum_chk" CHECK (gueltig_bis IS NULL OR gueltig_bis >= gueltig_von)
);
--> statement-breakpoint
ALTER TABLE "nutzungszeitraum" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "objekt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"buchungskreis_id" uuid NOT NULL,
	"nummer" text NOT NULL,
	"bezeichnung" text NOT NULL,
	"strasse" text NOT NULL,
	"plz" text NOT NULL,
	"ort" text NOT NULL,
	"ags" text,
	"bundesland" text NOT NULL,
	"verwaltungsarten" "verwaltungsart"[] NOT NULL,
	"baujahr" integer,
	"denkmalschutz" boolean DEFAULT false NOT NULL,
	"abrechnungsbeginn" text DEFAULT '01-01' NOT NULL,
	"verwaltungsbeginn" date NOT NULL,
	"verwaltungsende" date,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "objekt_mandant_id_uniq" UNIQUE("mandant_id","id")
);
--> statement-breakpoint
ALTER TABLE "objekt" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "partei" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"typ" "partei_typ" NOT NULL,
	"name" text NOT NULL,
	"anrede" text,
	"email" text,
	"telefon" text,
	"strasse" text,
	"plz" text,
	"ort" text,
	"land" text DEFAULT 'DE' NOT NULL,
	"iban" text,
	"ust_id_nr" text,
	"kreditor_nr" text,
	"freistellung_48b_bis" date,
	"auth_subject" text,
	"loeschsperre_bis" date,
	"pseudonymisiert_am" timestamp with time zone,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "partei_mandant_id_uniq" UNIQUE("mandant_id","id")
);
--> statement-breakpoint
ALTER TABLE "partei" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "partei_rolle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"partei_id" uuid NOT NULL,
	"rolle" "rolle_typ" NOT NULL,
	"kontext_art" "rollen_kontext" NOT NULL,
	"kontext_id" uuid,
	"anteil" numeric(12, 9),
	"haftung" "haftung_typ" DEFAULT 'gesamtschuldnerisch' NOT NULL,
	"zustellweg" "zustellkanal",
	"zustellung_zustimmung_am" date,
	"berechtigung" text,
	"gueltig_von" date NOT NULL,
	"gueltig_bis" date,
	"gueltigkeit" daterange GENERATED ALWAYS AS (daterange(gueltig_von, CASE WHEN gueltig_bis IS NULL THEN NULL ELSE (gueltig_bis + 1) END, '[)')) STORED NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "partei_rolle_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "partei_rolle_zeitraum_chk" CHECK (gueltig_bis IS NULL OR gueltig_bis >= gueltig_von),
	CONSTRAINT "partei_rolle_anteil_chk" CHECK (anteil IS NULL OR (anteil > 0 AND anteil <= 1))
);
--> statement-breakpoint
ALTER TABLE "partei_rolle" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vertrag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"buchungskreis_id" uuid NOT NULL,
	"objekt_id" uuid,
	"art" "vertrag_art" NOT NULL,
	"nummer" text NOT NULL,
	"beginn" date NOT NULL,
	"ende_vereinbart" date,
	"kuendigung_eingang_am" date,
	"beendet_zum" date,
	"rueckgabe_am" date,
	"kuendigungsfrist_monate" smallint,
	"verlaengerung_automatisch" boolean DEFAULT false NOT NULL,
	"anpassungsart" "anpassungsart" DEFAULT 'keine' NOT NULL,
	"anpassung_parameter" jsonb,
	"letzte_anpassung_am" date,
	"ust_pflichtig" boolean DEFAULT false NOT NULL,
	"klauseln" jsonb,
	"vollmacht" jsonb,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "vertrag_mandant_id_uniq" UNIQUE("mandant_id","id")
);
--> statement-breakpoint
ALTER TABLE "vertrag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vertrag_kondition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"vertrag_id" uuid NOT NULL,
	"art" "kondition_art" NOT NULL,
	"betrag_cent" bigint NOT NULL,
	"ust_satz" numeric(4, 2) DEFAULT '0' NOT NULL,
	"grundlage" text,
	"zustellung_ref" uuid,
	"gueltig_von" date NOT NULL,
	"gueltig_bis" date,
	"gueltigkeit" daterange GENERATED ALWAYS AS (daterange(gueltig_von, CASE WHEN gueltig_bis IS NULL THEN NULL ELSE (gueltig_bis + 1) END, '[)')) STORED NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "vertrag_kondition_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "vertrag_kondition_zeitraum_chk" CHECK (gueltig_bis IS NULL OR gueltig_bis >= gueltig_von)
);
--> statement-breakpoint
ALTER TABLE "vertrag_kondition" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bankumsatz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"buchungskreis_id" uuid NOT NULL,
	"konto_iban" text NOT NULL,
	"buchungstag" date NOT NULL,
	"valuta" date NOT NULL,
	"betrag_cent" bigint NOT NULL,
	"gegen_iban" text,
	"gegen_name" text,
	"verwendungszweck" text,
	"end_to_end_id" text,
	"mandatsreferenz" text,
	"btc_family" text,
	"btc_subfamily" text,
	"camt_raw" jsonb,
	"import_hash" text NOT NULL,
	"status" "zuordnung_status" DEFAULT 'neu' NOT NULL,
	"offen_cent" bigint NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "bankumsatz_mandant_id_uniq" UNIQUE("mandant_id","id")
);
--> statement-breakpoint
ALTER TABLE "bankumsatz" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "buchung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"buchungskreis_id" uuid NOT NULL,
	"jahr" smallint NOT NULL,
	"journal_nr" integer NOT NULL,
	"belegdatum" date NOT NULL,
	"buchungsdatum" date NOT NULL,
	"belegfeld" text,
	"buchungstext" text NOT NULL,
	"quelle" "buchungsquelle" NOT NULL,
	"storno_von_id" uuid,
	"agent_id" text,
	"modell_version" text,
	"ki_konfidenz" numeric(4, 3),
	"prompt_hash" text,
	"vorschlag_id" uuid,
	"entscheidung_id" uuid,
	"zeilen_digest" text NOT NULL,
	"hash_prev" text,
	"hash" text NOT NULL,
	"erfasst_von" uuid,
	"erfasst_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buchung_mandant_id_uniq" UNIQUE("mandant_id","id")
);
--> statement-breakpoint
ALTER TABLE "buchung" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "buchungszeile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"buchung_id" uuid NOT NULL,
	"zeilen_nr" smallint NOT NULL,
	"konto_id" uuid NOT NULL,
	"sh" text NOT NULL,
	"betrag_cent" bigint NOT NULL,
	"steuerbetrag_cent" bigint DEFAULT 0 NOT NULL,
	"ust_satz" numeric(4, 2) DEFAULT '0' NOT NULL,
	"reverse_charge" boolean DEFAULT false NOT NULL,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"vertrag_id" uuid,
	"partei_id" uuid,
	"leistung_von" date,
	"leistung_bis" date,
	"umlagejahr" smallint,
	"finanzierung" text,
	"p35a_lohnanteil_cent" bigint,
	"co2_anteil_vermieter_cent" bigint,
	"kostenstelle" text,
	CONSTRAINT "buchungszeile_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "buchungszeile_sh_chk" CHECK (sh IN ('S', 'H')),
	CONSTRAINT "buchungszeile_betrag_chk" CHECK (betrag_cent > 0),
	CONSTRAINT "buchungszeile_leistungszeitraum_chk" CHECK (leistung_bis IS NULL OR leistung_von IS NULL OR leistung_bis >= leistung_von)
);
--> statement-breakpoint
ALTER TABLE "buchungszeile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "eingangsrechnung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"buchungskreis_id" uuid NOT NULL,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"postfach_adresse" text,
	"format" "beleg_format" NOT NULL,
	"kreditor_partei_id" uuid,
	"kreditor_name_roh" text NOT NULL,
	"rechnungs_nr" text NOT NULL,
	"rechnungsdatum" date NOT NULL,
	"leistung_von" date,
	"leistung_bis" date,
	"faellig_am" date NOT NULL,
	"skonto_bis" date,
	"skonto_prozent" numeric(5, 2),
	"brutto_cent" bigint NOT NULL,
	"netto_cent" bigint NOT NULL,
	"ust_cent" bigint NOT NULL,
	"iban" text,
	"restbetrag_cent" bigint NOT NULL,
	"status" "rechnung_status" DEFAULT 'eingegangen' NOT NULL,
	"strukturiert" jsonb,
	"pruefung" jsonb,
	"extraktions_konfidenz" numeric(4, 3),
	"duplikat_von_id" uuid,
	"iban_abweichung" boolean DEFAULT false NOT NULL,
	"bauabzugsteuer_pflicht" boolean DEFAULT false NOT NULL,
	"beschluss_ref" uuid,
	"auftrag_ref" uuid,
	"eingang_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "eingangsrechnung_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "eingangsrechnung_summe_chk" CHECK (brutto_cent = netto_cent + ust_cent),
	CONSTRAINT "eingangsrechnung_rest_chk" CHECK (restbetrag_cent BETWEEN 0 AND brutto_cent)
);
--> statement-breakpoint
ALTER TABLE "eingangsrechnung" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "konto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"nummer" text NOT NULL,
	"bezeichnung" text NOT NULL,
	"art" "kontoart" NOT NULL,
	"ea_klasse" "ea_klasse" NOT NULL,
	"betrkv_ziffer" smallint,
	"umlagefaehig_miete" boolean DEFAULT false NOT NULL,
	"umlagefaehig_weg" boolean DEFAULT false NOT NULL,
	"heizkv_relevanz" "heizkv_relevanz" DEFAULT 'keine' NOT NULL,
	"abgrenzungsprinzip" "abgrenzungsprinzip" DEFAULT 'leistung' NOT NULL,
	"p35a_kategorie" "p35a_kategorie" DEFAULT 'keine' NOT NULL,
	"anlage_v_zeile" text,
	"aktivierungspruefung" boolean DEFAULT false NOT NULL,
	"co2_relevant" boolean DEFAULT false NOT NULL,
	"vorsteuerfaehig" boolean DEFAULT false NOT NULL,
	"datev_konto" text,
	"standard_schluessel" "schluessel_typ",
	"gesperrt_ab" date,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "konto_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "konto_betrkv_chk" CHECK (betrkv_ziffer IS NULL OR (betrkv_ziffer BETWEEN 1 AND 17)),
	CONSTRAINT "konto_umlage_begruendet_chk" CHECK (umlagefaehig_miete = false OR betrkv_ziffer IS NOT NULL OR heizkv_relevanz <> 'keine')
);
--> statement-breakpoint
ALTER TABLE "konto" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "periode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"buchungskreis_id" uuid NOT NULL,
	"jahr" smallint NOT NULL,
	"monat" smallint NOT NULL,
	"status" "periode_status" DEFAULT 'offen' NOT NULL,
	"ust_va_abgegeben_am" date,
	"gesperrt_am" timestamp with time zone,
	"gesperrt_von" uuid,
	"journal_nr_naechste" integer,
	"hash_letzter" text,
	"anker_signatur" text,
	"anker_am" timestamp with time zone,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "periode_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "periode_monat_chk" CHECK (monat BETWEEN 0 AND 12),
	CONSTRAINT "periode_anker_chk" CHECK ((monat = 0) = (journal_nr_naechste IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "periode" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sollstellung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"buchungskreis_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"einheit_id" uuid,
	"vertrag_id" uuid,
	"schuldner_partei_id" uuid NOT NULL,
	"art" "soll_art" NOT NULL,
	"periode" text NOT NULL,
	"betrag_cent" bigint NOT NULL,
	"faellig_am" date NOT NULL,
	"restbetrag_cent" bigint NOT NULL,
	"status" "op_status" DEFAULT 'offen' NOT NULL,
	"mahnstufe" smallint DEFAULT 0 NOT NULL,
	"letzter_mahnlauf_am" date,
	"verzug_ab" date,
	"verjaehrung_am" date,
	"tilgungssperre" boolean DEFAULT false NOT NULL,
	"grundlage_ref" uuid,
	"buchung_id" uuid,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "sollstellung_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "sollstellung_rest_chk" CHECK (restbetrag_cent BETWEEN 0 AND betrag_cent),
	CONSTRAINT "sollstellung_mahnstufe_chk" CHECK (mahnstufe BETWEEN 0 AND 3)
);
--> statement-breakpoint
ALTER TABLE "sollstellung" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "umlageregel" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"konto_id" uuid NOT NULL,
	"schluessel" "schluessel_typ" NOT NULL,
	"grundkosten_prozent" smallint,
	"vorwegabzug" jsonb,
	"zeitanteilig" boolean DEFAULT true NOT NULL,
	"ist_gesetzlicher_default" boolean DEFAULT true NOT NULL,
	"beschluss_ref" uuid,
	"vereinbarung_ref" uuid,
	"risikoscore" smallint,
	"gueltig_von" date NOT NULL,
	"gueltig_bis" date,
	"gueltigkeit" daterange GENERATED ALWAYS AS (daterange(gueltig_von, CASE WHEN gueltig_bis IS NULL THEN NULL ELSE (gueltig_bis + 1) END, '[)')) STORED NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "umlageregel_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "umlageregel_rechtsgrund_chk" CHECK (ist_gesetzlicher_default = true OR beschluss_ref IS NOT NULL OR vereinbarung_ref IS NOT NULL),
	CONSTRAINT "umlageregel_heizkv_chk" CHECK (grundkosten_prozent IS NULL OR (grundkosten_prozent BETWEEN 30 AND 50)),
	CONSTRAINT "umlageregel_zeitraum_chk" CHECK (gueltig_bis IS NULL OR gueltig_bis >= gueltig_von)
);
--> statement-breakpoint
ALTER TABLE "umlageregel" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "zahlungszuordnung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"bankumsatz_id" uuid NOT NULL,
	"sollstellung_id" uuid,
	"eingangsrechnung_id" uuid,
	"betrag_cent" bigint NOT NULL,
	"tilgungsrang" smallint DEFAULT 1 NOT NULL,
	"konfidenz" numeric(4, 3),
	"merkmale" jsonb,
	"modell_version" text,
	"buchung_id" uuid,
	"vorschlag_id" uuid,
	"aufgehoben_am" timestamp with time zone,
	"aufgehoben_grund" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "zahlungszuordnung_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "zahlungszuordnung_betrag_chk" CHECK (betrag_cent > 0),
	CONSTRAINT "zahlungszuordnung_ziel_chk" CHECK ((sollstellung_id IS NOT NULL) <> (eingangsrechnung_id IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "zahlungszuordnung" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_ereignis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"am" timestamp with time zone DEFAULT now() NOT NULL,
	"folge_nr" integer NOT NULL,
	"akteur_art" "akteur_art" NOT NULL,
	"akteur_id" text NOT NULL,
	"akteur_name" text NOT NULL,
	"akteur_version" text,
	"aktion" text NOT NULL,
	"entitaet" "bezug_entitaet" NOT NULL,
	"entitaet_id" uuid NOT NULL,
	"objekt_id" uuid,
	"vorher" jsonb,
	"nachher" jsonb,
	"legitimation" "legitimation" NOT NULL,
	"vorschlag_id" uuid,
	"entscheidung_id" uuid,
	"plan_aktion_id" text,
	"ausgefuehrter_plan_hash" text,
	"idempotenz_schluessel" text,
	"ergebnis" text,
	"fehler" text,
	"request_id" text,
	"hash_prev" text,
	"hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_ereignis" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bezug" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"quelle_art" "bezug_entitaet" NOT NULL,
	"quelle_id" uuid NOT NULL,
	"ziel_art" "bezug_entitaet" NOT NULL,
	"ziel_id" uuid NOT NULL,
	"rolle" "bezug_rolle" NOT NULL,
	"zitat" text,
	"fundstelle" text,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "bezug_kein_selbstbezug_chk" CHECK (NOT (quelle_art = ziel_art AND quelle_id = ziel_id))
);
--> statement-breakpoint
ALTER TABLE "bezug" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dokument" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid,
	"art" "dokument_art" NOT NULL,
	"titel" text NOT NULL,
	"aktenplan" text NOT NULL,
	"dateiname" text NOT NULL,
	"mime" text NOT NULL,
	"groesse_bytes" integer NOT NULL,
	"seiten" smallint,
	"sha256" text NOT NULL,
	"blob_uri" text NOT NULL,
	"lesefassung_uri" text,
	"ist_original" boolean DEFAULT true NOT NULL,
	"ocr_text" text,
	"extraktion" jsonb,
	"eingangskanal" text,
	"eingang_pruefung" jsonb,
	"aufbewahrung_bis" date,
	"rechtlicher_halt" boolean DEFAULT false NOT NULL,
	"vertraulich" boolean DEFAULT false NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "dokument_mandant_id_uniq" UNIQUE("mandant_id","id")
);
--> statement-breakpoint
ALTER TABLE "dokument" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "entscheidung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"vorschlag_id" uuid NOT NULL,
	"stufe" smallint DEFAULT 1 NOT NULL,
	"entscheider_partei_id" uuid NOT NULL,
	"art" "entscheidung_art" NOT NULL,
	"plan_hash" text NOT NULL,
	"geaenderter_plan" jsonb,
	"geaenderter_plan_hash" text,
	"grund" text,
	"delegiert_an_partei_id" uuid,
	"dauer_sek" integer,
	"kanal" text,
	"ip_hash" text,
	"am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entscheidung_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "entscheidung_stufe_chk" CHECK (stufe IN (1, 2)),
	CONSTRAINT "entscheidung_aenderung_chk" CHECK (art <> 'aendern_zustimmen' OR geaenderter_plan_hash IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "entscheidung" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "frist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"bezeichnung" text NOT NULL,
	"art" "frist_art" NOT NULL,
	"prozess" text,
	"rechtsgrundlage" text,
	"norm_fassung" text,
	"anker_art" "frist_anker" NOT NULL,
	"anker_ref" uuid,
	"anker_am" date NOT NULL,
	"berechnung" jsonb,
	"ablauf_am" date NOT NULL,
	"vorwarnung_tage" smallint[],
	"status" "frist_status" DEFAULT 'laufend' NOT NULL,
	"eskalationsstufe" smallint DEFAULT 0 NOT NULL,
	"hemmung_von" date,
	"hemmung_bis" date,
	"zustellkanal" "zustellkanal",
	"zugang_ist" date,
	"zugang_vermutet" date,
	"nachweis_dokument_id" uuid,
	"konsequenz" text NOT NULL,
	"risiko_cent" bigint,
	"verantwortlicher_partei_id" uuid,
	"erledigt_am" timestamp with time zone,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "frist_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "frist_ablauf_chk" CHECK (ablauf_am >= anker_am)
);
--> statement-breakpoint
ALTER TABLE "frist" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vorschlag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"buchungskreis_id" uuid,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"agent_id" text NOT NULL,
	"agent_version" text NOT NULL,
	"modell_version" text NOT NULL,
	"prompt_hash" text,
	"prozess" text NOT NULL,
	"kategorie" "vorschlag_kategorie" NOT NULL,
	"titel" text NOT NULL,
	"kurzfassung" text NOT NULL,
	"begruendung" text NOT NULL,
	"plan" jsonb NOT NULL,
	"plan_hash" text NOT NULL,
	"alternativen" jsonb,
	"rechtsnatur" "rechtsnatur" NOT NULL,
	"rechtsgrundlagen" text[],
	"betrag_cent" bigint,
	"konfidenz" numeric(4, 3) NOT NULL,
	"risiko" text NOT NULL,
	"reversibel" boolean NOT NULL,
	"blast_radius" integer DEFAULT 1 NOT NULL,
	"autonomiestufe" "autonomiestufe" NOT NULL,
	"policy_entscheid" jsonb,
	"vorlage_grund" text,
	"ausfuehrung_am" timestamp with time zone,
	"entscheiden_bis" timestamp with time zone,
	"prioritaet" integer DEFAULT 0 NOT NULL,
	"zeitersparnis_minuten" smallint,
	"status" "vorschlag_status" DEFAULT 'erzeugt' NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erstellt_von" uuid,
	CONSTRAINT "vorschlag_mandant_id_uniq" UNIQUE("mandant_id","id"),
	CONSTRAINT "vorschlag_konfidenz_chk" CHECK (konfidenz BETWEEN 0 AND 1),
	CONSTRAINT "vorschlag_risiko_chk" CHECK (risiko IN ('niedrig', 'mittel', 'hoch')),
	CONSTRAINT "vorschlag_gestaltungsrecht_chk" CHECK (rechtsnatur <> 'gestaltungsrecht' OR autonomiestufe IN ('s0', 's1'))
);
--> statement-breakpoint
ALTER TABLE "vorschlag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "buchungskreis" ADD CONSTRAINT "buchungskreis_mandant_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einheit" ADD CONSTRAINT "einheit_objekt_fk" FOREIGN KEY ("mandant_id","objekt_id") REFERENCES "public"."objekt"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einheit_bezugswert" ADD CONSTRAINT "einheit_bezugswert_einheit_fk" FOREIGN KEY ("mandant_id","einheit_id") REFERENCES "public"."einheit"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutzungszeitraum" ADD CONSTRAINT "nutzungszeitraum_einheit_fk" FOREIGN KEY ("mandant_id","einheit_id") REFERENCES "public"."einheit"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutzungszeitraum" ADD CONSTRAINT "nutzungszeitraum_vertrag_fk" FOREIGN KEY ("mandant_id","vertrag_id") REFERENCES "public"."vertrag"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objekt" ADD CONSTRAINT "objekt_mandant_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objekt" ADD CONSTRAINT "objekt_buchungskreis_fk" FOREIGN KEY ("mandant_id","buchungskreis_id") REFERENCES "public"."buchungskreis"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partei" ADD CONSTRAINT "partei_mandant_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partei_rolle" ADD CONSTRAINT "partei_rolle_partei_fk" FOREIGN KEY ("mandant_id","partei_id") REFERENCES "public"."partei"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vertrag" ADD CONSTRAINT "vertrag_buchungskreis_fk" FOREIGN KEY ("mandant_id","buchungskreis_id") REFERENCES "public"."buchungskreis"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vertrag" ADD CONSTRAINT "vertrag_objekt_fk" FOREIGN KEY ("mandant_id","objekt_id") REFERENCES "public"."objekt"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vertrag_kondition" ADD CONSTRAINT "vertrag_kondition_vertrag_fk" FOREIGN KEY ("mandant_id","vertrag_id") REFERENCES "public"."vertrag"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bankumsatz" ADD CONSTRAINT "bankumsatz_buchungskreis_fk" FOREIGN KEY ("mandant_id","buchungskreis_id") REFERENCES "public"."buchungskreis"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buchung" ADD CONSTRAINT "buchung_buchungskreis_fk" FOREIGN KEY ("mandant_id","buchungskreis_id") REFERENCES "public"."buchungskreis"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buchung" ADD CONSTRAINT "buchung_storno_fk" FOREIGN KEY ("mandant_id","storno_von_id") REFERENCES "public"."buchung"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buchungszeile" ADD CONSTRAINT "buchungszeile_buchung_fk" FOREIGN KEY ("mandant_id","buchung_id") REFERENCES "public"."buchung"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buchungszeile" ADD CONSTRAINT "buchungszeile_konto_fk" FOREIGN KEY ("mandant_id","konto_id") REFERENCES "public"."konto"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buchungszeile" ADD CONSTRAINT "buchungszeile_einheit_fk" FOREIGN KEY ("mandant_id","einheit_id") REFERENCES "public"."einheit"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buchungszeile" ADD CONSTRAINT "buchungszeile_partei_fk" FOREIGN KEY ("mandant_id","partei_id") REFERENCES "public"."partei"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eingangsrechnung" ADD CONSTRAINT "eingangsrechnung_buchungskreis_fk" FOREIGN KEY ("mandant_id","buchungskreis_id") REFERENCES "public"."buchungskreis"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eingangsrechnung" ADD CONSTRAINT "eingangsrechnung_kreditor_fk" FOREIGN KEY ("mandant_id","kreditor_partei_id") REFERENCES "public"."partei"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "konto" ADD CONSTRAINT "konto_mandant_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periode" ADD CONSTRAINT "periode_buchungskreis_fk" FOREIGN KEY ("mandant_id","buchungskreis_id") REFERENCES "public"."buchungskreis"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sollstellung" ADD CONSTRAINT "sollstellung_buchungskreis_fk" FOREIGN KEY ("mandant_id","buchungskreis_id") REFERENCES "public"."buchungskreis"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sollstellung" ADD CONSTRAINT "sollstellung_objekt_fk" FOREIGN KEY ("mandant_id","objekt_id") REFERENCES "public"."objekt"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sollstellung" ADD CONSTRAINT "sollstellung_vertrag_fk" FOREIGN KEY ("mandant_id","vertrag_id") REFERENCES "public"."vertrag"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sollstellung" ADD CONSTRAINT "sollstellung_schuldner_fk" FOREIGN KEY ("mandant_id","schuldner_partei_id") REFERENCES "public"."partei"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "umlageregel" ADD CONSTRAINT "umlageregel_objekt_fk" FOREIGN KEY ("mandant_id","objekt_id") REFERENCES "public"."objekt"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "umlageregel" ADD CONSTRAINT "umlageregel_konto_fk" FOREIGN KEY ("mandant_id","konto_id") REFERENCES "public"."konto"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zahlungszuordnung" ADD CONSTRAINT "zahlungszuordnung_bankumsatz_fk" FOREIGN KEY ("mandant_id","bankumsatz_id") REFERENCES "public"."bankumsatz"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zahlungszuordnung" ADD CONSTRAINT "zahlungszuordnung_sollstellung_fk" FOREIGN KEY ("mandant_id","sollstellung_id") REFERENCES "public"."sollstellung"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zahlungszuordnung" ADD CONSTRAINT "zahlungszuordnung_rechnung_fk" FOREIGN KEY ("mandant_id","eingangsrechnung_id") REFERENCES "public"."eingangsrechnung"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_ereignis" ADD CONSTRAINT "audit_mandant_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bezug" ADD CONSTRAINT "bezug_mandant_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokument" ADD CONSTRAINT "dokument_mandant_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokument" ADD CONSTRAINT "dokument_objekt_fk" FOREIGN KEY ("mandant_id","objekt_id") REFERENCES "public"."objekt"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entscheidung" ADD CONSTRAINT "entscheidung_vorschlag_fk" FOREIGN KEY ("mandant_id","vorschlag_id") REFERENCES "public"."vorschlag"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entscheidung" ADD CONSTRAINT "entscheidung_entscheider_fk" FOREIGN KEY ("mandant_id","entscheider_partei_id") REFERENCES "public"."partei"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frist" ADD CONSTRAINT "frist_mandant_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frist" ADD CONSTRAINT "frist_objekt_fk" FOREIGN KEY ("mandant_id","objekt_id") REFERENCES "public"."objekt"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frist" ADD CONSTRAINT "frist_einheit_fk" FOREIGN KEY ("mandant_id","einheit_id") REFERENCES "public"."einheit"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "frist" ADD CONSTRAINT "frist_nachweis_fk" FOREIGN KEY ("mandant_id","nachweis_dokument_id") REFERENCES "public"."dokument"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vorschlag" ADD CONSTRAINT "vorschlag_mandant_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vorschlag" ADD CONSTRAINT "vorschlag_objekt_fk" FOREIGN KEY ("mandant_id","objekt_id") REFERENCES "public"."objekt"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vorschlag" ADD CONSTRAINT "vorschlag_buchungskreis_fk" FOREIGN KEY ("mandant_id","buchungskreis_id") REFERENCES "public"."buchungskreis"("mandant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buchungskreis_mandant_idx" ON "buchungskreis" USING btree ("mandant_id","art");--> statement-breakpoint
CREATE UNIQUE INDEX "einheit_nummer_uniq" ON "einheit" USING btree ("mandant_id","objekt_id","nummer");--> statement-breakpoint
CREATE INDEX "einheit_objekt_idx" ON "einheit" USING btree ("mandant_id","objekt_id","typ");--> statement-breakpoint
CREATE INDEX "einheit_bezugswert_lookup_idx" ON "einheit_bezugswert" USING btree ("mandant_id","einheit_id","art");--> statement-breakpoint
CREATE INDEX "einheit_bezugswert_gueltigkeit_idx" ON "einheit_bezugswert" USING gist ("gueltigkeit");--> statement-breakpoint
CREATE UNIQUE INDEX "mandant_kurz_uniq" ON "mandant" USING btree ("kurz");--> statement-breakpoint
CREATE UNIQUE INDEX "mandant_mail_domain_uniq" ON "mandant" USING btree ("mail_domain");--> statement-breakpoint
CREATE INDEX "nutzungszeitraum_einheit_idx" ON "nutzungszeitraum" USING btree ("mandant_id","einheit_id");--> statement-breakpoint
CREATE INDEX "nutzungszeitraum_vertrag_idx" ON "nutzungszeitraum" USING btree ("mandant_id","vertrag_id");--> statement-breakpoint
CREATE INDEX "nutzungszeitraum_gueltigkeit_idx" ON "nutzungszeitraum" USING gist ("gueltigkeit");--> statement-breakpoint
CREATE UNIQUE INDEX "objekt_nummer_uniq" ON "objekt" USING btree ("mandant_id","nummer");--> statement-breakpoint
CREATE INDEX "objekt_buchungskreis_idx" ON "objekt" USING btree ("mandant_id","buchungskreis_id");--> statement-breakpoint
CREATE INDEX "objekt_ort_idx" ON "objekt" USING btree ("mandant_id","plz");--> statement-breakpoint
CREATE UNIQUE INDEX "partei_auth_subject_uniq" ON "partei" USING btree ("auth_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "partei_kreditor_nr_uniq" ON "partei" USING btree ("mandant_id","kreditor_nr");--> statement-breakpoint
CREATE INDEX "partei_name_trgm_idx" ON "partei" USING gin (name gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "partei_email_idx" ON "partei" USING btree ("mandant_id","email");--> statement-breakpoint
CREATE INDEX "partei_rolle_kontext_idx" ON "partei_rolle" USING btree ("mandant_id","kontext_art","kontext_id","rolle");--> statement-breakpoint
CREATE INDEX "partei_rolle_partei_idx" ON "partei_rolle" USING btree ("mandant_id","partei_id","rolle");--> statement-breakpoint
CREATE INDEX "partei_rolle_gueltigkeit_idx" ON "partei_rolle" USING gist ("gueltigkeit");--> statement-breakpoint
CREATE UNIQUE INDEX "vertrag_nummer_uniq" ON "vertrag" USING btree ("mandant_id","nummer");--> statement-breakpoint
CREATE INDEX "vertrag_objekt_idx" ON "vertrag" USING btree ("mandant_id","objekt_id","art");--> statement-breakpoint
CREATE INDEX "vertrag_buchungskreis_idx" ON "vertrag" USING btree ("mandant_id","buchungskreis_id");--> statement-breakpoint
CREATE INDEX "vertrag_anpassung_idx" ON "vertrag" USING btree ("mandant_id","anpassungsart","letzte_anpassung_am");--> statement-breakpoint
CREATE INDEX "vertrag_kondition_lookup_idx" ON "vertrag_kondition" USING btree ("mandant_id","vertrag_id","art");--> statement-breakpoint
CREATE INDEX "vertrag_kondition_gueltigkeit_idx" ON "vertrag_kondition" USING gist ("gueltigkeit");--> statement-breakpoint
CREATE UNIQUE INDEX "bankumsatz_import_uniq" ON "bankumsatz" USING btree ("mandant_id","import_hash");--> statement-breakpoint
CREATE INDEX "bankumsatz_offen_idx" ON "bankumsatz" USING btree ("mandant_id","buchungstag") WHERE status IN ('neu', 'vorgeschlagen', 'klaerfall');--> statement-breakpoint
CREATE INDEX "bankumsatz_e2e_idx" ON "bankumsatz" USING btree ("mandant_id","end_to_end_id");--> statement-breakpoint
CREATE INDEX "bankumsatz_mandat_idx" ON "bankumsatz" USING btree ("mandant_id","mandatsreferenz");--> statement-breakpoint
CREATE INDEX "bankumsatz_konto_idx" ON "bankumsatz" USING btree ("mandant_id","konto_iban","buchungstag");--> statement-breakpoint
CREATE UNIQUE INDEX "buchung_journal_nr_uniq" ON "buchung" USING btree ("mandant_id","buchungskreis_id","jahr","journal_nr");--> statement-breakpoint
CREATE UNIQUE INDEX "buchung_hash_uniq" ON "buchung" USING btree ("mandant_id","hash");--> statement-breakpoint
CREATE INDEX "buchung_datum_idx" ON "buchung" USING btree ("mandant_id","buchungskreis_id","buchungsdatum");--> statement-breakpoint
CREATE INDEX "buchung_storno_idx" ON "buchung" USING btree ("mandant_id","storno_von_id");--> statement-breakpoint
CREATE INDEX "buchung_vorschlag_idx" ON "buchung" USING btree ("mandant_id","vorschlag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "buchungszeile_nr_uniq" ON "buchungszeile" USING btree ("mandant_id","buchung_id","zeilen_nr");--> statement-breakpoint
CREATE INDEX "buchungszeile_umlage_idx" ON "buchungszeile" USING btree ("mandant_id","objekt_id","konto_id","leistung_von","leistung_bis");--> statement-breakpoint
CREATE INDEX "buchungszeile_konto_idx" ON "buchungszeile" USING btree ("mandant_id","konto_id");--> statement-breakpoint
CREATE INDEX "buchungszeile_partei_idx" ON "buchungszeile" USING btree ("mandant_id","partei_id");--> statement-breakpoint
CREATE INDEX "buchungszeile_vertrag_idx" ON "buchungszeile" USING btree ("mandant_id","vertrag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "eingangsrechnung_dublette_uniq" ON "eingangsrechnung" USING btree ("mandant_id","kreditor_partei_id","rechnungs_nr");--> statement-breakpoint
CREATE INDEX "eingangsrechnung_faellig_idx" ON "eingangsrechnung" USING btree ("mandant_id","faellig_am") WHERE status NOT IN ('bezahlt', 'abgelehnt');--> statement-breakpoint
CREATE INDEX "eingangsrechnung_status_idx" ON "eingangsrechnung" USING btree ("mandant_id","status");--> statement-breakpoint
CREATE INDEX "eingangsrechnung_objekt_idx" ON "eingangsrechnung" USING btree ("mandant_id","objekt_id");--> statement-breakpoint
CREATE INDEX "eingangsrechnung_skonto_idx" ON "eingangsrechnung" USING btree ("mandant_id","skonto_bis");--> statement-breakpoint
CREATE UNIQUE INDEX "konto_nummer_uniq" ON "konto" USING btree ("mandant_id","nummer");--> statement-breakpoint
CREATE INDEX "konto_art_idx" ON "konto" USING btree ("mandant_id","art");--> statement-breakpoint
CREATE INDEX "konto_betrkv_idx" ON "konto" USING btree ("mandant_id","betrkv_ziffer");--> statement-breakpoint
CREATE UNIQUE INDEX "periode_uniq" ON "periode" USING btree ("mandant_id","buchungskreis_id","jahr","monat");--> statement-breakpoint
CREATE UNIQUE INDEX "sollstellung_lauf_uniq" ON "sollstellung" USING btree ("mandant_id","vertrag_id","art","periode","einheit_id");--> statement-breakpoint
CREATE INDEX "sollstellung_offen_idx" ON "sollstellung" USING btree ("mandant_id","faellig_am","mahnstufe") WHERE status IN ('offen', 'teilbezahlt');--> statement-breakpoint
CREATE INDEX "sollstellung_schuldner_idx" ON "sollstellung" USING btree ("mandant_id","schuldner_partei_id","status");--> statement-breakpoint
CREATE INDEX "sollstellung_objekt_idx" ON "sollstellung" USING btree ("mandant_id","objekt_id","periode");--> statement-breakpoint
CREATE INDEX "umlageregel_lookup_idx" ON "umlageregel" USING btree ("mandant_id","objekt_id","konto_id");--> statement-breakpoint
CREATE INDEX "umlageregel_gueltigkeit_idx" ON "umlageregel" USING gist ("gueltigkeit");--> statement-breakpoint
CREATE INDEX "zahlungszuordnung_umsatz_idx" ON "zahlungszuordnung" USING btree ("mandant_id","bankumsatz_id");--> statement-breakpoint
CREATE INDEX "zahlungszuordnung_soll_idx" ON "zahlungszuordnung" USING btree ("mandant_id","sollstellung_id");--> statement-breakpoint
CREATE INDEX "zahlungszuordnung_rechnung_idx" ON "zahlungszuordnung" USING btree ("mandant_id","eingangsrechnung_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_folge_uniq" ON "audit_ereignis" USING btree ("mandant_id","folge_nr");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_hash_uniq" ON "audit_ereignis" USING btree ("mandant_id","hash");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_idempotenz_uniq" ON "audit_ereignis" USING btree ("mandant_id","idempotenz_schluessel");--> statement-breakpoint
CREATE INDEX "audit_entitaet_idx" ON "audit_ereignis" USING btree ("mandant_id","entitaet","entitaet_id","am");--> statement-breakpoint
CREATE INDEX "audit_vorschlag_idx" ON "audit_ereignis" USING btree ("mandant_id","vorschlag_id");--> statement-breakpoint
CREATE INDEX "audit_akteur_idx" ON "audit_ereignis" USING btree ("mandant_id","akteur_art","akteur_id","am");--> statement-breakpoint
CREATE INDEX "audit_zeit_idx" ON "audit_ereignis" USING btree ("mandant_id","am");--> statement-breakpoint
CREATE UNIQUE INDEX "bezug_uniq" ON "bezug" USING btree ("mandant_id","quelle_art","quelle_id","ziel_art","ziel_id","rolle");--> statement-breakpoint
CREATE INDEX "bezug_vorwaerts_idx" ON "bezug" USING btree ("mandant_id","quelle_art","quelle_id","rolle");--> statement-breakpoint
CREATE INDEX "bezug_rueckwaerts_idx" ON "bezug" USING btree ("mandant_id","ziel_art","ziel_id","rolle");--> statement-breakpoint
CREATE UNIQUE INDEX "dokument_sha256_uniq" ON "dokument" USING btree ("mandant_id","sha256");--> statement-breakpoint
CREATE INDEX "dokument_objekt_idx" ON "dokument" USING btree ("mandant_id","objekt_id","art");--> statement-breakpoint
CREATE INDEX "dokument_aufbewahrung_idx" ON "dokument" USING btree ("mandant_id","aufbewahrung_bis") WHERE rechtlicher_halt = false;--> statement-breakpoint
CREATE INDEX "dokument_ocr_idx" ON "dokument" USING gin (to_tsvector('german', coalesce(ocr_text, '')));--> statement-breakpoint
CREATE UNIQUE INDEX "entscheidung_stufe_uniq" ON "entscheidung" USING btree ("mandant_id","vorschlag_id","stufe");--> statement-breakpoint
CREATE INDEX "entscheidung_vorschlag_idx" ON "entscheidung" USING btree ("mandant_id","vorschlag_id");--> statement-breakpoint
CREATE INDEX "entscheidung_entscheider_idx" ON "entscheidung" USING btree ("mandant_id","entscheider_partei_id","am");--> statement-breakpoint
CREATE INDEX "frist_wache_idx" ON "frist" USING btree ("mandant_id","ablauf_am","eskalationsstufe") WHERE status IN ('laufend', 'vorwarnung', 'kritisch');--> statement-breakpoint
CREATE INDEX "frist_objekt_idx" ON "frist" USING btree ("mandant_id","objekt_id","status");--> statement-breakpoint
CREATE INDEX "frist_anker_idx" ON "frist" USING btree ("mandant_id","anker_art","anker_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "vorschlag_plan_uniq" ON "vorschlag" USING btree ("mandant_id","agent_id","plan_hash");--> statement-breakpoint
CREATE INDEX "vorschlag_queue_idx" ON "vorschlag" USING btree ("mandant_id","prioritaet","entscheiden_bis") WHERE status IN ('erzeugt', 'vorgelegt');--> statement-breakpoint
CREATE INDEX "vorschlag_faellig_idx" ON "vorschlag" USING btree ("mandant_id","ausfuehrung_am") WHERE status = 'vorgelegt' AND ausfuehrung_am IS NOT NULL;--> statement-breakpoint
CREATE INDEX "vorschlag_objekt_idx" ON "vorschlag" USING btree ("mandant_id","objekt_id","status");--> statement-breakpoint
CREATE INDEX "vorschlag_prozess_idx" ON "vorschlag" USING btree ("mandant_id","prozess","status");--> statement-breakpoint
CREATE POLICY "buchungskreis_mandant" ON "buchungskreis" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "einheit_mandant" ON "einheit" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "einheit_bezugswert_mandant" ON "einheit_bezugswert" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "mandant_selbst" ON "mandant" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (id = (select immos_sec.mandant())) WITH CHECK (id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "nutzungszeitraum_mandant" ON "nutzungszeitraum" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "objekt_mandant" ON "objekt" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "partei_mandant" ON "partei" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "partei_rolle_mandant" ON "partei_rolle" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "vertrag_mandant" ON "vertrag" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "vertrag_kondition_mandant" ON "vertrag_kondition" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "bankumsatz_lesen" ON "bankumsatz" AS PERMISSIVE FOR SELECT TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "bankumsatz_anlegen" ON "bankumsatz" AS PERMISSIVE FOR INSERT TO "immos_app", "immos_dienst" WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "bankumsatz_kein_update" ON "bankumsatz" AS RESTRICTIVE FOR UPDATE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "bankumsatz_kein_delete" ON "bankumsatz" AS RESTRICTIVE FOR DELETE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "buchung_lesen" ON "buchung" AS PERMISSIVE FOR SELECT TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "buchung_anlegen" ON "buchung" AS PERMISSIVE FOR INSERT TO "immos_app", "immos_dienst" WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "buchung_kein_update" ON "buchung" AS RESTRICTIVE FOR UPDATE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "buchung_kein_delete" ON "buchung" AS RESTRICTIVE FOR DELETE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "buchungszeile_lesen" ON "buchungszeile" AS PERMISSIVE FOR SELECT TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "buchungszeile_anlegen" ON "buchungszeile" AS PERMISSIVE FOR INSERT TO "immos_app", "immos_dienst" WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "buchungszeile_kein_update" ON "buchungszeile" AS RESTRICTIVE FOR UPDATE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "buchungszeile_kein_delete" ON "buchungszeile" AS RESTRICTIVE FOR DELETE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "eingangsrechnung_mandant" ON "eingangsrechnung" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "konto_mandant" ON "konto" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "periode_mandant" ON "periode" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "sollstellung_mandant" ON "sollstellung" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "umlageregel_mandant" ON "umlageregel" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "zahlungszuordnung_mandant" ON "zahlungszuordnung" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "audit_ereignis_lesen" ON "audit_ereignis" AS PERMISSIVE FOR SELECT TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "audit_ereignis_anlegen" ON "audit_ereignis" AS PERMISSIVE FOR INSERT TO "immos_app", "immos_dienst" WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "audit_ereignis_kein_update" ON "audit_ereignis" AS RESTRICTIVE FOR UPDATE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "audit_ereignis_kein_delete" ON "audit_ereignis" AS RESTRICTIVE FOR DELETE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "bezug_mandant" ON "bezug" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "dokument_mandant" ON "dokument" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "entscheidung_lesen" ON "entscheidung" AS PERMISSIVE FOR SELECT TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "entscheidung_anlegen" ON "entscheidung" AS PERMISSIVE FOR INSERT TO "immos_app", "immos_dienst" WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "entscheidung_kein_update" ON "entscheidung" AS RESTRICTIVE FOR UPDATE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "entscheidung_kein_delete" ON "entscheidung" AS RESTRICTIVE FOR DELETE TO "immos_app", "immos_dienst" USING (false);--> statement-breakpoint
CREATE POLICY "frist_mandant" ON "frist" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));--> statement-breakpoint
CREATE POLICY "vorschlag_mandant" ON "vorschlag" AS PERMISSIVE FOR ALL TO "immos_app", "immos_dienst" USING (mandant_id = (select immos_sec.mandant())) WITH CHECK (mandant_id = (select immos_sec.mandant()));