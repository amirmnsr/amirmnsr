"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { gsap, reduziertBewegung, useGSAP } from "@/components/motion/gsap";
import { ImmosMark } from "@/components/shell/immos-mark";
import { Knopf } from "@/components/ui/controls";

/**
 * Begrüßungsbühne
 * =============================================================================
 * Der Einstieg für eine Vorführung: ImmOS begrüßt den Gast beim Namen, sagt in
 * drei Sätzen, was es ist, und führt ins Cockpit. Der Name kommt aus der URL
 * (`/hallo?name=Thomas`) und wird gespeichert, damit ihn Cockpit und Assistent
 * ebenfalls verwenden.
 *
 * Die Sprachausgabe startet erst auf Knopfdruck — Browser blockieren Ton ohne
 * Nutzerinteraktion, und im Termin will man den Moment selbst auslösen.
 */

const ZEILEN = [
  "Ich nehme jeden Eingang an: Mail, Anruf, Portal, Kontoumsatz, Fristablauf.",
  "Ich bereite den Vorgang vollständig auf und lege dir einen begründeten Vorschlag vor.",
  "Du entscheidest. Zustimmen oder ablehnen — den Rest führe ich aus und weise es nach.",
];

export function HalloBuehne({ name }: { name: string }) {
  const buehne = useRef<HTMLDivElement>(null);
  const [gesprochen, setGesprochen] = useState(false);

  // Namen für Cockpit und Assistent merken.
  useEffect(() => {
    try {
      localStorage.setItem("immos.gast", name);
    } catch {
      // Privater Modus: dann bleibt es bei dieser Seite.
    }
  }, [name]);

  useGSAP(
    () => {
      if (reduziertBewegung()) {
        gsap.set("[data-hallo]", { opacity: 1, y: 0 });
        return;
      }
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo("[data-hallo-marke]", { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9 })
        .fromTo("[data-hallo-gruss]", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.4")
        .fromTo("[data-hallo]", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.14 }, "-=0.25");

      gsap.to("[data-hallo-puls]", {
        scale: 1.35,
        opacity: 0.08,
        duration: 2.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.3,
      });
    },
    { scope: buehne },
  );

  const begruessen = () => {
    setGesprochen(true);
    if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;
    const text =
      `Hallo ${name}, ich bin ImmOS, das Betriebssystem für Immobilienverwaltungen. ` +
      `Ich nehme jeden Eingang an, bereite den Vorgang vollständig auf und lege dir einen ` +
      `begründeten Vorschlag vor. Du entscheidest: zustimmen oder ablehnen. Den Rest führe ich ` +
      `aus und weise es nach. Sollen wir ins Cockpit?`;
    window.speechSynthesis.cancel();
    const aeusserung = new SpeechSynthesisUtterance(text);
    aeusserung.lang = "de-DE";
    aeusserung.rate = 1.02;
    window.speechSynthesis.speak(aeusserung);
  };

  return (
    <div
      ref={buehne}
      className="immos-grid-bg immos-vignette relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
    >
      <div className="relative mb-9 flex h-40 w-40 items-center justify-center">
        <span data-hallo-puls className="absolute inset-0 rounded-full border border-accent/50" />
        <span data-hallo-puls className="absolute inset-6 rounded-full border border-accent/40" />
        <span data-hallo-marke className="opacity-0">
          <ImmosMark groesse={72} />
        </span>
      </div>

      <p data-hallo-gruss className="text-4xl leading-tight font-semibold tracking-tighter opacity-0 sm:text-6xl">
        Hallo {name}, ich bin{" "}
        <span>
          Imm<span className="text-accent">OS</span>
        </span>
        .
      </p>

      <p data-hallo className="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted opacity-0 sm:text-base">
        Das Betriebssystem für Immobilienverwaltungen.
      </p>

      <ul className="mt-8 max-w-2xl space-y-2.5 text-left">
        {ZEILEN.map((zeile) => (
          <li
            key={zeile}
            data-hallo
            className="flex items-start gap-2.5 text-sm leading-relaxed text-fg opacity-0"
          >
            <Icons.ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.4} />
            {zeile}
          </li>
        ))}
      </ul>

      <div data-hallo className="mt-10 flex flex-wrap items-center justify-center gap-2.5 opacity-0">
        <Link
          href="/cockpit"
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-fg-inverse transition-colors hover:bg-accent-strong"
        >
          Cockpit betreten
          <Icons.ArrowRight className="h-4 w-4" strokeWidth={2.2} />
        </Link>
        <Knopf variante="sekundaer" onClick={begruessen}>
          <Icons.Volume2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          {gesprochen ? "Noch einmal vorlesen" : "Begrüßung anhören"}
        </Knopf>
        <Link
          href="/"
          className="rounded-lg border border-line-strong px-4 py-2.5 text-xs text-fg-muted transition-colors hover:border-accent-line hover:text-accent"
        >
          Was ImmOS kann
        </Link>
      </div>

      <p data-hallo className="mt-10 max-w-lg text-2xs leading-relaxed text-fg-subtle opacity-0">
        Vorführung mit Demo-Daten: sechs Objekte, 148 Einheiten, Bezugszeitpunkt 20. August 2026.
        Alle Namen, Adressen, IBANs und Belege sind erfunden. Der Name in der Begrüßung kommt aus
        der Adresse — <code className="font-mono">/hallo?name=…</code>
      </p>
    </div>
  );
}
