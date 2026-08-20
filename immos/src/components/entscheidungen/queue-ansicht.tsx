"use client";

import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import type { Vorschlag } from "@/domain";
import { useImmos } from "@/state/immos-store";
import { EntscheidungsKarte } from "@/components/cockpit/entscheidungs-karte";
import { Etikett, Karte, Plakette } from "@/components/ui/display";
import { Knopf, Segmente, Ueberlagerung } from "@/components/ui/controls";
import { formatCent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Entscheidungsansicht
 * =============================================================================
 * Der Stapel im Cockpit ist für den Durchlauf gedacht, diese Ansicht für den
 * Überblick: filtern, vergleichen, in Gruppen entscheiden.
 *
 * Die Sammelfreigabe ist bewusst eng: nur geringes Risiko, nur umkehrbar, nur
 * unterhalb der Betragsgrenze. Alles andere wäre Blindfreigabe mit einem Klick.
 */

type Filter = "alle" | "offen" | "hoch" | "geld" | "erledigt";

const SAMMEL_GRENZE_CENT = 100_000;

export function QueueAnsicht({
  agentNamen,
  objektNamen,
  jetzt,
}: {
  agentNamen: Record<string, string>;
  objektNamen: Record<string, string>;
  jetzt: string;
}) {
  const { vorschlaege, entscheide, gespartMinuten, entschiedenAnzahl } = useImmos();
  const [filter, setFilter] = useState<Filter>("offen");
  const [sammelOffen, setSammelOffen] = useState(false);

  const gefiltert = useMemo(() => {
    switch (filter) {
      case "offen":
        return vorschlaege.filter((v) => v.status === "offen");
      case "hoch":
        return vorschlaege.filter((v) => v.status === "offen" && v.risiko === "hoch");
      case "geld":
        return vorschlaege
          .filter((v) => v.status === "offen" && (v.betragCent ?? 0) > 0)
          .sort((a, b) => (b.betragCent ?? 0) - (a.betragCent ?? 0));
      case "erledigt":
        return vorschlaege.filter((v) => v.status !== "offen");
      default:
        return vorschlaege;
    }
  }, [vorschlaege, filter]);

  const sammelFaehig = useMemo(
    () =>
      vorschlaege.filter(
        (v) =>
          v.status === "offen" &&
          v.risiko === "niedrig" &&
          v.reversibel &&
          (v.betragCent ?? 0) <= SAMMEL_GRENZE_CENT,
      ),
    [vorschlaege],
  );

  const anzahl = (f: Filter) => {
    switch (f) {
      case "offen":
        return vorschlaege.filter((v) => v.status === "offen").length;
      case "hoch":
        return vorschlaege.filter((v) => v.status === "offen" && v.risiko === "hoch").length;
      case "geld":
        return vorschlaege.filter((v) => v.status === "offen" && (v.betragCent ?? 0) > 0).length;
      case "erledigt":
        return vorschlaege.filter((v) => v.status !== "offen").length;
      default:
        return vorschlaege.length;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmente<Filter>
          wert={filter}
          aendern={setFilter}
          optionen={[
            { wert: "offen", label: "Offen", anzahl: anzahl("offen") },
            { wert: "hoch", label: "Hohes Risiko", anzahl: anzahl("hoch") },
            { wert: "geld", label: "Nach Betrag", anzahl: anzahl("geld") },
            { wert: "erledigt", label: "Erledigt", anzahl: anzahl("erledigt") },
            { wert: "alle", label: "Alle", anzahl: anzahl("alle") },
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          {entschiedenAnzahl > 0 ? (
            <Plakette ton="ok" punkt>
              {entschiedenAnzahl} entschieden · {gespartMinuten} Min. gespart
            </Plakette>
          ) : null}
          <Knopf
            variante="sekundaer"
            klein
            disabled={sammelFaehig.length === 0}
            onClick={() => setSammelOffen(true)}
          >
            <Icons.ListChecks className="h-3.5 w-3.5" strokeWidth={1.8} />
            Sammelfreigabe ({sammelFaehig.length})
          </Knopf>
        </div>
      </div>

      {gefiltert.length === 0 ? (
        <Karte className="px-6 py-14 text-center">
          <p className="text-sm font-medium text-fg-muted">Keine Vorschläge in dieser Auswahl</p>
        </Karte>
      ) : (
        <div className="grid gap-3 2xl:grid-cols-2">
          {gefiltert.map((v) => (
            <div key={v.id} id={v.id} className="min-w-0 scroll-mt-24">
              <EntscheidungsKarte
                vorschlag={v}
                agentName={agentNamen[v.agentId] ?? v.agentId}
                objektName={v.objektId ? objektNamen[v.objektId] : undefined}
                jetzt={jetzt}
                aufEntscheidung={(art, grund, dauer) => entscheide(v.id, art, grund, dauer)}
              />
            </div>
          ))}
        </div>
      )}

      <Ueberlagerung
        offen={sammelOffen}
        schliessen={() => setSammelOffen(false)}
        titel="Sammelfreigabe"
        hinweis={`Nur geringes Risiko, umkehrbar und höchstens ${formatCent(SAMMEL_GRENZE_CENT)} je Vorgang`}
        breit
      >
        <ul className="space-y-2">
          {sammelFaehig.map((v) => (
            <li key={v.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
              <Icons.Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" strokeWidth={2.2} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-fg">{v.titel}</p>
                <p className="mt-0.5 text-2xs text-fg-subtle">{v.kurzfassung}</p>
              </div>
              {v.betragCent ? (
                <span className="text-2xs font-medium tabular-nums">
                  {formatCent(v.betragCent)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
          <Etikett className="mr-auto">
            {sammelFaehig.length} Vorgänge ·{" "}
            {formatCent(sammelFaehig.reduce((s, v) => s + (v.betragCent ?? 0), 0))} ·{" "}
            {sammelFaehig.reduce((s, v) => s + v.zeitersparnisMinuten, 0)} Min. Ersparnis
          </Etikett>
          <Knopf variante="geist" klein onClick={() => setSammelOffen(false)}>
            Abbrechen
          </Knopf>
          <Knopf
            variante="erfolg"
            onClick={() => {
              sammelFaehig.forEach((v) => entscheide(v.id, "zustimmen", "Sammelfreigabe", 8));
              setSammelOffen(false);
            }}
          >
            Alle freigeben
          </Knopf>
        </div>
      </Ueberlagerung>
    </div>
  );
}

export function VerteilungsLeiste({ vorschlaege }: { vorschlaege: Vorschlag[] }) {
  const gruppen = [
    { label: "hoch", ton: "danger" as const, anzahl: vorschlaege.filter((v) => v.risiko === "hoch").length },
    { label: "mittel", ton: "warn" as const, anzahl: vorschlaege.filter((v) => v.risiko === "mittel").length },
    { label: "niedrig", ton: "ok" as const, anzahl: vorschlaege.filter((v) => v.risiko === "niedrig").length },
  ];
  const gesamt = Math.max(1, vorschlaege.length);
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-1.5 w-40 overflow-hidden rounded-full bg-surface-3">
        {gruppen.map((g) => (
          <div
            key={g.label}
            className={cn(
              g.ton === "danger" ? "bg-danger" : g.ton === "warn" ? "bg-warn" : "bg-ok",
            )}
            style={{ width: `${(g.anzahl / gesamt) * 100}%` }}
          />
        ))}
      </div>
      <span className="text-2xs text-fg-subtle">
        {gruppen.map((g) => `${g.anzahl} ${g.label}`).join(" · ")}
      </span>
    </div>
  );
}
