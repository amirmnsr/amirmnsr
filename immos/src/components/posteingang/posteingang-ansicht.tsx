"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import type { Nachricht, Postfach } from "@/domain";
import { Etikett, Karte, Merkmal, Plakette } from "@/components/ui/display";
import { Knopf, Segmente } from "@/components/ui/controls";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Posteingang
 * =============================================================================
 * Drei Spalten: Postfächer je Objekt, Eingänge, Detail mit Sicherheitsbefund.
 *
 * Der Sicherheitsblock ist keine Zierde. Der teuerste Angriff auf eine
 * Verwaltung ist die gefälschte Rechnung mit geänderter Bankverbindung, der
 * zweitteuerste eine Mail, die dem Assistenten Anweisungen gibt. Beides muss
 * man auf einen Blick sehen.
 */

const ZWECK_LABEL: Record<Postfach["zweck"], string> = {
  rechnung: "Rechnungen",
  schaden: "Schäden",
  allgemein: "Allgemein",
  versammlung: "Versammlung",
  kuendigung: "Kündigungen",
  zaehler: "Zählerdaten",
};

const ZWECK_ICON: Record<Postfach["zweck"], string> = {
  rechnung: "Euro",
  schaden: "Wrench",
  allgemein: "Mail",
  versammlung: "Gavel",
  kuendigung: "FileText",
  zaehler: "Activity",
};

function Symbol({ name, className }: { name: string; className?: string }) {
  const K = (Icons as unknown as Record<string, Icons.LucideIcon>)[name];
  return K ? <K className={className} strokeWidth={1.6} /> : null;
}

type Ansicht = "alle" | "ungelesen" | "sicherheit" | "rechnungen";

