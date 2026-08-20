CREATE TYPE "public"."akteur_art" AS ENUM('mensch', 'agent', 'system', 'extern');--> statement-breakpoint
CREATE TYPE "public"."einheit_status" AS ENUM('vermietet', 'leerstand', 'eigennutzung', 'sanierung');--> statement-breakpoint
CREATE TYPE "public"."einheit_typ" AS ENUM('wohnung', 'gewerbe', 'stellplatz', 'garage', 'keller', 'lager', 'dachboden');--> statement-breakpoint
CREATE TYPE "public"."erfassungsart" AS ENUM('mensch', 'agent', 'system', 'import');--> statement-breakpoint
CREATE TYPE "public"."kontoart" AS ENUM('ertrag', 'aufwand', 'forderung', 'verbindlichkeit', 'bank', 'kasse', 'ruecklage', 'kaution', 'abgrenzung', 'kapital');--> statement-breakpoint
CREATE TYPE "public"."person_rolle" AS ENUM('mieter', 'eigentuemer', 'beirat', 'dienstleister', 'versorger', 'versicherung', 'behoerde', 'bank', 'hausmeister', 'interessent', 'mitarbeiter');--> statement-breakpoint
CREATE TYPE "public"."person_typ" AS ENUM('natuerlich', 'juristisch');--> statement-breakpoint
CREATE TYPE "public"."postfach_zweck" AS ENUM('rechnung', 'schaden', 'allgemein', 'versammlung', 'kuendigung', 'zaehler');--> statement-breakpoint
CREATE TYPE "public"."prioritaet" AS ENUM('notfall', 'hoch', 'normal', 'niedrig');--> statement-breakpoint
CREATE TYPE "public"."rechnung_status" AS ENUM('eingegangen', 'geprueft', 'freigabe_erforderlich', 'freigegeben', 'zahlung_beauftragt', 'bezahlt', 'abgelehnt', 'reklamation');--> statement-breakpoint
CREATE TYPE "public"."soll_art" AS ENUM('miete_kalt', 'bk_vorauszahlung', 'hk_vorauszahlung', 'stellplatz', 'hausgeld', 'ruecklage', 'sonderumlage', 'nachzahlung', 'mahngebuehr');--> statement-breakpoint
CREATE TYPE "public"."umlageschluessel" AS ENUM('wohnflaeche', 'personen', 'einheiten', 'mea', 'verbrauch_waerme', 'verbrauch_wasser', 'direktzuordnung', 'nicht_umlegen');--> statement-breakpoint
CREATE TYPE "public"."verwaltungsart" AS ENUM('miete', 'sev', 'weg', 'gewerbe');--> statement-breakpoint
CREATE TYPE "public"."vorgang_status" AS ENUM('neu', 'in_pruefung', 'wartet_auf_entscheidung', 'beauftragt', 'wartet_extern', 'erledigt', 'abgelehnt');--> statement-breakpoint
CREATE TYPE "public"."vorschlag_status" AS ENUM('offen', 'zugestimmt', 'abgelehnt', 'geaendert_zugestimmt', 'automatisch_ausgefuehrt', 'abgelaufen', 'eskaliert');--> statement-breakpoint
CREATE TABLE "abrechnungslaeufe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"jahr" integer NOT NULL,
	"art" text NOT NULL,
	"status" text DEFAULT 'vorbereitung' NOT NULL,
	"frist_am" date NOT NULL,
	"ergebnis" jsonb,
	"auffaelligkeiten" jsonb DEFAULT '[]'::jsonb,
	"berechnet_am" timestamp with time zone,
	"versendet_am" timestamp with time zone,
	CONSTRAINT "abrechnungslaeufe_objekt_id_jahr_art_unique" UNIQUE("objekt_id","jahr","art")
);
--> statement-breakpoint
ALTER TABLE "abrechnungslaeufe" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agent_laeufe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"ausloeser" text NOT NULL,
	"ergebnis" text NOT NULL,
	"vorschlag_id" uuid,
	"dauer_ms" integer,
	"tokens" integer,
	"kosten_cent" integer,
	"modell" text,
	"notiz" text,
	"start_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_laeufe" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "anlagen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"bezeichnung" text NOT NULL,
	"art" text NOT NULL,
	"hersteller" text,
	"baujahr" integer,
	"standort" text,
	"zustand" text DEFAULT 'gut' NOT NULL,
	"restnutzungsdauer_jahre" integer
);
--> statement-breakpoint
ALTER TABLE "anlagen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_ereignisse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"am" timestamp with time zone DEFAULT now() NOT NULL,
	"akteur_art" "akteur_art" NOT NULL,
	"akteur_id" text NOT NULL,
	"akteur_name" text NOT NULL,
	"aktion" text NOT NULL,
	"entitaet" text NOT NULL,
	"entitaet_id" text NOT NULL,
	"objekt_id" uuid,
	"vorschlag_id" uuid,
	"aenderungen" jsonb,
	"legitimation" text
);
--> statement-breakpoint
ALTER TABLE "audit_ereignisse" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auftraege" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"nummer" text NOT NULL,
	"vorgang_id" uuid,
	"objekt_id" uuid NOT NULL,
	"einheit_id" uuid,
	"dienstleister_id" uuid NOT NULL,
	"gewerk" text NOT NULL,
	"beschreibung" text NOT NULL,
	"status" text DEFAULT 'angefragt' NOT NULL,
	"budget_cent" bigint,
	"angebot_cent" bigint,
	"rechnung_cent" bigint,
	"beauftragt_am" date,
	"termin_am" timestamp with time zone,
	"gewaehrleistung_bis" date,
	"beschluss_id" uuid,
	"versicherungsfall" text,
	CONSTRAINT "auftraege_mandant_id_nummer_unique" UNIQUE("mandant_id","nummer")
);
--> statement-breakpoint
ALTER TABLE "auftraege" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "autonomie_regeln" (
	"mandant_id" uuid NOT NULL,
	"prozess" text NOT NULL,
	"modul_id" text NOT NULL,
	"stufe" integer DEFAULT 1 NOT NULL,
	"betragsgrenze_cent" bigint,
	"widerspruchsfenster_minuten" integer DEFAULT 0 NOT NULL,
	"max_stufe" integer DEFAULT 3 NOT NULL,
	"max_stufe_grund" text,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_von" uuid,
	CONSTRAINT "autonomie_regeln_mandant_id_prozess_pk" PRIMARY KEY("mandant_id","prozess")
);
--> statement-breakpoint
ALTER TABLE "autonomie_regeln" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bankkonten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid,
	"bezeichnung" text NOT NULL,
	"iban" text NOT NULL,
	"bic" text,
	"bank" text,
	"art" text NOT NULL,
	"saldo_cent" bigint DEFAULT 0 NOT NULL,
	"letzter_abruf" timestamp with time zone,
	CONSTRAINT "bankkonten_mandant_id_iban_unique" UNIQUE("mandant_id","iban")
);
--> statement-breakpoint
ALTER TABLE "bankkonten" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "beschluesse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"versammlung_id" uuid,
	"laufende_nr" integer NOT NULL,
	"datum" date NOT NULL,
	"gegenstand" text NOT NULL,
	"wortlaut" text NOT NULL,
	"ergebnis" text NOT NULL,
	"ja_stimmen" integer DEFAULT 0 NOT NULL,
	"nein_stimmen" integer DEFAULT 0 NOT NULL,
	"enthaltungen" integer DEFAULT 0 NOT NULL,
	"umlaufbeschluss" boolean DEFAULT false NOT NULL,
	"anfechtungsfrist_bis" date NOT NULL,
	"budget_cent" bigint,
	"umsetzung_status" text DEFAULT 'offen' NOT NULL,
	CONSTRAINT "beschluesse_objekt_id_datum_laufende_nr_unique" UNIQUE("objekt_id","datum","laufende_nr")
);
--> statement-breakpoint
ALTER TABLE "beschluesse" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "buchungen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"journal_nr" bigint NOT NULL,
	"geschaeftsjahr" integer NOT NULL,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"beleg_nr" text NOT NULL,
	"dokument_id" uuid,
	"datum" date NOT NULL,
	"leistung_von" date,
	"leistung_bis" date,
	"soll_konto" text NOT NULL,
	"haben_konto" text NOT NULL,
	"betrag_cent" bigint NOT NULL,
	"ust_satz" integer DEFAULT 0 NOT NULL,
	"ust_betrag_cent" bigint DEFAULT 0 NOT NULL,
	"text" text NOT NULL,
	"festgeschrieben" boolean DEFAULT false NOT NULL,
	"storno_von_id" uuid,
	"erfasst_von" "erfassungsart" NOT NULL,
	"agent_id" text,
	"nutzer_id" uuid,
	"erfasst_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buchungen_mandant_id_geschaeftsjahr_journal_nr_unique" UNIQUE("mandant_id","geschaeftsjahr","journal_nr")
);
--> statement-breakpoint
ALTER TABLE "buchungen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dokumente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"vorgang_id" uuid,
	"titel" text NOT NULL,
	"art" text NOT NULL,
	"aktenplan" text NOT NULL,
	"dateiname" text NOT NULL,
	"mime" text NOT NULL,
	"groesse_bytes" bigint NOT NULL,
	"seiten" integer,
	"sha256" text NOT NULL,
	"speicher_schluessel" text NOT NULL,
	"ocr_text" text,
	"vertraulich" boolean DEFAULT false NOT NULL,
	"aufbewahrung_bis" date,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dokumente_mandant_id_sha256_unique" UNIQUE("mandant_id","sha256")
);
--> statement-breakpoint
ALTER TABLE "dokumente" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "eigentumsverhaeltnisse" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"einheit_id" uuid NOT NULL,
	"eigentuemer_id" uuid NOT NULL,
	"mea_tausendstel" numeric(7, 3),
	"selbstnutzer" boolean DEFAULT false NOT NULL,
	"sev_auftrag" boolean DEFAULT false NOT NULL,
	"gueltig_von" date NOT NULL,
	"gueltig_bis" date
);
--> statement-breakpoint
ALTER TABLE "eigentumsverhaeltnisse" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "eingangsrechnungen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"postfach_id" uuid,
	"nachricht_id" uuid,
	"dokument_id" uuid,
	"format" text NOT NULL,
	"kreditor_id" uuid,
	"kreditor_name_roh" text NOT NULL,
	"rechnungs_nr" text NOT NULL,
	"rechnungsdatum" date NOT NULL,
	"leistung_von" date,
	"leistung_bis" date,
	"faellig_am" date,
	"skonto_bis" date,
	"skonto_prozent" real,
	"brutto_cent" bigint NOT NULL,
	"netto_cent" bigint NOT NULL,
	"ust_cent" bigint NOT NULL,
	"ust_satz" integer DEFAULT 19 NOT NULL,
	"iban" text,
	"konto_vorschlag" text,
	"umlagefaehig_vorschlag" boolean,
	"auftrag_id" uuid,
	"status" "rechnung_status" DEFAULT 'eingegangen' NOT NULL,
	"pruefung" jsonb NOT NULL,
	"extraktions_konfidenz" real,
	"eingang_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "eingangsrechnungen_mandant_id_kreditor_id_rechnungs_nr_unique" UNIQUE("mandant_id","kreditor_id","rechnungs_nr")
);
--> statement-breakpoint
ALTER TABLE "eingangsrechnungen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "einheit_flaechen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"einheit_id" uuid NOT NULL,
	"flaeche_m2" numeric(8, 2) NOT NULL,
	"personenzahl" integer DEFAULT 1 NOT NULL,
	"mea_tausendstel" numeric(7, 3),
	"gueltig_von" date NOT NULL,
	"gueltig_bis" date,
	"grund" text
);
--> statement-breakpoint
ALTER TABLE "einheit_flaechen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "einheiten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"nummer" text NOT NULL,
	"lage" text NOT NULL,
	"typ" "einheit_typ" NOT NULL,
	"status" "einheit_status" DEFAULT 'vermietet' NOT NULL,
	"zimmer" real,
	"balkon" boolean DEFAULT false NOT NULL,
	"aufzug" boolean DEFAULT false NOT NULL,
	"ust_option" boolean,
	CONSTRAINT "einheiten_objekt_id_nummer_unique" UNIQUE("objekt_id","nummer")
);
--> statement-breakpoint
ALTER TABLE "einheiten" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "entscheidungen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"vorschlag_id" uuid NOT NULL,
	"entscheider_id" uuid,
	"entscheidung" text NOT NULL,
	"grund" text,
	"aenderungen" jsonb,
	"entscheidungsdauer_sek" integer,
	"am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entscheidungen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fristen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"bezeichnung" text NOT NULL,
	"art" text NOT NULL,
	"rechtsgrundlage" text,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"vorgang_id" uuid,
	"ablauf_am" date NOT NULL,
	"vorlauf_tage" integer DEFAULT 14 NOT NULL,
	"status" text DEFAULT 'offen' NOT NULL,
	"konsequenz" text NOT NULL,
	"eskalationsstufe" integer DEFAULT 0 NOT NULL,
	"verantwortlicher_id" uuid
);
--> statement-breakpoint
ALTER TABLE "fristen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "konten" (
	"mandant_id" uuid NOT NULL,
	"nummer" text NOT NULL,
	"bezeichnung" text NOT NULL,
	"art" "kontoart" NOT NULL,
	"umlagefaehig" boolean,
	"standard_schluessel" "umlageschluessel",
	"betrkv" text,
	"paragraf_35a" text,
	CONSTRAINT "konten_mandant_id_nummer_pk" PRIMARY KEY("mandant_id","nummer")
);
--> statement-breakpoint
ALTER TABLE "konten" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kontoumsaetze" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"bankkonto_id" uuid NOT NULL,
	"import_schluessel" text NOT NULL,
	"buchungstag" date NOT NULL,
	"valuta" date,
	"betrag_cent" bigint NOT NULL,
	"gegenkonto_name" text,
	"gegenkonto_iban" text,
	"verwendungszweck" text,
	"end_to_end_id" text,
	"mandatsreferenz" text,
	"zuordnung" text DEFAULT 'offen' NOT NULL,
	"match_konfidenz" real,
	"match_regel" text,
	"match_begruendung" text,
	CONSTRAINT "kontoumsaetze_bankkonto_id_import_schluessel_unique" UNIQUE("bankkonto_id","import_schluessel")
);
--> statement-breakpoint
ALTER TABLE "kontoumsaetze" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "kostenpositionen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"jahr" integer NOT NULL,
	"konto_nr" text NOT NULL,
	"bezeichnung" text NOT NULL,
	"betrag_cent" bigint NOT NULL,
	"umlagefaehig" boolean NOT NULL,
	"schluessel" "umlageschluessel" NOT NULL,
	"vorwegabzug_cent" bigint DEFAULT 0 NOT NULL,
	"vorwegabzug_grund" text,
	"paragraf_35a_cent" bigint DEFAULT 0 NOT NULL,
	"co2_kosten_cent" bigint DEFAULT 0 NOT NULL,
	"heizkosten" boolean DEFAULT false NOT NULL,
	"beleg_ids" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
