"use client";

import Link from "next/link";
import { useRef } from "react";
import * as Icons from "lucide-react";
import { gsap, reduziertBewegung, TAKT, useGSAP } from "@/components/motion/gsap";
import { ImmosMark } from "@/components/shell/immos-mark";

/**
 * Startbühne
 * =============================================================================
 * Die Boot-Sequenz ist die einzige Stelle, an der ImmOS Zeit für Wirkung
 * verwendet: Systemzeilen laufen durch, dann setzt sich die Marke, dann die
 * These. Danach ist Schluss mit Show — im Cockpit zählt Tempo.
 */

const BOOT_ZEILEN = [
  "Verbindung Objektakte … 6 Objekte, 148 Einheiten",
  "Postfächer je Objekt … 26 Adressen aktiv",
  "Buchhaltung … Journal 2026 geladen, 512 Sollstellungen gestellt",
  "Betreiberpflichten … 7 Prüfpflichten überwacht, 2 überfällig",
  "Agenten … 27 aktiv, Autonomiestufen geladen",
  "Nachtlauf … 34 Eingänge verarbeitet, 27 Zahlungen zugeordnet",
];

const FAEHIGKEITEN = [
  {
    icon: "Inbox",
    titel: "Eigene Adressen je Objekt",
    text:
      "rechnung.1042@… , schaden.1042@… , versammlung.1088@… — jeder Eingang ist ohne Zutun dem Objekt zugeordnet. ZUGFeRD und XRechnung werden strukturiert gelesen, der Rest per Layout-Erkennung.",
  },
  {
    icon: "CheckCircle2",
    titel: "Entscheiden statt bearbeiten",
    text:
      "Agenten legen fertige Vorschläge vor: Begründung, Belege, geplante Aktionen als Diff, benannte Alternative. Der Verwalter stimmt zu oder lehnt ab — in Sekunden statt Minuten.",
  },
  {
    icon: "Bot",
    titel: "Autonomie in Stufen",
    text:
      "Pro Prozess und Betragsgrenze einstellbar: beobachten, vorschlagen, mit Widerspruchsfenster handeln, autonom handeln. Zahlungen und Kündigungen bleiben dauerhaft beim Menschen.",
  },
  {
    icon: "Calculator",
    titel: "Die Engine rechnet, das Modell erklärt",
    text:
      "Betriebs- und Heizkosten, CO₂-Aufteilung, Sollstellungen und Zahlungszuordnung laufen in deterministischem, getestetem Code. Das Sprachmodell formuliert und erklärt — es rechnet nie.",
  },
  {
    icon: "ScrollText",
    titel: "Nachweis über alles",
    text:
      "Jede Ausführung ist einem Akteur und einer Legitimation zugeordnet: Zustimmung, Autonomiestufe, gesetzliche Pflicht oder Beschluss. Auch die Entscheidungsdauer wird protokolliert.",
  },
];

const KETTE = [
  { titel: "Ereignis", text: "Mail, Anruf, Kontoumsatz, Fristablauf, Sensor" },
  { titel: "Agent", text: "liest Akte, prüft Regeln, rechnet mit der Engine" },
  { titel: "Vorschlag", text: "Was, warum, Belege, Diff, Alternative, Risiko" },
  { titel: "Entscheidung", text: "Zustimmen, ablehnen, ändern — oder Autonomiestufe" },
  { titel: "Ausführung", text: "Mail, Buchung, Auftrag, Zahlung, Frist" },
  { titel: "Nachweis", text: "Audit-Trail mit Akteur und Legitimation" },
];

