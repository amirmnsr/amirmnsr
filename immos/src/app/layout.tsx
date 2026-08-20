import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "ImmOS — Betriebssystem für Immobilienverwaltungen",
    template: "%s · ImmOS",
  },
  description:
    "ImmOS führt die Betriebsabläufe einer Immobilienverwaltung digital: Posteingang, Vorgänge, Buchhaltung, Abrechnung und Betreiberpflichten. Agenten schlagen vor, der Verwalter entscheidet.",
  applicationName: "ImmOS",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#05070b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" data-theme="light" className={`${sans.variable} ${mono.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
