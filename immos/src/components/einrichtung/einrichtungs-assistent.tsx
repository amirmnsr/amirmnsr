"use client";

import * as Icons from "lucide-react";
import {
  MODULE_DEFINITIONS,
  MODULE_MAP,
  dependentModules,
  type ModuleCategory,
} from "@/domain/modules";
import { NAVIGATION } from "@/components/shell/navigation";
import { useImmos } from "@/state/immos-store";
import { Etikett, Karte, KartenKopf, Plakette } from "@/components/ui/display";
import { Knopf, Schalter } from "@/components/ui/controls";

/**
 * Ersteinrichtung
 * =============================================================================
 * Hier wird aus ImmOS das System dieser Verwaltung. Wer keine WEG betreut, sieht
 * kein Wort über Wirtschaftsplan und Beschlusssammlung — das ist kein
 * Verstecken, sondern der Unterschied zwischen einem Werkzeug und einem
 * Katalog.
 *
 * Abhängigkeiten werden beim Schalten aufgelöst: SEV setzt Mietverwaltung
 * voraus, WEG setzt Buchhaltung voraus, Versammlung setzt WEG voraus. Beim
 * Abschalten wird angezeigt, was mitgeht.
 */

const KATEGORIE_TITEL: Record<ModuleCategory, { titel: string; text: string }> = {
  kern: {
    titel: "Kern",
    text: "Immer aktiv. Objektakte, Posteingang, Vorgänge, Dokumente und Fristen sind die Grundlage aller Module.",
  },
  verwaltungsart: {
    titel: "Verwaltungsarten",
    text: "Was betreut ihr? Miet- und SEV-Verwaltung sind voreingestellt, WEG und Gewerbe schaltet man dazu.",
  },
  fachmodul: {
    titel: "Fachbereiche",
    text: "Buchhaltung, Abrechnung, Technik, Vermietung, Versammlung, Reporting — einzeln aktivierbar.",
  },
  assistenz: {
    titel: "Assistenz",
    text: "Sprachsteuerung und Autonomiestufen. Beides jederzeit umschaltbar, auch im Betrieb.",
  },
};

