"use client";

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bedien-Primitiven
 * =============================================================================
 * Tastatur zuerst: jede Aktion im Cockpit ist ohne Maus erreichbar, weil
 * Verwalter im Akkord entscheiden. Sichtbare Fokusringe sind Pflicht.
 */

type Variante = "primaer" | "sekundaer" | "geist" | "gefahr" | "erfolg";

const VARIANTEN: Record<Variante, string> = {
  primaer:
    "bg-accent text-fg-inverse hover:bg-accent-strong active:translate-y-px font-semibold",
  sekundaer:
    "border border-line-strong bg-surface-2 text-fg hover:border-accent-line hover:text-accent",
  geist: "text-fg-muted hover:bg-surface-2 hover:text-fg",
  gefahr: "border border-danger/40 bg-danger-wash text-danger hover:bg-danger/20",
  erfolg: "border border-ok/40 bg-ok-wash text-ok hover:bg-ok/20",
};

export function Knopf({
  variante = "sekundaer",
  klein,
  kuerzel,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  klein?: boolean;
  kuerzel?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        klein ? "px-2.5 py-1.5" : "px-3.5 py-2",
        VARIANTEN[variante],
        className,
      )}
      {...rest}
    >
      {children}
      {kuerzel ? (
        <kbd className="rounded border border-current/30 px-1 font-mono text-[10px] opacity-70">
          {kuerzel}
        </kbd>
      ) : null}
    </button>
  );
}

export function Segmente<T extends string>({
  optionen,
  wert,
  aendern,
  className,
}: {
  optionen: { wert: T; label: string; anzahl?: number }[];
  wert: T;
  aendern: (wert: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5",
        className,
      )}
    >
      {optionen.map((o) => (
        <button
          key={o.wert}
          role="tab"
          aria-selected={o.wert === wert}
          onClick={() => aendern(o.wert)}
          className={cn(
            "rounded-md px-2.5 py-1 text-2xs font-medium transition-colors",
            o.wert === wert
              ? "bg-accent-wash text-accent"
              : "text-fg-subtle hover:text-fg",
          )}
        >
          {o.label}
          {o.anzahl !== undefined ? (
            <span className="ml-1.5 opacity-60 tabular-nums">{o.anzahl}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Schalter({
  an,
  aendern,
  label,
  gesperrt,
  beschreibung,
}: {
  an: boolean;
  aendern: (an: boolean) => void;
  label: string;
  gesperrt?: boolean;
  beschreibung?: string;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3",
        gesperrt ? "cursor-not-allowed opacity-70" : "cursor-pointer",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={an}
        aria-label={label}
        disabled={gesperrt}
        onClick={() => !gesperrt && aendern(!an)}
        className={cn(
          "relative mt-0.5 h-4 w-7 shrink-0 rounded-full border transition-colors",
          an ? "border-accent-line bg-accent/70" : "border-line-strong bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-fg transition-transform",
            an ? "translate-x-3.5" : "translate-x-0.5",
          )}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-fg">{label}</span>
        {beschreibung ? (
          <span className="mt-0.5 block text-2xs leading-relaxed text-fg-subtle">
            {beschreibung}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function Ueberlagerung({
  offen,
  schliessen,
  titel,
  hinweis,
  children,
  breit,
}: {
  offen: boolean;
  schliessen: () => void;
  titel: string;
  hinweis?: string;
  children: ReactNode;
  breit?: boolean;
}) {
  useEffect(() => {
    if (!offen) return;
    const aufEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") schliessen();
    };
    document.addEventListener("keydown", aufEscape);
    return () => document.removeEventListener("keydown", aufEscape);
  }, [offen, schliessen]);

  if (!offen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg-deep/80 p-4 pt-[8vh] backdrop-blur-sm">
      <button
        aria-label="Schließen"
        className="fixed inset-0 cursor-default"
        onClick={schliessen}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        className={cn(
          "card relative z-10 w-full",
          breit ? "max-w-4xl" : "max-w-xl",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-fg">{titel}</h2>
            {hinweis ? <p className="mt-0.5 text-2xs text-fg-subtle">{hinweis}</p> : null}
          </div>
          <Knopf variante="geist" klein onClick={schliessen} aria-label="Schließen">
            Schließen
          </Knopf>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
