/**
 * Zahlungszuordnung (Auto-Matching)
 * =============================================================================
 * Zuerst deterministische Regeln, absteigend nach Beweiskraft. Erst wenn keine
 * Regel greift, darf ein Vorschlag mit geringerer Konfidenz entstehen — und der
 * geht in die Entscheidungs-Queue statt direkt in die Buchhaltung.
 *
 * Die Reihenfolge ist bewusst so gewählt, dass eine Zuordnung immer belegbar
 * ist: SEPA-Referenz schlägt IBAN, IBAN schlägt Verwendungszweck, und Namens-
 * ähnlichkeit ist nie allein ausreichend.
 */

import type { Cent, IsoDate } from "../types";

export interface OffenerPosten {
  sollId: string;
  objektId: string;
  einheitId: string;
  vertragId?: string;
  periode: string;
  art: string;
  offenCent: Cent;
  faelligAm: IsoDate;
  mahnstufe: number;
  /** Erwartete SEPA-Referenz bzw. Buchungsreferenz. */
  referenz?: string;
}

export interface MatchKontext {
  /** Bekannte Zahler-IBANs → Vertrag. Stammdaten sind die stärkste Evidenz. */
  ibanZuVertrag: Record<string, string>;
  /** Mandatsreferenz → Vertrag. */
  mandatZuVertrag: Record<string, string>;
  /** Vertrag → sprechende Kennung im Verwendungszweck, z. B. "1042-03-L". */
  vertragKennung: Record<string, string>;
  /** Namen der Zahlungspflichtigen je Vertrag für den Namensvergleich. */
  vertragNamen: Record<string, string[]>;
}

export interface Umsatzeingang {
  umsatzId: string;
  betragCent: Cent;
  buchungstag: IsoDate;
  gegenkontoName: string;
  gegenkontoIban?: string;
  verwendungszweck: string;
  endToEndId?: string;
  mandatsreferenz?: string;
}

export interface Zuordnungsvorschlag {
  umsatzId: string;
  regel: string;
  konfidenz: number;
  begruendung: string;
  zuordnungen: { sollId: string; betragCent: Cent }[];
  restCent: Cent;
  /** Ab 0,9 automatisch buchbar, darunter Vorschlag an den Menschen. */
  automatischBuchbar: boolean;
}

const AUTO_SCHWELLE = 0.9;

function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalisiere(text).split(" ").filter((t) => t.length > 2);
}

/** Anteil gemeinsamer Tokens — bewusst simpel und erklärbar. */
export function namensAehnlichkeit(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let treffer = 0;
  ta.forEach((t) => {
    if (tb.has(t)) treffer++;
  });
  return treffer / Math.min(ta.size, tb.size);
}

/**
 * Verrechnung mehrerer offener Posten aus einer Zahlung.
 * §367 BGB: zuerst Kosten und Zinsen, dann die Hauptforderung.
 * §366 Abs. 2 BGB: unter mehreren Hauptforderungen die fällige und ältere zuerst.
 * Eine ausdrückliche Tilgungsbestimmung des Schuldners im Verwendungszweck
 * (§366 Abs. 1) hat Vorrang und wird vom Aufrufer als vorsortierte Liste übergeben.
 */
export function verrechne(
  betragCent: Cent,
  posten: readonly OffenerPosten[],
): { zuordnungen: { sollId: string; betragCent: Cent }[]; restCent: Cent } {
  const kosten = posten.filter((p) => p.art === "mahngebuehr");
  const haupt = posten
    .filter((p) => p.art !== "mahngebuehr")
    .sort((a, b) => a.faelligAm.localeCompare(b.faelligAm) || a.sollId.localeCompare(b.sollId));

  const reihenfolge = [
    ...kosten.sort((a, b) => a.faelligAm.localeCompare(b.faelligAm)),
    ...haupt,
  ];

  let rest = betragCent;
  const zuordnungen: { sollId: string; betragCent: Cent }[] = [];
  for (const p of reihenfolge) {
    if (rest <= 0) break;
    const betrag = Math.min(rest, p.offenCent);
    if (betrag <= 0) continue;
    zuordnungen.push({ sollId: p.sollId, betragCent: betrag });
    rest -= betrag;
  }
  return { zuordnungen, restCent: rest };
}

