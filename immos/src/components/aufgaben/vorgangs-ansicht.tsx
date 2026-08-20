"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import type { Auftrag, Vorgang, VorgangStatus } from "@/domain";
import { Etikett, Karte, Leer, Merkmal, Plakette } from "@/components/ui/display";
import { Segmente } from "@/components/ui/controls";
import { gsap, reduziertBewegung, TAKT, useGSAP } from "@/components/motion/gsap";
import { daysUntil, formatCent, formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRef } from "react";

/**
 * Vorgänge
 * =============================================================================
 * Board, Liste und Zeitachse auf derselben Datenbasis — wie in einem
 * Projektwerkzeug, aber mit den Statuswerten einer Verwaltung. Die Spalte
 * „wartet auf Entscheidung" ist die wichtigste: dort steht, was ImmOS
 * vorbereitet hat und was der Mensch freigeben muss.
 */

const SPALTEN: { status: VorgangStatus; label: string }[] = [
  { status: "neu", label: "Neu" },
  { status: "in_pruefung", label: "In Prüfung" },
  { status: "wartet_auf_entscheidung", label: "Wartet auf Entscheidung" },
  { status: "beauftragt", label: "Beauftragt" },
  { status: "wartet_extern", label: "Wartet extern" },
  { status: "erledigt", label: "Erledigt" },
];

const PRIO_TON = {
  notfall: "danger",
  hoch: "danger",
  normal: "neutral",
  niedrig: "neutral",
} as const;

