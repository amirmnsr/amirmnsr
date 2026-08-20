import { describe, expect, it } from "vitest";
import { einheiten, objekte, personen, postfaecher, vertraege, zaehler, eigentumsverhaeltnisse } from "./stammdaten";
import { offenePosten, sollstellungen, eingangsrechnungen, kostenpositionen2025 } from "./finanzen";
import { anlagen, fristen, nachrichten, pruefpflichten, vorgaenge } from "./betrieb";
import { agenten, autonomieRegeln } from "./agenten";
import { vorschlaege } from "./vorschlaege";
import { MODULE_DEFINITIONS, MODULE_MAP } from "@/domain/modules";
import { kontoMap } from "./kontenrahmen";

/**
 * Die Demo-Welt ist Produktdemonstration und Testfixture in einem. Wenn sie
 * inkonsistent wird, sind alle Screenshots und Vorführungen wertlos — daher
 * werden die Invarianten geprüft wie Produktionscode.
 */

function keineDuplikate(ids: string[]): string[] {
  const gesehen = new Set<string>();
  return ids.filter((id) => (gesehen.has(id) ? true : (gesehen.add(id), false)));
}

describe("Stammdaten-Konsistenz", () => {
  it("hat eindeutige IDs", () => {
    expect(keineDuplikate(objekte.map((o) => o.id))).toEqual([]);
    expect(keineDuplikate(einheiten.map((e) => e.id))).toEqual([]);
    expect(keineDuplikate(personen.map((p) => p.id))).toEqual([]);
    expect(keineDuplikate(vertraege.map((v) => v.id))).toEqual([]);
    expect(keineDuplikate(postfaecher.map((p) => p.id))).toEqual([]);
    expect(keineDuplikate(zaehler.map((z) => z.id))).toEqual([]);
  });

  it("verweist bei jeder Einheit auf ein existierendes Objekt", () => {
    const objektIds = new Set(objekte.map((o) => o.id));
    expect(einheiten.filter((e) => !objektIds.has(e.objektId))).toEqual([]);
  });

  it("stimmt in der Einheitenzahl mit dem Objekt überein", () => {
    for (const o of objekte) {
      expect(einheiten.filter((e) => e.objektId === o.id)).toHaveLength(o.einheitenAnzahl);
    }
  });

  it("hat für jede Einheit genau ein Eigentumsverhältnis", () => {
    for (const e of einheiten) {
      expect(eigentumsverhaeltnisse.filter((ev) => ev.einheitId === e.id)).toHaveLength(1);
    }
  });

  it("verknüpft jeden Mietvertrag mit Einheit und existierenden Mietern", () => {
    const einheitIds = new Set(einheiten.map((e) => e.id));
    const personIds = new Set(personen.map((p) => p.id));
    for (const v of vertraege) {
      expect(einheitIds.has(v.einheitId)).toBe(true);
      for (const m of v.mieterIds) expect(personIds.has(m)).toBe(true);
    }
  });

  it("hat keinen Mietvertrag auf einer leerstehenden Einheit", () => {
    const leerstand = new Set(
      einheiten.filter((e) => e.status === "leerstand").map((e) => e.id),
    );
    const verletzung = vertraege.filter(
      (v) => leerstand.has(v.einheitId) && !v.gekuendigtZum,
    );
    expect(verletzung).toEqual([]);
  });

  it("hat für jedes Objekt ein Rechnungspostfach mit eigener Adresse", () => {
    for (const o of objekte) {
      const eigene = postfaecher.filter((p) => p.objektId === o.id);
      expect(eigene.some((p) => p.zweck === "rechnung")).toBe(true);
      for (const p of eigene) expect(p.adresse).toContain(o.nummer);
    }
  });

  it("hat eindeutige Postfachadressen", () => {
    expect(keineDuplikate(postfaecher.map((p) => p.adresse))).toEqual([]);
  });

  it("weist WEG-Objekten Miteigentumsanteile zu", () => {
    for (const o of objekte.filter((x) => x.verwaltungsarten.includes("weg"))) {
      const wegEinheiten = einheiten.filter((e) => e.objektId === o.id);
      expect(wegEinheiten.every((e) => (e.meaTausendstel ?? 0) > 0)).toBe(true);
    }
  });
});

describe("Finanzdaten-Konsistenz", () => {
  it("hat für jede Sollstellung einen existierenden Vertrag", () => {
    const vertragIds = new Set(vertraege.map((v) => v.id));
    for (const s of sollstellungen) {
      expect(vertragIds.has(s.vertragId!)).toBe(true);
    }
  });

  it("führt nur unbezahlte Posten als offen", () => {
    for (const p of offenePosten) {
      expect(p.bezahltCent).toBeLessThan(p.betragCent);
      expect(p.status).not.toBe("bezahlt");
    }
  });

  it("hat für jede Eingangsrechnung ein bekanntes Vorkontierungskonto", () => {
    for (const r of eingangsrechnungen) {
      if (!r.kontoVorschlag) continue;
      expect(kontoMap.has(r.kontoVorschlag)).toBe(true);
    }
  });

  it("rechnet Netto plus Umsatzsteuer gleich Brutto", () => {
    for (const r of eingangsrechnungen) {
      expect(Math.abs(r.nettoCent + r.ustCent - r.bruttoCent)).toBeLessThanOrEqual(1);
    }
  });

  it("kennzeichnet den Duplikatverdacht wechselseitig auflösbar", () => {
    const verdacht = eingangsrechnungen.filter((r) => r.pruefung.duplikatVerdacht);
    expect(verdacht.length).toBeGreaterThan(0);
    for (const r of verdacht) {
      expect(eingangsrechnungen.some((x) => x.id === r.pruefung.duplikatVon)).toBe(true);
    }
  });

  it("nutzt in Kostenpositionen ausschließlich Konten des Kontenrahmens", () => {
    for (const k of kostenpositionen2025) {
      expect(kontoMap.has(k.kontoNr)).toBe(true);
      const konto = kontoMap.get(k.kontoNr)!;
      expect(konto.umlagefaehig ?? false).toBe(k.umlagefaehig);
    }
  });
});

