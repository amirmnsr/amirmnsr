"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Freihaendig } from "./freihaendig";
import { Knopf } from "@/components/ui/controls";

/** Einstieg in den freihändigen Modus — bewusst ein Knopf, kein Wake Word. */
export function FreihaendigKnopf({ agentNamen }: { agentNamen: Record<string, string> }) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <Knopf variante="sekundaer" klein onClick={() => setOffen(true)}>
        <Icons.Radio className="h-3.5 w-3.5" strokeWidth={1.8} />
        Freihändig
      </Knopf>
      {offen ? <Freihaendig schliessen={() => setOffen(false)} agentNamen={agentNamen} /> : null}
    </>
  );
}
