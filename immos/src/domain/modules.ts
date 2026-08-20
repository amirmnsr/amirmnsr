/**
 * Modul-Registry
 * =============================================================================
 * ImmOS wird bei der Ersteinrichtung zusammengesteckt: eine Verwaltung, die nur
 * Mietverwaltung macht, sieht nichts von WEG. Module sind daher keine
 * Feature-Flags im Code, sondern ein Datensatz pro Mandant — inklusive
 * Abhängigkeiten, damit man kein inkonsistentes System aktivieren kann.
 *
 * Regel: Jede Route, jeder Agent und jede Kennzahl deklariert ihr Modul.
 * Ist das Modul aus, existiert die Funktion für den Nutzer nicht.
 */

export type ModuleId =
  // Kern (nicht abwählbar)
  | "kern"
  | "posteingang"
  | "aufgaben"
  | "dokumente"
  | "fristen"
  // Verwaltungsarten
  | "miete"
  | "sev"
  | "weg"
  | "gewerbe"
  // Fachmodule
  | "buchhaltung"
  | "zahlungsverkehr"
  | "betriebskosten"
  | "technik"
  | "vermietung"
  | "versammlung"
  | "reporting"
  // Assistenz
  | "cockpit_voice"
  | "autonomie";

export type ModuleCategory = "kern" | "verwaltungsart" | "fachmodul" | "assistenz";

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  /** Ein Satz, den ein Verwalter ohne Software-Vorkenntnisse versteht. */
  claim: string;
  category: ModuleCategory;
  /** Kern-Module lassen sich nicht abschalten. */
  locked?: boolean;
  defaultEnabled: boolean;
  /** Ohne diese Module ist das Modul fachlich nicht sinnvoll betreibbar. */
  requires: ModuleId[];
  /** Was der Nutzer nach dem Aktivieren zusätzlich sieht. */
  unlocks: string[];
  /** Agenten, die dieses Modul aktiviert (IDs aus dem Agenten-Katalog). */
  agents: string[];
  /** Fachliche Warnung/Hinweis für die Einrichtung. */
  hinweis?: string;
}

