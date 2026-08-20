/**
 * Agenten, Vorschläge, Autonomie, Nachweis
 * =============================================================================
 * Das Betriebssystem-Prinzip von ImmOS:
 *
 *   Ereignis  ->  Agent  ->  Vorschlag  ->  Entscheidung  ->  Ausführung  ->  Nachweis
 *
 * Der Verwalter arbeitet nicht mehr in Formularen, sondern entscheidet über
 * Vorschläge. Ein Vorschlag ist deshalb ein vollwertiges Domänenobjekt: er
 * enthält die geplanten Aktionen als Diff, die Belege, die Alternative, das
 * Risiko und die Frist. Wird er angenommen, führt das System exakt die
 * beschriebenen Aktionen aus — nichts anderes.
 */

import type { Cent, IsoDateTime } from "./types";
import type { ModuleId } from "./modules";

// ---------------------------------------------------------------------------
// Autonomie
// ---------------------------------------------------------------------------

/**
 * 0 beobachten   – Agent protokolliert nur, kein Vorschlag.
 * 1 vorschlagen  – Vorschlag wartet auf Zustimmung (Standard).
 * 2 handeln mit Widerspruchsfenster – Ausführung nach Ablauf, vorher stornierbar.
 * 3 autonom      – Ausführung sofort, Nachweis im Audit-Trail.
 */
export type Autonomiestufe = 0 | 1 | 2 | 3;

export const AUTONOMIE_LABELS: Record<Autonomiestufe, { kurz: string; lang: string }> = {
  0: { kurz: "Beobachten", lang: "Nur protokollieren, keine Vorschläge" },
  1: { kurz: "Vorschlagen", lang: "Jede Aktion braucht Zustimmung" },
  2: { kurz: "Widerspruch", lang: "Führt aus, wenn nicht innerhalb der Frist widersprochen wird" },
  3: { kurz: "Autonom", lang: "Führt sofort aus, Nachweis im Audit-Trail" },
};

export interface AutonomieRegel {
  prozess: string;
  bezeichnung: string;
  modulId: ModuleId;
  stufe: Autonomiestufe;
  /** Oberhalb dieser Grenze immer Stufe 1, unabhängig von der Einstellung. */
  betragsgrenzeCent: Cent | null;
  widerspruchsfensterMinuten: number;
  /** Statistik, aus der sich ein Aufstieg rechtfertigt. */
  faelle30Tage: number;
  zustimmungsquote: number;
  korrekturquote: number;
  /** Vom System vorgeschlagene nächste Stufe, wenn Kriterien erfüllt sind. */
  aufstiegEmpfohlen: boolean;
  /** Prozesse, die per Gesetz oder Haftung beim Menschen bleiben müssen. */
  maxStufe: Autonomiestufe;
  maxStufeGrund?: string;
}

// ---------------------------------------------------------------------------
// Agenten
// ---------------------------------------------------------------------------

export interface AgentDefinition {
  id: string;
  name: string;
  /** Was der Agent im Betrieb tatsächlich tut, in einem Satz. */
  rolle: string;
  modulId: ModuleId;
  trigger: string;
  entscheidet: string;
  eskalation: string;
  kpi: string;
  /** Werkzeuge, die der Agent aufrufen darf — begrenzt seinen Wirkungskreis. */
  werkzeuge: string[];
}

export interface AgentLauf {
  id: string;
  agentId: string;
  startAm: IsoDateTime;
  dauerMs: number;
  ausloeser: string;
  ergebnis: "vorschlag" | "ausgefuehrt" | "nichts_zu_tun" | "eskaliert" | "fehler";
  vorschlagId?: string;
  tokens?: number;
  kostenCent?: Cent;
  notiz?: string;
}

// ---------------------------------------------------------------------------
// Vorschlag (Kern der Decision Queue)
// ---------------------------------------------------------------------------

export type VorschlagKategorie =
  | "zahlung"
  | "buchung"
  | "kommunikation"
  | "beauftragung"
  | "frist"
  | "vertrag"
  | "abrechnung"
  | "eskalation"
  | "stammdaten";

export type VorschlagStatus =
  | "offen"
  | "zugestimmt"
  | "abgelehnt"
  | "geaendert_zugestimmt"
  | "automatisch_ausgefuehrt"
  | "abgelaufen"
  | "eskaliert";

/** Quelle, auf die sich der Vorschlag stützt. Ohne Beleg kein Vorschlag. */
export interface Beleg {
  art: "dokument" | "nachricht" | "buchung" | "vertrag" | "gesetz" | "beschluss" | "kennzahl";
  ref: string;
  titel: string;
  /** Wörtliches Zitat oder Wert — macht die Begründung prüfbar. */
  zitat: string;
}

