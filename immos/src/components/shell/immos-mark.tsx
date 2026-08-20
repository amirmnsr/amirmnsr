"use client";

import { useRef } from "react";
import { gsap, reduziertBewegung, useGSAP } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

/**
 * Bildmarke
 * =============================================================================
 * Ein Ring, der langsam rotiert, und ein Kern, der bei Systemaktivität pulst.
 * Das ist die einzige dauerhafte Animation in der App: sie zeigt, dass Agenten
 * laufen. Steht sie still, arbeitet nichts.
 */

export function ImmosMark({
  groesse = 28,
  aktiv = true,
  className,
}: {
  groesse?: number;
  aktiv?: boolean;
  className?: string;
}) {
  const wurzel = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      if (reduziertBewegung() || !aktiv) return;
      gsap.to("[data-mark-ring]", { rotate: 360, duration: 24, repeat: -1, ease: "none", transformOrigin: "50% 50%" });
      gsap.to("[data-mark-kern]", {
        scale: 1.18,
        opacity: 1,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        transformOrigin: "50% 50%",
      });
    },
    { scope: wurzel, dependencies: [aktiv] },
  );

  return (
    <svg
      ref={wurzel}
      width={groesse}
      height={groesse}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <g data-mark-ring>
        <circle cx="16" cy="16" r="13" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1" />
        <path d="M16 3v4M16 25v4M3 16h4M25 16h4" stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <circle cx="16" cy="16" r="8.5" stroke="var(--accent)" strokeOpacity="0.5" strokeWidth="1" />
      <g data-mark-kern opacity="0.85">
        <path d="M16 10.5l4.2 5.5-4.2 5.5-4.2-5.5z" fill="var(--accent)" />
      </g>
    </svg>
  );
}