export const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    id: "kern",
    name: "Stammdaten & Objektakte",
    claim: "Objekte, Einheiten, Personen, Verträge und die digitale Objektakte.",
    category: "kern",
    locked: true,
    defaultEnabled: true,
    requires: [],
    unlocks: ["Objektakte", "Kontakte", "Audit-Trail"],
    agents: ["stammdaten_pfleger"],
  },
  {
    id: "posteingang",
    name: "Posteingang & objektbezogene Adressen",
    claim: "Eigene E-Mail-Adressen je Objekt und Zweck, KI-Triage jedes Eingangs.",
    category: "kern",
    locked: true,
    defaultEnabled: true,
    requires: ["kern"],
    unlocks: ["Posteingang", "Adressverwaltung je Objekt", "Auto-Antworten"],
    agents: ["triage", "korrespondenz"],
  },
  {
    id: "aufgaben",
    name: "Aufgaben & Vorgänge",
    claim: "Jede Anfrage wird ein Vorgang mit Verantwortlichem, Frist und Verlauf.",
    category: "kern",
    locked: true,
    defaultEnabled: true,
    requires: ["kern"],
    unlocks: ["Board", "Liste", "Timeline", "Meine Woche"],
    agents: ["vorgangs_dispatcher"],
  },
  {
    id: "dokumente",
    name: "Dokumente & Archiv",
    claim: "Revisionssichere Ablage mit Aktenplan, OCR und Aufbewahrungsfristen.",
    category: "kern",
    locked: true,
    defaultEnabled: true,
    requires: ["kern"],
    unlocks: ["Dokumentenarchiv", "Volltextsuche", "Löschkonzept"],
    agents: ["dokument_klassifizierer"],
  },
  {
    id: "fristen",
    name: "Fristenwächter",
    claim: "Gesetzliche und vertragliche Fristen werden überwacht, nicht erinnert.",
    category: "kern",
    locked: true,
    defaultEnabled: true,
    requires: ["kern"],
    unlocks: ["Fristenmonitor", "Eskalationsstufen", "Haftungsreport"],
    agents: ["fristenwaechter"],
  },

  {
    id: "miete",
    name: "Mietverwaltung",
    claim: "Mietverhältnisse, Sollstellung, Mahnwesen, Mieterwechsel, Kaution.",
    category: "verwaltungsart",
    defaultEnabled: true,
    requires: ["kern"],
    unlocks: ["Mietverträge", "Mieterwechsel-Prozess", "Kautionskonten", "Mahnstufen"],
    agents: ["mahnwesen", "mieterwechsel", "mietanpassung"],
  },
  {
    id: "sev",
    name: "Sondereigentumsverwaltung (SEV)",
    claim: "Einzeleigentümer als Auftraggeber: Eigentümerabrechnung und §35a-Nachweis.",
    category: "verwaltungsart",
    defaultEnabled: true,
    requires: ["kern", "miete"],
    unlocks: ["Eigentümerabrechnung", "§35a EStG-Bescheinigung", "Eigentümer-Portal"],
    agents: ["eigentuemer_reporting"],
    hinweis:
      "SEV setzt Mietverwaltung voraus — abgerechnet wird gegenüber dem Eigentümer der Einheit.",
  },
  {
    id: "weg",
    name: "WEG-Verwaltung",
    claim: "Gemeinschaften: Wirtschaftsplan, Jahresabrechnung, Versammlung, Beschlüsse.",
    category: "verwaltungsart",
    defaultEnabled: false,
    requires: ["kern", "buchhaltung"],
    unlocks: [
      "Wirtschaftsplan",
      "Jahresabrechnung & Vermögensbericht",
      "Beschluss-Sammlung",
      "Erhaltungsrücklage",
    ],
    agents: ["weg_abrechnung", "beschluss_pruefer", "hausgeld_mahnung"],
    hinweis:
      "Aktiviert eigene Rechnungslegung je Gemeinschaft (GdWE) inklusive Vermögensbericht.",
  },
  {
    id: "gewerbe",
    name: "Gewerbe & Asset Management",
    claim: "Gewerbemietverträge: Umsatzsteueroption, Index- und Umsatzmieten, Reporting.",
    category: "verwaltungsart",
    defaultEnabled: false,
    requires: ["kern", "miete"],
    unlocks: ["Index-/Staffelautomatik", "USt-Option je Einheit", "Asset-Reporting", "Mietvertrags-Optionen"],
    agents: ["indexmiete", "asset_reporting"],
    hinweis:
      "Schaltet die Option zur umsatzsteuerpflichtigen Vermietung und den Vorsteuerschlüssel frei.",
  },

  {
    id: "buchhaltung",
    name: "Buchhaltung",
    claim: "Objektbuchhaltung, Belegkette, Vorkontierung, DATEV-Übergabe.",
    category: "fachmodul",
    defaultEnabled: true,
    requires: ["kern"],
    unlocks: ["Journal", "Offene Posten", "Rechnungseingang", "DATEV-Export"],
    agents: ["rechnungspruefer", "kontierer"],
  },
  {
    id: "zahlungsverkehr",
    name: "Zahlungsverkehr & Bank",
    claim: "SEPA-Lastschrift und Überweisung, Kontoumsätze, automatisches Matching.",
    category: "fachmodul",
    defaultEnabled: true,
    requires: ["buchhaltung"],
    unlocks: ["Zahlläufe", "SEPA-Mandate", "Kontoauszug-Import", "Zahlungsfreigabe"],
    agents: ["zahlungsmatcher", "zahllauf"],
    hinweis: "Zahlungen sind immer freigabepflichtig — Vier-Augen-Prinzip ist nicht abschaltbar.",
  },
  {
    id: "betriebskosten",
    name: "Betriebs- & Heizkostenabrechnung",
    claim: "Umlage nach BetrKV, HeizkostenV und CO₂-Kostenaufteilung — mit Rechenweg.",
    category: "fachmodul",
    defaultEnabled: true,
    requires: ["buchhaltung"],
    unlocks: ["Abrechnungsläufe", "Umlageschlüssel", "Zählerverwaltung", "Widerspruchsassistent"],
    agents: ["abrechnung", "widerspruch"],
  },
  {
    id: "technik",
    name: "Technik, Wartung & Betreiberpflichten",
    claim: "Anlagen, Prüfpflichten, Schadenmanagement, Handwerkersteuerung.",
    category: "fachmodul",
    defaultEnabled: true,
    requires: ["kern", "aufgaben"],
    unlocks: ["Anlagenregister", "Prüfpflichten-Kalender", "Aufträge & Angebote", "Gewährleistung"],
    agents: ["schaden_dispatcher", "pruefpflicht", "angebotsvergleich"],
  },
  {
    id: "vermietung",
    name: "Vermietung & Leerstand",
    claim: "Von der Kündigung zum Neuvertrag: Exposé, Bewerber, Vertrag, Übergabe.",
    category: "fachmodul",
    defaultEnabled: false,
    requires: ["miete"],
    unlocks: ["Leerstandspipeline", "Bewerbermanagement", "Portal-Export (OpenImmo)", "Übergabeprotokoll"],
    agents: ["vermietung", "bewerber_scoring"],
  },
  {
    id: "versammlung",
    name: "Eigentümerversammlung",
    claim: "Einladung, Stimmrechte, Live-Protokoll, automatische Beschluss-Sammlung.",
    category: "fachmodul",
    defaultEnabled: false,
    requires: ["weg"],
    unlocks: ["Versammlungsplaner", "Vollmachten", "Abstimmungsmodul", "Beschluss-Sammlung"],
    agents: ["versammlung"],
  },
  {
    id: "reporting",
    name: "Reporting & Kennzahlen",
    claim: "Eigentümer, Beirat und Steuerberater bekommen Zahlen ohne Nachfrage.",
    category: "fachmodul",
    defaultEnabled: true,
    requires: ["kern"],
    unlocks: ["Kennzahlen-Dashboard", "Berichtsvorlagen", "Automatischer Versand"],
    agents: ["reporting"],
  },

  {
    id: "cockpit_voice",
    name: "Sprachsteuerung",
    claim: "Diktat, Sprachbefehle und Vorlesen von Vorgängen — freihändig arbeiten.",
    category: "assistenz",
    defaultEnabled: true,
    requires: ["kern"],
    unlocks: ["Push-to-Talk", "Sprachbefehle", "Vorlesen", "Diktat in Vorgänge"],
    agents: ["voice"],
    hinweis:
      "Im Großraumbüro standardmäßig als Push-to-Talk mit stiller Ausgabe konfigurieren (Datenschutz).",
  },
  {
    id: "autonomie",
    name: "Autonomie-Stufen",
    claim: "Pro Prozess festlegen, ob ImmOS beobachtet, vorschlägt oder selbst handelt.",
    category: "assistenz",
    defaultEnabled: true,
    requires: ["kern"],
    unlocks: ["Autonomie-Matrix", "Betragsgrenzen", "Widerspruchsfenster", "Aufstiegskriterien"],
    agents: [],
  },
] as const;

