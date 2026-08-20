/**
 * Screenshot-Werkzeug für die visuelle Prüfung
 * =============================================================================
 * Aufruf:  node scripts/screenshot.mjs "/cockpit::cockpit" "/objekte::objekte"
 * Voraussetzung: `npm run dev` läuft auf Port 3000.
 * Ergebnis: PNGs im per AUSGABE gesetzten Verzeichnis (Standard: ./.screenshots).
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const ausgabe = process.env.AUSGABE ?? "./.screenshots";
const breite = Number(process.env.BREITE ?? 1600);
const hoehe = Number(process.env.HOEHE ?? 1000);
const ganzeSeite = process.env.GANZ === "1";
const thema = process.env.THEMA ?? "light";

await mkdir(ausgabe, { recursive: true });

const ziele = process.argv.slice(2);
if (ziele.length === 0) {
  console.error('Kein Ziel angegeben. Beispiel: "/cockpit::cockpit"');
  process.exit(1);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const seite = await browser.newPage({ viewport: { width: breite, height: hoehe } });

const fehler = [];
seite.on("console", (m) => {
  if (m.type() === "error") fehler.push(m.text());
});
seite.on("pageerror", (e) => fehler.push(`pageerror: ${e.message}`));

for (const ziel of ziele) {
  const [pfad, name = pfad.replace(/\W+/g, "_")] = ziel.split("::");
  await seite.goto(`http://localhost:3000${pfad}`, { waitUntil: "networkidle", timeout: 45000 });
  if (thema !== "light") {
    await seite.evaluate((t) => {
      document.documentElement.dataset.theme = t;
    }, thema);
  }
  await seite.waitForTimeout(1800);
  const datei = `${ausgabe}/${name}.png`;
  await seite.screenshot({ path: datei, fullPage: ganzeSeite });
  console.log(`${pfad} -> ${datei}`);
}

console.log(fehler.length ? `FEHLER:\n${[...new Set(fehler)].join("\n")}` : "keine Konsolenfehler");
await browser.close();
