/**
 * Buchhaltung, Zahlungsverkehr, Abrechnung
 * =============================================================================
 * Grundsatz für den gesamten Finanzteil von ImmOS:
 *
 *   Die Engine rechnet. Das Sprachmodell erklärt, kontiert vor und findet
 *   Auffälligkeiten — es rechnet nie.
 *
 * Jede Zahl in einer Abrechnung, einer Sollstellung oder einem Zahlungsvorschlag
 * stammt aus deterministischem Code mit Testabdeckung. Ein LLM darf Beträge
 * vorschlagen (Kontierung, Zuordnung), aber niemals summieren oder verteilen.
 */

import type { Cent, IsoDate, IsoDateTime } from "./types";

// ---------------------------------------------------------------------------
// Kontenrahmen & Journal
// ---------------------------------------------------------------------------

export type Kontoart =
  | "ertrag"
  | "aufwand"
  | "forderung"
  | "verbindlichkeit"
  | "bank"
  | "kasse"
  | "ruecklage"
  | "kaution"
  | "abgrenzung"
  | "kapital";

export interface Konto {
  nummer: string;
  bezeichnung: string;
  art: Kontoart;
  /** Umlagefähigkeit nach BetrKV — steuert die Betriebskostenabrechnung. */
  umlagefaehig?: boolean;
  /** Standard-Umlageschlüssel, wenn die Kostenart umgelegt wird. */
  standardSchluessel?: UmlageschluesselId;
  /** BetrKV-Fundstelle, damit die Umlage begründbar ist. */
  betrkv?: string;
  /** §35a EStG: begünstigter Anteil (Handwerkerleistung/haushaltsnahe Dienstleistung). */
  paragraf35a?: "handwerker" | "haushaltsnah" | null;
}

