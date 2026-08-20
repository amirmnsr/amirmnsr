"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import type {
  Bankkonto,
  Buchung,
  Eingangsrechnung,
  Konto,
  Kontoumsatz,
  SepaMandat,
  Sollstellung,
  Zahlungsvorschlag,
} from "@/domain";
import { Balken, Etikett, Karte, KartenKopf, Leer, Merkmal, Plakette, Zeile } from "@/components/ui/display";
import { Segmente } from "@/components/ui/controls";
import { formatCent, formatDate, formatDateTime, formatIban, maskIban } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Buchhaltung
 * =============================================================================
 * Der Rechnungseingang ist das Herz: Prüfergebnis, Konfidenz der Extraktion und
 * Vorkontierung stehen direkt an der Rechnung. Was der Agent nicht sicher weiß,
 * sagt er — statt eine Zahl zu erfinden.
 */

type Reiter = "rechnungen" | "zahlungen" | "posten" | "journal" | "konten";

const PRUEF_LABEL: Record<string, string> = {
  formalOk: "Formal vollständig",
  ustAngabenOk: "Pflichtangaben §14 UStG",
  rechnerischOk: "Rechnerisch korrekt",
  sachlichOk: "Sachlich geprüft",
};

export function BuchhaltungAnsicht({
  rechnungen,
  umsaetze,
  posten,
  journal,
  konten,
  bankkonten,
  mandate,
  zahlungsvorschlaege,
  kreditorNamen,
  objektNamen,
  einheitNamen,
}: {
  rechnungen: Eingangsrechnung[];
  umsaetze: Kontoumsatz[];
  posten: Sollstellung[];
  journal: Buchung[];
  konten: Konto[];
  bankkonten: Bankkonto[];
  mandate: SepaMandat[];
  zahlungsvorschlaege: Zahlungsvorschlag[];
  kreditorNamen: Record<string, string>;
  objektNamen: Record<string, string>;
  einheitNamen: Record<string, string>;
}) {
  const [reiter, setReiter] = useState<Reiter>("rechnungen");
  const [gewaehlt, setGewaehlt] = useState<string>(rechnungen[0]?.id ?? "");
  const aktuell = rechnungen.find((r) => r.id === gewaehlt) ?? rechnungen[0];

  return (
    <div className="space-y-4">
      <Segmente<Reiter>
        wert={reiter}
        aendern={setReiter}
        optionen={[
          { wert: "rechnungen", label: "Rechnungseingang", anzahl: rechnungen.length },
          { wert: "zahlungen", label: "Zahlungsverkehr", anzahl: umsaetze.length },
          { wert: "posten", label: "Offene Posten", anzahl: posten.length },
          { wert: "journal", label: "Journal", anzahl: journal.length },
          { wert: "konten", label: "Kontenrahmen", anzahl: konten.length },
        ]}
      />

      {reiter === "rechnungen" ? (
        <div className="grid gap-3 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <Karte className="divide-y divide-line overflow-hidden">
            {rechnungen.map((r) => (
              <button
                key={r.id}
                onClick={() => setGewaehlt(r.id)}
                className={cn(
                  "flex w-full flex-col gap-1 px-3.5 py-2.5 text-left transition-colors",
                  aktuell?.id === r.id ? "bg-accent-wash" : "hover:bg-surface-2",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {r.kreditorNameRoh}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {formatCent(r.bruttoCent)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Merkmal>{r.rechnungsNr}</Merkmal>
                  <Plakette
                    ton={
                      r.status === "bezahlt" || r.status === "freigegeben"
                        ? "ok"
                        : r.status === "reklamation" || r.status === "abgelehnt"
                          ? "danger"
                          : "accent"
                    }
                  >
                    {r.status.replace(/_/g, " ")}
                  </Plakette>
                  {r.pruefung.ibanAbweichung ? (
                    <Plakette ton="danger" punkt>
                      IBAN
                    </Plakette>
                  ) : null}
                  {r.pruefung.duplikatVerdacht ? (
                    <Plakette ton="warn" punkt>
                      Dublette
                    </Plakette>
                  ) : null}
                </div>
              </button>
            ))}
          </Karte>

          {aktuell ? (
            <div className="space-y-3">
              <Karte>
                <KartenKopf
                  titel={`${aktuell.kreditorNameRoh} · ${aktuell.rechnungsNr}`}
                  hinweis={`Eingang ${formatDateTime(aktuell.eingangAm)} · Format ${aktuell.format} · Extraktion ${Math.round(aktuell.extraktionsKonfidenz * 100)} %`}
                  aktion={
                    <Plakette
                      ton={
                        aktuell.format === "zugferd" || aktuell.format === "xrechnung"
                          ? "ok"
                          : "warn"
                      }
                    >
                      {aktuell.format === "zugferd"
                        ? "ZUGFeRD strukturiert"
                        : aktuell.format === "xrechnung"
                          ? "XRechnung strukturiert"
                          : "aus Bild gelesen"}
                    </Plakette>
                  }
                />
                <div className="grid gap-x-6 px-4 py-3 sm:grid-cols-2">
                  <div>
                    <Zeile label="Netto">{formatCent(aktuell.nettoCent)}</Zeile>
                    <Zeile label={`Umsatzsteuer ${aktuell.ustSatz} %`}>
                      {formatCent(aktuell.ustCent)}
                    </Zeile>
                    <Zeile label="Brutto">{formatCent(aktuell.bruttoCent)}</Zeile>
                    <Zeile label="Rechnungsdatum">{formatDate(aktuell.rechnungsdatum)}</Zeile>
                    <Zeile label="Fällig">{formatDate(aktuell.faelligAm)}</Zeile>
                    {aktuell.skontoBis ? (
                      <Zeile label={`Skonto ${aktuell.skontoProzent} %`}>
                        bis {formatDate(aktuell.skontoBis)}
                      </Zeile>
                    ) : null}
                  </div>
                  <div>
                    <Zeile label="Objekt">
                      {aktuell.objektId ? objektNamen[aktuell.objektId] : "nicht zugeordnet"}
                    </Zeile>
                    <Zeile label="Kreditor">
                      {aktuell.kreditorId ? kreditorNamen[aktuell.kreditorId] : "unbekannt"}
                    </Zeile>
                    <Zeile label="Vorkontierung">
                      {aktuell.kontoVorschlag ?? "—"}
                      {aktuell.kontoVorschlag
                        ? ` ${konten.find((k) => k.nummer === aktuell.kontoVorschlag)?.bezeichnung ?? ""}`
                        : ""}
                    </Zeile>
                    <Zeile label="Umlagefähig">
                      {aktuell.umlagefaehigVorschlag === undefined
                        ? "—"
                        : aktuell.umlagefaehigVorschlag
                          ? "ja"
                          : "nein"}
                    </Zeile>
                    <Zeile label="Zahlungsempfänger">
                      {aktuell.iban ? maskIban(aktuell.iban) : "—"}
                    </Zeile>
                    {aktuell.leistungVon ? (
                      <Zeile label="Leistungszeitraum">
                        {formatDate(aktuell.leistungVon)}
                        {aktuell.leistungBis ? ` – ${formatDate(aktuell.leistungBis)}` : ""}
                      </Zeile>
                    ) : null}
                  </div>
                </div>
              </Karte>

              <Karte>
                <KartenKopf titel="Prüfergebnis" hinweis="maschinell, mit Begründung je Punkt" />
                <div className="grid gap-2 px-4 py-3 sm:grid-cols-2">
                  {(["formalOk", "ustAngabenOk", "rechnerischOk", "sachlichOk"] as const).map((k) => {
                    const wert = aktuell.pruefung[k];
                    return (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        {wert === true ? (
                          <Icons.CheckCircle2 className="h-3.5 w-3.5 text-ok" strokeWidth={1.8} />
                        ) : wert === false ? (
                          <Icons.XCircle className="h-3.5 w-3.5 text-danger" strokeWidth={1.8} />
                        ) : (
                          <Icons.CircleDot className="h-3.5 w-3.5 text-warn" strokeWidth={1.8} />
                        )}
                        <span className={wert === false ? "text-danger" : "text-fg-muted"}>
                          {PRUEF_LABEL[k]}
                          {wert === null ? " — nicht prüfbar" : ""}
                        </span>
                      </div>
                    );
                  })}
                  {aktuell.pruefung.preisAbweichungProzent !== undefined ? (
                    <div className="flex items-center gap-2 text-xs">
                      {Math.abs(aktuell.pruefung.preisAbweichungProzent) > 5 ? (
                        <Icons.TrendingUp className="h-3.5 w-3.5 text-danger" strokeWidth={1.8} />
                      ) : (
                        <Icons.CheckCircle2 className="h-3.5 w-3.5 text-ok" strokeWidth={1.8} />
                      )}
                      <span
                        className={
                          Math.abs(aktuell.pruefung.preisAbweichungProzent) > 5
                            ? "text-danger"
                            : "text-fg-muted"
                        }
                      >
                        Preisabweichung {aktuell.pruefung.preisAbweichungProzent > 0 ? "+" : ""}
                        {aktuell.pruefung.preisAbweichungProzent} % gegenüber Vertrag
                      </span>
                    </div>
                  ) : null}
                  {aktuell.pruefung.ibanAbweichung ? (
                    <div className="flex items-center gap-2 text-xs text-danger sm:col-span-2">
                      <Icons.ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.8} />
                      IBAN weicht vom Kreditorenstamm ab — Zahlung gesperrt
                    </div>
                  ) : null}
                </div>
                {aktuell.pruefung.hinweise.length > 0 ? (
                  <ul className="space-y-1.5 border-t border-line px-4 py-3">
                    {aktuell.pruefung.hinweise.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-2xs text-fg-muted">
                        <Icons.ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-accent" strokeWidth={2} />
                        {h}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Karte>
            </div>
          ) : null}
        </div>
      ) : null}

      {reiter === "zahlungen" ? (
        <div className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            {bankkonten.slice(0, 4).map((k) => (
              <Karte key={k.id} className="p-4">
                <Etikett>{k.bezeichnung}</Etikett>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatCent(k.saldoCent)}</p>
                <p className="mt-0.5 font-mono text-[10px] text-fg-subtle">{formatIban(k.iban)}</p>
                <Plakette className="mt-2" ton={k.art === "treuhand" ? "info" : "neutral"}>
                  {k.art}
                </Plakette>
              </Karte>
            ))}
          </div>

          {zahlungsvorschlaege.map((z) => (
            <Karte key={z.id}>
              <KartenKopf
                titel={`Zahllauf ${z.id.toUpperCase()}`}
                hinweis={`Ausführung ${formatDate(z.ausfuehrungAm)} · ${z.rechnungIds.length} Rechnungen · Skonto ${formatCent(z.skontoErsparnisCent)}`}
                aktion={
                  <Plakette ton={z.zweiteFreigabeErforderlich ? "warn" : "accent"} punkt>
                    {z.zweiteFreigabeErforderlich ? "zweite Freigabe nötig" : "einfache Freigabe"}
                  </Plakette>
                }
              />
              <div className="px-4 py-3">
                <Zeile label="Summe">{formatCent(z.summeCent)}</Zeile>
                <p className="mt-2 text-2xs text-fg-subtle">
                  Zahlungen werden nie autonom angewiesen. Die Freigabe erfolgt über die
                  Entscheidungs-Queue und ist im Nachweis einem Menschen zugeordnet.
                </p>
              </div>
            </Karte>
          ))}

          <Karte className="overflow-x-auto">
            <KartenKopf
              titel="Kontoumsätze"
              hinweis="automatische Zuordnung mit Regel und Konfidenz — ab 90 % wird gebucht, darunter vorgelegt"
            />
            <table className="w-full min-w-[64rem] text-xs">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Datum", "Gegenkonto", "Verwendungszweck", "Betrag", "Zuordnung", "Konfidenz", "Begründung"].map(
                    (h) => (
                      <th key={h} className="label-caps px-3 py-2">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {umsaetze.map((u) => (
                  <tr key={u.id} className="align-top hover:bg-surface-2">
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      {formatDate(u.buchungstag)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="block">{u.gegenkontoName}</span>
                      {u.gegenkontoIban ? (
                        <span className="block font-mono text-[10px] text-fg-subtle">
                          {maskIban(u.gegenkontoIban)}
                        </span>
                      ) : null}
                    </td>
                    <td className="max-w-[16rem] px-3 py-2 text-fg-muted">{u.verwendungszweck}</td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right tabular-nums whitespace-nowrap",
                        u.betragCent < 0 ? "text-danger" : "text-ok",
                      )}
                    >
                      {formatCent(u.betragCent)}
                    </td>
                    <td className="px-3 py-2">
                      <Plakette
                        ton={
                          u.zuordnung === "zugeordnet"
                            ? "ok"
                            : u.zuordnung === "vorgeschlagen"
                              ? "accent"
                              : u.zuordnung === "rueckbuchung"
                                ? "warn"
                                : "danger"
                        }
                      >
                        {u.zuordnung}
                      </Plakette>
                    </td>
                    <td className="w-24 px-3 py-2">
                      {u.matchKonfidenz !== undefined ? (
                        <>
                          <Balken
                            anteil={u.matchKonfidenz}
                            ton={u.matchKonfidenz >= 0.9 ? "ok" : u.matchKonfidenz >= 0.7 ? "warn" : "danger"}
                          />
                          <span className="mt-1 block text-[10px] tabular-nums text-fg-subtle">
                            {Math.round(u.matchKonfidenz * 100)} %
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-[22rem] px-3 py-2 text-2xs text-fg-subtle">
                      {u.matchBegruendung}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Karte>

          <Karte>
            <KartenKopf
              titel="SEPA-Mandate"
              hinweis={`${mandate.filter((m) => m.aktiv).length} aktiv von ${mandate.length} · ein Core-Mandat verfällt 36 Monate nach der letzten Nutzung`}
            />
            <div className="px-4 py-3">
              {mandate.filter((m) => !m.aktiv).length > 0 ? (
                <ul className="space-y-1.5">
                  {mandate
                    .filter((m) => !m.aktiv)
                    .map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-xs">
                        <Icons.AlertTriangle className="h-3.5 w-3.5 text-warn" strokeWidth={1.8} />
                        <span className="font-mono text-2xs">{m.mandatsreferenz}</span>
                        <span className="text-fg-subtle">
                          ungültig — Einzug scheitert, Selbstzahlung anfordern
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-xs text-fg-subtle">Alle Mandate gültig.</p>
              )}
            </div>
          </Karte>
        </div>
      ) : null}

      {reiter === "posten" ? (
        <Karte className="overflow-x-auto">
          <KartenKopf
            titel="Offene Posten"
            hinweis="nach Fälligkeit — Grundlage für Mahnstufen und die Kündigungsschwelle nach §543 BGB"
          />
          {posten.length === 0 ? (
            <Leer titel="Keine offenen Posten" />
          ) : (
            <table className="w-full min-w-[52rem] text-xs">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Fällig", "Objekt", "Einheit", "Periode", "Art", "Soll", "Bezahlt", "Offen", "Mahnstufe"].map(
                    (h) => (
                      <th key={h} className="label-caps px-3 py-2">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {posten.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2">
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      {formatDate(p.faelligAm)}
                    </td>
                    <td className="px-3 py-2 text-fg-subtle">{objektNamen[p.objektId]}</td>
                    <td className="px-3 py-2">{einheitNamen[p.einheitId] ?? p.einheitId}</td>
                    <td className="px-3 py-2 font-mono text-2xs">{p.periode}</td>
                    <td className="px-3 py-2 text-fg-subtle">{p.art.replace(/_/g, " ")}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCent(p.betragCent)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-fg-subtle">
                      {formatCent(p.bezahltCent)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-warn">
                      {formatCent(p.betragCent - p.bezahltCent)}
                    </td>
                    <td className="px-3 py-2">
                      {p.mahnstufe > 0 ? (
                        <Plakette ton={p.mahnstufe >= 2 ? "danger" : "warn"}>
                          Stufe {p.mahnstufe}
                        </Plakette>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Karte>
      ) : null}

      {reiter === "journal" ? (
        <Karte className="overflow-x-auto">
          <KartenKopf
            titel="Journal"
            hinweis="lückenlos, festgeschriebene Buchungen sind unveränderbar — Korrektur nur per Storno (GoBD)"
          />
          <table className="w-full min-w-[60rem] text-xs">
            <thead>
              <tr className="border-b border-line text-left">
                {["Nr.", "Datum", "Beleg", "Soll", "Haben", "Betrag", "USt", "Text", "Erfasst von"].map(
                  (h) => (
                    <th key={h} className="label-caps px-3 py-2">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {journal.map((b) => (
                <tr key={b.id} className="hover:bg-surface-2">
                  <td className="px-3 py-2 font-mono text-2xs">{b.journalNr}</td>
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap">{formatDate(b.datum)}</td>
                  <td className="px-3 py-2 font-mono text-2xs">{b.belegNr}</td>
                  <td className="px-3 py-2 font-mono text-2xs">{b.sollKonto}</td>
                  <td className="px-3 py-2 font-mono text-2xs">{b.habenKonto}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatCent(b.betragCent)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-fg-subtle">
                    {b.ustSatz} %
                  </td>
                  <td className="max-w-[20rem] px-3 py-2 text-fg-muted">{b.text}</td>
                  <td className="px-3 py-2">
                    <Plakette ton={b.erfasstVon === "agent" ? "agent" : "neutral"}>
                      {b.erfasstVon === "agent" ? (b.agentId ?? "Agent") : b.erfasstVon}
                    </Plakette>
                    {b.festgeschrieben ? (
                      <Icons.Lock className="ml-1.5 inline h-3 w-3 text-fg-subtle" strokeWidth={1.8} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Karte>
      ) : null}

      {reiter === "konten" ? (
        <Karte className="overflow-x-auto">
          <KartenKopf
            titel="Kontenrahmen"
            hinweis="Umlagefähigkeit und BetrKV-Fundstelle hängen am Konto — dadurch ist jede Umlage begründbar"
          />
          <table className="w-full min-w-[52rem] text-xs">
            <thead>
              <tr className="border-b border-line text-left">
                {["Konto", "Bezeichnung", "Art", "Umlagefähig", "Schlüssel", "BetrKV", "§35a"].map((h) => (
                  <th key={h} className="label-caps px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {konten.map((k) => (
                <tr key={k.nummer} className="hover:bg-surface-2">
                  <td className="px-3 py-2 font-mono text-2xs">{k.nummer}</td>
                  <td className="px-3 py-2">{k.bezeichnung}</td>
                  <td className="px-3 py-2 text-fg-subtle">{k.art}</td>
                  <td className="px-3 py-2">
                    {k.umlagefaehig === undefined ? (
                      "—"
                    ) : k.umlagefaehig ? (
                      <Plakette ton="ok">ja</Plakette>
                    ) : (
                      <Plakette ton="neutral">nein</Plakette>
                    )}
                  </td>
                  <td className="px-3 py-2 text-fg-subtle">
                    {k.standardSchluessel?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-2xs text-fg-subtle">{k.betrkv ?? "—"}</td>
                  <td className="px-3 py-2 text-fg-subtle">{k.paragraf35a ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Karte>
      ) : null}
    </div>
  );
}
