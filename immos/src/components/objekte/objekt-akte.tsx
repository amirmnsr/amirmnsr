"use client";

import Link from "next/link";
import { useState } from "react";
import * as Icons from "lucide-react";
import type { ObjektAkte } from "@/data/world";
import { useImmos } from "@/state/immos-store";
import { EntscheidungsKarte } from "@/components/cockpit/entscheidungs-karte";
import { Balken, Etikett, Karte, KartenKopf, Leer, Merkmal, Plakette, Zeile } from "@/components/ui/display";
import { Segmente } from "@/components/ui/controls";
import { daysUntil, formatArea, formatCent, formatDate, formatDeadline, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Objektakte
 * =============================================================================
 * Eine Akte statt zwölf Ordner. Reiter in der Reihenfolge, in der ein Verwalter
 * fragt: Was ist hier los, wer wohnt hier, was liegt an, was muss geprüft
 * werden, wohin geht die Post, was sagt die Buchhaltung.
 */

type Reiter =
  | "uebersicht"
  | "einheiten"
  | "vorgaenge"
  | "technik"
  | "post"
  | "finanzen"
  | "dokumente"
  | "beschluesse";

export function ObjektAkteAnsicht({
  akte,
  agentNamen,
  jetzt,
  wegAktiv,
}: {
  akte: ObjektAkte;
  agentNamen: Record<string, string>;
  jetzt: string;
  wegAktiv: boolean;
}) {
  const [reiter, setReiter] = useState<Reiter>("uebersicht");
  const { entscheide, vorschlaege } = useImmos();
  const o = akte.objekt;

  const meineVorschlaege = vorschlaege.filter((v) => v.objektId === o.id);
  const offeneVorschlaege = meineVorschlaege.filter((v) => v.status === "offen");
  const quote = akte.einheiten > 0 ? akte.vermietet / akte.einheiten : 0;

  const optionen: { wert: Reiter; label: string; anzahl?: number }[] = [
    { wert: "uebersicht", label: "Übersicht" },
    { wert: "einheiten", label: "Einheiten", anzahl: akte.einheiten },
    { wert: "vorgaenge", label: "Vorgänge", anzahl: akte.vorgaenge.length },
    { wert: "technik", label: "Technik", anzahl: akte.pruefpflichten.length },
    { wert: "post", label: "Adressen", anzahl: akte.postfaecher.length },
    { wert: "finanzen", label: "Finanzen" },
    { wert: "dokumente", label: "Dokumente", anzahl: akte.dokumente.length },
    ...(wegAktiv && akte.beschluesse.length > 0
      ? [{ wert: "beschluesse" as Reiter, label: "Beschlüsse", anzahl: akte.beschluesse.length }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <Karte className="p-4">
          <Etikett>Vermietungsstand</Etikett>
          <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">
            {formatPercent(quote)}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">
            {akte.vermietet} vermietet · {akte.leerstand} leer
          </p>
          <Balken className="mt-2" anteil={quote} ton={quote > 0.95 ? "ok" : "warn"} />
        </Karte>
        <Karte className="p-4">
          <Etikett>Soll im Monat</Etikett>
          <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">
            {formatCent(akte.monatsSollCent)}
          </p>
          <p className={cn("mt-1 text-2xs", akte.offenCent > 0 ? "text-warn" : "text-fg-subtle")}>
            {akte.offenCent > 0 ? `${formatCent(akte.offenCent)} offen` : "keine Rückstände"}
          </p>
        </Karte>
        <Karte className="p-4">
          <Etikett>Offene Vorgänge</Etikett>
          <p className="mt-1 text-2xl leading-none font-semibold tabular-nums">
            {akte.offeneVorgaenge}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">
            {offeneVorschlaege.length} Entscheidungen offen
          </p>
        </Karte>
        <Karte className="p-4">
          <Etikett>Prüfpflichten</Etikett>
          <p
            className={cn(
              "mt-1 text-2xl leading-none font-semibold tabular-nums",
              akte.pruefpflichten.some((p) => p.status === "ueberfaellig") && "text-danger",
            )}
          >
            {akte.pruefpflichten.filter((p) => p.status === "erfuellt").length}/
            {akte.pruefpflichten.length}
          </p>
          <p className="mt-1 text-2xs text-fg-subtle">
            {akte.zaehlerFernablesbar} von {akte.zaehlerAnzahl} Zählern fernablesbar
          </p>
        </Karte>
      </div>

      {offeneVorschlaege.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Icons.Bot className="h-4 w-4 text-agent" strokeWidth={1.7} />
            <h2 className="text-[13px] font-semibold tracking-tight">
              Offene Entscheidungen zu diesem Objekt
            </h2>
          </div>
          <div className="grid gap-3 2xl:grid-cols-2">
            {offeneVorschlaege.map((v) => (
              <EntscheidungsKarte
                key={v.id}
                vorschlag={v}
                agentName={agentNamen[v.agentId] ?? v.agentId}
                jetzt={jetzt}
                kompakt
                aufEntscheidung={(art, grund, dauer) => entscheide(v.id, art, grund, dauer)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <Segmente<Reiter> wert={reiter} aendern={setReiter} optionen={optionen} />

      {reiter === "uebersicht" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Karte>
            <KartenKopf titel="Stammdaten" />
            <div className="px-4 py-3">
              <Zeile label="Adresse">
                {o.strasse}, {o.plz} {o.ort}
              </Zeile>
              <Zeile label="Baujahr">{o.baujahr}</Zeile>
              <Zeile label="Wohnfläche">{formatArea(o.wohnflaecheM2)}</Zeile>
              {o.gewerbeflaecheM2 > 0 ? (
                <Zeile label="Gewerbefläche">{formatArea(o.gewerbeflaecheM2)}</Zeile>
              ) : null}
              <Zeile label="Heizung">
                {o.heizungsart.replace("_", " ")} · {o.energietraeger}
              </Zeile>
              <Zeile label="Eigentümer">{akte.eigentuemerName}</Zeile>
              <Zeile label="Verwaltung seit">{formatDate(o.verwaltungsbeginn)}</Zeile>
              <Zeile label="Verwaltungsart">
                {o.verwaltungsarten.join(", ")}
              </Zeile>
              {akte.bankkonto ? (
                <Zeile label="Treuhandkonto">{formatCent(akte.bankkonto.saldoCent)}</Zeile>
              ) : null}
            </div>
            {o.notizen ? (
              <div className="border-t border-line px-4 py-3">
                <Etikett>Notiz</Etikett>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">{o.notizen}</p>
              </div>
            ) : null}
          </Karte>

          <Karte>
            <KartenKopf titel="Fristen und Pflichten" hinweis="nach Ablauf sortiert" />
            {akte.fristen.length === 0 ? (
              <Leer titel="Keine offenen Fristen" />
            ) : (
              <ul className="divide-y divide-line">
                {akte.fristen.map((f) => {
                  const tage = daysUntil(f.ablaufAm, jetzt);
                  return (
                    <li key={f.id} className="px-4 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-fg">{f.bezeichnung}</p>
                        <Plakette ton={tage < 0 ? "danger" : tage < 14 ? "warn" : "neutral"} punkt>
                          {formatDeadline(f.ablaufAm, jetzt)}
                        </Plakette>
                      </div>
                      <p className="mt-1 text-2xs text-fg-subtle">{f.konsequenz}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Karte>
        </div>
      ) : null}

      {reiter === "einheiten" ? (
        <Karte className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-xs">
            <thead>
              <tr className="border-b border-line text-left">
                {["WE", "Lage", "Typ", "Fläche", "Status", "Mieter", "Miete kalt", "Offen"].map((h) => (
                  <th key={h} className="label-caps px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {akte.einheitenListe.map(({ einheit, vertrag, mieter, offenCent }) => (
                <tr key={einheit.id} className="hover:bg-surface-2">
                  <td className="px-3 py-2 font-mono text-2xs">{einheit.nummer}</td>
                  <td className="px-3 py-2">{einheit.lage}</td>
                  <td className="px-3 py-2 text-fg-subtle">{einheit.typ}</td>
                  <td className="px-3 py-2 tabular-nums">{formatArea(einheit.wohnflaecheM2)}</td>
                  <td className="px-3 py-2">
                    <Plakette
                      ton={
                        einheit.status === "vermietet"
                          ? "ok"
                          : einheit.status === "leerstand"
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {einheit.status}
                    </Plakette>
                  </td>
                  <td className="px-3 py-2 text-fg-muted">{mieter ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {vertrag ? formatCent(vertrag.mieteKaltCent) : "—"}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 tabular-nums",
                      offenCent > 0 ? "text-warn" : "text-fg-subtle",
                    )}
                  >
                    {offenCent > 0 ? formatCent(offenCent) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Karte>
      ) : null}

      {reiter === "vorgaenge" ? (
        <Karte>
          {akte.vorgaenge.length === 0 ? (
            <Leer titel="Keine Vorgänge" />
          ) : (
            <ul className="divide-y divide-line">
              {akte.vorgaenge.map((v) => (
                <li key={v.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Merkmal>{v.nummer}</Merkmal>
                    <span className="text-xs font-medium text-fg">{v.titel}</span>
                    <Plakette
                      ton={
                        v.prioritaet === "notfall" || v.prioritaet === "hoch"
                          ? "danger"
                          : v.prioritaet === "normal"
                            ? "neutral"
                            : "neutral"
                      }
                    >
                      {v.prioritaet}
                    </Plakette>
                    <Plakette ton={v.status === "erledigt" ? "ok" : "accent"}>
                      {v.status.replace(/_/g, " ")}
                    </Plakette>
                  </div>
                  <p className="mt-1 text-2xs leading-relaxed text-fg-muted">{v.zusammenfassung}</p>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      ) : null}

      {reiter === "technik" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Karte>
            <KartenKopf titel="Anlagen" />
            <ul className="divide-y divide-line">
              {akte.anlagen.map((a) => (
                <li key={a.id} className="flex items-center gap-2 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-fg">{a.bezeichnung}</span>
                    <span className="block text-2xs text-fg-subtle">
                      {a.standort}
                      {a.baujahr ? ` · Baujahr ${a.baujahr}` : ""}
                    </span>
                  </span>
                  <Plakette
                    ton={
                      a.zustand === "gut" ? "ok" : a.zustand === "mittel" ? "warn" : "danger"
                    }
                  >
                    {a.zustand}
                  </Plakette>
                </li>
              ))}
            </ul>
          </Karte>
          <Karte>
            <KartenKopf titel="Prüfpflichten" hinweis="mit Rechtsgrundlage" />
            <ul className="divide-y divide-line">
              {akte.pruefpflichten.map((p) => (
                <li key={p.id} className="px-4 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-fg">{p.bezeichnung}</span>
                    <Plakette
                      ton={
                        p.status === "erfuellt"
                          ? "ok"
                          : p.status === "faellig"
                            ? "warn"
                            : "danger"
                      }
                      punkt
                    >
                      {formatDeadline(p.naechstePruefung, jetzt)}
                    </Plakette>
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">{p.rechtsgrundlage}</p>
                  <p className="mt-0.5 text-2xs text-fg-subtle">
                    Intervall {p.intervallMonate} Monate · Haftungsrisiko {p.haftungsrisiko}
                  </p>
                </li>
              ))}
            </ul>
          </Karte>
        </div>
      ) : null}

      {reiter === "post" ? (
        <Karte>
          <KartenKopf
            titel="Adressen dieses Objekts"
            hinweis="Eingänge werden automatisch zugeordnet, Antworten gehen im Namen der Verwaltung raus"
          />
          <ul className="divide-y divide-line">
            {akte.postfaecher.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-xs text-accent">{p.adresse}</span>
                  <span className="mt-0.5 block text-2xs text-fg-subtle">
                    Zweck {p.zweck} · Rückfall an {p.fallback}
                    {p.absenderWhitelist.length > 0
                      ? ` · ${p.absenderWhitelist.length} freigegebene Absender`
                      : ""}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xs font-medium tabular-nums">
                    {p.eingaengeMonat}
                  </span>
                  <Etikett>Eingänge/Monat</Etikett>
                </span>
                <span className="w-28">
                  <Balken anteil={p.autoQuote} ton={p.autoQuote > 0.7 ? "ok" : "accent"} />
                  <Etikett className="mt-1">
                    {formatPercent(p.autoQuote)} automatisch
                  </Etikett>
                </span>
              </li>
            ))}
          </ul>
        </Karte>
      ) : null}

      {reiter === "finanzen" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Karte>
            <KartenKopf titel="Rechnungseingang" />
            {akte.rechnungen.length === 0 ? (
              <Leer titel="Keine Rechnungen" />
            ) : (
              <ul className="divide-y divide-line">
                {akte.rechnungen.map((r) => (
                  <li key={r.id} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {r.kreditorNameRoh}
                      </span>
                      <span className="text-xs font-medium tabular-nums">
                        {formatCent(r.bruttoCent)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Merkmal>{r.rechnungsNr}</Merkmal>
                      <Plakette
                        ton={
                          r.status === "bezahlt"
                            ? "ok"
                            : r.status === "abgelehnt" || r.status === "reklamation"
                              ? "danger"
                              : "accent"
                        }
                      >
                        {r.status.replace(/_/g, " ")}
                      </Plakette>
                      <Plakette ton={r.format === "zugferd" || r.format === "xrechnung" ? "ok" : "neutral"}>
                        {r.format}
                      </Plakette>
                      {r.pruefung.ibanAbweichung ? (
                        <Plakette ton="danger" punkt>
                          IBAN abweichend
                        </Plakette>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Karte>
          <Karte>
            <KartenKopf titel="Abrechnungsläufe" />
            {akte.abrechnungen.length === 0 ? (
              <Leer titel="Keine Läufe" />
            ) : (
              <ul className="divide-y divide-line">
                {akte.abrechnungen.map((a) => (
                  <li key={a.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">
                        {a.art.replace(/_/g, " ")} {a.jahr}
                      </span>
                      <Plakette ton={a.status === "versendet" || a.status === "beschlossen" ? "ok" : "accent"}>
                        {a.status}
                      </Plakette>
                      <Link
                        href="/abrechnung"
                        className="ml-auto text-2xs text-accent hover:underline"
                      >
                        Rechenweg
                      </Link>
                    </div>
                    <Zeile label="Gesamtkosten">{formatCent(a.gesamtkostenCent)}</Zeile>
                    <Zeile label="Umlagefähig">{formatCent(a.umlagefaehigCent)}</Zeile>
                    {a.auffaelligkeiten.map((h, i) => (
                      <p key={i} className="mt-1 flex items-start gap-1.5 text-2xs text-warn">
                        <Icons.AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} />
                        {h}
                      </p>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </Karte>
        </div>
      ) : null}

      {reiter === "dokumente" ? (
        <Karte className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-xs">
            <thead>
              <tr className="border-b border-line text-left">
                {["Titel", "Art", "Aktenplan", "Erstellt", "Aufbewahrung"].map((h) => (
                  <th key={h} className="label-caps px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {akte.dokumente.map((d) => (
                <tr key={d.id} className="hover:bg-surface-2">
                  <td className="px-3 py-2">
                    {d.titel}
                    {d.vertraulich ? (
                      <Icons.Lock className="ml-1.5 inline h-3 w-3 text-warn" strokeWidth={1.8} />
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-fg-subtle">{d.art}</td>
                  <td className="px-3 py-2 font-mono text-2xs text-fg-subtle">{d.aktenplan}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDate(d.erstelltAm)}</td>
                  <td className="px-3 py-2 tabular-nums text-fg-subtle">
                    {d.aufbewahrungBis ? formatDate(d.aufbewahrungBis) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Karte>
      ) : null}

      {reiter === "beschluesse" ? (
        <Karte>
          <KartenKopf
            titel="Beschluss-Sammlung"
            hinweis="fortlaufend, mit Anfechtungsfrist und Umsetzungsstand"
          />
          <ul className="divide-y divide-line">
            {akte.beschluesse.map((b) => (
              <li key={b.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Merkmal>
                    {b.datum.slice(0, 4)}-{String(b.laufendeNr).padStart(2, "0")}
                  </Merkmal>
                  <span className="text-xs font-medium text-fg">{b.gegenstand}</span>
                  <Plakette ton={b.ergebnis === "angenommen" ? "ok" : "danger"}>
                    {b.ergebnis}
                  </Plakette>
                  {b.umlaufbeschluss ? <Plakette ton="info">Umlaufbeschluss</Plakette> : null}
                  <Plakette
                    ton={
                      b.umsetzungStatus === "umgesetzt"
                        ? "ok"
                        : b.umsetzungStatus === "in_umsetzung"
                          ? "accent"
                          : "neutral"
                    }
                  >
                    {b.umsetzungStatus.replace(/_/g, " ")}
                  </Plakette>
                </div>
                <p className="mt-1.5 text-2xs leading-relaxed text-fg-muted">{b.wortlaut}</p>
                <p className="mt-1 text-2xs text-fg-subtle">
                  {b.jaStimmen} Ja · {b.neinStimmen} Nein · {b.enthaltungen} Enthaltungen ·
                  Anfechtungsfrist bis {formatDate(b.anfechtungsfristBis)}
                  {b.budgetCent ? ` · Budget ${formatCent(b.budgetCent)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Karte>
      ) : null}
    </div>
  );
}
