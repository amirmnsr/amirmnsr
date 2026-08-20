/**
 * Betrieb: Vorgänge, Technik, Fristen, Kommunikation, Dokumente
 * =============================================================================
 * Alles, was im Tagesgeschäft eintrifft, wird genau ein Objekt: ein `Vorgang`.
 * Herkunft (Mail, Anruf, Portal, Sensor) ist ein Attribut, kein eigener Prozess.
 * Damit gibt es genau eine Warteschlange und genau eine Definition von "erledigt".
 */

import type { Cent, Gewerk, IsoDate, IsoDateTime } from "./types";

export type Kanal = "email" | "telefon" | "brief" | "portal" | "whatsapp" | "sensor" | "intern";

export type VorgangKategorie =
  | "schaden"
  | "mietanfrage"
  | "abrechnungsfrage"
  | "zahlungsstoerung"
  | "kuendigung"
  | "vertragsaenderung"
  | "hausordnung"
  | "rechnung"
  | "wartung"
  | "pruefpflicht"
  | "versammlung"
  | "vermietung"
  | "behoerde"
  | "versicherung"
  | "sonstiges";

export type Prioritaet = "notfall" | "hoch" | "normal" | "niedrig";

export type VorgangStatus =
  | "neu"
  | "in_pruefung"
  | "wartet_auf_entscheidung"
  | "beauftragt"
  | "wartet_extern"
  | "erledigt"
  | "abgelehnt";

export interface Vorgang {
  id: string;
  nummer: string;
  titel: string;
  kategorie: VorgangKategorie;
  objektId: string;
  einheitId?: string;
  /** Wer den Vorgang ausgelöst hat. */
  melderId?: string;
  kanal: Kanal;
  prioritaet: Prioritaet;
  status: VorgangStatus;
  bearbeiterId?: string;
  /** Vom Agenten gesetzte Zusammenfassung — was ist zu tun, in einem Satz. */
  zusammenfassung: string;
  erstelltAm: IsoDateTime;
  faelligAm?: IsoDate;
  /** Zugesagte Reaktionszeit gegenüber dem Melder. */
  slaStunden?: number;
  /** Verknüpfungen: Aufträge, Rechnungen, Nachrichten, Dokumente. */
  auftragIds: string[];
  nachrichtIds: string[];
  dokumentIds: string[];
  /** Vorgänge, die derselbe Ursache haben (z. B. 6 Meldungen "Heizung kalt"). */
  gruppeId?: string;
  kostenSchaetzungCent?: Cent;
  /** Vom Agenten erkannter Prozess mit definierten Schritten. */
  playbookId?: string;
  schrittIndex?: number;
}

export interface Auftrag {
  id: string;
  nummer: string;
  vorgangId: string;
  objektId: string;
  einheitId?: string;
  dienstleisterId: string;
  gewerk: Gewerk;
  beschreibung: string;
  status: "angefragt" | "angebot_erhalten" | "beauftragt" | "terminiert" | "ausgefuehrt" | "abgenommen" | "reklamation";
  beauftragtAm?: IsoDate;
  terminAm?: IsoDateTime;
  budgetCent?: Cent;
  angebotCent?: Cent;
  rechnungCent?: Cent;
  /** Gewährleistungsende — der teuerste vergessene Termin der Branche. */
  gewaehrleistungBis?: IsoDate;
  /** Bei WEG: Beschluss, der die Beauftragung deckt. */
  beschlussId?: string;
  versicherungsfallId?: string;
}

export interface Anlage {
  id: string;
  objektId: string;
  bezeichnung: string;
  art: AnlagenArt;
  hersteller?: string;
  baujahr?: number;
  standort: string;
  /** Wartungsvertrag, der die Anlage abdeckt. */
  wartungsvertragId?: string;
  naechstePruefung?: IsoDate;
  zustand: "gut" | "mittel" | "schlecht" | "defekt";
  restnutzungsdauerJahre?: number;
}

export type AnlagenArt =
  | "heizung"
  | "aufzug"
  | "trinkwasser"
  | "rauchwarnmelder"
  | "feuerloescher"
  | "elektro"
  | "blitzschutz"
  | "lueftung"
  | "spielplatz"
  | "garagentor"
  | "fettabscheider"
  | "baum";

/**
 * Prüf- und Betreiberpflicht. Die Rechtsgrundlage steht als Text am Datensatz,
 * damit in der Abrechnung und im Haftungsreport nachvollziehbar ist, warum
 * geprüft wurde — und damit ein Update der Rechtslage nur Daten ändert.
 */