export function PosteingangAnsicht({
  nachrichten,
  postfaecher,
  objektNamen,
  vorschlagZuNachricht,
  jetzt,
}: {
  nachrichten: Nachricht[];
  postfaecher: Postfach[];
  objektNamen: Record<string, string>;
  vorschlagZuNachricht: Record<string, string>;
  jetzt: string;
}) {
  const [postfachFilter, setPostfachFilter] = useState<string | null>(null);
  const [ansicht, setAnsicht] = useState<Ansicht>("alle");
  const [gewaehlt, setGewaehlt] = useState<string>(
    // Standardauswahl ist immer ein Eingang, nicht die letzte gesendete Antwort.
    nachrichten.find((n) => n.richtung === "eingang")?.id ?? "",
  );

  const liste = useMemo(() => {
    let ergebnis = nachrichten.filter((n) => n.richtung === "eingang");
    if (postfachFilter) ergebnis = ergebnis.filter((n) => n.postfachId === postfachFilter);
    if (ansicht === "ungelesen") ergebnis = ergebnis.filter((n) => !n.gelesen);
    if (ansicht === "sicherheit")
      ergebnis = ergebnis.filter(
        (n) => n.sicherheit.promptInjektionVerdacht || !n.sicherheit.dmarcOk,
      );
    if (ansicht === "rechnungen")
      ergebnis = ergebnis.filter((n) => n.intent?.includes("rechnung") || n.postfachId?.includes("rechnung"));
    return ergebnis;
  }, [nachrichten, postfachFilter, ansicht]);

  const aktuell = nachrichten.find((n) => n.id === gewaehlt) ?? liste[0];
  const thread = aktuell
    ? nachrichten.filter((n) => n.threadId === aktuell.threadId).sort((a, b) => a.eingangAm.localeCompare(b.eingangAm))
    : [];

  const objektPostfaecher = postfaecher.filter((p) => p.objektId);
  const zentral = postfaecher.filter((p) => !p.objektId);

  return (
    <div className="grid min-h-0 gap-3 xl:grid-cols-[15rem_minmax(0,22rem)_minmax(0,1fr)]">
      <aside className="space-y-3">
        <Karte className="p-3">
          <Etikett className="mb-2">Zentrale Adressen</Etikett>
          <ul className="space-y-0.5">
            {zentral.map((p) => (
              <PostfachZeile
                key={p.id}
                postfach={p}
                aktiv={postfachFilter === p.id}
                waehlen={() => setPostfachFilter(postfachFilter === p.id ? null : p.id)}
              />
            ))}
          </ul>
        </Karte>
        <Karte className="p-3">
          <Etikett className="mb-2">Adressen je Objekt</Etikett>
          <p className="mb-2 text-2xs leading-relaxed text-fg-subtle">
            Jedes Objekt hat eigene Adressen. Der Eingang ist damit ohne Zutun zugeordnet — und
            Handwerker, Versorger und Mieter brauchen nie wieder eine Objektnummer im Betreff.
          </p>
          <ul className="max-h-[28rem] space-y-0.5 overflow-y-auto">
            {objektPostfaecher.map((p) => (
              <PostfachZeile
                key={p.id}
                postfach={p}
                objektName={p.objektId ? objektNamen[p.objektId] : undefined}
                aktiv={postfachFilter === p.id}
                waehlen={() => setPostfachFilter(postfachFilter === p.id ? null : p.id)}
              />
            ))}
          </ul>
        </Karte>
      </aside>

      <div className="min-w-0 space-y-2">
        <Segmente<Ansicht>
          wert={ansicht}
          aendern={setAnsicht}
          optionen={[
            { wert: "alle", label: "Alle" },
            { wert: "ungelesen", label: "Neu" },
            { wert: "rechnungen", label: "Belege" },
            { wert: "sicherheit", label: "Auffällig" },
          ]}
        />
        <Karte className="divide-y divide-line overflow-hidden">
          {liste.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-fg-subtle">Kein Eingang in dieser Auswahl</p>
          ) : (
            liste.map((n) => (
              <button
                key={n.id}
                onClick={() => setGewaehlt(n.id)}
                className={cn(
                  "flex w-full flex-col gap-1 px-3.5 py-2.5 text-left transition-colors",
                  aktuell?.id === n.id ? "bg-accent-wash" : "hover:bg-surface-2",
                )}
              >
                <div className="flex items-center gap-2">
                  {!n.gelesen ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-fg">
                    {n.absenderName}
                  </span>
                  <span className="text-2xs text-fg-subtle">{formatRelative(n.eingangAm, jetzt)}</span>
                </div>
                <span className="truncate text-2xs text-fg-muted">{n.betreff}</span>
                <div className="flex flex-wrap items-center gap-1">
                  {n.sicherheit.promptInjektionVerdacht ? (
                    <Plakette ton="danger" punkt>
                      Manipulationsversuch
                    </Plakette>
                  ) : null}
                  {!n.sicherheit.dmarcOk && !n.sicherheit.promptInjektionVerdacht ? (
                    <Plakette ton="warn">DMARC fehlt</Plakette>
                  ) : null}
                  {n.intent ? <Merkmal>{n.intent}</Merkmal> : null}
                  {n.anhaenge.length > 0 ? (
                    <span className="flex items-center gap-0.5 text-2xs text-fg-subtle">
                      <Icons.Paperclip className="h-3 w-3" strokeWidth={1.8} />
                      {n.anhaenge.length}
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </Karte>
      </div>

      {aktuell ? (
        <div className="min-w-0 space-y-3">
          <Karte>
            <div className="border-b border-line px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Plakette ton={aktuell.kanal === "telefon" ? "info" : "neutral"}>
                  {aktuell.kanal}
                </Plakette>
                {aktuell.objektId ? <Merkmal>{objektNamen[aktuell.objektId]}</Merkmal> : null}
                {aktuell.intentKonfidenz ? (
                  <span className="text-2xs text-fg-subtle">
                    Absicht erkannt mit {Math.round(aktuell.intentKonfidenz * 100)} %
                  </span>
                ) : null}
                {aktuell.stimmung ? <Plakette>{aktuell.stimmung}</Plakette> : null}
                <span className="ml-auto text-2xs text-fg-subtle">
                  {formatDateTime(aktuell.eingangAm)}
                </span>
              </div>
              <h2 className="mt-2 text-sm font-semibold tracking-tight">{aktuell.betreff}</h2>
              <p className="mt-0.5 text-2xs text-fg-subtle">
                {aktuell.absenderName} &lt;{aktuell.absender}&gt; an {aktuell.empfaenger.join(", ")}
              </p>
            </div>

            <SicherheitsBlock nachricht={aktuell} />

            <div className="space-y-3 px-4 py-3">
              {thread.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-lg border px-3 py-2.5",
                    n.richtung === "ausgang"
                      ? "border-accent-line bg-accent-wash/40"
                      : "border-line bg-surface-2",
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <Plakette ton={n.richtung === "ausgang" ? "accent" : "neutral"}>
                      {n.richtung === "ausgang" ? "gesendet von ImmOS" : n.absenderName}
                    </Plakette>
                    <span className="text-2xs text-fg-subtle">
                      {formatRelative(n.eingangAm, jetzt)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-fg-muted">
                    {n.body}
                  </p>
                </div>
              ))}
            </div>

            {aktuell.anhaenge.length > 0 ? (
              <div className="border-t border-line px-4 py-3">
                <Etikett className="mb-2">Anhänge</Etikett>
                <ul className="space-y-1.5">
                  {aktuell.anhaenge.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2"
                    >
                      <Icons.FileText className="h-3.5 w-3.5 text-fg-subtle" strokeWidth={1.7} />
                      <span className="min-w-0 flex-1 truncate text-2xs text-fg">{a.name}</span>
                      {a.erkanntAls && a.erkanntAls !== "unbekannt" ? (
                        <Plakette ton={a.erkanntAls === "zugferd" || a.erkanntAls === "xrechnung" ? "ok" : "neutral"}>
                          {a.erkanntAls === "zugferd"
                            ? "ZUGFeRD gelesen"
                            : a.erkanntAls === "xrechnung"
                              ? "XRechnung gelesen"
                              : a.erkanntAls}
                        </Plakette>
                      ) : (
                        <Plakette ton="warn">nur OCR</Plakette>
                      )}
                      <Merkmal>{Math.round(a.groesseBytes / 1024)} kB</Merkmal>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
              {vorschlagZuNachricht[aktuell.id] ? (
                <Link href={`/entscheidungen#${vorschlagZuNachricht[aktuell.id]}`}>
                  <Knopf variante="primaer" klein>
                    <Icons.Bot className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Vorschlag ansehen
                  </Knopf>
                </Link>
              ) : (
                <Plakette ton="neutral">kein Vorschlag offen</Plakette>
              )}
              {aktuell.vorgangId ? (
                <Link href="/aufgaben" className="text-2xs text-accent hover:underline">
                  Vorgang öffnen
                </Link>
              ) : null}
            </div>
          </Karte>
        </div>
      ) : null}
    </div>
  );
}

function PostfachZeile({
  postfach,
  objektName,
  aktiv,
  waehlen,
}: {
  postfach: Postfach;
  objektName?: string;
  aktiv: boolean;
  waehlen: () => void;
}) {
  return (
    <li>
      <button
        onClick={waehlen}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
          aktiv ? "bg-accent-wash text-accent" : "hover:bg-surface-2",
        )}
      >
        <Symbol name={ZWECK_ICON[postfach.zweck]} className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-2xs font-medium">
            {objektName ? objektName.split(" · ")[0] + " " : ""}
            {ZWECK_LABEL[postfach.zweck]}
          </span>
          <span className="block truncate font-mono text-[10px] text-fg-subtle">
            {postfach.adresse}
          </span>
        </span>
        <span className="text-[10px] tabular-nums text-fg-subtle">{postfach.eingaengeMonat}</span>
      </button>
    </li>
  );
}

function SicherheitsBlock({ nachricht }: { nachricht: Nachricht }) {
  const s = nachricht.sicherheit;
  const kritisch = s.promptInjektionVerdacht || (!s.dmarcOk && !s.absenderBekannt);

  return (
    <div
      className={cn(
        "border-b px-4 py-3",
        kritisch ? "border-danger/40 bg-danger-wash" : "border-line bg-surface-2/60",
      )}
    >
      <div className="flex items-center gap-2">
        {kritisch ? (
          <Icons.ShieldAlert className="h-4 w-4 text-danger" strokeWidth={1.8} />
        ) : (
          <Icons.ShieldCheck className="h-4 w-4 text-ok" strokeWidth={1.8} />
        )}
        <span className={cn("text-xs font-semibold", kritisch ? "text-danger" : "text-fg")}>
          {kritisch ? "Eingang als gefährlich eingestuft" : "Eingang unauffällig"}
        </span>
        <div className="ml-auto flex gap-1.5">
          <Plakette ton={s.spfOk ? "ok" : "danger"}>SPF</Plakette>
          <Plakette ton={s.dkimOk ? "ok" : "danger"}>DKIM</Plakette>
          <Plakette ton={s.dmarcOk ? "ok" : "danger"}>DMARC</Plakette>
        </div>
      </div>
      {s.promptInjektionVerdacht ? (
        <p className="mt-2 text-2xs leading-relaxed text-danger">
          Der Text enthält Anweisungen an das verarbeitende System. ImmOS behandelt Inhalte aus
          Nachrichten grundsätzlich als Daten, nie als Befehl: Es wurden keine Stammdaten geändert,
          keine Zahlung erzeugt und kein Auftrag erteilt. Der Vorgang liegt zur Entscheidung vor.
        </p>
      ) : null}
      {!s.absenderBekannt ? (
        <p className="mt-1.5 text-2xs text-warn">
          Absender ist im Stammdatensatz nicht hinterlegt.
        </p>
      ) : null}
    </div>
  );
}
