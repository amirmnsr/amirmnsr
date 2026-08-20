import * as Icons from "lucide-react";
import type { Frist } from "@/domain";
import { Karte, KartenKopf, Plakette } from "@/components/ui/display";
import { daysUntil, formatDate, formatDeadline } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Fristenmonitor
 * =============================================================================
 * Sortiert nach Eskalationsstufe, nicht nach Datum: eine überfällige
 * Betreiberpflicht ist wichtiger als eine Frist, die morgen abläuft und
 * niemanden haften lässt. Zu jeder Frist steht die Konsequenz — sonst ist es
 * eine Erinnerung und keine Steuerung.
 */

export function FristenListe({
  fristen,
  jetzt,
  objektNamen,
  grenze = 5,
}: {
  fristen: Frist[];
  jetzt: string;
  objektNamen: Record<string, string>;
  grenze?: number;
}) {
  return (
    <Karte>
      <KartenKopf titel="Fristen" hinweis="nach Haftungsrelevanz sortiert" />
      <ul className="divide-y divide-line">
        {fristen.slice(0, grenze).map((f) => {
          const tage = daysUntil(f.ablaufAm, jetzt);
          const ton = tage < 0 ? "danger" : tage <= 14 ? "warn" : "neutral";
          return (
            <li key={f.id} className="px-4 py-2.5">
              <div className="flex items-start gap-2">
                <Icons.CalendarClock
                  className={cn(
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    ton === "danger" ? "text-danger" : ton === "warn" ? "text-warn" : "text-fg-subtle",
                  )}
                  strokeWidth={1.7}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug font-medium text-fg">{f.bezeichnung}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Plakette ton={ton} punkt>
                      {formatDeadline(f.ablaufAm, jetzt)}
                    </Plakette>
                    <span className="text-2xs text-fg-subtle">{formatDate(f.ablaufAm)}</span>
                    {f.objektId && objektNamen[f.objektId] ? (
                      <span className="text-2xs text-fg-subtle">
                        · {objektNamen[f.objektId]}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-2xs leading-relaxed text-fg-subtle">{f.konsequenz}</p>
                  {f.rechtsgrundlage ? (
                    <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">
                      {f.rechtsgrundlage}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Karte>
  );
}