export function findeZuordnung(
  umsatz: Umsatzeingang,
  offene: readonly OffenerPosten[],
  kontext: MatchKontext,
): Zuordnungsvorschlag {
  const zweck = normalisiere(umsatz.verwendungszweck);

  const bauen = (
    regel: string,
    konfidenz: number,
    begruendung: string,
    posten: readonly OffenerPosten[],
  ): Zuordnungsvorschlag => {
    const { zuordnungen, restCent } = verrechne(umsatz.betragCent, posten);
    return {
      umsatzId: umsatz.umsatzId,
      regel,
      konfidenz,
      begruendung,
      zuordnungen,
      restCent,
      automatischBuchbar: konfidenz >= AUTO_SCHWELLE && restCent === 0,
    };
  };

  // 1. Exakte SEPA-Referenz: stärkste Evidenz, weil vom System erzeugt.
  const referenzTreffer = offene.find(
    (p) =>
      (umsatz.endToEndId && p.referenz && p.referenz === umsatz.endToEndId) ||
      (umsatz.mandatsreferenz && p.referenz && p.referenz === umsatz.mandatsreferenz),
  );
  if (referenzTreffer && referenzTreffer.offenCent === umsatz.betragCent) {
    return bauen(
      "sepa_referenz_exakt",
      0.99,
      `SEPA-Referenz ${umsatz.endToEndId ?? umsatz.mandatsreferenz} stimmt mit Sollstellung ` +
        `${referenzTreffer.periode} überein, Betrag identisch.`,
      [referenzTreffer],
    );
  }

  // 2. Mandatsreferenz → Vertrag, Summe der offenen Posten passt exakt.
  const vertragUeberMandat = umsatz.mandatsreferenz
    ? kontext.mandatZuVertrag[umsatz.mandatsreferenz]
    : undefined;
  const vertragUeberIban = umsatz.gegenkontoIban
    ? kontext.ibanZuVertrag[umsatz.gegenkontoIban.replace(/\s/g, "")]
    : undefined;
  const vertragId = vertragUeberMandat ?? vertragUeberIban;

  if (vertragId) {
    const vertragsPosten = offene.filter((p) => p.vertragId === vertragId);
    const summe = vertragsPosten.reduce((s, p) => s + p.offenCent, 0);

    if (summe === umsatz.betragCent && vertragsPosten.length > 0) {
      return bauen(
        vertragUeberMandat ? "mandat_summe_exakt" : "iban_summe_exakt",
        0.97,
        `${vertragUeberMandat ? "Mandatsreferenz" : "IBAN"} ist dem Vertrag zugeordnet; ` +
          `Zahlbetrag entspricht exakt der Summe von ${vertragsPosten.length} offenen Posten.`,
        vertragsPosten,
      );
    }

    const einzel = vertragsPosten.find((p) => p.offenCent === umsatz.betragCent);
    if (einzel) {
      return bauen(
        "iban_einzelposten_exakt",
        0.94,
        `IBAN dem Vertrag zugeordnet; Betrag entspricht der Sollstellung ${einzel.periode}.`,
        [einzel],
      );
    }

    const kennung = kontext.vertragKennung[vertragId];
    if (kennung && zweck.includes(normalisiere(kennung))) {
      return bauen(
        "iban_und_kennung",
        0.91,
        `IBAN und Objektkennung "${kennung}" im Verwendungszweck stimmen überein; ` +
          `Verrechnung nach §366/§367 BGB (älteste Forderung zuerst).`,
        vertragsPosten,
      );
    }

    if (vertragsPosten.length > 0) {
      const summeOffen = vertragsPosten.reduce((s, p) => s + p.offenCent, 0);
      const teil = umsatz.betragCent < summeOffen;
      return bauen(
        teil ? "iban_teilzahlung" : "iban_ueberzahlung",
        0.78,
        teil
          ? `IBAN bekannt, Zahlung deckt die offenen Posten nicht vollständig ` +
              `(offen ${(summeOffen / 100).toFixed(2)} €). Verrechnung nach §366/§367 BGB, ` +
              `Restforderung bleibt offen.`
          : `IBAN bekannt, Zahlung übersteigt die offenen Posten — Überzahlung prüfen.`,
        vertragsPosten,
      );
    }
  }

  // 3. Kennung im Verwendungszweck ohne bekannte IBAN (z. B. Zahlung durch Dritte).
  for (const [vId, kennung] of Object.entries(kontext.vertragKennung)) {
    if (!kennung || !zweck.includes(normalisiere(kennung))) continue;
    const vertragsPosten = offene.filter((p) => p.vertragId === vId);
    if (vertragsPosten.length === 0) continue;
    return bauen(
      "kennung_im_zweck",
      0.82,
      `Verwendungszweck enthält die Kennung "${kennung}", die IBAN ist jedoch nicht im ` +
        `Stammdatensatz — Zahlung durch Dritte möglich, bitte prüfen.`,
      vertragsPosten,
    );
  }

  // 4. Namensähnlichkeit: nur als Vorschlag, nie automatisch.
  let besterVertrag: string | undefined;
  let besteAehnlichkeit = 0;
  for (const [vId, namen] of Object.entries(kontext.vertragNamen)) {
    for (const name of namen) {
      const score = Math.max(
        namensAehnlichkeit(umsatz.gegenkontoName, name),
        namensAehnlichkeit(umsatz.verwendungszweck, name),
      );
      if (score > besteAehnlichkeit) {
        besteAehnlichkeit = score;
        besterVertrag = vId;
      }
    }
  }

  if (besterVertrag && besteAehnlichkeit >= 0.5) {
    const vertragsPosten = offene.filter((p) => p.vertragId === besterVertrag);
    if (vertragsPosten.length > 0) {
      return bauen(
        "namensaehnlichkeit",
        Math.min(0.7, 0.4 + besteAehnlichkeit * 0.3),
        `Zahlername "${umsatz.gegenkontoName}" ähnelt dem Mieternamen ` +
          `(${Math.round(besteAehnlichkeit * 100)} % Übereinstimmung). Keine IBAN-Zuordnung — ` +
          `Zuordnung bestätigen und IBAN im Stammdatensatz ergänzen.`,
        vertragsPosten,
      );
    }
  }

  return {
    umsatzId: umsatz.umsatzId,
    regel: "keine_regel",
    konfidenz: 0,
    begruendung:
      "Keine Zuordnung möglich: IBAN unbekannt, keine Referenz, keine Kennung im Verwendungszweck.",
    zuordnungen: [],
    restCent: umsatz.betragCent,
    automatischBuchbar: false,
  };
}
