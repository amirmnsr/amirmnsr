"use client";

/**
 * Sitzungszustand des Prototyps
 * =============================================================================
 * Alles, was der Nutzer in der Demo verändert, lebt hier: Entscheidungen über
 * Vorschläge, Modulkonfiguration, Autonomiestufen, Chat, Darstellung.
 *
 * Bewusste Trennung: Fachdaten kommen aus der Repository-Schicht (Server),
 * Entscheidungen liegen im Sitzungszustand. Beim Wechsel auf eine echte
 * Datenbank wird aus `entscheide` eine Server Action — die Komponenten bleiben
 * unverändert.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { ChatNachricht, Entscheidung, Vorschlag } from "@/domain";
import {
  MODULE_MAP,
  toggleModule,
  type ModuleConfig,
  type ModuleId,
} from "@/domain/modules";
import type { AutonomieRegel, Autonomiestufe } from "@/domain/ai";

const SPEICHER_SCHLUESSEL = "immos.sitzung.v1";

export interface Sitzung {
  vorschlaege: Vorschlag[];
  moduleConfig: ModuleConfig;
  autonomie: AutonomieRegel[];
  chat: ChatNachricht[];
  theme: "dark" | "light";
  dichte: "normal" | "kompakt";
  /** Kumulierte Zeitersparnis der in dieser Sitzung getroffenen Entscheidungen. */
  gespartMinuten: number;
  entschiedenAnzahl: number;
  /** Warnung bei zu schnellem Durchklicken (Rubber-Stamping-Schutz). */
  schnellklicks: number;
  tonAus: boolean;
}

type Aktion =
  | { typ: "entscheide"; vorschlagId: string; entscheidung: Entscheidung["entscheidung"]; grund?: string; dauerSek: number }
  | { typ: "modul"; modulId: ModuleId; aktiv: boolean }
  | { typ: "stufe"; prozess: string; stufe: Autonomiestufe }
  | { typ: "grenze"; prozess: string; betragCent: number | null }
  | { typ: "chat"; nachricht: ChatNachricht }
  | { typ: "theme"; theme: "dark" | "light" }
  | { typ: "dichte"; dichte: "normal" | "kompakt" }
  | { typ: "ton"; aus: boolean }
  | { typ: "wiederherstellen"; teil: Partial<Sitzung> }
  | { typ: "zuruecksetzen"; basis: Sitzung };

