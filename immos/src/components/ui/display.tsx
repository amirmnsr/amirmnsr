import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Anzeige-Primitiven (Server Components)
 * =============================================================================
 * Bewusst wenige, streng typisierte Bausteine. Die Datendichte im Cockpit ist
 * hoch — jede zusätzliche visuelle Variante macht es schwerer lesbar.
 */

export type Ton = "neutral" | "accent" | "ok" | "warn" | "danger" | "info" | "agent";

const TON_KLASSEN: Record<Ton, string> = {
  neutral: "border-line-strong/70 bg-surface-3 text-fg-muted",
  accent: "border-accent-line bg-accent-wash text-accent",
  ok: "border-ok/30 bg-ok-wash text-ok",
  warn: "border-warn/30 bg-warn-wash text-warn",
  danger: "border-danger/35 bg-danger-wash text-danger",
  info: "border-info/30 bg-info-wash text-info",
  agent: "border-agent/30 bg-agent-wash text-agent",
};

export function Karte({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function KartenKopf({
  titel,
  hinweis,
  aktion,
  className,
}: {
  titel: ReactNode;
  hinweis?: ReactNode;
  aktion?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-line px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-tight text-fg">{titel}</h2>
        {hinweis ? <p className="mt-0.5 text-2xs text-fg-subtle">{hinweis}</p> : null}
      </div>
      {aktion}
    </div>
  );
}

export function Etikett({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("label-caps block", className)}>{children}</span>;
}

export function Plakette({
  children,
  ton = "neutral",
  className,
  punkt,
}: {
  children: ReactNode;
  ton?: Ton;
  className?: string;
  punkt?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium whitespace-nowrap",
        TON_KLASSEN[ton],
        className,
      )}
    >
      {punkt ? <StatusPunkt ton={ton} /> : null}
      {children}
    </span>
  );
}

export function StatusPunkt({ ton = "neutral", puls }: { ton?: Ton; puls?: boolean }) {
  const farbe: Record<Ton, string> = {
    neutral: "bg-fg-subtle",
    accent: "bg-accent",
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
    info: "bg-info",
    agent: "bg-agent",
  };
  return (
    <span className="relative inline-flex h-1.5 w-1.5 shrink-0">
      <span className={cn("h-1.5 w-1.5 rounded-full", farbe[ton])} />
      {puls ? (
        <span
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-60",
            farbe[ton],
          )}
        />
      ) : null}
    </span>
  );
}

/** Kennzahl-Fliese. Zahlen immer tabellarisch, Einheit kleiner als der Wert. */
export function Fliese({
  label,
  wert,
  einheit,
  hinweis,
  trend,
  ton = "neutral",
  className,
}: {
  label: string;
  wert: string;
  einheit?: string;
  hinweis?: string;
  trend?: { text: string; ton: Ton };
  ton?: Ton;
  className?: string;
}) {
  return (
    <div className={cn("card flex flex-col gap-1 p-4", className)}>
      <Etikett>{label}</Etikett>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-2xl leading-none font-semibold tracking-tight tabular-nums",
            ton === "danger" && "text-danger",
            ton === "warn" && "text-warn",
            ton === "ok" && "text-ok",
            ton === "accent" && "text-accent",
          )}
        >
          {wert}
        </span>
        {einheit ? <span className="text-xs text-fg-subtle">{einheit}</span> : null}
        {trend ? (
          <span
            className={cn(
              "ml-auto text-2xs font-medium",
              trend.ton === "ok" && "text-ok",
              trend.ton === "danger" && "text-danger",
              trend.ton === "warn" && "text-warn",
              trend.ton === "neutral" && "text-fg-subtle",
            )}
          >
            {trend.text}
          </span>
        ) : null}
      </div>
      {hinweis ? <p className="mt-1 text-2xs leading-relaxed text-fg-subtle">{hinweis}</p> : null}
    </div>
  );
}

export function Balken({
  anteil,
  ton = "accent",
  className,
}: {
  anteil: number;
  ton?: Ton;
  className?: string;
}) {
  const farbe: Record<Ton, string> = {
    neutral: "bg-fg-subtle",
    accent: "bg-accent",
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
    info: "bg-info",
    agent: "bg-agent",
  };
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", farbe[ton])}
        style={{ width: `${Math.max(0, Math.min(100, anteil * 100))}%` }}
      />
    </div>
  );
}

export function Zeile({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5 text-xs", className)}>
      <span className="text-fg-subtle">{label}</span>
      <span className="text-right font-medium text-fg tabular-nums">{children}</span>
    </div>
  );
}

export function Leer({ titel, text }: { titel: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      <p className="text-sm font-medium text-fg-muted">{titel}</p>
      {text ? <p className="max-w-sm text-xs text-fg-subtle">{text}</p> : null}
    </div>
  );
}

/** Kurzform für Beträge/Attribute in Tabellen und Listen. */
export function Merkmal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-2xs text-fg-subtle", className)}>{children}</span>
  );
}

export function Risiko({ stufe }: { stufe: "niedrig" | "mittel" | "hoch" }) {
  const map = { niedrig: "ok", mittel: "warn", hoch: "danger" } as const;
  return (
    <Plakette ton={map[stufe]} punkt>
      Risiko {stufe}
    </Plakette>
  );
}
