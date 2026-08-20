import { describe, expect, it } from "vitest";
import {
  berechneAbrechnung,
  co2Vermieteranteil,
  type AbrechnungskontextInput,
  type KostenpositionInput,
} from "./betriebskosten";

/**
 * Referenzobjekt: 3 Einheiten, 300 m², ein Mieterwechsel zur Jahresmitte,
 * eine Einheit mit Leerstand im Dezember.
 */
function kontext(overrides: Partial<AbrechnungskontextInput> = {}): AbrechnungskontextInput {
  return {
    objektId: "obj-1",
    jahr: 2025,
    von: "2025-01-01",
    bis: "2025-12-31",
    einheiten: [
      { einheitId: "e1", bezeichnung: "EG links", flaecheM2: 100, gewerbe: false, meaTausendstel: 340 },
      { einheitId: "e2", bezeichnung: "1. OG", flaecheM2: 100, gewerbe: false, meaTausendstel: 330 },
      { einheitId: "e3", bezeichnung: "2. OG", flaecheM2: 100, gewerbe: false, meaTausendstel: 330 },
    ],
    nutzungen: [
      {
        nutzungId: "n1",
        einheitId: "e1",
        nutzerName: "Mieter A",
        von: "2025-01-01",
        bis: "2025-12-31",
        personen: 2,
        vorauszahlungCent: 120000,
        verbrauchWaermeKwh: 8000,
        verbrauchKaltwasserM3: 60,
      },
      {
        nutzungId: "n2a",
        einheitId: "e2",
        nutzerName: "Mieter B (bis 30.06.)",
        von: "2025-01-01",
        bis: "2025-06-30",
        personen: 1,
        vorauszahlungCent: 60000,
        verbrauchWaermeKwh: 4000,
        verbrauchKaltwasserM3: 20,
      },
      {
        nutzungId: "n2b",
        einheitId: "e2",
        nutzerName: "Mieter C (ab 01.07.)",
        von: "2025-07-01",
        bis: "2025-12-31",
        personen: 3,
        vorauszahlungCent: 60000,
        verbrauchWaermeKwh: 3000,
        verbrauchKaltwasserM3: 40,
      },
      {
        nutzungId: "n3",
        einheitId: "e3",
        nutzerName: "Mieter D",
        von: "2025-01-01",
        bis: "2025-11-30",
        personen: 2,
        vorauszahlungCent: 110000,
        verbrauchWaermeKwh: 7000,
        verbrauchKaltwasserM3: 50,
      },
      {
        nutzungId: "n3-leer",
        einheitId: "e3",
        nutzerName: "Leerstand (Eigentümer)",
        von: "2025-12-01",
        bis: "2025-12-31",
        personen: 0,
        vorauszahlungCent: 0,
        leerstand: true,
        verbrauchWaermeKwh: 500,
      },
    ],
    heizkosten: { verbrauchsanteil: 0.7, co2EmissionKgProM2: 35 },
    ...overrides,
  };
}

const grundsteuer: KostenpositionInput = {
  id: "p-grundsteuer",
  kontoNr: "4200",
  bezeichnung: "Grundsteuer",
  betragCent: 300000,
  umlagefaehig: true,
  schluessel: "wohnflaeche",
  betrkv: "BetrKV §2 Nr. 1",
};