function reduzieren(state: Sitzung, aktion: Aktion): Sitzung {
  switch (aktion.typ) {
    case "entscheide": {
      const vorschlag = state.vorschlaege.find((v) => v.id === aktion.vorschlagId);
      if (!vorschlag || vorschlag.status !== "offen") return state;

      const status: Vorschlag["status"] =
        aktion.entscheidung === "zustimmen"
          ? "zugestimmt"
          : aktion.entscheidung === "aendern"
            ? "geaendert_zugestimmt"
            : aktion.entscheidung === "ablehnen"
              ? "abgelehnt"
              : "offen";

      const entscheidung: Entscheidung = {
        vorschlagId: vorschlag.id,
        entscheiderId: "ma-1",
        entscheidung: aktion.entscheidung,
        am: new Date().toISOString(),
        grund: aktion.grund,
        entscheidungsdauerSek: aktion.dauerSek,
      };

      const zugestimmt = aktion.entscheidung === "zustimmen" || aktion.entscheidung === "aendern";

      // Jede Entscheidung erscheint im Chat als Quittung. Damit ist der Verlauf
      // gleichzeitig das Protokoll: was habe ich heute freigegeben, was abgelehnt.
      const quittung: ChatNachricht = {
        id: `ch-q-${vorschlag.id}-${entscheidung.am}`,
        rolle: "immos",
        am: entscheidung.am,
        intent: "quittung",
        text: zugestimmt
          ? `Erledigt: ${vorschlag.titel}. Ausgeführt wurden ${vorschlag.aktionen.length} ` +
            `Aktion${vorschlag.aktionen.length === 1 ? "" : "en"} — ` +
            vorschlag.aktionen.map((a) => a.beschreibung).join("; ") +
            `. Alles liegt im Nachweis, Rückabwicklung ${vorschlag.reversibel ? "möglich" : "nicht möglich"}.`
          : aktion.entscheidung === "ablehnen"
            ? `Abgelehnt: ${vorschlag.titel}.` +
              (aktion.grund ? ` Grund: ${aktion.grund}.` : "") +
              ` Ich habe nichts ausgeführt und merke mir das für ähnliche Fälle.`
            : `Zurückgestellt: ${vorschlag.titel}. Ich lege den Vorgang später erneut vor.`,
      };

      return {
        ...state,
        chat: [...state.chat, quittung],
        vorschlaege: state.vorschlaege.map((v) =>
          v.id === vorschlag.id ? { ...v, status, entscheidung } : v,
        ),
        gespartMinuten: state.gespartMinuten + (zugestimmt ? vorschlag.zeitersparnisMinuten : 0),
        entschiedenAnzahl: state.entschiedenAnzahl + 1,
        // Unter 2 Sekunden bei mittlerem oder hohem Risiko ist ein Warnsignal.
        schnellklicks:
          aktion.dauerSek < 2 && vorschlag.risiko !== "niedrig"
            ? state.schnellklicks + 1
            : state.schnellklicks,
      };
    }
    case "modul":
      return { ...state, moduleConfig: toggleModule(state.moduleConfig, aktion.modulId, aktion.aktiv) };
    case "stufe":
      return {
        ...state,
        autonomie: state.autonomie.map((r) =>
          r.prozess === aktion.prozess
            ? { ...r, stufe: Math.min(aktion.stufe, r.maxStufe) as Autonomiestufe }
            : r,
        ),
      };
    case "grenze":
      return {
        ...state,
        autonomie: state.autonomie.map((r) =>
          r.prozess === aktion.prozess ? { ...r, betragsgrenzeCent: aktion.betragCent } : r,
        ),
      };
    case "chat":
      return { ...state, chat: [...state.chat, aktion.nachricht] };
    case "theme":
      return { ...state, theme: aktion.theme };
    case "dichte":
      return { ...state, dichte: aktion.dichte };
    case "ton":
      return { ...state, tonAus: aktion.aus };
    case "wiederherstellen":
      return { ...state, ...aktion.teil };
    case "zuruecksetzen":
      return aktion.basis;
    default:
      return state;
  }
}

interface StoreWert extends Sitzung {
  entscheide: (id: string, entscheidung: Entscheidung["entscheidung"], grund?: string, dauerSek?: number) => void;
  setzeModul: (modulId: ModuleId, aktiv: boolean) => void;
  setzeStufe: (prozess: string, stufe: Autonomiestufe) => void;
  setzeGrenze: (prozess: string, betragCent: number | null) => void;
  sendeChat: (text: string, perSprache?: boolean) => void;
  setzeTheme: (theme: "dark" | "light") => void;
  setzeDichte: (dichte: "normal" | "kompakt") => void;
  setzeTon: (aus: boolean) => void;
  zuruecksetzen: () => void;
  modulAktiv: (modulId?: ModuleId) => boolean;
  offeneVorschlaege: Vorschlag[];
}

const StoreContext = createContext<StoreWert | null>(null);