ALTER TABLE "kostenpositionen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mandanten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kurz" text NOT NULL,
	"mail_domain" text NOT NULL,
	"sitz" text NOT NULL,
	"ust_id_nr" text,
	"angelegt_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mandanten_mail_domain_unique" UNIQUE("mail_domain")
);
--> statement-breakpoint
CREATE TABLE "mietkonditionen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"vertrag_id" uuid NOT NULL,
	"miete_kalt_cent" bigint NOT NULL,
	"bk_vorauszahlung_cent" bigint DEFAULT 0 NOT NULL,
	"hk_vorauszahlung_cent" bigint DEFAULT 0 NOT NULL,
	"stellplatz_cent" bigint DEFAULT 0 NOT NULL,
	"gueltig_von" date NOT NULL,
	"gueltig_bis" date,
	"grund" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mietkonditionen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "mietvertraege" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"einheit_id" uuid NOT NULL,
	"art" text NOT NULL,
	"beginn" date NOT NULL,
	"ende" date,
	"gekuendigt_zum" date,
	"kuendigung_eingang" date,
	"kaution_cent" bigint DEFAULT 0 NOT NULL,
	"kautionsart" text,
	"kaution_eingegangen" boolean DEFAULT false NOT NULL,
	"anpassungsart" text DEFAULT 'vergleichsmiete' NOT NULL,
	"index_basis" numeric(6, 2),
	"ust_pflichtig" boolean DEFAULT false NOT NULL,
	"besondere_vereinbarungen" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
