"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { useImmos } from "@/state/immos-store";
import { useSprache } from "@/hooks/use-sprache";
import { Karte, Etikett } from "@/components/ui/display";
import { Knopf } from "@/components/ui/controls";
import { gsap, reduziertBewegung, useGSAP } from "@/components/motion/gsap";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Assistent
 * =============================================================================
 * Chat mit Zustimmen/Ablehnen statt Formular. Die Antworten im Prototyp sind
 * regelbasiert und ausdrücklich als solche gekennzeichnet — ein Demo, das ein
 * Sprachmodell vortäuscht, ist im Vertrieb ein Bumerang.
 *
 * Der Orb links zeigt den Systemzustand: ruhig, hört zu, spricht, arbeitet.
 */

export function Assistent({
  vorschlaege,
  sprachbefehle,
}: {
  vorschlaege: { id: string; titel: string }[];
  sprachbefehle: { satz: string; aktion: string }[];
}) {
  const { chat, sendeChat, tonAus } = useImmos();
  const [eingabe, setEingabe] = useState("");
  const liste = useRef<HTMLDivElement>(null);
  const sprache = useSprache({
    tonAus,
    aufBefehl: (text) => sendeChat(text, true),
  });

  const letzte = chat.at(-1);

  useEffect(() => {
    liste.current?.scrollTo({ top: liste.current.scrollHeight, behavior: "smooth" });
  }, [chat.length]);

  // Antwort vorlesen, wenn per Sprache gefragt wurde und der Ton an ist.
  useEffect(() => {
    if (!letzte || letzte.rolle !== "immos" || tonAus) return;
    const vorherige = chat[chat.length - 2];
    if (vorherige?.perSprache) sprache.sprechen(letzte.text);
  }, [letzte, chat, tonAus, sprache]);

  const absenden = () => {
    const text = eingabe.trim();
    if (!text) return;
    sendeChat(text);
    setEingabe("");
  };

  return (
    <Karte className="flex min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Orb hoert={sprache.hoert} spricht={sprache.spricht} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-tight">Assistent</p>
          <p className="text-2xs text-fg-subtle">
            {sprache.hoert
              ? "hört zu …"
              : sprache.spricht
                ? "spricht"
                : "regelbasierte Demo-Antworten, kein Modellaufruf"}
          </p>
        </div>
        <button
          onClick={() => (sprache.hoert ? sprache.stoppen() : sprache.starten())}
          aria-label="Diktat"
          className={cn(
            "rounded-lg border p-1.5 transition-colors",
            sprache.hoert
              ? "border-accent-line bg-accent-wash text-accent"
              : "border-line text-fg-subtle hover:text-fg",
          )}
        >
          <Icons.Mic className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>

      <div ref={liste} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {chat.map((n) => (
          <div key={n.id} className={cn("flex", n.rolle === "nutzer" && "justify-end")}>
            <div
              className={cn(
                "max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed",
                n.rolle === "nutzer"
                  ? "bg-accent-wash text-fg"
                  : "border border-line bg-surface-2 text-fg-muted",
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="label-caps">
                  {n.rolle === "nutzer" ? "Du" : "ImmOS"}
                </span>
                <span className="text-[10px] text-fg-subtle">{formatTime(n.am)}</span>
                {n.perSprache ? (
                  <Icons.Mic className="h-3 w-3 text-accent" strokeWidth={1.8} />
                ) : null}
              </div>
              <p className="whitespace-pre-wrap">{n.text}</p>
              {n.belege?.length ? (
                <ul className="mt-2 space-y-1 border-l-2 border-line-strong pl-2.5">
                  {n.belege.map((b, i) => (
                    <li key={i} className="text-2xs text-fg-subtle italic">
                      {b.zitat}
                    </li>
                  ))}
                </ul>
              ) : null}
              {n.vorschlagIds?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {n.vorschlagIds.map((id) => {
                    const v = vorschlaege.find((x) => x.id === id);
                    if (!v) return null;
                    return (
                      <a
                        key={id}
                        href={`/entscheidungen#${id}`}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent-line bg-accent-wash px-2 py-0.5 text-2xs text-accent hover:bg-accent/15"
                      >
                        <Icons.ArrowRight className="h-3 w-3 shrink-0" strokeWidth={2} />
                        <span className="truncate">{v.titel}</span>
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-4 py-2">
        <Etikett className="mb-1.5">Beispiele</Etikett>
        <div className="flex flex-wrap gap-1.5">
          {sprachbefehle.slice(0, 4).map((b) => (
            <button
              key={b.satz}
              onClick={() => sendeChat(b.satz)}
              className="rounded-full border border-line px-2 py-0.5 text-2xs text-fg-subtle transition-colors hover:border-accent-line hover:text-accent"
            >
              {b.satz}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
        <input
          value={eingabe}
          onChange={(e) => setEingabe(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              absenden();
            }
          }}
          placeholder="Frage stellen oder Anweisung diktieren …"
          className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs outline-none focus:border-accent-line"
        />
        <Knopf variante="primaer" klein onClick={absenden} aria-label="Senden">
          <Icons.ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Knopf>
      </div>
      {sprache.verfuegbar ? null : (
        <p className="border-t border-line px-4 py-2 text-2xs text-fg-subtle">
          Spracherkennung ist in diesem Browser nicht verfügbar. Texteingabe funktioniert
          unabhängig davon.
        </p>
      )}
    </Karte>
  );
}

/** Zustandsanzeige: ruhig atmend, bei Sprache reaktiv. */
function Orb({ hoert, spricht }: { hoert: boolean; spricht: boolean }) {
  const wurzel = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduziertBewegung()) return;
      gsap.killTweensOf("[data-orb-ring]");
      if (hoert || spricht) {
        gsap.to("[data-orb-ring]", {
          scale: 1.35,
          opacity: 0.15,
          duration: 0.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.12,
        });
      } else {
        gsap.to("[data-orb-ring]", {
          scale: 1.1,
          opacity: 0.35,
          duration: 2.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    },
    { scope: wurzel, dependencies: [hoert, spricht] },
  );

  return (
    <div ref={wurzel} className="relative flex h-8 w-8 items-center justify-center">
      <span
        data-orb-ring
        className={cn(
          "absolute inset-0 rounded-full border",
          hoert ? "border-accent" : spricht ? "border-info" : "border-line-strong",
        )}
      />
      <span
        data-orb-ring
        className={cn(
          "absolute inset-1.5 rounded-full border",
          hoert ? "border-accent" : spricht ? "border-info" : "border-line-strong",
        )}
      />
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          hoert ? "bg-accent" : spricht ? "bg-info" : "bg-accent/70",
        )}
      />
    </div>
  );
}