export function ImmosProvider({
  children,
  vorschlaege,
  moduleConfig,
  autonomie,
  chat,
}: {
  children: ReactNode;
  vorschlaege: Vorschlag[];
  moduleConfig: ModuleConfig;
  autonomie: AutonomieRegel[];
  chat: ChatNachricht[];
}) {
  const basis = useMemo<Sitzung>(
    () => ({
      vorschlaege,
      moduleConfig,
      autonomie,
      chat,
      theme: "light",
      dichte: "normal",
      gespartMinuten: 0,
      entschiedenAnzahl: 0,
      schnellklicks: 0,
      tonAus: true,
    }),
    [vorschlaege, moduleConfig, autonomie, chat],
  );

  const [state, dispatch] = useReducer(reduzieren, basis);

  // Darstellung und Konfiguration überleben einen Reload; Entscheidungen nicht —
  // eine Demo soll reproduzierbar von vorn starten können.
  useEffect(() => {
    try {
      const roh = localStorage.getItem(SPEICHER_SCHLUESSEL);
      if (!roh) return;
      const gespeichert = JSON.parse(roh) as Partial<Sitzung>;
      dispatch({
        typ: "wiederherstellen",
        teil: {
          theme: gespeichert.theme,
          dichte: gespeichert.dichte,
          tonAus: gespeichert.tonAus,
          moduleConfig: gespeichert.moduleConfig ?? moduleConfig,
        },
      });
    } catch {
      // Beschädigter Speicher darf die App nicht blockieren.
    }
  }, [moduleConfig]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.dichte = state.dichte;
    try {
      localStorage.setItem(
        SPEICHER_SCHLUESSEL,
        JSON.stringify({
          theme: state.theme,
          dichte: state.dichte,
          tonAus: state.tonAus,
          moduleConfig: state.moduleConfig,
        }),
      );
    } catch {
      // Privater Modus ohne Speicher: kein Problem.
    }
  }, [state.theme, state.dichte, state.tonAus, state.moduleConfig]);

  const modulAktiv = useCallback(
    (modulId?: ModuleId) => {
      if (!modulId) return true;
      return state.moduleConfig[modulId] === true || Boolean(MODULE_MAP[modulId]?.locked);
    },
    [state.moduleConfig],
  );

  const wert = useMemo<StoreWert>(
    () => ({
      ...state,
      entscheide: (id, entscheidung, grund, dauerSek = 5) =>
        dispatch({ typ: "entscheide", vorschlagId: id, entscheidung, grund, dauerSek }),
      setzeModul: (modulId, aktiv) => dispatch({ typ: "modul", modulId, aktiv }),
      setzeStufe: (prozess, stufe) => dispatch({ typ: "stufe", prozess, stufe }),
      setzeGrenze: (prozess, betragCent) => dispatch({ typ: "grenze", prozess, betragCent }),
      sendeChat: (text, perSprache) => {
        const jetzt = new Date().toISOString();
        dispatch({
          typ: "chat",
          nachricht: { id: `ch-u-${jetzt}`, rolle: "nutzer", text, am: jetzt, perSprache },
        });
        const antwort = antworte(text, state);
        dispatch({
          typ: "chat",
          nachricht: {
            id: `ch-a-${jetzt}`,
            rolle: "immos",
            text: antwort.text,
            am: new Date(Date.now() + 400).toISOString(),
            vorschlagIds: antwort.vorschlagIds,
            intent: antwort.intent,
          },
        });
      },
      setzeTheme: (theme) => dispatch({ typ: "theme", theme }),
      setzeDichte: (dichte) => dispatch({ typ: "dichte", dichte }),
      setzeTon: (aus) => dispatch({ typ: "ton", aus }),
      zuruecksetzen: () => dispatch({ typ: "zuruecksetzen", basis }),
      modulAktiv,
      offeneVorschlaege: state.vorschlaege.filter((v) => v.status === "offen"),
    }),
    [state, basis, modulAktiv],
  );

  return <StoreContext.Provider value={wert}>{children}</StoreContext.Provider>;
}

export function useImmos(): StoreWert {
  const wert = useContext(StoreContext);
  if (!wert) throw new Error("useImmos muss innerhalb von ImmosProvider verwendet werden");
  return wert;
}

// ---------------------------------------------------------------------------
// Demo-Assistent
// ---------------------------------------------------------------------------

/**
 * Regelbasierte Antworten für den Prototyp — ausdrücklich kein Modellaufruf.
 * Die Regeln entsprechen den Intents, die später ein Agent bedient; das hält
 * die Demo offline lauffähig und die Erwartung ehrlich.
 */
