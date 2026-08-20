/**
 * Datenzugriff (Repository-Schicht)
 * =============================================================================
 * Server Components fragen ausschließlich über diese Funktionen ab — nie direkt
 * die Seed-Module. Das ist die Naht, an der später Postgres eingesetzt wird:
 * dieselben Signaturen, andere Implementierung. Deshalb sind alle Funktionen
 * async, obwohl die Seed-Daten synchron im Speicher liegen.
 */

import type { Objekt, Vorschlag } from "@/domain";
import { MODULE_MAP, defaultModuleConfig, type ModuleConfig, type ModuleId } from "@/domain/modules";
import { HEUTE, JETZT } from "./seed/basis";
import {
  bankkonten,
  einheiten,
  eigentumsverhaeltnisse,
  mandant,
  mitarbeiter,
  objekte,
  personen,
  postfaecher,
  vertraege,
  zaehler,
} from "./seed/stammdaten";
import {
  abrechnungslaeufe,
  buchungen,
  eingangsrechnungen,
  kontoumsaetze,
  kostenpositionen2025,
  offenePosten,
  objektSalden,
  sepaMandate,
  sollstellungen,
  zahlungsvorschlaege,
} from "./seed/finanzen";
import { kontenrahmen } from "./seed/kontenrahmen";
import {
  anlagen,
  auftraege,
  beschluesse,
  dokumente,
  fristen,
  nachrichten,
  pruefpflichten,
  vorgaenge,
} from "./seed/betrieb";
import { agentLaeufe, agenten, autonomieRegeln } from "./seed/agenten";
import { vorschlaege } from "./seed/vorschlaege";
import { auditEreignisse, chatVerlauf, kennzahlen, sprachbefehle } from "./seed/cockpit";

export const BEZUGSZEIT = { jetzt: JETZT, heute: HEUTE };

// ---------------------------------------------------------------------------
// Modulkonfiguration des Mandanten
// ---------------------------------------------------------------------------

/**
 * Auslieferungszustand für diese Demo: Mietverwaltung als Kern, WEG und Gewerbe
 * zugeschaltet (der Bestand ist gemischt), Vermietung noch aus — damit sichtbar
 * ist, wie ein abgeschaltetes Modul das System verändert.
 */
export function standardModulConfig(): ModuleConfig {
  return {
    ...defaultModuleConfig(),
    weg: true,
    gewerbe: true,
    versammlung: true,
    vermietung: false,
  };
}

export function modulVonAgent(agentId: string): ModuleId | undefined {
  return agenten.find((a) => a.id === agentId)?.modulId;
}

/** Ein Vorschlag ist nur sichtbar, wenn das Modul seines Agenten aktiv ist. */
export function vorschlagSichtbar(v: Vorschlag, config: ModuleConfig): boolean {
  const modulId = modulVonAgent(v.agentId);
  if (!modulId) return true;
  const modul = MODULE_MAP[modulId];
  return config[modulId] === true || Boolean(modul?.locked);
}

// ---------------------------------------------------------------------------
// Cockpit
// ---------------------------------------------------------------------------

export interface CockpitDaten {
  mandant: typeof mandant;
  nutzer: (typeof mitarbeiter)[number];
  kennzahlen: typeof kennzahlen;
  queue: Vorschlag[];
  chat: typeof chatVerlauf;
  audit: typeof auditEreignisse;
  agentLaeufe: typeof agentLaeufe;
  agenten: typeof agenten;
  objekte: ObjektKarte[];
  fristenKritisch: typeof fristen;
  posteingangNeu: number;
  sprachbefehle: typeof sprachbefehle;
}

export interface ObjektKarte {
  objekt: Objekt;
  einheiten: number;
  vermietet: number;
  leerstand: number;
  offenCent: number;
  monatsSollCent: number;
  offeneVorgaenge: number;
  kritischeFristen: number;
  eigentuemerName: string;
}

function objektKarte(objekt: Objekt): ObjektKarte {
  const objektEinheiten = einheiten.filter((e) => e.objektId === objekt.id);
  const saldo = objektSalden.find((s) => s.objektId === objekt.id);
  return {
    objekt,
    einheiten: objektEinheiten.length,
    vermietet: objektEinheiten.filter((e) => e.status === "vermietet").length,
    leerstand: objektEinheiten.filter((e) => e.status === "leerstand").length,
    offenCent: saldo?.offenCent ?? 0,
    monatsSollCent: saldo?.monatsSollCent ?? 0,
    offeneVorgaenge: vorgaenge.filter(
      (v) => v.objektId === objekt.id && v.status !== "erledigt" && v.status !== "abgelehnt",
    ).length,
    kritischeFristen: fristen.filter(
      (f) => f.objektId === objekt.id && f.status !== "gewahrt" && f.eskalationsstufe >= 2,
    ).length,
    eigentuemerName: personen.find((p) => p.id === objekt.eigentuemerId)?.name ?? "—",
  };
}

