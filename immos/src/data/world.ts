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
import {
  berechneAbrechnung,
  type KostenpositionInput,
  type UmlageEinheit,
  type UmlageNutzung,
} from "@/domain/accounting/betriebskosten";
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
  versammlungen,
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

/**
 * Betriebskostenabrechnung eines Objekts — gerechnet mit der echten Engine.
 *
 * Wichtig für die Demo und später für den Betrieb: Die Zahlen dieser Seite sind
 * nicht hinterlegt, sie entstehen bei jedem Aufruf aus Kostenpositionen,
 * Flächen, Personen, Verbräuchen und Nutzungszeiträumen. Deshalb stimmt der
 * angezeigte Rechenweg immer mit dem Ergebnis überein.
 */
export async function getAbrechnungsLauf(objektId: string, jahr: number) {
  const objekt = objekte.find((o) => o.id === objektId);
  const lauf = abrechnungslaeufe.find((a) => a.objektId === objektId && a.jahr === jahr);
  if (!objekt || !lauf) return null;

  const von = `${jahr}-01-01`;
  const bis = `${jahr}-12-31`;
  const objektEinheiten = einheiten.filter((e) => e.objektId === objektId);

  const umlageEinheiten: UmlageEinheit[] = objektEinheiten.map((e) => ({
    einheitId: e.id,
    bezeichnung: `WE ${e.nummer} · ${e.lage}`,
    flaecheM2: e.wohnflaecheM2,
    meaTausendstel: e.meaTausendstel,
    gewerbe: e.typ === "gewerbe",
  }));

  // Nutzungszeitscheiben: im Regelfall das ganze Jahr, dazu ein Mieterwechsel
  // zur Jahresmitte und ein Leerstand ab November — die beiden Fälle, an denen
  // sich zeigt, ob eine Abrechnung richtig rechnet.
  const nutzungen: UmlageNutzung[] = [];
  for (const [i, e] of objektEinheiten.entries()) {
    const vertrag = vertraege.find((v) => v.einheitId === e.id);
    const mieter = vertrag ? personen.find((p) => p.id === vertrag.mieterIds[0])?.name : undefined;
    // Vorauszahlungen liegen in der Praxis leicht unter den tatsächlichen Kosten —
    // deshalb gibt es überhaupt Nachzahlungen. Faktor bewusst unter 1.
    const vorauszahlungJahr = Math.round(
      ((vertrag?.bkVorauszahlungCent ?? 0) + (vertrag?.hkVorauszahlungCent ?? 0)) * 12 * 0.82,
    );
    const verbrauchWaerme = 2600 + ((i * 811) % 5200);
    const verbrauchWasser = 28 + ((i * 37) % 62);

    const wechsel = e.nummer === "18";
    const leerstandAbNovember = e.nummer === "11";

    if (wechsel) {
      nutzungen.push(
        {
          nutzungId: `${e.id}-a`,
          einheitId: e.id,
          nutzerName: `${mieter ?? "Mieter"} (bis 30.06.)`,
          von,
          bis: `${jahr}-06-30`,
          personen: e.personenzahl || 1,
          vorauszahlungCent: Math.round(vorauszahlungJahr / 2),
          verbrauchWaermeKwh: Math.round(verbrauchWaerme * 0.62),
          verbrauchKaltwasserM3: Math.round(verbrauchWasser * 0.5),
        },
        {
          nutzungId: `${e.id}-b`,
          einheitId: e.id,
          nutzerName: "Nachmieter (ab 01.07.)",
          von: `${jahr}-07-01`,
          bis,
          personen: 2,
          vorauszahlungCent: Math.round(vorauszahlungJahr / 2),
          verbrauchWaermeKwh: Math.round(verbrauchWaerme * 0.38),
          verbrauchKaltwasserM3: Math.round(verbrauchWasser * 0.5),
        },
      );
      continue;
    }

    if (leerstandAbNovember) {
      nutzungen.push(
        {
          nutzungId: `${e.id}-a`,
          einheitId: e.id,
          nutzerName: `${mieter ?? "Mieter"} (bis 31.10.)`,
          von,
          bis: `${jahr}-10-31`,
          personen: e.personenzahl || 1,
          vorauszahlungCent: Math.round((vorauszahlungJahr / 12) * 10),
          verbrauchWaermeKwh: Math.round(verbrauchWaerme * 0.8),
          verbrauchKaltwasserM3: Math.round(verbrauchWasser * 0.85),
        },
        {
          nutzungId: `${e.id}-leer`,
          einheitId: e.id,
          nutzerName: "Leerstand (Eigentümer)",
          von: `${jahr}-11-01`,
          bis,
          personen: 0,
          vorauszahlungCent: 0,
          leerstand: true,
          verbrauchWaermeKwh: Math.round(verbrauchWaerme * 0.2),
          verbrauchKaltwasserM3: Math.round(verbrauchWasser * 0.15),
        },
      );
      continue;
    }

    nutzungen.push({
      nutzungId: `${e.id}-a`,
      einheitId: e.id,
      nutzerName: mieter ?? `Nutzer WE ${e.nummer}`,
      von,
      bis,
      personen: e.personenzahl || 1,
      vorauszahlungCent: vorauszahlungJahr,
      verbrauchWaermeKwh: verbrauchWaerme,
      verbrauchKaltwasserM3: verbrauchWasser,
    });
  }

  const positionen: KostenpositionInput[] = kostenpositionen2025
    .filter((k) => k.objektId === objektId && k.jahr === jahr)
    .map((k) => ({
      id: k.id,
      kontoNr: k.kontoNr,
      bezeichnung: k.bezeichnung,
      betragCent: k.betragCent,
      umlagefaehig: k.umlagefaehig,
      schluessel: k.schluessel,
      vorwegabzugCent: k.vorwegabzugCent,
      paragraf35aCent: k.paragraf35aCent,
      betrkv: kontenrahmen.find((konto) => konto.nummer === k.kontoNr)?.betrkv,
      // Heizung: HeizkostenV-Aufteilung und CO₂-Anteil aus dem Energiebezug.
      heizkosten: k.kontoNr === "4300",
      co2KostenCent: k.kontoNr === "4300" ? Math.round(k.betragCent * 0.087) : undefined,
      belegIds: k.belegIds,
    }));

  const ergebnis = berechneAbrechnung(
    {
      objektId,
      jahr,
      von,
      bis,
      einheiten: umlageEinheiten,
      nutzungen,
      heizkosten: {
        // 70/30 ist der in der Praxis übliche und nach HeizkostenV zulässige Schlüssel.
        verbrauchsanteil: 0.7,
        co2EmissionKgProM2: 35,
      },
    },
    positionen,
  );

  // Kennzahlen des Laufs aus dem Rechenergebnis übernehmen, damit Übersicht und
  // Detail nie auseinanderlaufen.
  const nachzahlungen = ergebnis.nutzungen
    .filter((n) => n.saldoCent > 0)
    .reduce((s, n) => s + n.saldoCent, 0);
  const guthaben = ergebnis.nutzungen
    .filter((n) => n.saldoCent < 0)
    .reduce((s, n) => s + n.saldoCent, 0);

  return {
    lauf: {
      ...lauf,
      gesamtkostenCent: ergebnis.gesamtkostenCent,
      umlagefaehigCent: ergebnis.umgelegtCent,
      nachzahlungenCent: nachzahlungen,
      guthabenCent: guthaben,
    },
    objekt,
    ergebnis,
    positionen,
    einheitenAnzahl: objektEinheiten.length,
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

export async function getVersammlung(objektId?: string) {
  const versammlung = objektId
    ? versammlungen.find((v) => v.objektId === objektId)
    : versammlungen[0];
  if (!versammlung) return null;

  const objekt = objekte.find((o) => o.id === versammlung.objektId);
  const wegEinheiten = einheiten.filter((e) => e.objektId === versammlung.objektId);
  const stimmen = wegEinheiten.map((e) => {
    const verhaeltnis = eigentumsverhaeltnisse.find((ev) => ev.einheitId === e.id);
    const eigentuemer = personen.find((p) => p.id === verhaeltnis?.eigentuemerId);
    return {
      einheitId: e.id,
      bezeichnung: `WE ${e.nummer} · ${e.lage}`,
      eigentuemer: eigentuemer?.name ?? "unbekannt",
      meaTausendstel: e.meaTausendstel ?? 0,
      selbstnutzer: verhaeltnis?.selbstnutzer ?? false,
    };
  });

  return {
    versammlung,
    objekt,
    stimmen,
    meaSumme: stimmen.reduce((s, x) => s + x.meaTausendstel, 0),
    beschluesse: beschluesse.filter((b) => b.objektId === versammlung.objektId),
    frist: fristen.find((f) => f.objektId === versammlung.objektId && f.art === "gesetzlich"),
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