function antworte(
  eingabe: string,
  state: Sitzung,
): { text: string; vorschlagIds?: string[]; intent: string } {
  const text = eingabe.toLowerCase();
  const offen = state.vorschlaege.filter((v) => v.status === "offen");
  const dringend = [...offen].sort((a, b) => b.prioritaet - a.prioritaet).slice(0, 3);

  const treffer = (...begriffe: string[]) => begriffe.some((b) => text.includes(b));

  if (treffer("heute", "briefing", "was liegt", "übersicht", "uebersicht")) {
    return {
      intent: "tagesbriefing",
      text:
        `Offen sind ${offen.length} Entscheidungen. Die drei wichtigsten: ` +
        dringend.map((v) => v.titel).join(" · ") +
        ". Sag „nächster“, um sie einzeln durchzugehen.",
      vorschlagIds: dringend.map((v) => v.id),
    };
  }
  if (treffer("betrug", "iban", "sicherheit", "phishing")) {
    const v = state.vorschlaege.find((x) => x.prozess === "stammdaten_bank");
    return {
      intent: "sicherheit",
      text: v
        ? `${v.titel}. ${v.kurzfassung} Ich habe nichts geändert und keine Zahlung erzeugt.`
        : "Aktuell liegt kein Sicherheitsvorfall vor.",
      vorschlagIds: v ? [v.id] : undefined,
    };
  }
  if (treffer("frist", "überfällig", "ueberfaellig", "haftung", "legionell")) {
    const v = state.vorschlaege.filter((x) => x.kategorie === "frist" || x.risiko === "hoch");
    return {
      intent: "fristen",
      text:
        "Kritisch sind: Legionellenprüfung Objekt 1156 (seit 2 Tagen überfällig, Haftungsrisiko hoch) " +
        "und die Gewährleistung der Fensterelemente in 1104, die am 14.09. endet. Beides habe ich vorbereitet.",
      vorschlagIds: v.slice(0, 2).map((x) => x.id),
    };
  }
  if (treffer("geld", "offene posten", "rückstand", "rueckstand", "mahn")) {
    return {
      intent: "forderungen",
      text:
        "Offene Posten insgesamt 18.427,40 €. Auffällig ist WE 03 in Objekt 1042 mit 2.412,80 € über " +
        "drei Perioden — dort ist die Kündigungsschwelle nach §543 BGB erreicht. Mein Vorschlag ist eine " +
        "nachgeschärfte Ratenvereinbarung statt einer Kündigung.",
      vorschlagIds: state.vorschlaege.filter((v) => v.prozess === "mahnung_stufe3").map((v) => v.id),
    };
  }
  if (treffer("abrechnung", "betriebskosten", "nebenkosten")) {
    return {
      intent: "abrechnung",
      text:
        "Der Lauf 2025 für Objekt 1042 ist gerechnet. Ich habe eine Doppelerfassung von 2.208,00 € " +
        "zwischen Hausmeister- und Gartenpflegekonto gefunden — bitte vor dem Versand entscheiden. " +
        "Der vollständige Rechenweg liegt im Bereich Abrechnung.",
      vorschlagIds: state.vorschlaege.filter((v) => v.kategorie === "abrechnung").map((v) => v.id),
    };
  }
  if (treffer("leerstand", "vermiet")) {
    return {
      intent: "leerstand",
      text:
        "4 von 148 Einheiten stehen leer, zwei davon in Sanierung. WE 11 in Objekt 1042 seit 34 Tagen: " +
        "erzielbare Marktmiete 12,40 €/m² gegenüber zuletzt 10,90 €/m²." +
        (state.moduleConfig.vermietung
          ? " Exposé und Portalexport sind vorbereitet."
          : " Das Modul Vermietung ist bei dir noch nicht aktiv — in der Einrichtung zuschaltbar."),
      vorschlagIds: state.vorschlaege.filter((v) => v.agentId === "vermietung").map((v) => v.id),
    };
  }
  if (treffer("modul", "einrichtung", "aktivieren", "abschalten")) {
    const aktiv = Object.values(state.moduleConfig).filter(Boolean).length;
    return {
      intent: "module",
      text:
        `Aktuell sind ${aktiv} Module aktiv. Miet- und SEV-Verwaltung bilden den Kern, WEG und Gewerbe ` +
        `sind zugeschaltet, Vermietung ist aus. Änderungen gehen über die Einrichtung — abhängige Module ` +
        `werden dabei automatisch mitgeschaltet.`,
      intentDummy: undefined,
    } as { text: string; intent: string };
  }
  if (treffer("nächster", "naechster", "weiter")) {
    const v = dringend[0];
    return {
      intent: "queue_weiter",
      text: v ? `${v.titel} — ${v.kurzfassung}` : "Die Warteschlange ist leer.",
      vorschlagIds: v ? [v.id] : undefined,
    };
  }

  return {
    intent: "unbekannt",
    text:
      "Dazu habe ich in dieser Demo keine hinterlegte Antwort. Der Prototyp beantwortet regelbasiert " +
      "Fragen zu Tagesübersicht, Fristen, offenen Posten, Abrechnung, Leerstand, Sicherheit und Modulen. " +
      "Im Produktivbetrieb übernimmt das ein Agent mit Zugriff auf Objektakte, Buchhaltung und Postfächer.",
  };
}