export interface Buchung {
  id: string;
  /** Fortlaufende, lückenlose Journalnummer (GoBD). */
  journalNr: number;
  objektId: string;
  einheitId?: string;
  belegId?: string;
  belegNr: string;
  datum: IsoDate;
  /** Leistungszeitraum — entscheidend für die periodengerechte Umlage. */
  leistungVon?: IsoDate;
  leistungBis?: IsoDate;
  sollKonto: string;
  habenKonto: string;
  betragCent: Cent;
  ustSatz: 0 | 7 | 19;
  ustBetragCent: Cent;
  text: string;
  /** Festgeschrieben = unveränderbar. Korrektur nur per Storno. */
  festgeschrieben: boolean;
  stornoVonId?: string;
  erfasstVon: "mensch" | "agent" | "system" | "import";
  agentId?: string;
  erfasstAm: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Sollstellung & offene Posten
// ---------------------------------------------------------------------------

export type SollArt =
  | "miete_kalt"
  | "bk_vorauszahlung"
  | "hk_vorauszahlung"
  | "stellplatz"
  | "hausgeld"
  | "ruecklage"
  | "sonderumlage"
  | "nachzahlung"
  | "mahngebuehr";

export interface Sollstellung {
  id: string;
  objektId: string;
  einheitId: string;
  vertragId?: string;
  /** Abrechnungsmonat, Format YYYY-MM. */
  periode: string;
  art: SollArt;
  betragCent: Cent;
  faelligAm: IsoDate;
  /** Bereits zugeordnete Zahlungen. */
  bezahltCent: Cent;
  status: "offen" | "teilbezahlt" | "bezahlt" | "storniert";
  mahnstufe: 0 | 1 | 2 | 3;
  buchungId?: string;
}

export interface Kontoumsatz {
  id: string;
  bankkontoId: string;
  objektId: string | null;
  buchungstag: IsoDate;
  valuta: IsoDate;
  betragCent: Cent;
  gegenkontoName: string;
  gegenkontoIban?: string;
  verwendungszweck: string;
  /** SEPA-Referenzen aus camt.053 — die beste Matching-Grundlage. */
  endToEndId?: string;
  mandatsreferenz?: string;
  zuordnung: Zuordnungsstatus;
  zugeordneteSollIds: string[];
  /** Konfidenz des Matching-Vorschlags, 0–1. */
  matchKonfidenz?: number;
  matchBegruendung?: string;
}

export type Zuordnungsstatus = "offen" | "vorgeschlagen" | "zugeordnet" | "unklar" | "rueckbuchung";

export interface SepaMandat {
  id: string;
  vertragId: string;
  personId: string;
  mandatsreferenz: string;
  iban: string;
  unterschriftAm: IsoDate;
  art: "core" | "b2b";
  letzteNutzung?: IsoDate;
  /** Ein Core-Mandat verfällt 36 Monate nach der letzten Nutzung. */
  aktiv: boolean;
}

// ---------------------------------------------------------------------------
// Rechnungseingang
// ---------------------------------------------------------------------------

export type BelegFormat = "zugferd" | "xrechnung" | "pdf_ocr" | "papier_scan" | "manuell";

export interface Eingangsrechnung {
  id: string;
  objektId: string | null;
  einheitId?: string;
  /** Postfach, über das der Beleg kam — Grundlage der Objektzuordnung. */
  postfachId?: string;
  nachrichtId?: string;
  format: BelegFormat;
  kreditorId: string | null;
  kreditorNameRoh: string;
  rechnungsNr: string;
  rechnungsdatum: IsoDate;
  leistungVon?: IsoDate;
  leistungBis?: IsoDate;
  faelligAm: IsoDate;
  skontoBis?: IsoDate;
  skontoProzent?: number;
  bruttoCent: Cent;
  nettoCent: Cent;
  ustCent: Cent;
  ustSatz: 0 | 7 | 19;
  iban?: string;
  /** Vorkontierung durch den Agenten — Konto + Umlagefähigkeit. */
  kontoVorschlag?: string;
  umlagefaehigVorschlag?: boolean;
  auftragId?: string;
  status: RechnungStatus;
  pruefung: Rechnungspruefung;
  extraktionsKonfidenz: number;
  dokumentId: string;
  eingangAm: IsoDateTime;
}

export type RechnungStatus =
  | "eingegangen"
  | "geprueft"
  | "freigabe_erforderlich"
  | "freigegeben"
  | "zahlung_beauftragt"
  | "bezahlt"
  | "abgelehnt"
  | "reklamation";

/** Ergebnis der maschinellen Prüfung — jeder Punkt ist einzeln begründet. */
export interface Rechnungspruefung {
  formalOk: boolean;
  /** §14 UStG Pflichtangaben vollständig. */
  ustAngabenOk: boolean;
  rechnerischOk: boolean;
  /** Gegen Auftrag/Angebot/Wartungsvertrag geprüft. */
  sachlichOk: boolean | null;
  duplikatVerdacht: boolean;
  duplikatVon?: string;
  /** Abweichende IBAN gegenüber Kreditorenstamm = Betrugsindikator. */
  ibanAbweichung: boolean;
  preisAbweichungProzent?: number;
  hinweise: string[];
}

export interface Zahlungsvorschlag {
  id: string;
  rechnungIds: string[];
  bankkontoId: string;
  summeCent: Cent;
  ausfuehrungAm: IsoDate;
  skontoErsparnisCent: Cent;
  status: "vorgeschlagen" | "freigegeben" | "eingereicht" | "ausgefuehrt" | "abgelehnt";
  /** Vier-Augen-Prinzip: zweite Freigabe ab Betragsgrenze. */
  zweiteFreigabeErforderlich: boolean;
  freigabeVon?: string[];
}

export interface Mahnstufenkonfiguration {
  stufe: 1 | 2 | 3;
  tageNachFaelligkeit: number;
  gebuehrCent: Cent;
  verzugszinsen: boolean;
  ton: "freundlich" | "sachlich" | "letzte_frist";
  automatisch: boolean;
}

// ---------------------------------------------------------------------------
// Umlage & Abrechnung
// ---------------------------------------------------------------------------

export type UmlageschluesselId =
  | "wohnflaeche"
  | "personen"
  | "einheiten"
  | "mea"
  | "verbrauch_waerme"
  | "verbrauch_wasser"
  | "direktzuordnung"
  | "nicht_umlegen";

export interface Umlageschluessel {
  id: UmlageschluesselId;
  bezeichnung: string;
  /** Kurzbegründung, die in der Abrechnung als Erläuterung erscheint. */
  erklaerung: string;
  /** Zeitanteilige Berücksichtigung bei Mieterwechsel. */
  zeitanteilig: boolean;
}

export interface Kostenposition {
  id: string;
  objektId: string;
  jahr: number;
  kontoNr: string;
  bezeichnung: string;
  betragCent: Cent;
  umlagefaehig: boolean;
  schluessel: UmlageschluesselId;
  /** Vorwegabzug z. B. für Gewerbeanteil oder Leerstand. */
  vorwegabzugCent: Cent;
  /** Anteil §35a EStG für die Bescheinigung. */
  paragraf35aCent: Cent;
  belegIds: string[];
}

export interface Abrechnungslauf {
  id: string;
  objektId: string;
  jahr: number;
  art: "betriebskosten" | "heizkosten" | "weg_jahresabrechnung" | "eigentuemer_sev";
  status: "vorbereitung" | "berechnet" | "geprueft" | "versendet" | "beschlossen";
  /** §556 Abs. 3 BGB: Abrechnung bis Ende des Folgejahres. */
  fristAm: IsoDate;
  einheitenGesamt: number;
  einheitenGeprueft: number;
  gesamtkostenCent: Cent;
  umlagefaehigCent: Cent;
  nachzahlungenCent: Cent;
  guthabenCent: Cent;
  /** Vom Agenten gefundene Auffälligkeiten (Vorjahresvergleich, Ausreißer). */
  auffaelligkeiten: string[];
}

/** Ergebnis für eine Einheit — mit vollständigem Rechenweg für die Prüfung. */
export interface Abrechnungsergebnis {
  einheitId: string;
  nutzerName: string;
  zeitraumVon: IsoDate;
  zeitraumBis: IsoDate;
  tage: number;
  positionen: Abrechnungsposition[];
  summeUmlageCent: Cent;
  vorauszahlungCent: Cent;
  /** Positiv = Nachzahlung, negativ = Guthaben. */
  saldoCent: Cent;
  paragraf35aCent: Cent;
}

export interface Abrechnungsposition {
  kostenpositionId: string;
  bezeichnung: string;
  gesamtkostenCent: Cent;
  vorwegabzugCent: Cent;
  verteilbarCent: Cent;
  schluessel: UmlageschluesselId;
  /** Bezugsgröße der Einheit (z. B. 72,4 m²) und des Objekts (1.842 m²). */
  anteilEinheit: number;
  anteilGesamt: number;
  zeitanteil: number;
  anteilCent: Cent;
  /** Ein Satz, der den Rechenweg erklärt — erscheint in der Mieterabrechnung. */
  rechenweg: string;
}