/** Queue-Sortierung: erst Haftung und Frist, dann Geld, dann Zeitgewinn. */
export function sortiereQueue(liste: Vorschlag[]): Vorschlag[] {
  return [...liste].sort((a, b) => {
    if (a.status !== b.status) return a.status === "offen" ? -1 : 1;
    return b.prioritaet - a.prioritaet || (b.betragCent ?? 0) - (a.betragCent ?? 0);
  });
}

export async function getCockpit(config: ModuleConfig = standardModulConfig()): Promise<CockpitDaten> {
  return {
    mandant,
    nutzer: mitarbeiter[0],
    kennzahlen: kennzahlen.filter((k) => !k.modulId || config[k.modulId]),
    queue: sortiereQueue(vorschlaege.filter((v) => vorschlagSichtbar(v, config))),
    chat: chatVerlauf,
    audit: auditEreignisse,
    agentLaeufe,
    agenten: agenten.filter((a) => config[a.modulId] || MODULE_MAP[a.modulId].locked),
    objekte: objekte.map(objektKarte),
    fristenKritisch: fristen
      .filter((f) => f.status !== "gewahrt")
      .sort((a, b) => b.eskalationsstufe - a.eskalationsstufe || a.ablaufAm.localeCompare(b.ablaufAm)),
    posteingangNeu: nachrichten.filter((n) => n.richtung === "eingang" && !n.gelesen).length,
    sprachbefehle,
  };
}

// ---------------------------------------------------------------------------
// Objekte
// ---------------------------------------------------------------------------

export async function getObjektListe(): Promise<ObjektKarte[]> {
  return objekte.map(objektKarte);
}

export interface ObjektAkte extends ObjektKarte {
  einheitenListe: {
    einheit: (typeof einheiten)[number];
    mieter?: string;
    vertrag?: (typeof vertraege)[number];
    offenCent: number;
  }[];
  postfaecher: typeof postfaecher;
  vorgaenge: typeof vorgaenge;
  anlagen: typeof anlagen;
  pruefpflichten: typeof pruefpflichten;
  fristen: typeof fristen;
  dokumente: typeof dokumente;
  beschluesse: typeof beschluesse;
  rechnungen: typeof eingangsrechnungen;
  bankkonto?: (typeof bankkonten)[number];
  abrechnungen: typeof abrechnungslaeufe;
  zaehlerAnzahl: number;
  zaehlerFernablesbar: number;
  vorschlaege: Vorschlag[];
}

export async function getObjektAkte(
  objektId: string,
  config: ModuleConfig = standardModulConfig(),
): Promise<ObjektAkte | null> {
  const objekt = objekte.find((o) => o.id === objektId);
  if (!objekt) return null;

  const objektZaehler = zaehler.filter((z) => z.objektId === objektId);

  return {
    ...objektKarte(objekt),
    einheitenListe: einheiten
      .filter((e) => e.objektId === objektId)
      .map((einheit) => {
        const vertrag = vertraege.find((v) => v.einheitId === einheit.id);
        const mieter = vertrag
          ? personen.find((p) => p.id === vertrag.mieterIds[0])?.name
          : undefined;
        return {
          einheit,
          vertrag,
          mieter,
          offenCent: offenePosten
            .filter((p) => p.einheitId === einheit.id)
            .reduce((s, p) => s + (p.betragCent - p.bezahltCent), 0),
        };
      }),
    postfaecher: postfaecher.filter((p) => p.objektId === objektId),
    vorgaenge: vorgaenge.filter((v) => v.objektId === objektId),
    anlagen: anlagen.filter((a) => a.objektId === objektId),
    pruefpflichten: pruefpflichten.filter((p) => p.objektId === objektId),
    fristen: fristen.filter((f) => f.objektId === objektId),
    dokumente: dokumente.filter((d) => d.objektId === objektId),
    beschluesse: config.weg ? beschluesse.filter((b) => b.objektId === objektId) : [],
    rechnungen: eingangsrechnungen.filter((r) => r.objektId === objektId),
    bankkonto: bankkonten.find((k) => k.objektId === objektId),
    abrechnungen: abrechnungslaeufe.filter((a) => a.objektId === objektId),
    zaehlerAnzahl: objektZaehler.length,
    zaehlerFernablesbar: objektZaehler.filter((z) => z.fernablesbar).length,
    vorschlaege: sortiereQueue(
      vorschlaege.filter((v) => v.objektId === objektId && vorschlagSichtbar(v, config)),
    ),
  };
}

// ---------------------------------------------------------------------------
// Posteingang
// ---------------------------------------------------------------------------

