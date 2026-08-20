"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import type { AbrechnungsErgebnis, KostenpositionInput } from "@/domain/accounting/betriebskosten";
import type { Abrechnungslauf } from "@/domain";
import { Etikett, Karte, KartenKopf, Merkmal, Plakette, Zeile } from "@/components/ui/display";
import { Knopf } from "@/components/ui/controls";
import { formatCent, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Abrechnung
 * =============================================================================
 * Diese Seite ist der Beweis für das Prinzip „die Engine rechnet". Jede Zahl
 * unten entsteht beim Aufruf aus Kostenpositionen, Flächen, Personen,
 * Verbräuchen und Nutzungszeiträumen — und jede Position nennt ihren Rechenweg
 * im Klartext. Genau diese Zeile bekommt der Mieter auf die Abrechnung.
 */

export function AbrechnungsAnsicht({
  lauf,
  ergebnis,
  positionen,
  auffaelligkeiten,
}: {
  lauf: Abrechnungslauf;
  ergebnis: AbrechnungsErgebnis;
  positionen: KostenpositionInput[];
  auffaelligkeiten: string[];
}) {
  const [gewaehlt, setGewaehlt] = useState(ergebnis.nutzungen[0]?.nutzungId ?? "");
  const nutzung = ergebnis.nutzungen.find((n) => n.nutzungId === gewaehlt) ?? ergebnis.nutzungen[0];

  const nachzahlungen = ergebnis.nutzungen.filter((n) => n.saldoCent > 0);
  const guthaben = ergebnis.nutzungen.filter((n) => n.saldoCent < 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
        <Karte className="p-4">
          <Etikett>Gesamtkosten {ergebnis.jahr}</Etikett>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatCent(ergebnis.gesamtkostenCent)}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">{positionen.length} Kostenpositionen</p>
        </Karte>
        <Karte className="p-4">
          <Etikett>Umgelegt</Etikett>
          <p className="mt-1 text-xl font-semibold tabular-nums text-accent">
            {formatCent(ergebnis.umgelegtCent)}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">
            auf {ergebnis.nutzungen.filter((n) => !n.leerstand).length} Nutzer
          </p>
        </Karte>
        <Karte className="p-4">
          <Etikett>Nicht umlagefähig</Etikett>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatCent(ergebnis.nichtUmlagefaehigCent)}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">
            Instandhaltung, Verwaltung, Vorwegabzüge {formatCent(ergebnis.vorwegabzuegeCent)}
          </p>
        </Karte>
        <Karte className="p-4">
          <Etikett>CO₂-Anteil Vermieter</Etikett>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatCent(ergebnis.co2VermieteranteilCent)}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">Stufe {ergebnis.co2Stufe ?? "—"}</p>
        </Karte>
        <Karte className={cn("p-4", !ergebnis.summenkontrolleOk && "border-danger/40")}>
          <Etikett>Summenkontrolle</Etikett>
          <p
            className={cn(
              "mt-1 flex items-center gap-1.5 text-xl font-semibold",
              ergebnis.summenkontrolleOk ? "text-ok" : "text-danger",
            )}
          >
            {ergebnis.summenkontrolleOk ? (
              <>
                <Icons.CheckCircle2 className="h-5 w-5" strokeWidth={1.8} /> stimmt
              </>
            ) : (
              <>
                <Icons.XCircle className="h-5 w-5" strokeWidth={1.8} /> Abweichung
              </>
            )}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">
            umgelegt + nicht umlagefähig + Vorwegabzüge + CO₂ = Gesamtkosten
          </p>
        </Karte>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <Karte className="p-4">
          <Etikett>Nachzahlungen</Etikett>
          <p className="mt-1 text-lg font-semibold tabular-nums text-warn">
            {formatCent(nachzahlungen.reduce((s, n) => s + n.saldoCent, 0))}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">{nachzahlungen.length} Nutzer</p>
        </Karte>
        <Karte className="p-4">
          <Etikett>Guthaben</Etikett>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ok">
            {formatCent(guthaben.reduce((s, n) => s + n.saldoCent, 0))}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">{guthaben.length} Nutzer</p>
        </Karte>
        <Karte className="p-4">
          <Etikett>Abrechnungsfrist §556 Abs. 3 BGB</Etikett>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatDate(lauf.fristAm)}</p>
          <p className="mt-1 text-2xs text-fg-subtle">
            danach sind Nachforderungen ausgeschlossen
          </p>
        </Karte>
      </div>

      {auffaelligkeiten.length > 0 ? (
        <Karte className="border-warn/35">
          <KartenKopf
            titel="Auffälligkeiten vor dem Versand"
            hinweis="vom Abrechnungs-Assistenten gefunden — bitte einzeln entscheiden"
          />
          <ul className="divide-y divide-line">
            {auffaelligkeiten.map((h, i) => (
              <li key={i} className="flex items-start gap-2 px-4 py-2.5 text-xs text-fg-muted">
                <Icons.AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" strokeWidth={1.8} />
                {h}
              </li>
            ))}
          </ul>
        </Karte>
      ) : null}

      {ergebnis.hinweise.length > 0 ? (
        <Karte>
          <KartenKopf
            titel="Hinweise der Rechenengine"
            hinweis="deterministisch erzeugt, kein Sprachmodell beteiligt"
          />
          <ul className="divide-y divide-line">
            {ergebnis.hinweise.map((h, i) => (
              <li key={i} className="flex items-start gap-2 px-4 py-2.5 text-xs text-fg-muted">
                <Icons.Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" strokeWidth={1.8} />
                {h}
              </li>
            ))}
          </ul>
        </Karte>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <Karte className="overflow-hidden">
          <KartenKopf
            titel="Nutzer und Salden"
            hinweis="Zeitscheiben inklusive Mieterwechsel und Leerstand"
          />
          <div className="max-h-[36rem] divide-y divide-line overflow-y-auto">
            {ergebnis.nutzungen.map((n) => (
              <button
                key={n.nutzungId}
                onClick={() => setGewaehlt(n.nutzungId)}
                className={cn(
                  "flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors",
                  nutzung?.nutzungId === n.nutzungId ? "bg-accent-wash" : "hover:bg-surface-2",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{n.nutzerName}</span>
                  <span className="block truncate text-2xs text-fg-subtle">
                    {n.einheitBezeichnung} · {n.tage} Tage
                  </span>
                </span>
                {n.leerstand ? <Plakette ton="warn">Leerstand</Plakette> : null}
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    n.saldoCent > 0 ? "text-warn" : n.saldoCent < 0 ? "text-ok" : "text-fg-subtle",
                  )}
                >
                  {formatCent(n.saldoCent)}
                </span>
              </button>
            ))}
          </div>
        </Karte>

        {nutzung ? (
          <Karte>
            <KartenKopf
              titel={`Rechenweg · ${nutzung.nutzerName}`}
              hinweis={`${nutzung.einheitBezeichnung} · Zeitraum ${formatDate(nutzung.von)} bis ${formatDate(nutzung.bis)} (${nutzung.tage} Tage)`}
              aktion={
                <Knopf variante="sekundaer" klein disabled title="Im Prototyp ohne Versand">
                  <Icons.FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Abrechnung als PDF
                </Knopf>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-xs">
                <thead>
                  <tr className="border-b border-line text-left">
                    {["Position", "Schlüssel", "Verteilbar", "Anteil", "Betrag"].map((h) => (
                      <th key={h} className="label-caps px-3 py-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {nutzung.positionen.map((p, i) => (
                    <tr key={i} className="align-top hover:bg-surface-2">
                      <td className="px-3 py-2">
                        <span className="block font-medium">{p.bezeichnung}</span>
                        <span className="block font-mono text-[10px] text-fg-subtle">
                          Konto {p.kontoNr}
                          {p.betrkv ? ` · BetrKV ${p.betrkv}` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-fg-subtle">{p.schluessel.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCent(p.verteilbarCent)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-fg-subtle">
                        {formatNumber(p.anteilEinheit, 2)} / {formatNumber(p.anteilGesamt, 2)}
                        {p.zeitanteilTage < p.zeitanteilGesamtTage ? (
                          <span className="block text-[10px]">
                            {p.zeitanteilTage}/{p.zeitanteilGesamtTage} Tage
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        {formatCent(p.anteilCent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line px-4 py-3">
              <Zeile label="Summe Umlage">{formatCent(nutzung.summeUmlageCent)}</Zeile>
              <Zeile label="Geleistete Vorauszahlungen">
                {formatCent(nutzung.vorauszahlungCent)}
              </Zeile>
              <Zeile
                label={nutzung.saldoCent >= 0 ? "Nachzahlung" : "Guthaben"}
                className="border-t border-line pt-2 text-sm"
              >
                {formatCent(Math.abs(nutzung.saldoCent))}
              </Zeile>
              {nutzung.paragraf35aCent > 0 ? (
                <Zeile label="Davon §35a EStG begünstigt">
                  {formatCent(nutzung.paragraf35aCent)}
                </Zeile>
              ) : null}
            </div>

            <div className="border-t border-line px-4 py-3">
              <Etikett className="mb-2">Erläuterung für den Nutzer</Etikett>
              <ul className="space-y-1.5">
                {nutzung.positionen.map((p, i) => (
                  <li key={i} className="text-2xs leading-relaxed text-fg-muted">
                    <span className="font-medium text-fg">{p.bezeichnung}:</span> {p.rechenweg}
                  </li>
                ))}
              </ul>
            </div>
          </Karte>
        ) : null}
      </div>

      <Karte className="overflow-x-auto">
        <KartenKopf
          titel="Kostenpositionen"
          hinweis="Umlagefähigkeit und Schlüssel stammen aus dem Kontenrahmen"
        />
        <table className="w-full min-w-[52rem] text-xs">
          <thead>
            <tr className="border-b border-line text-left">
              {["Konto", "Position", "Betrag", "Vorwegabzug", "Umlagefähig", "Schlüssel", "§35a"].map(
                (h) => (
                  <th key={h} className="label-caps px-3 py-2">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {positionen.map((p) => (
              <tr key={p.id} className="hover:bg-surface-2">
                <td className="px-3 py-2 font-mono text-2xs">{p.kontoNr}</td>
                <td className="px-3 py-2">
                  {p.bezeichnung}
                  {p.heizkosten ? (
                    <Plakette className="ml-2" ton="info">
                      HeizkostenV 70/30
                    </Plakette>
                  ) : null}
                  {p.co2KostenCent ? (
                    <Merkmal className="ml-2">
                      davon CO₂ {formatCent(p.co2KostenCent)}
                    </Merkmal>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCent(p.betragCent)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-fg-subtle">
                  {p.vorwegabzugCent ? formatCent(p.vorwegabzugCent) : "—"}
                </td>
                <td className="px-3 py-2">
                  {p.umlagefaehig ? (
                    <Plakette ton="ok">ja</Plakette>
                  ) : (
                    <Plakette ton="neutral">nein</Plakette>
                  )}
                </td>
                <td className="px-3 py-2 text-fg-subtle">{p.schluessel.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 text-right tabular-nums text-fg-subtle">
                  {p.paragraf35aCent ? formatCent(p.paragraf35aCent) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Karte>
    </div>
  );
}