export type AktionArt =
  | "mail_senden"
  | "buchen"
  | "zahlung_einreichen"
  | "auftrag_erteilen"
  | "frist_setzen"
  | "status_aendern"
  | "dokument_erzeugen"
  | "stammdaten_aendern"
  | "termin_vereinbaren";

export interface Feldaenderung {
  feld: string;
  vorher: string;
  nachher: string;
}

export interface Aktion {
  art: AktionArt;
  beschreibung: string;
  /** Konkreter Diff — das ist die Vorschau, die der Nutzer prüft. */
  aenderungen?: Feldaenderung[];
  /** Bei Kommunikation: der fertige Text, der rausgeht. */
  entwurf?: string;
  betragCent?: Cent;
  empfaenger?: string;
}

export interface Alternative {
  titel: string;
  begruendung: string;
  /** Konsequenz in einem Satz — hilft, in 3 Sekunden zu entscheiden. */
  folge: string;
}

export interface Vorschlag {
  id: string;
  agentId: string;
  kategorie: VorschlagKategorie;
  /** Prozessschlüssel für die Autonomie-Matrix. */
  prozess: string;
  titel: string;
  /** Der Satz, der auf der Karte steht: Was ist zu entscheiden? */
  kurzfassung: string;
  begruendung: string;
  objektId: string | null;
  einheitId?: string;
  vorgangId?: string;
  betragCent?: Cent;
  belege: Beleg[];
  aktionen: Aktion[];
  alternativen: Alternative[];
  risiko: "niedrig" | "mittel" | "hoch";
  reversibel: boolean;
  konfidenz: number;
  autonomiestufe: Autonomiestufe;
  /** Nur bei Stufe 2: Zeitpunkt der automatischen Ausführung. */
  ausfuehrungAm?: IsoDateTime;
  /** Frist, bis zu der entschieden sein muss (z. B. Skonto, Klagefrist). */
  entscheidenBis?: IsoDateTime;
  status: VorschlagStatus;
  erstelltAm: IsoDateTime;
  /** Geschätzte Zeitersparnis gegenüber manueller Bearbeitung. */
  zeitersparnisMinuten: number;
  /** Sortiergewicht der Queue: Haftung > Geld > Zeit. */
  prioritaet: number;
  /** Warum dieser Vorschlag trotz hoher Autonomie vorgelegt wird. */
  vorlageGrund?: string;
  entscheidung?: Entscheidung;
}

export interface Entscheidung {
  vorschlagId: string;
  entscheiderId: string;
  entscheidung: "zustimmen" | "ablehnen" | "aendern" | "delegieren" | "zurueckstellen";
  am: IsoDateTime;
  /** Ablehnungsgrund fließt in das Training der Regeln zurück. */
  grund?: string;
  aenderungen?: Feldaenderung[];
  /** Sekunden zwischen Anzeige und Entscheidung — erkennt Blindklicken. */
  entscheidungsdauerSek?: number;
}

// ---------------------------------------------------------------------------
// Nachweis
// ---------------------------------------------------------------------------

export interface AuditEreignis {
  id: string;
  am: IsoDateTime;
  akteurArt: "mensch" | "agent" | "system" | "extern";
  akteurId: string;
  akteurName: string;
  aktion: string;
  objektId?: string;
  entitaet: string;
  entitaetId: string;
  vorschlagId?: string;
  aenderungen?: Feldaenderung[];
  /** Nachweis, dass eine Ausführung durch eine Entscheidung gedeckt war. */
  legitimation?: "entscheidung" | "autonomie_stufe" | "gesetzlich" | "beschluss";
}

// ---------------------------------------------------------------------------
// Cockpit-Chat
// ---------------------------------------------------------------------------

export interface ChatNachricht {
  id: string;
  rolle: "nutzer" | "immos" | "system";
  text: string;
  am: IsoDateTime;
  /** Vorschläge, die in der Antwort als entscheidbare Karten erscheinen. */
  vorschlagIds?: string[];
  belege?: Beleg[];
  /** Wurde die Eingabe diktiert? Steuert, ob die Antwort vorgelesen wird. */
  perSprache?: boolean;
  /** Vom Assistenten erkannte Absicht, für Telemetrie und Tests. */
  intent?: string;
  laufendeAktion?: string;
}

export interface KennzahlSnapshot {
  id: string;
  bezeichnung: string;
  wert: number;
  einheit: "eur" | "prozent" | "anzahl" | "tage" | "stunden";
  /** Veränderung gegenüber Vorperiode, als Faktor (0,08 = +8 %). */
  trend: number;
  /** Bewertung aus Sicht des Betriebs, nicht mathematisch. */
  richtung: "gut" | "neutral" | "schlecht";
  hinweis?: string;
  modulId?: ModuleId;
}