export function VorgangsAnsicht({
  vorgaenge,
  auftraege,
  objektNamen,
  bearbeiter,
  jetzt,
}: {
  vorgaenge: Vorgang[];
  auftraege: Auftrag[];
  objektNamen: Record<string, string>;
  bearbeiter: Record<string, string>;
  jetzt: string;
}) {
  const [ansicht, setAnsicht] = useState<"board" | "liste" | "zeit">("board");
  const wurzel = useRef<HTMLDivElement>(null);

  const nachFrist = useMemo(
    () =>
      [...vorgaenge].sort((a, b) =>
        (a.faelligAm ?? "9999").localeCompare(b.faelligAm ?? "9999"),
      ),
    [vorgaenge],
  );

  useGSAP(
    () => {
      if (reduziertBewegung()) return;
      gsap.from("[data-vorgang]", {
        y: 10,
        opacity: 0,
        duration: TAKT.schnell,
        stagger: 0.03,
        clearProps: "all",
      });
    },
    { scope: wurzel, dependencies: [ansicht] },
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmente
          wert={ansicht}
          aendern={setAnsicht}
          optionen={[
            { wert: "board", label: "Board" },
            { wert: "liste", label: "Liste" },
            { wert: "zeit", label: "Zeitachse" },
          ]}
        />
        <span className="text-2xs text-fg-subtle">
          {vorgaenge.filter((v) => v.status !== "erledigt").length} offen ·{" "}
          {auftraege.filter((a) => a.status !== "abgenommen").length} laufende Aufträge
        </span>
      </div>

      <div ref={wurzel}>
        {ansicht === "board" ? (
          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {SPALTEN.map((spalte) => {
              const inSpalte = vorgaenge.filter((v) => v.status === spalte.status);
              return (
                <div key={spalte.status} className="min-w-0">
                  <div className="mb-1.5 flex items-center gap-2">
                    <Etikett className="flex-1">{spalte.label}</Etikett>
                    <span className="text-2xs tabular-nums text-fg-subtle">{inSpalte.length}</span>
                  </div>
                  <div className="space-y-2">
                    {inSpalte.map((v) => (
                      <VorgangKarte
                        key={v.id}
                        vorgang={v}
                        objektName={objektNamen[v.objektId]}
                        bearbeiterName={v.bearbeiterId ? bearbeiter[v.bearbeiterId] : undefined}
                        jetzt={jetzt}
                      />
                    ))}
                    {inSpalte.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-2xs text-fg-subtle">
                        leer
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {ansicht === "liste" ? (
          <Karte className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-xs">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Nummer", "Vorgang", "Objekt", "Kategorie", "Priorität", "Status", "Fällig", "Bearbeiter"].map(
                    (h) => (
                      <th key={h} className="label-caps px-3 py-2">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {nachFrist.map((v) => (
                  <tr key={v.id} data-vorgang className="hover:bg-surface-2">
                    <td className="px-3 py-2 font-mono text-2xs">{v.nummer}</td>
                    <td className="max-w-[22rem] px-3 py-2">
                      <span className="block truncate font-medium">{v.titel}</span>
                      <span className="block truncate text-2xs text-fg-subtle">
                        {v.zusammenfassung}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-fg-subtle">{objektNamen[v.objektId]}</td>
                    <td className="px-3 py-2 text-fg-subtle">{v.kategorie}</td>
                    <td className="px-3 py-2">
                      <Plakette ton={PRIO_TON[v.prioritaet]}>{v.prioritaet}</Plakette>
                    </td>
                    <td className="px-3 py-2">
                      <Plakette ton={v.status === "erledigt" ? "ok" : "accent"}>
                        {v.status.replace(/_/g, " ")}
                      </Plakette>
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 tabular-nums",
                        v.faelligAm && daysUntil(v.faelligAm, jetzt) < 0 && "text-danger",
                      )}
                    >
                      {v.faelligAm ? formatDate(v.faelligAm) : "—"}
                    </td>
                    <td className="px-3 py-2 text-fg-subtle">
                      {v.bearbeiterId ? bearbeiter[v.bearbeiterId] : "ImmOS"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Karte>
        ) : null}

        {ansicht === "zeit" ? (
          <Karte className="p-4">
            {nachFrist.filter((v) => v.faelligAm).length === 0 ? (
              <Leer titel="Keine terminierten Vorgänge" />
            ) : (
              <ol className="space-y-2">
                {nachFrist
                  .filter((v) => v.faelligAm)
                  .map((v) => {
                    const tage = daysUntil(v.faelligAm!, jetzt);
                    const spanne = Math.max(1, 45);
                    const anteil = Math.min(100, Math.max(0, ((tage + 5) / spanne) * 100));
                    return (
                      <li key={v.id} data-vorgang className="group">
                        <div className="flex items-center gap-3">
                          <span className="w-52 shrink-0 truncate text-xs">{v.titel}</span>
                          <span className="relative h-6 flex-1 rounded-md bg-surface-2">
                            <span
                              className={cn(
                                "absolute top-1/2 h-3 -translate-y-1/2 rounded-full px-2 text-[10px] leading-3",
                                tage < 0
                                  ? "bg-danger"
                                  : tage < 7
                                    ? "bg-warn"
                                    : "bg-accent/70",
                              )}
                              style={{ left: `${anteil}%`, width: "10px" }}
                            />
                          </span>
                          <span
                            className={cn(
                              "w-28 shrink-0 text-right text-2xs tabular-nums",
                              tage < 0 ? "text-danger" : "text-fg-subtle",
                            )}
                          >
                            {formatDate(v.faelligAm!)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
              </ol>
            )}
            <p className="mt-3 border-t border-line pt-2 text-2xs text-fg-subtle">
              Zeitachse von heute minus 5 bis heute plus 40 Tage. Rot: überfällig.
            </p>
          </Karte>
        ) : null}
      </div>
    </div>
  );
}

function VorgangKarte({
  vorgang,
  objektName,
  bearbeiterName,
  jetzt,
}: {
  vorgang: Vorgang;
  objektName?: string;
  bearbeiterName?: string;
  jetzt: string;
}) {
  const tage = vorgang.faelligAm ? daysUntil(vorgang.faelligAm, jetzt) : undefined;
  return (
    <Karte data-vorgang className="p-3">
      <div className="flex items-start justify-between gap-2">
        <Merkmal>{vorgang.nummer}</Merkmal>
        <Plakette ton={PRIO_TON[vorgang.prioritaet]}>{vorgang.prioritaet}</Plakette>
      </div>
      <p className="mt-1.5 text-xs leading-snug font-medium text-fg">{vorgang.titel}</p>
      <p className="mt-1 line-clamp-3 text-2xs leading-relaxed text-fg-subtle">
        {vorgang.zusammenfassung}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-2">
        {objektName ? <Merkmal>{objektName.split(" · ")[0]}</Merkmal> : null}
        {tage !== undefined ? (
          <span
            className={cn(
              "text-2xs",
              tage < 0 ? "text-danger" : tage <= 2 ? "text-warn" : "text-fg-subtle",
            )}
          >
            {formatRelative(vorgang.faelligAm!, jetzt)}
          </span>
        ) : null}
        {vorgang.kostenSchaetzungCent ? (
          <span className="text-2xs tabular-nums text-fg-subtle">
            {formatCent(vorgang.kostenSchaetzungCent)}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1 text-2xs text-fg-subtle">
          {bearbeiterName ? (
            bearbeiterName.split(" ")[0]
          ) : (
            <>
              <Icons.Bot className="h-3 w-3 text-agent" strokeWidth={1.8} /> ImmOS
            </>
          )}
        </span>
      </div>
      {vorgang.gruppeId ? (
        <p className="mt-1.5 flex items-center gap-1 text-2xs text-accent">
          <Icons.Layers className="h-3 w-3" strokeWidth={1.8} />
          mehrere Meldungen zusammengefasst
        </p>
      ) : null}
    </Karte>
  );
}