export const MODULE_MAP: Record<ModuleId, ModuleDefinition> = Object.fromEntries(
  MODULE_DEFINITIONS.map((m) => [m.id, m]),
) as Record<ModuleId, ModuleDefinition>;

export type ModuleConfig = Record<ModuleId, boolean>;

export function defaultModuleConfig(): ModuleConfig {
  return Object.fromEntries(
    MODULE_DEFINITIONS.map((m) => [m.id, m.locked || m.defaultEnabled]),
  ) as ModuleConfig;
}

export function isModuleEnabled(config: ModuleConfig, id: ModuleId | undefined): boolean {
  if (!id) return true;
  return config[id] === true;
}

/**
 * Schaltet ein Modul und zieht Abhängigkeiten mit: Einschalten aktiviert alle
 * Voraussetzungen, Ausschalten deaktiviert alles, was darauf aufbaut.
 * So kann die Einrichtung keinen widersprüchlichen Zustand erzeugen.
 */
export function toggleModule(config: ModuleConfig, id: ModuleId, enabled: boolean): ModuleConfig {
  const next = { ...config };
  const def = MODULE_MAP[id];
  if (def.locked) return next;

  if (enabled) {
    const activate = (moduleId: ModuleId) => {
      if (next[moduleId]) return;
      next[moduleId] = true;
      MODULE_MAP[moduleId].requires.forEach(activate);
    };
    activate(id);
  } else {
    const deactivate = (moduleId: ModuleId) => {
      if (MODULE_MAP[moduleId].locked) return;
      next[moduleId] = false;
      MODULE_DEFINITIONS.filter((m) => m.requires.includes(moduleId)).forEach((m) =>
        deactivate(m.id),
      );
    };
    deactivate(id);
  }
  return next;
}

/** Module, die durch das Abschalten von `id` mitgehen — für die Warnung in der UI. */
export function dependentModules(config: ModuleConfig, id: ModuleId): ModuleId[] {
  const before = config;
  const after = toggleModule(config, id, false);
  return (Object.keys(after) as ModuleId[]).filter(
    (key) => key !== id && before[key] && !after[key],
  );
}

export function enabledAgentIds(config: ModuleConfig): string[] {
  return MODULE_DEFINITIONS.filter((m) => config[m.id]).flatMap((m) => m.agents);
}