export function StartBuehne() {
  const wurzel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduziertBewegung()) {
        gsap.set("[data-anim='boot']", { opacity: 1, y: 0 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.to("[data-boot-zeile]", {
        opacity: 1,
        x: 0,
        duration: 0.22,
        stagger: 0.085,
      })
        .to("[data-boot-block]", { opacity: 0.45, duration: 0.3 }, "+=0.15")
        .fromTo(
          "[data-marke]",
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: TAKT.boot, ease: "power3.out" },
          "-=0.2",
        )
        .fromTo(
          "[data-these] > *",
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.42, stagger: 0.09 },
          "-=0.6",
        )
        .fromTo(
          "[data-kette] > *",
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.3, stagger: 0.06 },
          "-=0.25",
        );

      gsap.fromTo(
        "[data-faehigkeit]",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.08,
          scrollTrigger: { trigger: "[data-faehigkeiten]", start: "top 78%" },
        },
      );
    },
    { scope: wurzel },
  );

  return (
    <div ref={wurzel} className="immos-grid-bg immos-vignette relative min-h-dvh overflow-hidden">
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ImmosMark groesse={24} />
            <span className="text-sm font-semibold tracking-tight">
              Imm<span className="text-accent">OS</span>
            </span>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-line-strong px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-accent-line hover:text-accent"
          >
            Cockpit öffnen
          </Link>
        </header>

        <section className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="label-caps">Betriebssystem für Immobilienverwaltungen</p>
            <div data-marke className="mt-4 flex items-center gap-4 opacity-0">
              <ImmosMark groesse={54} />
              <h1 className="text-5xl leading-none font-semibold tracking-tighter sm:text-6xl">
                Imm<span className="text-accent">OS</span>
              </h1>
            </div>
            <div data-these className="mt-7 space-y-4">
              <p className="max-w-xl text-lg leading-snug text-fg opacity-0">
                Eine Verwaltung arbeitet nicht in Formularen, sondern an Entscheidungen.
                ImmOS nimmt jeden Eingang an, bereitet den Vorgang vollständig auf und legt
                einen begründeten Vorschlag vor. Zustimmen oder ablehnen.
              </p>
              <p className="max-w-xl text-sm leading-relaxed text-fg-muted opacity-0">
                Posteingang, Vorgänge, Technik und Betreiberpflichten, Buchhaltung,
                Betriebskosten- und WEG-Abrechnung — in einem System, mit einem Nachweis.
                Miet- und SEV-Verwaltung als Kern, WEG und Gewerbe als Module, die bei der
                Ersteinrichtung zugeschaltet werden.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 opacity-0">
                <Link
                  href="/cockpit"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-fg-inverse transition-colors hover:bg-accent-strong"
                >
                  Cockpit betreten
                  <Icons.ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                </Link>
                <Link
                  href="/einrichtung"
                  className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-4 py-2.5 text-xs text-fg-muted transition-colors hover:border-accent-line hover:text-accent"
                >
                  Module einrichten
                </Link>
                <Link
                  href="/abrechnung"
                  className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-4 py-2.5 text-xs text-fg-muted transition-colors hover:border-accent-line hover:text-accent"
                >
                  Rechenweg ansehen
                </Link>
              </div>
            </div>
          </div>

          <div
            data-boot-block
            className="card overflow-hidden p-4 font-mono text-[11px] leading-relaxed"
          >
            <div className="mb-2.5 flex items-center gap-2 text-2xs text-fg-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" />
              Systemstart · Mandant Rheinquartier
            </div>
            <ul className="space-y-1.5">
              {BOOT_ZEILEN.map((zeile) => (
                <li
                  key={zeile}
                  data-boot-zeile
                  className="flex items-start gap-2 opacity-0"
                  style={{ transform: "translateX(-10px)" }}
                >
                  <span className="text-accent">›</span>
                  <span className="text-fg-muted">{zeile}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section data-kette className="mt-16 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {KETTE.map((k, i) => (
            <div key={k.titel} className="card p-3.5 opacity-0">
              <p className="label-caps">Schritt {i + 1}</p>
              <p className="mt-1 text-xs font-semibold text-fg">{k.titel}</p>
              <p className="mt-1 text-2xs leading-relaxed text-fg-subtle">{k.text}</p>
            </div>
          ))}
        </section>

        <section data-faehigkeiten className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight">
            Fünf Dinge, die den Unterschied machen
          </h2>
          <div className="mt-5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {FAEHIGKEITEN.map((f) => {
              const Symbol = (Icons as unknown as Record<string, Icons.LucideIcon>)[f.icon];
              return (
                <div key={f.titel} data-faehigkeit className="card p-4">
                  {Symbol ? <Symbol className="h-4 w-4 text-accent" strokeWidth={1.7} /> : null}
                  <p className="mt-2.5 text-[13px] font-semibold tracking-tight">{f.titel}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{f.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="mt-16 border-t border-line pt-5 pb-4 text-2xs text-fg-subtle">
          Prototyp mit Demo-Daten. Alle Namen, Adressen, IBANs und Belege sind erfunden.
          Rechtsangaben im System sind Arbeitsstand und vor produktivem Einsatz zu verifizieren.
        </footer>
      </div>
    </div>
  );
}
