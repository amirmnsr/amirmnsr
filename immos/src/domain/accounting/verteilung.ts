/**
 * Centgenaue Verteilung
 * =============================================================================
 * Jede Umlage muss in Summe exakt dem verteilten Betrag entsprechen. Naives
 * Runden je Einheit erzeugt Differenzen von wenigen Cent — genau die, über die
 * Mieter widersprechen und Abrechnungen angreifbar werden.
 *
 * Verfahren: größte Restwerte (Hare-Niemeyer). Reproduzierbar, dokumentierbar,
 * und die Summe stimmt per Konstruktion.
 */

import type { Cent } from "../types";

export interface Verteilungsanteil {
  key: string;
  gewicht: number;
}

export interface Verteilungsergebnis {
  key: string;
  anteilCent: Cent;
  /** Exakter Anteil vor Rundung — für die Rechenweg-Darstellung. */
  exakt: number;
}

export function verteileCent(
  betragCent: Cent,
  anteile: readonly Verteilungsanteil[],
): Verteilungsergebnis[] {
  const summeGewichte = anteile.reduce((s, a) => s + a.gewicht, 0);
  if (summeGewichte <= 0) {
    return anteile.map((a) => ({ key: a.key, anteilCent: 0, exakt: 0 }));
  }

  const vorzeichen = betragCent < 0 ? -1 : 1;
  const betrag = Math.abs(betragCent);

  const roh = anteile.map((a) => {
    const exakt = (betrag * a.gewicht) / summeGewichte;
    return { key: a.key, exakt, abgerundet: Math.floor(exakt), rest: exakt - Math.floor(exakt) };
  });

  let verteilt = roh.reduce((s, r) => s + r.abgerundet, 0);
  const differenz = betrag - verteilt;

  // Die verbleibenden Cent gehen an die größten Reste; bei Gleichstand an den
  // stabilen Schlüssel, damit dasselbe Ergebnis reproduzierbar bleibt.
  const sortiert = [...roh].sort((a, b) => b.rest - a.rest || a.key.localeCompare(b.key));
  for (let i = 0; i < differenz; i++) {
    sortiert[i % sortiert.length].abgerundet += 1;
  }
  verteilt = roh.reduce((s, r) => s + r.abgerundet, 0);

  return roh.map((r) => ({
    key: r.key,
    anteilCent: vorzeichen * r.abgerundet,
    exakt: vorzeichen * r.exakt,
  }));
}

/** Prüfsumme für Tests und den Abrechnungsprüfpfad. */
export function summe(ergebnisse: readonly Verteilungsergebnis[]): Cent {
  return ergebnisse.reduce((s, e) => s + e.anteilCent, 0);
}

/** Tage im Zeitraum inklusive Start- und Endtag. */
export function tageImZeitraum(von: string, bis: string): number {
  const a = Date.UTC(
    Number(von.slice(0, 4)),
    Number(von.slice(5, 7)) - 1,
    Number(von.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(bis.slice(0, 4)),
    Number(bis.slice(5, 7)) - 1,
    Number(bis.slice(8, 10)),
  );
  if (b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Schnittmenge zweier Zeiträume — Basis jeder Zeitscheibenrechnung. */
export function ueberschneidung(
  aVon: string,
  aBis: string,
  bVon: string,
  bBis: string,
): { von: string; bis: string; tage: number } | null {
  const von = aVon > bVon ? aVon : bVon;
  const bis = aBis < bBis ? aBis : bBis;
  if (von > bis) return null;
  return { von, bis, tage: tageImZeitraum(von, bis) };
}
