import { describe, expect, it } from "vitest";
import {
  bewerteMahnfall,
  erzeugeSollstellungenJahr,
  erzeugeSollstellungenMonat,
  faelligkeitMonat,
  verzugszinsen,
  type VertragFuerSoll,
} from "./sollstellung";

const vertrag: VertragFuerSoll = {
  vertragId: "v-1",
  objektId: "obj-1",
  einheitId: "e-1",
  beginn: "2024-05-01",
  ende: null,
  gekuendigtZum: null,
  mieteKaltCent: 84000,
  bkVorauszahlungCent: 15000,
  hkVorauszahlungCent: 9000,
  stellplatzCent: 4500,
};

describe("faelligkeitMonat", () => {
  it("findet den 3. Werktag", () => {
    // August 2026: 1. Sa, 2. So -> 3./4./5. sind Werktage 1..3
    expect(faelligkeitMonat(2026, 8)).toBe("2026-08-05");
    // Januar 2026: 1. Do -> 1., 2. (Fr), 5. (Mo)
    expect(faelligkeitMonat(2026, 1)).toBe("2026-01-05");
  });
});

describe("erzeugeSollstellungenMonat", () => {
  it("erzeugt alle Sollarten für einen vollen Monat", () => {
    const s = erzeugeSollstellungenMonat(vertrag, 2026, 8);
    expect(s).toHaveLength(4);
    expect(s.reduce((a, b) => a + b.betragCent, 0)).toBe(84000 + 15000 + 9000 + 4500);
    expect(s.every((p) => p.faelligAm === "2026-08-05")).toBe(true);
  });

  it("rechnet den Anfangsmonat zeitanteilig", () => {
    const s = erzeugeSollstellungenMonat({ ...vertrag, beginn: "2026-08-15" }, 2026, 8);
    const kalt = s.find((p) => p.art === "miete_kalt")!;
    // 17 von 31 Tagen
    expect(kalt.betragCent).toBe(Math.round((84000 * 17) / 31));
    expect(kalt.hinweis).toContain("17/31");
  });

  it("berücksichtigt die Kündigung zum Monatsmitte", () => {
    const s = erzeugeSollstellungenMonat({ ...vertrag, gekuendigtZum: "2026-08-15" }, 2026, 8);
    const kalt = s.find((p) => p.art === "miete_kalt")!;
    expect(kalt.tage).toBe(15);
  });

  it("erzeugt beim Mieterwechsel in Summe genau eine Monatsmiete", () => {
    const raus = erzeugeSollstellungenMonat({ ...vertrag, gekuendigtZum: "2026-08-15" }, 2026, 8);
    const rein = erzeugeSollstellungenMonat(
      { ...vertrag, vertragId: "v-2", beginn: "2026-08-16" },
      2026,
      8,
    );
    const summe = (arr: typeof raus) =>
      arr.filter((p) => p.art === "miete_kalt").reduce((s, p) => s + p.betragCent, 0);
    expect(summe(raus) + summe(rein)).toBe(84000);
  });

  it("liefert nichts vor Vertragsbeginn und nach Vertragsende", () => {
    expect(erzeugeSollstellungenMonat(vertrag, 2024, 4)).toHaveLength(0);
    expect(
      erzeugeSollstellungenMonat({ ...vertrag, gekuendigtZum: "2026-07-31" }, 2026, 8),
    ).toHaveLength(0);
  });

  it("wendet terminierte Anpassungen ab dem Stichtag an", () => {
    const mitStaffel: VertragFuerSoll = {
      ...vertrag,
      anpassungen: [
        { abIso: "2026-07-01", mieteKaltCent: 88000, grund: "Staffelmiete Stufe 3" },
        { abIso: "2027-01-01", mieteKaltCent: 92000, grund: "Staffelmiete Stufe 4" },
      ],
    };
    expect(
      erzeugeSollstellungenMonat(mitStaffel, 2026, 6).find((p) => p.art === "miete_kalt")!.betragCent,
    ).toBe(84000);
    const juli = erzeugeSollstellungenMonat(mitStaffel, 2026, 7).find((p) => p.art === "miete_kalt")!;
    expect(juli.betragCent).toBe(88000);
    expect(juli.hinweis).toBe("Staffelmiete Stufe 3");
  });

  it("erzeugt zwölf Monatsläufe im Jahr", () => {
    const jahr = erzeugeSollstellungenJahr(vertrag, 2026);
    expect(new Set(jahr.map((p) => p.periode)).size).toBe(12);
    expect(jahr.reduce((s, p) => s + p.betragCent, 0)).toBe((84000 + 15000 + 9000 + 4500) * 12);
  });
});

describe("bewerteMahnfall", () => {
  const basis = {
    vertragId: "v-1",
    objektId: "obj-1",
    einheitId: "e-1",
    monatsBruttoMieteCent: 112500,
  };

  it("gibt für bezahlte Konten keinen Fall zurück", () => {
    expect(bewerteMahnfall({ ...basis, offenePosten: [] }, "2026-08-20")).toBeNull();
  });

  it("empfiehlt Stufe 1 nach sieben Tagen", () => {
    const r = bewerteMahnfall(
      { ...basis, offenePosten: [{ faelligAm: "2026-08-05", offenCent: 112500, mahnstufe: 0 }] },
      "2026-08-14",
    )!;
    expect(r.empfohleneStufe).toBe(1);
    expect(r.automatischErlaubt).toBe(true);
  });

  it("erkennt den Kündigungsgrund bei zwei Monatsmieten und sperrt die Automatik", () => {
    const r = bewerteMahnfall(
      {
        ...basis,
        offenePosten: [
          { faelligAm: "2026-06-03", offenCent: 112500, mahnstufe: 2 },
          { faelligAm: "2026-07-03", offenCent: 112500, mahnstufe: 1 },
        ],
      },
      "2026-08-20",
    )!;
    expect(r.kuendigungsgrund).toBe(true);
    expect(r.automatischErlaubt).toBe(false);
    expect(r.begruendung).toContain("§543");
    expect(r.begruendung).toContain("§569");
  });

  it("ignoriert noch nicht fällige Posten", () => {
    const r = bewerteMahnfall(
      { ...basis, offenePosten: [{ faelligAm: "2026-09-03", offenCent: 112500, mahnstufe: 0 }] },
      "2026-08-20",
    );
    expect(r).toBeNull();
  });
});

describe("verzugszinsen", () => {
  it("rechnet 5 Punkte über Basiszinssatz taggenau", () => {
    // 1.000 € Rückstand, 90 Tage, Basiszinssatz 3,0 % -> 8 % p. a.
    expect(verzugszinsen(100000, 90, 3)).toBe(Math.round((100000 * 0.08 * 90) / 365));
  });
});
