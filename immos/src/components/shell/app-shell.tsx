"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Icons from "lucide-react";
import { GRUPPEN_TITEL, NAVIGATION, type NavEintrag } from "./navigation";
import { ImmosMark } from "./immos-mark";
import { useImmos } from "@/state/immos-store";
import { useSprache } from "@/hooks/use-sprache";
import { gsap, reduziertBewegung, TAKT, useGSAP } from "@/components/motion/gsap";
import { Plakette, StatusPunkt } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import { AUTONOMIE_LABELS } from "@/domain/ai";

export interface SchnellZiel {
  href: string;
  titel: string;
  unterzeile: string;
  art: "Seite" | "Objekt" | "Entscheidung" | "Sprachbefehl";
}

function Symbol({ name, className }: { name: string; className?: string }) {
  const Komponente = (Icons as unknown as Record<string, Icons.LucideIcon>)[name];
  if (!Komponente) return null;
  return <Komponente className={className} strokeWidth={1.6} />;
}

export function AppShell({
  children,
  ziele,
  posteingangNeu,
  nutzerName,
  mandantName,
}: {
  children: ReactNode;
  ziele: SchnellZiel[];
  posteingangNeu: number;
  nutzerName: string;
  mandantName: string;
}) {
  const pfad = usePathname();
  const router = useRouter();
  const { modulAktiv, offeneVorschlaege, theme, setzeTheme, tonAus, setzeTon, autonomie, sendeChat } =
    useImmos();
  const [paletteOffen, setPaletteOffen] = useState(false);
  const seitenleiste = useRef<HTMLElement>(null);
  const inhalt = useRef<HTMLDivElement>(null);

  const sprache = useSprache({
    tonAus,
    aufBefehl: (text) => {
      sendeChat(text, true);
      if (!pfad.startsWith("/cockpit")) router.push("/cockpit");
    },
  });

  const eintraege = useMemo(
    () => NAVIGATION.filter((n) => modulAktiv(n.modulId)),
    [modulAktiv],
  );

  const zaehlerWert = useCallback(
    (eintrag: NavEintrag) => {
      if (eintrag.zaehler === "entscheidungen") return offeneVorschlaege.length;
      if (eintrag.zaehler === "posteingang") return posteingangNeu;
      return 0;
    },
    [offeneVorschlaege.length, posteingangNeu],
  );

  // Tastatur: Palette, Schnellnavigation, Push-to-Talk.
  useEffect(() => {
    const aufTaste = (e: KeyboardEvent) => {
      const imFeld =
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(e.target.tagName);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOffen((o) => !o);
        return;
      }
      if (imFeld) return;
      if (e.altKey && /^[1-5]$/.test(e.key)) {
        const ziel = eintraege.filter((n) => n.kuerzel)[Number(e.key) - 1];
        if (ziel) {
          e.preventDefault();
          router.push(ziel.href);
        }
      }
      if (e.key.toLowerCase() === "m" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (sprache.hoert) {
          sprache.stoppen();
        } else {
          sprache.starten();
        }
      }
    };
    document.addEventListener("keydown", aufTaste);
    return () => document.removeEventListener("keydown", aufTaste);
  }, [eintraege, router, sprache]);

  useGSAP(
    () => {
      if (reduziertBewegung()) return;
      gsap.from("[data-nav-item]", {
        x: -10,
        opacity: 0,
        duration: TAKT.normal,
        stagger: TAKT.stagger,
        clearProps: "all",
      });
    },
    { scope: seitenleiste },
  );

  // Seitenwechsel: kurzer Aufbau, damit Navigation als Ortswechsel lesbar ist.
  useGSAP(
    () => {
      if (reduziertBewegung()) return;
      gsap.fromTo(
        inhalt.current,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: TAKT.schnell, clearProps: "all" },
      );
    },
    { dependencies: [pfad] },
  );

  const aktiveStufen = autonomie.filter((r) => r.stufe >= 2).length;

  return (
    <div className="flex min-h-dvh">
      <aside
        ref={seitenleiste}
        className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface/60 backdrop-blur lg:flex"
      >
        <div className="flex items-center gap-2.5 px-4 py-4">
          <ImmosMark groesse={26} />
          <div className="min-w-0">
            <p className="text-sm leading-none font-semibold tracking-tight">
              Imm<span className="text-accent">OS</span>
            </p>
            <p className="mt-1 truncate text-2xs text-fg-subtle">{mandantName}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {(["arbeit", "fach", "system"] as const).map((gruppe) => {
            const gruppenEintraege = eintraege.filter((n) => n.gruppe === gruppe);
            if (gruppenEintraege.length === 0) return null;
            return (
              <div key={gruppe} className="mt-3">
                <p className="label-caps px-2.5 pb-1.5">{GRUPPEN_TITEL[gruppe]}</p>
                <ul className="space-y-0.5">
                  {gruppenEintraege.map((eintrag) => {
                    const aktiv = pfad === eintrag.href || pfad.startsWith(`${eintrag.href}/`);
                    const zahl = zaehlerWert(eintrag);
                    return (
                      <li key={eintrag.href} data-nav-item>
                        <Link
                          href={eintrag.href}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                            aktiv
                              ? "bg-accent-wash text-accent"
                              : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                          )}
                        >
                          <Symbol name={eintrag.icon} className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{eintrag.label}</span>
                          {zahl > 0 ? (
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                                aktiv
                                  ? "bg-accent/20 text-accent"
                                  : "bg-surface-3 text-fg-subtle group-hover:text-fg",
                              )}
                            >
                              {zahl}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-line px-3 py-3">
          <div className="flex items-center gap-2 text-2xs text-fg-subtle">
            <StatusPunkt ton="ok" puls />
            <span>{aktiveStufen} Prozesse laufen automatisch</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold text-fg-muted">
              {nutzerName
                .split(" ")
                .map((t) => t[0])
                .join("")}
            </div>
            <span className="truncate text-2xs text-fg-muted">{nutzerName}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg/85 px-4 py-2.5 backdrop-blur">
          <div className="lg:hidden">
            <ImmosMark groesse={22} />
          </div>
          <button
            onClick={() => setPaletteOffen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-left text-xs text-fg-subtle transition-colors hover:border-accent-line hover:text-fg sm:max-w-md"
          >
            <Icons.Search className="h-3.5 w-3.5" strokeWidth={1.6} />
            <span className="flex-1 truncate">Objekt, Vorgang, Entscheidung oder Befehl …</span>
            <kbd className="hidden rounded border border-line-strong px-1 font-mono text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            {sprache.hoert ? (
              <Plakette ton="accent" punkt>
                hört zu …
              </Plakette>
            ) : null}
            <button
              onClick={() => (sprache.hoert ? sprache.stoppen() : sprache.starten())}
              title={
                sprache.verfuegbar
                  ? "Push-to-Talk (Taste M)"
                  : "Spracherkennung in diesem Browser nicht verfügbar"
              }
              aria-label="Sprachsteuerung"
              className={cn(
                "rounded-lg border p-1.5 transition-colors",
                sprache.hoert
                  ? "border-accent-line bg-accent-wash text-accent"
                  : "border-line text-fg-subtle hover:text-fg",
              )}
            >
              {sprache.hoert ? (
                <Icons.Mic className="h-4 w-4" strokeWidth={1.6} />
              ) : (
                <Icons.MicOff className="h-4 w-4" strokeWidth={1.6} />
              )}
            </button>
            <button
              onClick={() => setzeTon(!tonAus)}
              title={tonAus ? "Sprachausgabe einschalten" : "Sprachausgabe stumm"}
              aria-label="Sprachausgabe"
              className={cn(
                "rounded-lg border p-1.5 transition-colors",
                tonAus
                  ? "border-line text-fg-subtle hover:text-fg"
                  : "border-accent-line bg-accent-wash text-accent",
              )}
            >
              {tonAus ? (
                <Icons.VolumeX className="h-4 w-4" strokeWidth={1.6} />
              ) : (
                <Icons.Volume2 className="h-4 w-4" strokeWidth={1.6} />
              )}
            </button>
            <button
              onClick={() => setzeTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Darstellung wechseln"
              className="rounded-lg border border-line p-1.5 text-fg-subtle transition-colors hover:text-fg"
            >
              {theme === "dark" ? (
                <Icons.Sun className="h-4 w-4" strokeWidth={1.6} />
              ) : (
                <Icons.Moon className="h-4 w-4" strokeWidth={1.6} />
              )}
            </button>
          </div>
        </header>

        {sprache.transkript ? (
          <div className="border-b border-accent-line bg-accent-wash px-4 py-2 text-xs text-accent">
            {sprache.transkript}
          </div>
        ) : null}
        {sprache.fehler ? (
          <div className="border-b border-warn/30 bg-warn-wash px-4 py-2 text-xs text-warn">
            {sprache.fehler}
          </div>
        ) : null}

        <div ref={inhalt} className="min-w-0 flex-1">
          {children}
        </div>
      </div>

      {/* Nur bei Bedarf montiert — dadurch startet die Palette immer mit leerer
          Suche, ohne den Zustand in einem Effekt zurücksetzen zu müssen. */}
      {paletteOffen ? (
        <Palette
          schliessen={() => setPaletteOffen(false)}
          ziele={ziele}
          eintraege={eintraege}
        />
      ) : null}
    </div>
  );
}

function Palette({
  schliessen,
  ziele,
  eintraege,
}: {
  schliessen: () => void;
  ziele: SchnellZiel[];
  eintraege: NavEintrag[];
}) {
  const router = useRouter();
  const [suche, setSuche] = useState("");
  const [markiert, setMarkiert] = useState(0);
  const { sendeChat } = useImmos();

  const alle = useMemo<SchnellZiel[]>(
    () => [
      ...eintraege.map<SchnellZiel>((e) => ({
        href: e.href,
        titel: e.label,
        unterzeile: "Bereich öffnen",
        art: "Seite",
      })),
      ...ziele,
    ],
    [eintraege, ziele],
  );

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return alle.slice(0, 12);
    return alle
      .filter((z) => `${z.titel} ${z.unterzeile}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [alle, suche]);

  const ausfuehren = (ziel: SchnellZiel) => {
    schliessen();
    if (ziel.art === "Sprachbefehl") {
      sendeChat(ziel.titel);
      router.push("/cockpit");
      return;
    }
    router.push(ziel.href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-bg-deep/80 p-4 pt-[12vh] backdrop-blur-sm">
      <button aria-label="Schließen" className="fixed inset-0 cursor-default" onClick={schliessen} />
      <div className="card relative z-10 w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Icons.Command className="h-4 w-4 text-accent" strokeWidth={1.6} />
          <input
            autoFocus
            value={suche}
            onChange={(e) => {
              setSuche(e.target.value);
              setMarkiert(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMarkiert((m) => Math.min(m + 1, gefiltert.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMarkiert((m) => Math.max(m - 1, 0));
              }
              if (e.key === "Enter" && gefiltert[markiert]) {
                e.preventDefault();
                ausfuehren(gefiltert[markiert]);
              }
              if (e.key === "Escape") schliessen();
            }}
            placeholder="Suchen oder Befehl sprechen …"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle"
          />
          <kbd className="rounded border border-line-strong px-1 font-mono text-[10px] text-fg-subtle">
            esc
          </kbd>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto py-1">
          {gefiltert.length === 0 ? (
            <li className="px-4 py-6 text-center text-xs text-fg-subtle">Kein Treffer</li>
          ) : (
            gefiltert.map((ziel, i) => (
              <li key={`${ziel.art}-${ziel.href}-${ziel.titel}`}>
                <button
                  onMouseEnter={() => setMarkiert(i)}
                  onClick={() => ausfuehren(ziel)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2 text-left",
                    i === markiert ? "bg-accent-wash" : "hover:bg-surface-2",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-fg">{ziel.titel}</span>
                    <span className="block truncate text-2xs text-fg-subtle">{ziel.unterzeile}</span>
                  </span>
                  <span className="label-caps">{ziel.art}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-2xs text-fg-subtle">
          <span>↑↓ wählen · ⏎ öffnen</span>
          <span>M drücken für Push-to-Talk</span>
        </div>
      </div>
    </div>
  );
}

export function AutonomieHinweis({ stufe }: { stufe: 0 | 1 | 2 | 3 }) {
  const ton = stufe >= 3 ? "agent" : stufe === 2 ? "info" : stufe === 1 ? "accent" : "neutral";
  return (
    <Plakette ton={ton} punkt>
      Stufe {stufe} · {AUTONOMIE_LABELS[stufe].kurz}
    </Plakette>
  );
}
