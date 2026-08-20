import type { ModuleId } from "@/domain/modules";

/**
 * Navigationsdefinition
 * =============================================================================
 * Jeder Eintrag deklariert sein Modul. Ist das Modul in der Ersteinrichtung
 * abgewählt, existiert der Menüpunkt für den Nutzer nicht — kein ausgegrauter
 * Eintrag, kein Werbebanner.
 */

export interface NavEintrag {
  href: string;
  label: string;
  icon: string;
  modulId?: ModuleId;
  /** Schlüssel für die Zählerblase (aus dem Sitzungszustand). */
  zaehler?: "entscheidungen" | "posteingang" | "fristen";
  gruppe: "arbeit" | "fach" | "system";
  kuerzel?: string;
}

export const NAVIGATION: NavEintrag[] = [
  { href: "/cockpit", label: "Cockpit", icon: "LayoutDashboard", gruppe: "arbeit", kuerzel: "1" },
  { href: "/entscheidungen", label: "Entscheidungen", icon: "CheckCircle2", gruppe: "arbeit", zaehler: "entscheidungen", kuerzel: "2" },
  { href: "/posteingang", label: "Posteingang", icon: "Inbox", modulId: "posteingang", gruppe: "arbeit", zaehler: "posteingang", kuerzel: "3" },
  { href: "/aufgaben", label: "Vorgänge", icon: "ListChecks", modulId: "aufgaben", gruppe: "arbeit", kuerzel: "4" },
  { href: "/objekte", label: "Objekte", icon: "Building2", gruppe: "arbeit", kuerzel: "5" },

  { href: "/prozesse", label: "Betriebsabläufe", icon: "Workflow", modulId: "aufgaben", gruppe: "fach" },

  { href: "/buchhaltung", label: "Buchhaltung", icon: "Calculator", modulId: "buchhaltung", gruppe: "fach" },
  { href: "/abrechnung", label: "Abrechnung", icon: "FileSpreadsheet", modulId: "betriebskosten", gruppe: "fach" },
  { href: "/technik", label: "Technik & Pflichten", icon: "Wrench", modulId: "technik", gruppe: "fach" },
  { href: "/versammlung", label: "Versammlung", icon: "Gavel", modulId: "versammlung", gruppe: "fach" },

  { href: "/automationen", label: "Automationen", icon: "Bot", modulId: "autonomie", gruppe: "system" },
  { href: "/audit", label: "Nachweis", icon: "ScrollText", gruppe: "system" },
  { href: "/einrichtung", label: "Einrichtung", icon: "Settings2", gruppe: "system" },
];

export const GRUPPEN_TITEL: Record<NavEintrag["gruppe"], string> = {
  arbeit: "Tagesarbeit",
  fach: "Fachbereiche",
  system: "Steuerung",
};
