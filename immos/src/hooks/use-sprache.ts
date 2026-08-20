"use client";

/**
 * Sprachein- und -ausgabe
 * =============================================================================
 * Der Prototyp nutzt die Web Speech API des Browsers: `SpeechRecognition` für
 * Diktat und Befehle, `speechSynthesis` für die Ausgabe. Das läuft ohne Server
 * und ohne Schlüssel, hat aber Grenzen (Chromium-Bindung, Cloud-Erkennung beim
 * Hersteller). Für den Produktivbetrieb ist serverseitiges STT mit EU-Verarbeitung
 * gesetzt; die Schnittstelle dieses Hooks bleibt dabei gleich.
 *
 * Standard ist Push-to-Talk statt Wake Word — im Büro will niemand ein dauerhaft
 * offenes Mikrofon, und die DSGVO-Diskussion über Mithören im Großraum spart man
 * sich gleich mit.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type ErkennungsEreignis = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  resultIndex: number;
};

interface Erkennung {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: ErkennungsEreignis) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type ErkennungsKonstruktor = new () => Erkennung;

function konstruktor(): ErkennungsKonstruktor | undefined {
  if (typeof window === "undefined") return undefined;
  const fenster = window as unknown as {
    SpeechRecognition?: ErkennungsKonstruktor;
    webkitSpeechRecognition?: ErkennungsKonstruktor;
  };
  return fenster.SpeechRecognition ?? fenster.webkitSpeechRecognition;
}

/**
 * Verfügbarkeit als externer Zustand: Der Browser ändert seine Fähigkeiten zur
 * Laufzeit nicht, deshalb ist das Abo leer. `useSyncExternalStore` vermeidet
 * hier sowohl eine Hydration-Abweichung als auch einen Zustandswechsel im Effekt.
 */
const keinAbo = () => () => {};
const sttImBrowser = () => konstruktor() !== undefined;
const ttsImBrowser = () =>
  typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
const serverseitigFalsch = () => false;

export function useSprache(options?: { aufBefehl?: (text: string) => void; tonAus?: boolean }) {
  const sttVerfuegbar = useSyncExternalStore(keinAbo, sttImBrowser, serverseitigFalsch);
  const ttsVerfuegbar = useSyncExternalStore(keinAbo, ttsImBrowser, serverseitigFalsch);

  const [hoert, setHoert] = useState(false);
  const [spricht, setSpricht] = useState(false);
  const [transkript, setTranskript] = useState("");
  const [fehler, setFehler] = useState<string | undefined>(undefined);

  const erkennungRef = useRef<Erkennung | null>(null);
  const aufBefehlRef = useRef<((text: string) => void) | undefined>(undefined);

  // Callback über einen Effekt synchronisieren, damit die Erkennung nicht bei
  // jedem Render neu aufgebaut werden muss.
  useEffect(() => {
    aufBefehlRef.current = options?.aufBefehl;
  }, [options?.aufBefehl]);

  useEffect(() => {
    const Konstruktor = konstruktor();
    if (!Konstruktor) return;

    const erkennung = new Konstruktor();
    erkennung.lang = "de-DE";
    erkennung.continuous = false;
    erkennung.interimResults = true;

    erkennung.onresult = (e) => {
      let text = "";
      let endgueltig = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const ergebnis = e.results[i];
        text += ergebnis[0]?.transcript ?? "";
        if (ergebnis.isFinal) endgueltig = true;
      }
      setTranskript(text);
      if (endgueltig && text.trim()) {
        aufBefehlRef.current?.(text.trim());
        setTranskript("");
        setHoert(false);
      }
    };
    erkennung.onerror = (e) => {
      setHoert(false);
      setFehler(
        e.error === "not-allowed"
          ? "Mikrofonzugriff verweigert — Push-to-Talk braucht die Freigabe im Browser."
          : `Spracherkennung: ${e.error}`,
      );
    };
    erkennung.onend = () => setHoert(false);

    erkennungRef.current = erkennung;

    return () => {
      erkennung.onresult = null;
      erkennung.onerror = null;
      erkennung.onend = null;
      try {
        erkennung.stop();
      } catch {
        // Bereits gestoppt — unkritisch.
      }
      erkennungRef.current = null;
    };
  }, []);

  const starten = useCallback(() => {
    const erkennung = erkennungRef.current;
    if (!erkennung) {
      setFehler("Dieser Browser unterstützt keine Spracherkennung.");
      return;
    }
    try {
      erkennung.start();
      setFehler(undefined);
      setTranskript("");
      setHoert(true);
    } catch {
      // Doppelter Start ist unkritisch.
    }
  }, []);

  const stoppen = useCallback(() => {
    erkennungRef.current?.stop();
    setHoert(false);
  }, []);

  const sprechen = useCallback(
    (text: string) => {
      if (options?.tonAus || !ttsVerfuegbar) return;
      window.speechSynthesis.cancel();
      const aeusserung = new SpeechSynthesisUtterance(text);
      aeusserung.lang = "de-DE";
      aeusserung.rate = 1.05;
      aeusserung.onstart = () => setSpricht(true);
      aeusserung.onend = () => setSpricht(false);
      window.speechSynthesis.speak(aeusserung);
    },
    [options?.tonAus, ttsVerfuegbar],
  );

  const schweigen = useCallback(() => {
    if (ttsVerfuegbar) window.speechSynthesis.cancel();
    setSpricht(false);
  }, [ttsVerfuegbar]);

  return {
    verfuegbar: sttVerfuegbar,
    ausgabeVerfuegbar: ttsVerfuegbar,
    hoert,
    spricht,
    transkript,
    fehler,
    starten,
    stoppen,
    sprechen,
    schweigen,
  };
}
