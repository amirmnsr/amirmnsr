import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Seitenkopf
 * =============================================================================
 * Eine Zeile Titel, eine Zeile Einordnung, rechts die Aktionen. Immer gleich,
 * damit der Blick beim Seitenwechsel nicht neu suchen muss.
 */

export function SeitenKopf({
  titel,
  unterzeile,
  aktionen,
  className,
}: {
  titel: string;
  unterzeile?: ReactNode;
  aktionen?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-4 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-lg leading-tight font-semibold tracking-tight text-fg">{titel}</h1>
        {unterzeile ? (
          <p className="mt-1 text-xs leading-relaxed text-fg-subtle">{unterzeile}</p>
        ) : null}
      </div>
      {aktionen ? <div className="flex flex-wrap items-center gap-2">{aktionen}</div> : null}
    </div>
  );
}
