/**
 * Sollstellung und Mahnwesen
 * =============================================================================
 * Aus Verträgen werden monatliche Forderungen. Klingt trivial, ist es nicht:
 * Teilmonate, Staffeln, Indexanpassungen, Vorauszahlungsänderungen und
 * Kündigungen fallen alle in denselben Lauf.
 *
 * Rechtliche Anker:
 *  - §556b BGB   Miete ist im Voraus zu zahlen, spätestens am 3. Werktag
 *  - §366/§367   Verrechnungsreihenfolge (siehe matching.ts)
 *  - §543 Abs. 2 Nr. 3, §569 Abs. 3 BGB  Kündigung bei Zahlungsverzug
 *  - §288 BGB    Verzugszinsen
 */

import type { Cent, IsoDate } from "../types";
import type { SollArt } from "../finance";
import { verteileCent } from "./verteilung";

export interface VertragFuerSoll {
  vertragId: string;
  objektId: string;
  einheitId: string;
  beginn: IsoDate;
  ende: IsoDate | null;
  gekuendigtZum: IsoDate | null;
  mieteKaltCent: Cent;
  bkVorauszahlungCent: Cent;
  hkVorauszahlungCent: Cent;
  stellplatzCent: Cent;
  /** Terminierte Änderungen: Staffel, Indexanpassung, neue Vorauszahlung. */
  anpassungen?: Vertragsanpassung[];
}

export interface Vertragsanpassung {
  abIso: IsoDate;
  mieteKaltCent?: Cent;
  bkVorauszahlungCent?: Cent;
  hkVorauszahlungCent?: Cent;
  grund: string;
}

export interface SollPosition {
  sollId: string;
  vertragId: string;
  objektId: string;
  einheitId: string;
  periode: string;
  art: SollArt;
  betragCent: Cent;
  faelligAm: IsoDate;
  /** Teilmonat: Anzahl berechneter Tage und Tage im Monat. */
  tage?: number;
  tageImMonat?: number;
  hinweis?: string;
}

function tageInMonat(jahr: number, monat: number): number {
  return new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
}