describe("Betriebsdaten-Konsistenz", () => {
  it("verweist jeder Vorgang auf ein existierendes Objekt", () => {
    const objektIds = new Set(objekte.map((o) => o.id));
    for (const v of vorgaenge) expect(objektIds.has(v.objektId)).toBe(true);
  });

  it("verknüpft Nachrichten mit existierenden Vorgängen", () => {
    const vorgangIds = new Set(vorgaenge.map((v) => v.id));
    for (const n of nachrichten) {
      if (n.vorgangId) expect(vorgangIds.has(n.vorgangId)).toBe(true);
    }
  });

  it("markiert überfällige Prüfpflichten auch als überfällige Frist", () => {
    const ueberfaellig = pruefpflichten.filter((p) => p.status === "ueberfaellig");
    expect(ueberfaellig.length).toBeGreaterThan(0);
    for (const p of ueberfaellig) {
      expect(p.naechstePruefung < "2026-08-20").toBe(true);
    }
  });

  it("verweist jede Prüfpflicht auf eine existierende Anlage", () => {
    const anlagenIds = new Set(anlagen.map((a) => a.id));
    for (const p of pruefpflichten) expect(anlagenIds.has(p.anlageId)).toBe(true);
  });

  it("nennt zu jeder Frist eine Konsequenz", () => {
    for (const f of fristen) expect(f.konsequenz.length).toBeGreaterThan(10);
  });

  it("enthält mindestens einen erkannten Prompt-Injection-Versuch", () => {
    expect(nachrichten.some((n) => n.sicherheit.promptInjektionVerdacht)).toBe(true);
  });
});

describe("Vorschläge", () => {
  it("nennt zu jedem Vorschlag Begründung, Belege und mindestens eine Aktion", () => {
    for (const v of vorschlaege) {
      expect(v.begruendung.length).toBeGreaterThan(60);
      expect(v.belege.length).toBeGreaterThan(0);
      expect(v.aktionen.length).toBeGreaterThan(0);
      expect(v.kurzfassung.length).toBeGreaterThan(20);
    }
  });

  it("verweist auf existierende Agenten und Objekte", () => {
    const agentIds = new Set(agenten.map((a) => a.id));
    const objektIds = new Set(objekte.map((o) => o.id));
    for (const v of vorschlaege) {
      expect(agentIds.has(v.agentId)).toBe(true);
      if (v.objektId) expect(objektIds.has(v.objektId)).toBe(true);
    }
  });

  it("hält die Autonomiestufe innerhalb der erlaubten Höchststufe des Prozesses", () => {
    const regelMap = new Map(autonomieRegeln.map((r) => [r.prozess, r]));
    for (const v of vorschlaege) {
      const regel = regelMap.get(v.prozess);
      expect(regel, `Prozess ${v.prozess} fehlt in der Autonomie-Matrix`).toBeDefined();
      expect(v.autonomiestufe).toBeLessThanOrEqual(regel!.maxStufe);
    }
  });

  it("begründet jede hohe Autonomiestufe bei riskanten Vorschlägen", () => {
    for (const v of vorschlaege.filter((x) => x.risiko === "hoch")) {
      expect(v.autonomiestufe).toBeLessThanOrEqual(1);
    }
  });

  it("nennt bei Stufe 2 einen Ausführungszeitpunkt", () => {
    for (const v of vorschlaege.filter((x) => x.autonomiestufe === 2 && x.status === "offen")) {
      expect(v.ausfuehrungAm).toBeDefined();
    }
  });

  it("hat für jeden Agenten ein aktives Modul im Katalog", () => {
    for (const a of agenten) expect(MODULE_MAP[a.modulId]).toBeDefined();
  });

  it("deckt jeden im Modulkatalog genannten Agenten ab", () => {
    const bekannt = new Set(agenten.map((a) => a.id));
    for (const m of MODULE_DEFINITIONS) {
      for (const agentId of m.agents) {
        expect(bekannt.has(agentId), `Agent ${agentId} aus Modul ${m.id} fehlt`).toBe(true);
      }
    }
  });
});

describe("Umfang der Demo-Welt", () => {
  it("ist groß genug, um realistisch zu wirken", () => {
    expect(objekte.length).toBeGreaterThanOrEqual(6);
    expect(einheiten.length).toBeGreaterThanOrEqual(140);
    expect(vertraege.length).toBeGreaterThanOrEqual(120);
    expect(vorschlaege.length).toBeGreaterThanOrEqual(15);
    expect(nachrichten.length).toBeGreaterThanOrEqual(12);
  });
});
