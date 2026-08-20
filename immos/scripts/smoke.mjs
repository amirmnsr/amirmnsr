/**
 * Interaktions-Rauchtest
 * =============================================================================
 * Prüft die Wege, die eine Vorführung nimmt: Frage im Chat stellen, dort
 * entscheiden, per Tastatur ablehnen, Befehlspalette benutzen. Bricht bei
 * Konsolenfehlern mit Exit-Code 1 ab.
 *
 * Aufruf: npm run dev, dann `node scripts/smoke.mjs`
 * Screenshots landen in AUSGABE (Standard ./.screenshots).
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const ausgabe = process.env.AUSGABE ?? "./.screenshots";
await mkdir(ausgabe, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium",
});
const seite = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const fehler = [];
seite.on("console", (m) => {
  if (m.type() === "error") fehler.push(m.text());
});
seite.on("pageerror", (e) => fehler.push(`pageerror: ${e.message}`));

const schritt = async (name, fn) => {
  await fn();
  await seite.screenshot({ path: `${ausgabe}/${name}.png` });
  console.log(`✓ ${name}`);
};

await seite.goto("http://localhost:3000/cockpit", { waitUntil: "networkidle" });
await seite.waitForTimeout(1500);

await schritt("chat-vorschlag", async () => {
  await seite.getByPlaceholder("Frage stellen oder Anweisung diktieren …").fill("Was liegt heute an?");
  await seite.keyboard.press("Enter");
  await seite.waitForTimeout(900);
});

const offeneQueue = await seite.locator("[data-karte]").count();
console.log(`Karten im Fokus: ${offeneQueue}`);

await schritt("chat-quittung", async () => {
  const knoepfe = await seite.locator("button:has-text('Zustimmen'):not([disabled])").all();
  console.log(`  freigebbare Vorschläge sichtbar: ${knoepfe.length}`);
  if (knoepfe.length > 0) {
    await knoepfe[knoepfe.length - 1].click();
    await seite.waitForTimeout(900);
  }
});

await schritt("stapel-ablehnung", async () => {
  await seite.locator("body").click({ position: { x: 5, y: 300 } });
  await seite.keyboard.press("a");
  await seite.waitForTimeout(800);
});

await schritt("palette", async () => {
  await seite.keyboard.press("Escape");
  await seite.keyboard.press("Control+k");
  await seite.waitForTimeout(400);
  await seite.keyboard.type("1042");
  await seite.waitForTimeout(500);
});

await schritt("nach-palette", async () => {
  await seite.keyboard.press("Enter");
  await seite.waitForTimeout(1800);
});
console.log(`Ziel nach Palette: ${seite.url()}`);

await browser.close();

if (fehler.length) {
  console.error(`\nKonsolenfehler:\n${[...new Set(fehler)].join("\n")}`);
  process.exit(1);
}
console.log("\nkeine Konsolenfehler");