describe("berechneAbrechnung", () => {
  it("verteilt flächenbezogene Kosten zeitanteilig und ohne Centverlust", () => {
    const r = berechneAbrechnung(kontext(), [grundsteuer]);

    expect(r.summenkontrolleOk).toBe(true);
    expect(r.umgelegtCent).toBe(300000);

    const anteil = (id: string) =>
      r.nutzungen.find((n) => n.nutzungId === id)!.summeUmlageCent;

    // e1 nutzt das ganze Jahr: 100/300 der Kosten.
    expect(anteil("n1")).toBe(100000);
    // e2 teilt seinen Anteil auf zwei Mieter (181 und 184 Tage).
    expect(anteil("n2a") + anteil("n2b")).toBe(100000);
    expect(anteil("n2a")).toBeLessThan(anteil("n2b"));
    // e3: Leerstand im Dezember trägt der Eigentümer.
    expect(anteil("n3") + anteil("n3-leer")).toBe(100000);
    expect(anteil("n3-leer")).toBeGreaterThan(0);
  });

  it("weist Leerstandskosten dem Eigentümer zu und nicht den Mietern", () => {
    const r = berechneAbrechnung(kontext(), [grundsteuer]);
    const leer = r.nutzungen.find((n) => n.nutzungId === "n3-leer")!;
    expect(leer.leerstand).toBe(true);
    expect(r.eigentuemeranteilCent).toBeGreaterThanOrEqual(leer.summeUmlageCent);
  });

  it("teilt Heizkosten nach HeizkostenV in Grund- und Verbrauchskosten", () => {
    const heizung: KostenpositionInput = {
      id: "p-heiz",
      kontoNr: "4300",
      bezeichnung: "Heizung Erdgas",
      betragCent: 1000000,
      umlagefaehig: true,
      schluessel: "verbrauch_waerme",
      heizkosten: true,
      betrkv: "BetrKV §2 Nr. 4a",
    };
    const r = berechneAbrechnung(kontext(), [heizung]);

    expect(r.summenkontrolleOk).toBe(true);
    const alle = r.nutzungen.flatMap((n) => n.positionen);
    const grund = alle.filter((p) => p.bezeichnung.includes("Grundkosten"));
    const verbrauch = alle.filter((p) => p.bezeichnung.includes("Verbrauch"));

    expect(grund.reduce((s, p) => s + p.anteilCent, 0)).toBe(300000);
    expect(verbrauch.reduce((s, p) => s + p.anteilCent, 0)).toBe(700000);
    expect(grund[0].rechenweg).toContain("HeizkostenV §7");
  });

  it("begrenzt einen unzulässigen Verbrauchsanteil auf 70 % und weist darauf hin", () => {
    const r = berechneAbrechnung(
      kontext({ heizkosten: { verbrauchsanteil: 0.9, co2EmissionKgProM2: 20 } }),
      [
        {
          id: "p-heiz",
          kontoNr: "4300",
          bezeichnung: "Heizung",
          betragCent: 1000000,
          umlagefaehig: true,
          schluessel: "verbrauch_waerme",
          heizkosten: true,
        },
      ],
    );
    expect(r.hinweise.some((h) => h.includes("HeizkostenV §7"))).toBe(true);
    const verbrauch = r.nutzungen
      .flatMap((n) => n.positionen)
      .filter((p) => p.bezeichnung.includes("Verbrauch"));
    expect(verbrauch.reduce((s, p) => s + p.anteilCent, 0)).toBe(700000);
  });

  it("zieht den CO₂-Vermieteranteil nach Stufenmodell vor der Umlage ab", () => {
    // 35 kg/m²·a → Stufe 32 bis < 37 → 50 % Vermieteranteil.
    const r = berechneAbrechnung(kontext(), [
      {
        id: "p-heiz",
        kontoNr: "4300",
        bezeichnung: "Heizung Erdgas",
        betragCent: 1000000,
        umlagefaehig: true,
        schluessel: "verbrauch_waerme",
        heizkosten: true,
        co2KostenCent: 100000,
      },
    ]);

    expect(r.co2VermieteranteilCent).toBe(50000);
    expect(r.umgelegtCent).toBe(950000);
    expect(r.summenkontrolleOk).toBe(true);
    expect(r.co2Stufe).toBe("32 bis < 37 kg/m²·a");
  });

  it("legt nicht umlagefähige Kosten nicht um", () => {
    const r = berechneAbrechnung(kontext(), [
      {
        id: "p-inst",
        kontoNr: "4600",
        bezeichnung: "Instandhaltung Dach",
        betragCent: 500000,
        umlagefaehig: false,
        schluessel: "nicht_umlegen",
      },
      grundsteuer,
    ]);
    expect(r.nichtUmlagefaehigCent).toBe(500000);
    expect(r.umgelegtCent).toBe(300000);
    expect(r.summenkontrolleOk).toBe(true);
  });

  it("berücksichtigt Vorwegabzug für Gewerbeanteil", () => {
    const r = berechneAbrechnung(kontext(), [
      {
        ...grundsteuer,
        vorwegabzugCent: 60000,
        vorwegabzugGrund: "Gewerbeanteil Ladenlokal",
      },
    ]);
    expect(r.vorwegabzuegeCent).toBe(60000);
    expect(r.umgelegtCent).toBe(240000);
    expect(r.summenkontrolleOk).toBe(true);
  });

  it("rechnet Personenschlüssel zeitanteilig", () => {
    const r = berechneAbrechnung(kontext(), [
      {
        id: "p-muell",
        kontoNr: "4250",
        bezeichnung: "Müllentsorgung",
        betragCent: 120000,
        umlagefaehig: true,
        schluessel: "personen",
        betrkv: "BetrKV §2 Nr. 8",
      },
    ]);
    expect(r.summenkontrolleOk).toBe(true);
    const a = r.nutzungen.find((n) => n.nutzungId === "n2a")!.summeUmlageCent;
    const b = r.nutzungen.find((n) => n.nutzungId === "n2b")!.summeUmlageCent;
    // 1 Person × 181 Tage gegen 3 Personen × 184 Tage.
    expect(b).toBeGreaterThan(a * 2);
  });

  it("ordnet Direktzuordnung nur der betroffenen Einheit zu", () => {
    const r = berechneAbrechnung(kontext(), [
      {
        id: "p-direkt",
        kontoNr: "4900",
        bezeichnung: "Sondernutzung Garage",
        betragCent: 60000,
        umlagefaehig: true,
        schluessel: "direktzuordnung",
        einheitId: "e1",
      },
    ]);
    expect(r.nutzungen.find((n) => n.nutzungId === "n1")!.summeUmlageCent).toBe(60000);
    expect(r.nutzungen.find((n) => n.nutzungId === "n2a")!.summeUmlageCent).toBe(0);
  });

  it("berechnet Saldo als Umlage minus Vorauszahlung", () => {
    const r = berechneAbrechnung(kontext(), [grundsteuer]);
    const n1 = r.nutzungen.find((n) => n.nutzungId === "n1")!;
    expect(n1.saldoCent).toBe(n1.summeUmlageCent - 120000);
  });

  it("meldet fehlende Bezugsgröße statt still zu verteilen", () => {
    const ohneVerbrauch = kontext({
      nutzungen: kontext().nutzungen.map((n) => ({ ...n, verbrauchWaermeKwh: 0 })),
    });
    const r = berechneAbrechnung(ohneVerbrauch, [
      {
        id: "p-heiz",
        kontoNr: "4300",
        bezeichnung: "Heizung",
        betragCent: 100000,
        umlagefaehig: true,
        schluessel: "verbrauch_waerme",
      },
    ]);
    expect(r.hinweise.some((h) => h.includes("keine Bezugsgröße"))).toBe(true);
    expect(r.summenkontrolleOk).toBe(true);
  });

  it("verteilt einen vollständigen Kostenkatalog centgenau", () => {
    const positionen: KostenpositionInput[] = [
      grundsteuer,
      { id: "p2", kontoNr: "4210", bezeichnung: "Wasser/Abwasser", betragCent: 187345, umlagefaehig: true, schluessel: "verbrauch_wasser" },
      { id: "p3", kontoNr: "4250", bezeichnung: "Müllentsorgung", betragCent: 98777, umlagefaehig: true, schluessel: "personen" },
      { id: "p4", kontoNr: "4260", bezeichnung: "Hausreinigung", betragCent: 234567, umlagefaehig: true, schluessel: "wohnflaeche" },
      { id: "p5", kontoNr: "4270", bezeichnung: "Gartenpflege", betragCent: 45123, umlagefaehig: true, schluessel: "wohnflaeche" },
      { id: "p6", kontoNr: "4280", bezeichnung: "Aufzug", betragCent: 76543, umlagefaehig: true, schluessel: "einheiten" },
      { id: "p7", kontoNr: "4300", bezeichnung: "Heizung", betragCent: 1123457, umlagefaehig: true, schluessel: "verbrauch_waerme", heizkosten: true, co2KostenCent: 87654 },
      { id: "p8", kontoNr: "4600", bezeichnung: "Instandhaltung", betragCent: 333333, umlagefaehig: false, schluessel: "nicht_umlegen" },
      { id: "p9", kontoNr: "4610", bezeichnung: "Verwaltervergütung", betragCent: 222222, umlagefaehig: false, schluessel: "nicht_umlegen" },
    ];
    const r = berechneAbrechnung(kontext(), positionen);
    const gesamt = positionen.reduce((s, p) => s + p.betragCent, 0);

    expect(r.gesamtkostenCent).toBe(gesamt);
    expect(r.summenkontrolleOk).toBe(true);
    expect(
      r.umgelegtCent + r.nichtUmlagefaehigCent + r.vorwegabzuegeCent + r.co2VermieteranteilCent,
    ).toBe(gesamt);
    // Jede Nutzung hat einen nachvollziehbaren Rechenweg pro Position.
    for (const n of r.nutzungen) {
      for (const p of n.positionen) {
        expect(p.rechenweg.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("co2Vermieteranteil", () => {
  it("trifft die Stufengrenzen", () => {
    expect(co2Vermieteranteil(11).anteil).toBe(0);
    expect(co2Vermieteranteil(12).anteil).toBeCloseTo(0.1);
    expect(co2Vermieteranteil(36.9).anteil).toBeCloseTo(0.5);
    expect(co2Vermieteranteil(52).anteil).toBeCloseTo(0.95);
    expect(co2Vermieteranteil(999).anteil).toBeCloseTo(0.95);
  });

  it("teilt bei Nichtwohngebäuden hälftig", () => {
    expect(co2Vermieteranteil(80, true).anteil).toBe(0.5);
  });

  it("verteilt ohne Emissionsdaten nichts und sagt das", () => {
    const r = co2Vermieteranteil(undefined);
    expect(r.anteil).toBe(0);
    expect(r.label).toContain("keine Emissionsdaten");
  });
});