function iso(jahr: number, monat: number, tag: number): IsoDate {
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

/** Fälligkeit: 3. Werktag des Monats (§556b BGB), Samstag zählt nicht als Werktag. */
export function faelligkeitMonat(jahr: number, monat: number): IsoDate {
  let werktage = 0;
  for (let tag = 1; tag <= 10; tag++) {
    const wochentag = new Date(Date.UTC(jahr, monat - 1, tag)).getUTCDay();
    if (wochentag !== 0 && wochentag !== 6) werktage++;
    if (werktage === 3) return iso(jahr, monat, tag);
  }
  return iso(jahr, monat, 3);
}

function wirksameWerte(vertrag: VertragFuerSoll, stichtag: IsoDate) {
  const werte = {
    mieteKaltCent: vertrag.mieteKaltCent,
    bkVorauszahlungCent: vertrag.bkVorauszahlungCent,
    hkVorauszahlungCent: vertrag.hkVorauszahlungCent,
    grund: "Vertragsstand",
  };
  for (const a of (vertrag.anpassungen ?? [])
    .filter((a) => a.abIso <= stichtag)
    .sort((x, y) => x.abIso.localeCompare(y.abIso))) {
    if (a.mieteKaltCent !== undefined) werte.mieteKaltCent = a.mieteKaltCent;
    if (a.bkVorauszahlungCent !== undefined) werte.bkVorauszahlungCent = a.bkVorauszahlungCent;
    if (a.hkVorauszahlungCent !== undefined) werte.hkVorauszahlungCent = a.hkVorauszahlungCent;
    werte.grund = a.grund;
  }
  return werte;
}

/**
 * Erzeugt die Sollstellungen eines Monats. Teilmonate werden nach tatsächlichen
 * Tagen berechnet (kalendertaggenau, nicht 30/360) — das ist die in der
 * Rechtsprechung übliche Methode bei Mietbeginn und -ende im laufenden Monat.
 */
export function erzeugeSollstellungenMonat(
  vertrag: VertragFuerSoll,
  jahr: number,
  monat: number,
): SollPosition[] {
  const monatsStart = iso(jahr, monat, 1);
  const tageMonat = tageInMonat(jahr, monat);
  const monatsEnde = iso(jahr, monat, tageMonat);
  const vertragsEnde = vertrag.gekuendigtZum ?? vertrag.ende;

  if (vertrag.beginn > monatsEnde) return [];
  if (vertragsEnde && vertragsEnde < monatsStart) return [];

  const von = vertrag.beginn > monatsStart ? vertrag.beginn : monatsStart;
  const bis = vertragsEnde && vertragsEnde < monatsEnde ? vertragsEnde : monatsEnde;
  const tage = Number(bis.slice(8, 10)) - Number(von.slice(8, 10)) + 1;
  const teilmonat = tage < tageMonat;

  const werte = wirksameWerte(vertrag, von);
  const periode = `${jahr}-${String(monat).padStart(2, "0")}`;
  const faellig = faelligkeitMonat(jahr, monat);

  const basis: { art: SollArt; betragCent: Cent }[] = [
    { art: "miete_kalt", betragCent: werte.mieteKaltCent },
    { art: "bk_vorauszahlung", betragCent: werte.bkVorauszahlungCent },
    { art: "hk_vorauszahlung", betragCent: werte.hkVorauszahlungCent },
    { art: "stellplatz", betragCent: vertrag.stellplatzCent },
  ];

  return basis
    .filter((b) => b.betragCent > 0)
    .map((b) => {
      // Teilmonat centgenau: über die Verteilungsfunktion, damit die Summe der
      // Teilmonate eines Mieterwechsels exakt der Monatsmiete entspricht.
      const betragCent = teilmonat
        ? verteileCent(b.betragCent, [
            { key: "genutzt", gewicht: tage },
            { key: "rest", gewicht: tageMonat - tage },
          ]).find((v) => v.key === "genutzt")!.anteilCent
        : b.betragCent;

      return {
        sollId: `${vertrag.vertragId}-${periode}-${b.art}`,
        vertragId: vertrag.vertragId,
        objektId: vertrag.objektId,
        einheitId: vertrag.einheitId,
        periode,
        art: b.art,
        betragCent,
        faelligAm: faellig,
        tage: teilmonat ? tage : undefined,
        tageImMonat: teilmonat ? tageMonat : undefined,
        hinweis: teilmonat
          ? `Zeitanteilig ${tage}/${tageMonat} Tage (${von} bis ${bis})`
          : werte.grund !== "Vertragsstand"
            ? werte.grund
            : undefined,
      };
    });
}

export function erzeugeSollstellungenJahr(
  vertrag: VertragFuerSoll,
  jahr: number,
): SollPosition[] {
  return Array.from({ length: 12 }, (_, i) => i + 1).flatMap((monat) =>
    erzeugeSollstellungenMonat(vertrag, jahr, monat),
  );
}

// ---------------------------------------------------------------------------
// Mahnwesen
// ---------------------------------------------------------------------------

export interface Mahnstufe {
  stufe: 1 | 2 | 3;
  tageNachFaelligkeit: number;
  gebuehrCent: Cent;
  ton: "freundlich" | "sachlich" | "letzte_frist";
  automatisch: boolean;
}

export const MAHNSTUFEN_STANDARD: readonly Mahnstufe[] = [
  { stufe: 1, tageNachFaelligkeit: 7, gebuehrCent: 0, ton: "freundlich", automatisch: true },
  { stufe: 2, tageNachFaelligkeit: 21, gebuehrCent: 500, ton: "sachlich", automatisch: true },
  { stufe: 3, tageNachFaelligkeit: 42, gebuehrCent: 1000, ton: "letzte_frist", automatisch: false },
];

export interface MahnKandidat {
  vertragId: string;
  einheitId: string;
  objektId: string;
  offenCent: Cent;
  aelteste: IsoDate;
  tageUeberfaellig: number;
  aktuelleStufe: number;
  empfohleneStufe: 0 | 1 | 2 | 3;
  gebuehrCent: Cent;
  automatischErlaubt: boolean;
  /** §543 Abs. 2 Nr. 3 BGB: Rückstand von zwei Monatsmieten. */
  kuendigungsgrund: boolean;
  begruendung: string;
}

function tageDiff(von: IsoDate, bis: IsoDate): number {
  return Math.round(
    (Date.parse(`${bis}T12:00:00Z`) - Date.parse(`${von}T12:00:00Z`)) / 86_400_000,
  );
}

export function bewerteMahnfall(
  input: {
    vertragId: string;
    objektId: string;
    einheitId: string;
    offenePosten: { faelligAm: IsoDate; offenCent: Cent; mahnstufe: number }[];
    monatsBruttoMieteCent: Cent;
  },
  heute: IsoDate,
  stufen: readonly Mahnstufe[] = MAHNSTUFEN_STANDARD,
): MahnKandidat | null {
  const offene = input.offenePosten.filter((p) => p.offenCent > 0 && p.faelligAm <= heute);
  if (offene.length === 0) return null;

  const offenCent = offene.reduce((s, p) => s + p.offenCent, 0);
  const aelteste = offene.reduce((a, p) => (p.faelligAm < a ? p.faelligAm : a), offene[0].faelligAm);
  const tageUeberfaellig = tageDiff(aelteste, heute);
  const aktuelleStufe = Math.max(...offene.map((p) => p.mahnstufe), 0);

  const passend = [...stufen]
    .filter((s) => tageUeberfaellig >= s.tageNachFaelligkeit)
    .sort((a, b) => b.stufe - a.stufe)[0];

  const empfohleneStufe = (passend?.stufe ?? 0) as 0 | 1 | 2 | 3;

  // Kündigungsgrund: Rückstand erreicht zwei Monatsmieten. Die Kündigung selbst
  // bleibt immer eine menschliche Entscheidung — hier wird nur die Schwelle erkannt.
  const kuendigungsgrund = offenCent >= input.monatsBruttoMieteCent * 2;

  return {
    vertragId: input.vertragId,
    objektId: input.objektId,
    einheitId: input.einheitId,
    offenCent,
    aelteste,
    tageUeberfaellig,
    aktuelleStufe,
    empfohleneStufe,
    gebuehrCent: passend?.gebuehrCent ?? 0,
    automatischErlaubt: Boolean(passend?.automatisch) && !kuendigungsgrund,
    kuendigungsgrund,
    begruendung: kuendigungsgrund
      ? `Rückstand ${(offenCent / 100).toFixed(2)} € entspricht mindestens zwei Monatsmieten — ` +
        `Kündigungsgrund nach §543 Abs. 2 Nr. 3 BGB liegt vor. Entscheidung durch Verwalter, ` +
        `Heilungsmöglichkeit nach §569 Abs. 3 BGB beachten.`
      : `Ältester offener Posten seit ${tageUeberfaellig} Tagen überfällig, ` +
        `Gesamtrückstand ${(offenCent / 100).toFixed(2)} € → Mahnstufe ${empfohleneStufe}.`,
  };
}

/** Verzugszinsen nach §288 Abs. 1 BGB: 5 Prozentpunkte über Basiszinssatz. */
export function verzugszinsen(
  offenCent: Cent,
  tage: number,
  basiszinssatz: number,
  aufschlagProzentpunkte = 5,
): Cent {
  const satz = (basiszinssatz + aufschlagProzentpunkte) / 100;
  return Math.round((offenCent * satz * tage) / 365);
}