export interface PosteingangDaten {
  nachrichten: (typeof nachrichten)[number][];
  postfaecher: typeof postfaecher;
  objektNamen: Record<string, string>;
  vorschlagZuNachricht: Record<string, string>;
}

export async function getPosteingang(): Promise<PosteingangDaten> {
  const vorschlagZuNachricht: Record<string, string> = {};
  for (const v of vorschlaege) {
    for (const beleg of v.belege) {
      if (beleg.art === "nachricht") vorschlagZuNachricht[beleg.ref] = v.id;
    }
  }
  return {
    nachrichten: [...nachrichten].sort((a, b) => b.eingangAm.localeCompare(a.eingangAm)),
    postfaecher,
    objektNamen: Object.fromEntries(objekte.map((o) => [o.id, `${o.nummer} · ${o.bezeichnung}`])),
    vorschlagZuNachricht,
  };
}

// ---------------------------------------------------------------------------
// Aufgaben
// ---------------------------------------------------------------------------

export async function getVorgaenge() {
  return {
    vorgaenge,
    objektNamen: Object.fromEntries(objekte.map((o) => [o.id, `${o.nummer} · ${o.bezeichnung}`])),
    bearbeiter: Object.fromEntries(mitarbeiter.map((m) => [m.id, m.name])),
    auftraege,
  };
}

// ---------------------------------------------------------------------------
// Buchhaltung
// ---------------------------------------------------------------------------

export async function getBuchhaltung() {
  const kreditorNamen = Object.fromEntries(personen.map((p) => [p.id, p.name]));
  return {
    kontenrahmen,
    buchungen,
    eingangsrechnungen: [...eingangsrechnungen].sort((a, b) =>
      b.eingangAm.localeCompare(a.eingangAm),
    ),
    kontoumsaetze,
    zahlungsvorschlaege,
    offenePosten: [...offenePosten].sort((a, b) => a.faelligAm.localeCompare(b.faelligAm)),
    sepaMandate,
    bankkonten,
    kreditorNamen,
    objektNamen: Object.fromEntries(objekte.map((o) => [o.id, `${o.nummer} · ${o.bezeichnung}`])),
    einheitNamen: Object.fromEntries(
      einheiten.map((e) => [e.id, `WE ${e.nummer} · ${e.lage}`]),
    ),
    summen: {
      offenCent: offenePosten.reduce((s, p) => s + (p.betragCent - p.bezahltCent), 0),
      sollMonatCent: sollstellungen
        .filter((s) => s.periode === "2026-08")
        .reduce((s, p) => s + p.betragCent, 0),
      rechnungenOffenCent: eingangsrechnungen
        .filter((r) => r.status === "freigabe_erforderlich" || r.status === "eingegangen")
        .reduce((s, r) => s + r.bruttoCent, 0),
      liquiditaetCent: bankkonten.reduce((s, k) => s + k.saldoCent, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Abrechnung
// ---------------------------------------------------------------------------

export async function getAbrechnung() {
  return {
    laeufe: abrechnungslaeufe,
    kostenpositionen: kostenpositionen2025,
    objektNamen: Object.fromEntries(objekte.map((o) => [o.id, `${o.nummer} · ${o.bezeichnung}`])),
  };
}

// ---------------------------------------------------------------------------
// Technik, Fristen, Automation
// ---------------------------------------------------------------------------

export async function getTechnik() {
  return {
    anlagen,
    pruefpflichten: [...pruefpflichten].sort((a, b) =>
      a.naechstePruefung.localeCompare(b.naechstePruefung),
    ),
    auftraege,
    objektNamen: Object.fromEntries(objekte.map((o) => [o.id, `${o.nummer} · ${o.bezeichnung}`])),
    dienstleisterNamen: Object.fromEntries(personen.map((p) => [p.id, p.name])),
  };
}

export async function getAutonomie() {
  return { regeln: autonomieRegeln, agenten, laeufe: agentLaeufe };
}

export async function getAudit() {
  return {
    ereignisse: [...auditEreignisse].sort((a, b) => b.am.localeCompare(a.am)),
    objektNamen: Object.fromEntries(objekte.map((o) => [o.id, `${o.nummer} · ${o.bezeichnung}`])),
  };
}

export async function getEinrichtung() {
  return {
    mandant,
    objekte: objekte.map((o) => ({
      id: o.id,
      nummer: o.nummer,
      bezeichnung: o.bezeichnung,
      verwaltungsarten: o.verwaltungsarten,
      einheiten: o.einheitenAnzahl,
    })),
    postfaecher,
    eigentumsverhaeltnisse: eigentumsverhaeltnisse.length,
  };
}

export function alleVorschlaege(): Vorschlag[] {
  return vorschlaege;
}