export function EinrichtungsAssistent({
  mandantName,
  mailDomain,
  objekte,
}: {
  mandantName: string;
  mailDomain: string;
  objekte: { id: string; nummer: string; bezeichnung: string; verwaltungsarten: string[]; einheiten: number }[];
}) {
  const { moduleConfig, setzeModul, autonomie, modulAktiv } = useImmos();

  const aktiveModule = MODULE_DEFINITIONS.filter((m) => moduleConfig[m.id]);
  const sichtbareNavigation = NAVIGATION.filter((n) => modulAktiv(n.modulId));
  const aktiveAgenten = new Set(aktiveModule.flatMap((m) => m.agents));
  const aktiveProzesse = autonomie.filter((r) => moduleConfig[r.modulId]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {(["verwaltungsart", "fachmodul", "assistenz", "kern"] as ModuleCategory[]).map((kat) => (
          <Karte key={kat}>
            <KartenKopf titel={KATEGORIE_TITEL[kat].titel} hinweis={KATEGORIE_TITEL[kat].text} />
            <ul className="divide-y divide-line">
              {MODULE_DEFINITIONS.filter((m) => m.category === kat).map((m) => {
                const an = moduleConfig[m.id] === true;
                const mitAbschalten = an && !m.locked ? dependentModules(moduleConfig, m.id) : [];
                const fehlend = m.requires.filter((r) => !moduleConfig[r]);
                return (
                  <li key={m.id} className="px-4 py-3.5">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <Schalter
                          an={an}
                          gesperrt={m.locked}
                          label={m.name}
                          beschreibung={m.claim}
                          aendern={(neu) => setzeModul(m.id, neu)}
                        />
                        <div className="mt-2 ml-10 flex flex-wrap gap-1">
                          {m.unlocks.map((u) => (
                            <Plakette key={u} ton={an ? "accent" : "neutral"}>
                              {u}
                            </Plakette>
                          ))}
                        </div>
                        {m.hinweis ? (
                          <p className="mt-1.5 ml-10 flex items-start gap-1.5 text-2xs leading-relaxed text-fg-subtle">
                            <Icons.Info className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
                            {m.hinweis}
                          </p>
                        ) : null}
                        {fehlend.length > 0 && !an ? (
                          <p className="mt-1.5 ml-10 text-2xs text-info">
                            Aktivieren schaltet zusätzlich ein:{" "}
                            {fehlend.map((f) => MODULE_MAP[f].name).join(", ")}
                          </p>
                        ) : null}
                        {mitAbschalten.length > 0 ? (
                          <p className="mt-1.5 ml-10 text-2xs text-warn">
                            Abschalten deaktiviert außerdem:{" "}
                            {mitAbschalten.map((f) => MODULE_MAP[f].name).join(", ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="w-24 shrink-0 text-right">
                        {m.locked ? (
                          <Plakette ton="neutral">
                            <Icons.Lock className="h-3 w-3" strokeWidth={1.8} /> Kern
                          </Plakette>
                        ) : (
                          <Etikett>{m.agents.length} Agenten</Etikett>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Karte>
        ))}

        <Karte>
          <KartenKopf
            titel="Objektbezogene Adressen"
            hinweis={`Schema: zweck.objektnummer@${mailDomain} — je Objekt und Zweck eine eigene Adresse`}
          />
          <div className="px-4 py-3">
            <p className="text-2xs leading-relaxed text-fg-subtle">
              Diese Adressen sind der Grund, warum die Zuordnung ohne Aufwand funktioniert:
              Handwerker, Versorger und Mieter schreiben an das Objekt, nicht an eine Sammeladresse.
              Kunden mit eigener Domain hinterlegen einen MX-Eintrag; SPF, DKIM und DMARC richtet der
              Assistent mit ein, damit Antworten aus dem System zugestellt werden.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[46rem] text-xs">
                <thead>
                  <tr className="border-b border-line text-left">
                    {["Objekt", "Rechnungen", "Schäden", "Allgemein", "je nach Modul"].map((h) => (
                      <th key={h} className="label-caps px-3 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {objekte.map((o) => {
                    const wegObjekt = o.verwaltungsarten.includes("weg");
                    return (
                      <tr key={o.id}>
                        <td className="px-3 py-2">
                          <span className="block font-medium">{o.nummer}</span>
                          <span className="block truncate text-2xs text-fg-subtle">
                            {o.bezeichnung}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-accent">
                          rechnung.{o.nummer}@{mailDomain}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-fg-muted">
                          schaden.{o.nummer}@{mailDomain}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-fg-muted">
                          allgemein.{o.nummer}@{mailDomain}
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-fg-subtle">
                          {wegObjekt && moduleConfig.versammlung
                            ? `versammlung.${o.nummer}@${mailDomain}`
                            : moduleConfig.betriebskosten
                              ? `zaehler.${o.nummer}@${mailDomain}`
                              : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Karte>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
        <Karte>
          <KartenKopf titel="Ergebnis dieser Einrichtung" hinweis={mandantName} />
          <div className="space-y-3 px-4 py-3">
            <div>
              <Etikett>Aktive Module</Etikett>
              <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">
                {aktiveModule.length}
                <span className="text-sm text-fg-subtle"> / {MODULE_DEFINITIONS.length}</span>
              </p>
            </div>
            <div>
              <Etikett>Agenten im Einsatz</Etikett>
              <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">
                {aktiveAgenten.size}
              </p>
            </div>
            <div>
              <Etikett>Automatisierbare Prozesse</Etikett>
              <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">
                {aktiveProzesse.length}
              </p>
              <p className="mt-1 text-2xs text-fg-subtle">
                davon {aktiveProzesse.filter((r) => r.maxStufe <= 1).length} dauerhaft mit
                menschlicher Freigabe
              </p>
            </div>
          </div>
        </Karte>

        <Karte>
          <KartenKopf titel="Menü nach dieser Auswahl" hinweis="so sieht die Verwaltung ImmOS" />
          <ul className="divide-y divide-line">
            {sichtbareNavigation.map((n) => (
              <li key={n.href} className="flex items-center gap-2 px-4 py-2 text-xs">
                <Icons.Check className="h-3.5 w-3.5 text-ok" strokeWidth={2} />
                {n.label}
              </li>
            ))}
            {NAVIGATION.filter((n) => !modulAktiv(n.modulId)).map((n) => (
              <li
                key={n.href}
                className="flex items-center gap-2 px-4 py-2 text-xs text-fg-subtle/60 line-through"
              >
                <Icons.X className="h-3.5 w-3.5" strokeWidth={2} />
                {n.label}
              </li>
            ))}
          </ul>
        </Karte>

        <Karte>
          <KartenKopf titel="Nicht abschaltbar" hinweis="aus Haftungs- und Nachweisgründen" />
          <ul className="space-y-2 px-4 py-3 text-2xs leading-relaxed text-fg-muted">
            <li className="flex items-start gap-2">
              <Icons.Lock className="mt-0.5 h-3 w-3 shrink-0 text-warn" strokeWidth={1.8} />
              Vier-Augen-Prinzip bei Zahlungen über der eingestellten Betragsgrenze
            </li>
            <li className="flex items-start gap-2">
              <Icons.Lock className="mt-0.5 h-3 w-3 shrink-0 text-warn" strokeWidth={1.8} />
              Nachweis jeder Ausführung mit Akteur und Legitimation
            </li>
            <li className="flex items-start gap-2">
              <Icons.Lock className="mt-0.5 h-3 w-3 shrink-0 text-warn" strokeWidth={1.8} />
              Menschliche Entscheidung bei Kündigung, Mieterhöhung und Abrechnungsversand
            </li>
            <li className="flex items-start gap-2">
              <Icons.Lock className="mt-0.5 h-3 w-3 shrink-0 text-warn" strokeWidth={1.8} />
              Unveränderbarkeit festgeschriebener Buchungen, Korrektur nur per Storno
            </li>
          </ul>
        </Karte>

        <Karte className="p-4">
          <Etikett>Übernahme aus dem Altsystem</Etikett>
          <p className="mt-1.5 text-2xs leading-relaxed text-fg-muted">
            Für den Wechsel aus DOMUS, Haufe PowerHaus, iX-Haus, Immoware24 oder Excel liest ImmOS
            Stammdaten, Verträge, Salden und offene Posten ein und stellt sie zur Prüfung gegenüber.
            Der Umzug ist im Prototyp noch nicht enthalten — er ist der eigentliche Vertriebsengpass
            und braucht eigene Aufmerksamkeit.
          </p>
          <Knopf variante="sekundaer" klein className="mt-3" disabled>
            <Icons.Layers className="h-3.5 w-3.5" strokeWidth={1.8} />
            Migration vorbereiten
          </Knopf>
        </Karte>
      </aside>
    </div>
  );
}