ALTER TABLE "mietvertraege" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "modul_konfiguration" (
	"mandant_id" uuid NOT NULL,
	"modul_id" text NOT NULL,
	"aktiv" boolean DEFAULT false NOT NULL,
	"geaendert_am" timestamp with time zone DEFAULT now() NOT NULL,
	"geaendert_von" uuid,
	CONSTRAINT "modul_konfiguration_mandant_id_modul_id_pk" PRIMARY KEY("mandant_id","modul_id")
);
--> statement-breakpoint
ALTER TABLE "modul_konfiguration" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "nachrichten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"richtung" text NOT NULL,
	"kanal" text NOT NULL,
	"postfach_id" uuid,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"vorgang_id" uuid,
	"externe_id" text,
	"thread_id" text,
	"absender" text NOT NULL,
	"absender_name" text,
	"empfaenger" jsonb DEFAULT '[]'::jsonb,
	"betreff" text,
	"speicher_schluessel" text,
	"vorschau" text,
	"intent" text,
	"intent_konfidenz" real,
	"stimmung" text,
	"sicherheit" jsonb NOT NULL,
	"gelesen" boolean DEFAULT false NOT NULL,
	"eingang_am" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nachrichten_mandant_id_externe_id_unique" UNIQUE("mandant_id","externe_id")
);
--> statement-breakpoint
ALTER TABLE "nachrichten" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "nutzer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"rolle" text DEFAULT 'verwalter' NOT NULL,
	"zwei_faktor_aktiv" boolean DEFAULT false NOT NULL,
	"zahlungsberechtigt" boolean DEFAULT false NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	CONSTRAINT "nutzer_mandant_id_email_unique" UNIQUE("mandant_id","email")
);
--> statement-breakpoint
ALTER TABLE "nutzer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "objekte" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"nummer" text NOT NULL,
	"bezeichnung" text NOT NULL,
	"strasse" text NOT NULL,
	"plz" text NOT NULL,
	"ort" text NOT NULL,
	"verwaltungsarten" "verwaltungsart"[] NOT NULL,
	"baujahr" integer,
	"heizungsart" text,
	"energietraeger" text,
	"co2_emission_kg_pro_m2" real,
	"heizkosten_verbrauchsanteil" numeric(3, 2) DEFAULT '0.70',
	"abrechnungszeitraum_start" text DEFAULT '01-01' NOT NULL,
	"verwaltungsbeginn" date NOT NULL,
	"verwaltungsende" date,
	"lat" real,
	"lng" real,
	"notizen" text,
	CONSTRAINT "objekte_mandant_id_nummer_unique" UNIQUE("mandant_id","nummer")
);
--> statement-breakpoint
ALTER TABLE "objekte" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "person_rollen" (
	"mandant_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"rolle" "person_rolle" NOT NULL,
	CONSTRAINT "person_rollen_person_id_rolle_pk" PRIMARY KEY("person_id","rolle")
);
--> statement-breakpoint
ALTER TABLE "person_rollen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "personen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"typ" "person_typ" NOT NULL,
	"anrede" text,
	"name" text NOT NULL,
	"email" text,
	"telefon" text,
	"mobil" text,
	"strasse" text,
	"plz" text,
	"ort" text,
	"iban" text,
	"iban_geaendert_am" timestamp with time zone,
	"kreditor_nr" text,
	"gewerk" text,
	"reaktionszeit_stunden" integer,
	"bewertung" real,
	"bevorzugter_kanal" text,
	"seit" date,
	"geloescht_am" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "personen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "postfaecher" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid,
	"zweck" "postfach_zweck" NOT NULL,
	"adresse" text NOT NULL,
	"aktiv" boolean DEFAULT true NOT NULL,
	"fallback" text DEFAULT 'triage' NOT NULL,
	"absender_whitelist" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "postfaecher_adresse_unique" UNIQUE("adresse")
);
--> statement-breakpoint
ALTER TABLE "postfaecher" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pruefpflichten" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"anlage_id" uuid,
	"bezeichnung" text NOT NULL,
	"rechtsgrundlage" text NOT NULL,
	"intervall_monate" integer NOT NULL,
	"letzte_pruefung" date,
	"naechste_pruefung" date NOT NULL,
	"haftungsrisiko" text DEFAULT 'mittel' NOT NULL,
	"zustaendiger_id" uuid,
	"nachweis_dokument_id" uuid
);
--> statement-breakpoint
ALTER TABLE "pruefpflichten" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sepa_mandate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"vertrag_id" uuid,
	"person_id" uuid,
	"mandatsreferenz" text NOT NULL,
	"iban" text NOT NULL,
	"art" text DEFAULT 'core' NOT NULL,
	"unterschrift_am" date NOT NULL,
	"letzte_nutzung" date,
	"aktiv" boolean DEFAULT true NOT NULL,
	"ungueltig_grund" text,
	CONSTRAINT "sepa_mandate_mandant_id_mandatsreferenz_unique" UNIQUE("mandant_id","mandatsreferenz")
);
--> statement-breakpoint
ALTER TABLE "sepa_mandate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sollstellungen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"einheit_id" uuid NOT NULL,
	"vertrag_id" uuid,
	"periode" text NOT NULL,
	"art" "soll_art" NOT NULL,
	"betrag_cent" bigint NOT NULL,
	"bezahlt_cent" bigint DEFAULT 0 NOT NULL,
	"faellig_am" date NOT NULL,
	"mahnstufe" integer DEFAULT 0 NOT NULL,
	"buchung_id" uuid,
	"storniert_am" timestamp with time zone,
	CONSTRAINT "sollstellungen_vertrag_id_periode_art_unique" UNIQUE("vertrag_id","periode","art")
);
--> statement-breakpoint
ALTER TABLE "sollstellungen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vertragsparteien" (
	"mandant_id" uuid NOT NULL,
	"vertrag_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"hauptmieter" boolean DEFAULT false NOT NULL,
	CONSTRAINT "vertragsparteien_vertrag_id_person_id_pk" PRIMARY KEY("vertrag_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "vertragsparteien" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vorgaenge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"nummer" text NOT NULL,
	"objekt_id" uuid NOT NULL,
	"einheit_id" uuid,
	"titel" text NOT NULL,
	"kategorie" text NOT NULL,
	"kanal" text NOT NULL,
	"prioritaet" "prioritaet" DEFAULT 'normal' NOT NULL,
	"status" "vorgang_status" DEFAULT 'neu' NOT NULL,
	"melder_id" uuid,
	"bearbeiter_id" uuid,
	"zusammenfassung" text,
	"gruppe_id" uuid,
	"playbook_id" text,
	"schritt_index" integer,
	"sla_stunden" integer,
	"kosten_schaetzung_cent" bigint,
	"faellig_am" date,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL,
	"erledigt_am" timestamp with time zone,
	CONSTRAINT "vorgaenge_mandant_id_nummer_unique" UNIQUE("mandant_id","nummer")
);
--> statement-breakpoint
ALTER TABLE "vorgaenge" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vorschlaege" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"agent_id" text NOT NULL,
	"prozess" text NOT NULL,
	"kategorie" text NOT NULL,
	"objekt_id" uuid,
	"einheit_id" uuid,
	"vorgang_id" uuid,
	"titel" text NOT NULL,
	"kurzfassung" text NOT NULL,
	"begruendung" text NOT NULL,
	"betrag_cent" bigint,
	"belege" jsonb NOT NULL,
	"aktionen" jsonb NOT NULL,
	"alternativen" jsonb NOT NULL,
	"risiko" text NOT NULL,
	"reversibel" boolean DEFAULT true NOT NULL,
	"konfidenz" real NOT NULL,
	"autonomiestufe" integer NOT NULL,
	"prioritaet" integer DEFAULT 50 NOT NULL,
	"zeitersparnis_minuten" integer DEFAULT 0 NOT NULL,
	"vorlage_grund" text,
	"status" "vorschlag_status" DEFAULT 'offen' NOT NULL,
	"ausfuehrung_am" timestamp with time zone,
	"entscheiden_bis" timestamp with time zone,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vorschlaege" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "zaehler" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"objekt_id" uuid NOT NULL,
	"einheit_id" uuid,
	"art" text NOT NULL,
	"nummer" text NOT NULL,
	"einheit" text NOT NULL,
	"fernablesbar" boolean DEFAULT false NOT NULL,
	"einbau" date,
	"eichung_bis" date,
	CONSTRAINT "zaehler_objekt_id_nummer_unique" UNIQUE("objekt_id","nummer")
);
--> statement-breakpoint
ALTER TABLE "zaehler" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "zaehlerstaende" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"zaehler_id" uuid NOT NULL,
	"stichtag" date NOT NULL,
	"stand" numeric(12, 3) NOT NULL,
	"quelle" text DEFAULT 'fern' NOT NULL,
	"geschaetzt" boolean DEFAULT false NOT NULL,
	CONSTRAINT "zaehlerstaende_zaehler_id_stichtag_unique" UNIQUE("zaehler_id","stichtag")
);
--> statement-breakpoint
ALTER TABLE "zaehlerstaende" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "zahlungszuordnungen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mandant_id" uuid NOT NULL,
	"umsatz_id" uuid NOT NULL,
	"sollstellung_id" uuid NOT NULL,
	"betrag_cent" bigint NOT NULL,
	"quelle" "erfassungsart" NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "zahlungszuordnungen" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "abrechnungslaeufe" ADD CONSTRAINT "abrechnungslaeufe_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_laeufe" ADD CONSTRAINT "agent_laeufe_vorschlag_id_vorschlaege_id_fk" FOREIGN KEY ("vorschlag_id") REFERENCES "public"."vorschlaege"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anlagen" ADD CONSTRAINT "anlagen_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auftraege" ADD CONSTRAINT "auftraege_vorgang_id_vorgaenge_id_fk" FOREIGN KEY ("vorgang_id") REFERENCES "public"."vorgaenge"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auftraege" ADD CONSTRAINT "auftraege_dienstleister_id_personen_id_fk" FOREIGN KEY ("dienstleister_id") REFERENCES "public"."personen"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomie_regeln" ADD CONSTRAINT "autonomie_regeln_geaendert_von_nutzer_id_fk" FOREIGN KEY ("geaendert_von") REFERENCES "public"."nutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bankkonten" ADD CONSTRAINT "bankkonten_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beschluesse" ADD CONSTRAINT "beschluesse_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buchungen" ADD CONSTRAINT "buchungen_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buchungen" ADD CONSTRAINT "buchungen_einheit_id_einheiten_id_fk" FOREIGN KEY ("einheit_id") REFERENCES "public"."einheiten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buchungen" ADD CONSTRAINT "buchungen_nutzer_id_nutzer_id_fk" FOREIGN KEY ("nutzer_id") REFERENCES "public"."nutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokumente" ADD CONSTRAINT "dokumente_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dokumente" ADD CONSTRAINT "dokumente_vorgang_id_vorgaenge_id_fk" FOREIGN KEY ("vorgang_id") REFERENCES "public"."vorgaenge"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eigentumsverhaeltnisse" ADD CONSTRAINT "eigentumsverhaeltnisse_einheit_id_einheiten_id_fk" FOREIGN KEY ("einheit_id") REFERENCES "public"."einheiten"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eigentumsverhaeltnisse" ADD CONSTRAINT "eigentumsverhaeltnisse_eigentuemer_id_personen_id_fk" FOREIGN KEY ("eigentuemer_id") REFERENCES "public"."personen"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eingangsrechnungen" ADD CONSTRAINT "eingangsrechnungen_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eingangsrechnungen" ADD CONSTRAINT "eingangsrechnungen_einheit_id_einheiten_id_fk" FOREIGN KEY ("einheit_id") REFERENCES "public"."einheiten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eingangsrechnungen" ADD CONSTRAINT "eingangsrechnungen_postfach_id_postfaecher_id_fk" FOREIGN KEY ("postfach_id") REFERENCES "public"."postfaecher"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eingangsrechnungen" ADD CONSTRAINT "eingangsrechnungen_kreditor_id_personen_id_fk" FOREIGN KEY ("kreditor_id") REFERENCES "public"."personen"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einheit_flaechen" ADD CONSTRAINT "einheit_flaechen_einheit_id_einheiten_id_fk" FOREIGN KEY ("einheit_id") REFERENCES "public"."einheiten"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "einheiten" ADD CONSTRAINT "einheiten_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entscheidungen" ADD CONSTRAINT "entscheidungen_vorschlag_id_vorschlaege_id_fk" FOREIGN KEY ("vorschlag_id") REFERENCES "public"."vorschlaege"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entscheidungen" ADD CONSTRAINT "entscheidungen_entscheider_id_nutzer_id_fk" FOREIGN KEY ("entscheider_id") REFERENCES "public"."nutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fristen" ADD CONSTRAINT "fristen_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fristen" ADD CONSTRAINT "fristen_vorgang_id_vorgaenge_id_fk" FOREIGN KEY ("vorgang_id") REFERENCES "public"."vorgaenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fristen" ADD CONSTRAINT "fristen_verantwortlicher_id_nutzer_id_fk" FOREIGN KEY ("verantwortlicher_id") REFERENCES "public"."nutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kontoumsaetze" ADD CONSTRAINT "kontoumsaetze_bankkonto_id_bankkonten_id_fk" FOREIGN KEY ("bankkonto_id") REFERENCES "public"."bankkonten"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kostenpositionen" ADD CONSTRAINT "kostenpositionen_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mietkonditionen" ADD CONSTRAINT "mietkonditionen_vertrag_id_mietvertraege_id_fk" FOREIGN KEY ("vertrag_id") REFERENCES "public"."mietvertraege"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mietvertraege" ADD CONSTRAINT "mietvertraege_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mietvertraege" ADD CONSTRAINT "mietvertraege_einheit_id_einheiten_id_fk" FOREIGN KEY ("einheit_id") REFERENCES "public"."einheiten"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modul_konfiguration" ADD CONSTRAINT "modul_konfiguration_mandant_id_mandanten_id_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandanten"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachrichten" ADD CONSTRAINT "nachrichten_postfach_id_postfaecher_id_fk" FOREIGN KEY ("postfach_id") REFERENCES "public"."postfaecher"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachrichten" ADD CONSTRAINT "nachrichten_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nachrichten" ADD CONSTRAINT "nachrichten_vorgang_id_vorgaenge_id_fk" FOREIGN KEY ("vorgang_id") REFERENCES "public"."vorgaenge"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutzer" ADD CONSTRAINT "nutzer_mandant_id_mandanten_id_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandanten"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objekte" ADD CONSTRAINT "objekte_mandant_id_mandanten_id_fk" FOREIGN KEY ("mandant_id") REFERENCES "public"."mandanten"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person_rollen" ADD CONSTRAINT "person_rollen_person_id_personen_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postfaecher" ADD CONSTRAINT "postfaecher_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pruefpflichten" ADD CONSTRAINT "pruefpflichten_anlage_id_anlagen_id_fk" FOREIGN KEY ("anlage_id") REFERENCES "public"."anlagen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pruefpflichten" ADD CONSTRAINT "pruefpflichten_zustaendiger_id_nutzer_id_fk" FOREIGN KEY ("zustaendiger_id") REFERENCES "public"."nutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sepa_mandate" ADD CONSTRAINT "sepa_mandate_vertrag_id_mietvertraege_id_fk" FOREIGN KEY ("vertrag_id") REFERENCES "public"."mietvertraege"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sepa_mandate" ADD CONSTRAINT "sepa_mandate_person_id_personen_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sollstellungen" ADD CONSTRAINT "sollstellungen_vertrag_id_mietvertraege_id_fk" FOREIGN KEY ("vertrag_id") REFERENCES "public"."mietvertraege"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sollstellungen" ADD CONSTRAINT "sollstellungen_buchung_id_buchungen_id_fk" FOREIGN KEY ("buchung_id") REFERENCES "public"."buchungen"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vertragsparteien" ADD CONSTRAINT "vertragsparteien_vertrag_id_mietvertraege_id_fk" FOREIGN KEY ("vertrag_id") REFERENCES "public"."mietvertraege"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vertragsparteien" ADD CONSTRAINT "vertragsparteien_person_id_personen_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."personen"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vorgaenge" ADD CONSTRAINT "vorgaenge_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vorgaenge" ADD CONSTRAINT "vorgaenge_einheit_id_einheiten_id_fk" FOREIGN KEY ("einheit_id") REFERENCES "public"."einheiten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vorgaenge" ADD CONSTRAINT "vorgaenge_melder_id_personen_id_fk" FOREIGN KEY ("melder_id") REFERENCES "public"."personen"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vorgaenge" ADD CONSTRAINT "vorgaenge_bearbeiter_id_nutzer_id_fk" FOREIGN KEY ("bearbeiter_id") REFERENCES "public"."nutzer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vorschlaege" ADD CONSTRAINT "vorschlaege_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vorschlaege" ADD CONSTRAINT "vorschlaege_vorgang_id_vorgaenge_id_fk" FOREIGN KEY ("vorgang_id") REFERENCES "public"."vorgaenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zaehler" ADD CONSTRAINT "zaehler_objekt_id_objekte_id_fk" FOREIGN KEY ("objekt_id") REFERENCES "public"."objekte"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zaehler" ADD CONSTRAINT "zaehler_einheit_id_einheiten_id_fk" FOREIGN KEY ("einheit_id") REFERENCES "public"."einheiten"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zaehlerstaende" ADD CONSTRAINT "zaehlerstaende_zaehler_id_zaehler_id_fk" FOREIGN KEY ("zaehler_id") REFERENCES "public"."zaehler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zahlungszuordnungen" ADD CONSTRAINT "zahlungszuordnungen_umsatz_id_kontoumsaetze_id_fk" FOREIGN KEY ("umsatz_id") REFERENCES "public"."kontoumsaetze"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zahlungszuordnungen" ADD CONSTRAINT "zahlungszuordnungen_sollstellung_id_sollstellungen_id_fk" FOREIGN KEY ("sollstellung_id") REFERENCES "public"."sollstellungen"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_laeufe_agent_idx" ON "agent_laeufe" USING btree ("mandant_id","agent_id","start_am");--> statement-breakpoint
