/**
 * Formatierung ausschließlich in de-DE. Alle Geldbeträge kommen als Integer-Cent
 * aus der Domäne und werden erst hier zu Text — nie umgekehrt.
 */

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const eurCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const num = new Intl.NumberFormat("de-DE");

const pct = new Intl.NumberFormat("de-DE", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function formatCent(cent: number): string {
  return eur.format(cent / 100);
}

export function formatCentCompact(cent: number): string {
  const abs = Math.abs(cent);
  if (abs >= 100_000_00) return eurCompact.format(cent / 100);
  return eur.format(cent / 100);
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatCount(value: number): string {
  return num.format(value);
}

export function formatPercent(ratio: number): string {
  return pct.format(ratio);
}

export function formatArea(m2: number): string {
  return `${formatNumber(m2, 2)} m²`;
}

/**
 * Alle Datums- und Zeitangaben in Europe/Berlin. Eine deutsche Verwaltung
 * arbeitet in deutscher Zeit — unabhängig davon, in welcher Zeitzone der
 * Browser des Betrachters steht. Sonst wäre eine Frist "morgen 00:00" je
 * Standort eine andere.
 */
const ZEITZONE = "Europe/Berlin";

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: ZEITZONE }).format(
    new Date(iso),
  );
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: ZEITZONE,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: ZEITZONE,
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZEITZONE,
  }).format(new Date(iso));
}

/** "vor 3 Min.", "in 2 Tagen" — relativ zu einem übergebenen Bezugszeitpunkt (SSR-stabil). */
export function formatRelative(iso: string, now: string): string {
  const rtf = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });
  const diffMs = new Date(iso).getTime() - new Date(now).getTime();
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms || unit === "minute") {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return "jetzt";
}

/** Tagesdifferenz — Grundlage jeder Fristanzeige. Negativ = überfällig. */
export function daysUntil(iso: string, now: string): number {
  const a = new Date(iso);
  const b = new Date(now);
  a.setHours(12, 0, 0, 0);
  b.setHours(12, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function formatDeadline(iso: string, now: string): string {
  const d = daysUntil(iso, now);
  if (d < 0) return `${Math.abs(d)} Tage überfällig`;
  if (d === 0) return "heute fällig";
  if (d === 1) return "morgen fällig";
  return `in ${d} Tagen`;
}

export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

export function maskIban(iban: string): string {
  const clean = iban.replace(/\s/g, "");
  return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
}

export function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Stunde in deutscher Zeit — Grundlage für Begrüßung und Tagesabschnitt. */
export function stundeBerlin(iso: string): number {
  const teil = new Intl.DateTimeFormat("de-DE", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: ZEITZONE,
  })
    .formatToParts(new Date(iso))
    .find((t) => t.type === "hour");
  return Number(teil?.value ?? 0);
}

export function formatWochentag(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ZEITZONE,
  }).format(new Date(iso));
}
