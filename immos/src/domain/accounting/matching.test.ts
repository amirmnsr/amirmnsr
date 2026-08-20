import { describe, expect, it } from "vitest";
import { findeZuordnung, namensAehnlichkeit, verrechne, type MatchKontext, type OffenerPosten } from "./matching";

const kontext: MatchKontext = {
  ibanZuVertrag: { DE02120300000000202051: "v-1" },
  mandatZuVertrag: { "MND-1042-03": "v-1" },
  vertragKennung: { "v-1": "1042-03-L", "v-2": "1042-07-R" },
  vertragNamen: { "v-1": ["Katharina Böhmer"], "v-2": ["Ferhat Yilmaz"] },
};

const posten = (over: Partial<OffenerPosten> = {}): OffenerPosten => ({
  sollId: "s-1",
  objektId: "obj-1",
  einheitId: "e-1",
  vertragId: "v-1",
  periode: "2026-08",
  art: "miete_kalt",
  offenCent: 84000,
  faelligAm: "2026-08-04",
  mahnstufe: 0,
  ...over,
});

describe("verrechne", () => {
  it("tilgt Kosten vor der Hauptforderung (§367 BGB)", () => {
    const r = verrechne(10000, [
      posten({ sollId: "miete", offenCent: 84000, faelligAm: "2026-07-03" }),
      posten({ sollId: "gebuehr", art: "mahngebuehr", offenCent: 500, faelligAm: "2026-08-04" }),
    ]);
    expect(r.zuordnungen[0]).toEqual({ sollId: "gebuehr", betragCent: 500 });
    expect(r.zuordnungen[1]).toEqual({ sollId: "miete", betragCent: 9500 });
  });

  it("tilgt die ältere Forderung zuerst (§366 Abs. 2 BGB)", () => {
    const r = verrechne(84000, [
      posten({ sollId: "neu", faelligAm: "2026-08-04" }),
      posten({ sollId: "alt", faelligAm: "2026-06-03" }),
    ]);
    expect(r.zuordnungen).toEqual([{ sollId: "alt", betragCent: 84000 }]);
    expect(r.restCent).toBe(0);
  });

  it("weist Restbetrag bei Überzahlung aus", () => {
    const r = verrechne(100000, [posten({ offenCent: 84000 })]);
    expect(r.restCent).toBe(16000);
  });
});

describe("findeZuordnung", () => {
  it("erkennt exakte SEPA-Referenz mit höchster Konfidenz", () => {
    const r = findeZuordnung(
      {
        umsatzId: "u1",
        betragCent: 84000,
        buchungstag: "2026-08-04",
        gegenkontoName: "K. Boehmer",
        verwendungszweck: "Miete",
        endToEndId: "REF-2026-08-1042-03",
      },
      [posten({ referenz: "REF-2026-08-1042-03" })],
      kontext,
    );
    expect(r.regel).toBe("sepa_referenz_exakt");
    expect(r.konfidenz).toBeGreaterThan(0.95);
    expect(r.automatischBuchbar).toBe(true);
  });

  it("ordnet über IBAN zu, wenn die Summe der offenen Posten passt", () => {
    const r = findeZuordnung(
      {
        umsatzId: "u2",
        betragCent: 84000 + 18000,
        buchungstag: "2026-08-04",
        gegenkontoName: "Katharina Böhmer",
        verwendungszweck: "Miete August",
        gegenkontoIban: "DE02120300000000202051",
      },
      [posten({ sollId: "kalt" }), posten({ sollId: "nk", art: "bk_vorauszahlung", offenCent: 18000 })],
      kontext,
    );
    expect(r.regel).toBe("iban_summe_exakt");
    expect(r.zuordnungen).toHaveLength(2);
    expect(r.automatischBuchbar).toBe(true);
  });

  it("markiert Teilzahlungen als nicht automatisch buchbar", () => {
    const r = findeZuordnung(
      {
        umsatzId: "u3",
        betragCent: 40000,
        buchungstag: "2026-08-10",
        gegenkontoName: "Katharina Böhmer",
        verwendungszweck: "Teilzahlung",
        gegenkontoIban: "DE02120300000000202051",
      },
      [posten()],
      kontext,
    );
    expect(r.regel).toBe("iban_teilzahlung");
    expect(r.automatischBuchbar).toBe(false);
    expect(r.restCent).toBe(0);
    expect(r.zuordnungen[0].betragCent).toBe(40000);
  });

  it("nutzt die Objektkennung im Verwendungszweck, wenn die IBAN unbekannt ist", () => {
    const r = findeZuordnung(
      {
        umsatzId: "u4",
        betragCent: 84000,
        buchungstag: "2026-08-04",
        gegenkontoName: "Sparkasse Zahlungseingang",
        verwendungszweck: "Zahlung fuer 1042-03-L August",
        gegenkontoIban: "DE99999999999999999999",
      },
      [posten()],
      kontext,
    );
    expect(r.regel).toBe("kennung_im_zweck");
    expect(r.automatischBuchbar).toBe(false);
    expect(r.begruendung).toContain("Zahlung durch Dritte");
  });

  it("schlägt bei Namensähnlichkeit nur vor, statt zu buchen", () => {
    const r = findeZuordnung(
      {
        umsatzId: "u5",
        betragCent: 84000,
        buchungstag: "2026-08-04",
        gegenkontoName: "Katharina Böhmer",
        verwendungszweck: "Ueberweisung",
      },
      [posten()],
      kontext,
    );
    expect(r.regel).toBe("namensaehnlichkeit");
    expect(r.konfidenz).toBeLessThan(0.9);
    expect(r.automatischBuchbar).toBe(false);
  });

  it("gibt ehrlich auf, wenn nichts passt", () => {
    const r = findeZuordnung(
      {
        umsatzId: "u6",
        betragCent: 12345,
        buchungstag: "2026-08-04",
        gegenkontoName: "Unbekannt GmbH",
        verwendungszweck: "Rechnung 4711",
      },
      [posten()],
      kontext,
    );
    expect(r.regel).toBe("keine_regel");
    expect(r.zuordnungen).toHaveLength(0);
    expect(r.automatischBuchbar).toBe(false);
  });
});

describe("namensAehnlichkeit", () => {
  it("erkennt Übereinstimmung unabhängig von Reihenfolge und Groß-/Kleinschreibung", () => {
    expect(namensAehnlichkeit("Böhmer Katharina", "Katharina Böhmer")).toBe(1);
  });
  it("liefert 0 bei fremden Namen", () => {
    expect(namensAehnlichkeit("Müller GmbH", "Yilmaz")).toBe(0);
  });
});