CREATE INDEX "anlagen_objekt_idx" ON "anlagen" USING btree ("mandant_id","objekt_id");--> statement-breakpoint
CREATE INDEX "audit_zeit_idx" ON "audit_ereignisse" USING btree ("mandant_id","am");--> statement-breakpoint
CREATE INDEX "audit_entitaet_idx" ON "audit_ereignisse" USING btree ("mandant_id","entitaet","entitaet_id");--> statement-breakpoint
CREATE INDEX "auftraege_gewaehrleistung_idx" ON "auftraege" USING btree ("mandant_id","gewaehrleistung_bis");--> statement-breakpoint
CREATE INDEX "buchungen_objekt_datum_idx" ON "buchungen" USING btree ("mandant_id","objekt_id","datum");--> statement-breakpoint
CREATE INDEX "dokumente_objekt_idx" ON "dokumente" USING btree ("mandant_id","objekt_id");--> statement-breakpoint
CREATE INDEX "eigentum_einheit_idx" ON "eigentumsverhaeltnisse" USING btree ("einheit_id","gueltig_von");--> statement-breakpoint
CREATE INDEX "eingangsrechnungen_status_idx" ON "eingangsrechnungen" USING btree ("mandant_id","status");--> statement-breakpoint
CREATE INDEX "einheit_flaechen_einheit_idx" ON "einheit_flaechen" USING btree ("einheit_id","gueltig_von");--> statement-breakpoint
CREATE INDEX "einheiten_mandant_objekt_idx" ON "einheiten" USING btree ("mandant_id","objekt_id");--> statement-breakpoint
CREATE INDEX "entscheidungen_vorschlag_idx" ON "entscheidungen" USING btree ("vorschlag_id");--> statement-breakpoint
CREATE INDEX "fristen_ablauf_idx" ON "fristen" USING btree ("mandant_id","status","ablauf_am");--> statement-breakpoint
CREATE INDEX "kontoumsaetze_offen_idx" ON "kontoumsaetze" USING btree ("mandant_id","zuordnung");--> statement-breakpoint
CREATE INDEX "kostenpositionen_objekt_jahr_idx" ON "kostenpositionen" USING btree ("mandant_id","objekt_id","jahr");--> statement-breakpoint
CREATE INDEX "mietkonditionen_vertrag_idx" ON "mietkonditionen" USING btree ("vertrag_id","gueltig_von");--> statement-breakpoint
CREATE INDEX "mietvertraege_einheit_idx" ON "mietvertraege" USING btree ("einheit_id","beginn");--> statement-breakpoint
CREATE INDEX "nachrichten_postfach_idx" ON "nachrichten" USING btree ("mandant_id","postfach_id","eingang_am");--> statement-breakpoint
CREATE INDEX "objekte_mandant_idx" ON "objekte" USING btree ("mandant_id");--> statement-breakpoint
CREATE INDEX "personen_mandant_idx" ON "personen" USING btree ("mandant_id");--> statement-breakpoint
CREATE INDEX "personen_iban_idx" ON "personen" USING btree ("mandant_id","iban");--> statement-breakpoint
CREATE INDEX "postfaecher_objekt_idx" ON "postfaecher" USING btree ("mandant_id","objekt_id");--> statement-breakpoint
CREATE INDEX "pruefpflichten_faellig_idx" ON "pruefpflichten" USING btree ("mandant_id","naechste_pruefung");--> statement-breakpoint
CREATE INDEX "sollstellungen_offen_idx" ON "sollstellungen" USING btree ("mandant_id","faellig_am");--> statement-breakpoint
CREATE INDEX "vorgaenge_status_idx" ON "vorgaenge" USING btree ("mandant_id","status","faellig_am");--> statement-breakpoint
CREATE INDEX "vorschlaege_offen_idx" ON "vorschlaege" USING btree ("mandant_id","status","prioritaet");--> statement-breakpoint
CREATE INDEX "zahlungszuordnungen_soll_idx" ON "zahlungszuordnungen" USING btree ("sollstellung_id");--> statement-breakpoint
CREATE POLICY "abrechnungslaeufe_mandant" ON "abrechnungslaeufe" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "agent_laeufe_mandant" ON "agent_laeufe" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "anlagen_mandant" ON "anlagen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "audit_mandant" ON "audit_ereignisse" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "auftraege_mandant" ON "auftraege" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "autonomie_regeln_mandant" ON "autonomie_regeln" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "bankkonten_mandant" ON "bankkonten" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "beschluesse_mandant" ON "beschluesse" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "buchungen_mandant" ON "buchungen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "dokumente_mandant" ON "dokumente" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "eigentumsverhaeltnisse_mandant" ON "eigentumsverhaeltnisse" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "eingangsrechnungen_mandant" ON "eingangsrechnungen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "einheit_flaechen_mandant" ON "einheit_flaechen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "einheiten_mandant" ON "einheiten" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "entscheidungen_mandant" ON "entscheidungen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "fristen_mandant" ON "fristen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "konten_mandant" ON "konten" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "kontoumsaetze_mandant" ON "kontoumsaetze" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "kostenpositionen_mandant" ON "kostenpositionen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "mietkonditionen_mandant" ON "mietkonditionen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "mietvertraege_mandant" ON "mietvertraege" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "modul_konfiguration_mandant" ON "modul_konfiguration" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "nachrichten_mandant" ON "nachrichten" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "nutzer_mandant" ON "nutzer" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "objekte_mandant" ON "objekte" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "person_rollen_mandant" ON "person_rollen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "personen_mandant" ON "personen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "postfaecher_mandant" ON "postfaecher" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "pruefpflichten_mandant" ON "pruefpflichten" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "sepa_mandate_mandant" ON "sepa_mandate" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "sollstellungen_mandant" ON "sollstellungen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "vertragsparteien_mandant" ON "vertragsparteien" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "vorgaenge_mandant" ON "vorgaenge" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "vorschlaege_mandant" ON "vorschlaege" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "zaehler_mandant" ON "zaehler" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "zaehlerstaende_mandant" ON "zaehlerstaende" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "zahlungszuordnungen_mandant" ON "zahlungszuordnungen" AS PERMISSIVE FOR ALL TO public USING (mandant_id = current_setting('immos.mandant_id', true)::uuid) WITH CHECK (mandant_id = current_setting('immos.mandant_id', true)::uuid);