export interface Pruefpflicht {
  id: string;
  anlageId: string;
  objektId: string;
  bezeichnung: string;
  rechtsgrundlage: string;
  intervallMonate: number;
  letztePruefung?: IsoDate;
  naechstePruefung: IsoDate;
  status: "erfuellt" | "faellig" | "ueberfaellig" | "unbekannt";
  zustaendigerId?: string;
  nachweisDokumentId?: string;
  /** Konsequenz bei Versäumnis — Grundlage der Priorisierung. */
  haftungsrisiko: "hoch" | "mittel" | "gering";
}

export type FristArt =
  | "gesetzlich"
  | "vertraglich"
  | "behoerdlich"
  | "gerichtlich"
  | "selbst_gesetzt";

export interface Frist {
  id: string;
  bezeichnung: string;
  art: FristArt;
  rechtsgrundlage?: string;
  objektId?: string;
  einheitId?: string;
  vorgangId?: string;
  ablaufAm: IsoDate;
  /** Vorlauf, ab dem der Wächter eskaliert. */
  vorlaufTage: number;
  status: "offen" | "in_arbeit" | "gewahrt" | "versaeumt";
  verantwortlicherId?: string;
  /** Was passiert, wenn die Frist reißt. */
  konsequenz: string;
  eskalationsstufe: 0 | 1 | 2 | 3;
}

export interface Nachricht {
  id: string;
  richtung: "eingang" | "ausgang";
  kanal: Kanal;
  postfachId?: string;
  objektId: string | null;
  einheitId?: string;
  vorgangId?: string;
  absender: string;
  absenderName: string;
  empfaenger: string[];
  betreff: string;
  /** Vorschau/Volltext im Prototyp; produktiv liegt der Body im Storage. */
  body: string;
  anhaenge: Anhang[];
  eingangAm: IsoDateTime;
  gelesen: boolean;
  /** Ergebnis der KI-Triage. */
  intent?: string;
  intentKonfidenz?: number;
  stimmung?: "neutral" | "verärgert" | "dringlich" | "freundlich" | "sachlich";
  /** Sicherheitsprüfung des Eingangs. */
  sicherheit: NachrichtSicherheit;
  threadId: string;
}

export interface Anhang {
  id: string;
  name: string;
  mime: string;
  groesseBytes: number;
  /** Erkanntes Format: ZUGFeRD/XRechnung werden strukturiert gelesen. */
  erkanntAls?: "zugferd" | "xrechnung" | "pdf" | "bild" | "office" | "unbekannt";
  sha256: string;
}

export interface NachrichtSicherheit {
  spfOk: boolean;
  dkimOk: boolean;
  dmarcOk: boolean;
  /** Enthält der Text Anweisungen an die KI? Dann nur als Daten behandeln. */
  promptInjektionVerdacht: boolean;
  absenderBekannt: boolean;
  anhangGeprueft: boolean;
}

export interface Dokument {
  id: string;
  objektId: string | null;
  einheitId?: string;
  vorgangId?: string;
  titel: string;
  art: DokumentArt;
  /** Ablageort im Aktenplan, z. B. "04 Verträge / 04.2 Wartung". */
  aktenplan: string;
  dateiname: string;
  mime: string;
  groesseBytes: number;
  seiten?: number;
  erstelltAm: IsoDateTime;
  /** Aufbewahrungsfrist nach HGB/AO bzw. DSGVO-Löschfrist. */
  aufbewahrungBis?: IsoDate;
  sha256: string;
  ocrText?: string;
  vertraulich: boolean;
}

export type DokumentArt =
  | "mietvertrag"
  | "rechnung"
  | "angebot"
  | "protokoll"
  | "beschluss"
  | "abrechnung"
  | "kontoauszug"
  | "gutachten"
  | "nachweis"
  | "korrespondenz"
  | "foto"
  | "plan"
  | "versicherung"
  | "sonstiges";

/** Beschluss einer Eigentümerversammlung (Modul WEG). */
export interface Beschluss {
  id: string;
  objektId: string;
  versammlungId?: string;
  laufendeNr: number;
  datum: IsoDate;
  gegenstand: string;
  wortlaut: string;
  ergebnis: "angenommen" | "abgelehnt" | "vertagt";
  jaStimmen: number;
  neinStimmen: number;
  enthaltungen: number;
  /** §23 Abs. 3 WEG: Umlaufbeschluss statt Versammlung. */
  umlaufbeschluss: boolean;
  /** §45 WEG: einmonatige Anfechtungsfrist ab Beschlussfassung. */
  anfechtungsfristBis: IsoDate;
  budgetCent?: Cent;
  umsetzungStatus: "offen" | "in_umsetzung" | "umgesetzt" | "hinfaellig";
}
