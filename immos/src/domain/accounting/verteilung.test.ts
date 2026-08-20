import { describe, expect, it } from "vitest";
import { summe, tageImZeitraum, ueberschneidung, verteileCent } from "./verteilung";
import { seededRandom } from "@/lib/utils";

describe("verteileCent", () => {
  it("verteilt ohne Centverlust", () => {
    const r = verteileCent(10000, [
      { key: "a", gewicht: 1 },
      { key: "b", gewicht: 1 },
      { key: "c", gewicht: 1 },
    ]);
    expect(summe(r)).toBe(10000);
    expect(r.map((x) => x.anteilCent).sort()).toEqual([3333, 3333, 3334]);
  });

  it("verteilt nach Gewichten", () => {
    const r = verteileCent(100000, [
      { key: "gross", gewicht: 120 },
      { key: "klein", gewicht: 30 },
    ]);
    expect(r.find((x) => x.key === "gross")!.anteilCent).toBe(80000);
    expect(r.find((x) => x.key === "klein")!.anteilCent).toBe(20000);
  });

  it("behandelt negative Beträge (Guthaben) vorzeichenrichtig", () => {
    const r = verteileCent(-1000, [
      { key: "a", gewicht: 1 },
      { key: "b", gewicht: 2 },
    ]);
    expect(summe(r)).toBe(-1000);
    expect(r.every((x) => x.anteilCent <= 0)).toBe(true);
  });

  it("gibt bei Gewichtssumme 0 keine Anteile", () => {
    const r = verteileCent(5000, [
      { key: "a", gewicht: 0 },
      { key: "b", gewicht: 0 },
    ]);
    expect(summe(r)).toBe(0);
  });

  it("ist deterministisch bei gleichen Resten", () => {
    const a = verteileCent(1000, [
      { key: "x", gewicht: 1 },
      { key: "y", gewicht: 1 },
      { key: "z", gewicht: 1 },
    ]);
    const b = verteileCent(1000, [
      { key: "x", gewicht: 1 },
      { key: "y", gewicht: 1 },
      { key: "z", gewicht: 1 },
    ]);
    expect(a).toEqual(b);
  });

  it("hält die Summe über 500 Zufallsfälle exakt ein", () => {
    const rand = seededRandom(42);
    for (let fall = 0; fall < 500; fall++) {
      const betrag = Math.floor(rand() * 5_000_000);
      const n = 1 + Math.floor(rand() * 40);
      const anteile = Array.from({ length: n }, (_, i) => ({
        key: `k${i}`,
        gewicht: Math.round(rand() * 10000) / 100,
      }));
      const gesamt = anteile.reduce((s, a) => s + a.gewicht, 0);
      const r = verteileCent(betrag, anteile);
      expect(summe(r)).toBe(gesamt > 0 ? betrag : 0);
    }
  });
});

describe("Zeiträume", () => {
  it("zählt Tage inklusive Start und Ende", () => {
    expect(tageImZeitraum("2025-01-01", "2025-01-31")).toBe(31);
    expect(tageImZeitraum("2025-01-01", "2025-12-31")).toBe(365);
    expect(tageImZeitraum("2024-01-01", "2024-12-31")).toBe(366);
    expect(tageImZeitraum("2025-03-15", "2025-03-15")).toBe(1);
  });

  it("liefert für vertauschte Grenzen 0 Tage", () => {
    expect(tageImZeitraum("2025-05-01", "2025-04-01")).toBe(0);
  });

  it("schneidet Zeiträume korrekt", () => {
    expect(ueberschneidung("2025-01-01", "2025-06-30", "2025-04-01", "2025-12-31")).toEqual({
      von: "2025-04-01",
      bis: "2025-06-30",
      tage: 91,
    });
    expect(ueberschneidung("2025-01-01", "2025-03-31", "2025-04-01", "2025-12-31")).toBeNull();
  });
});
