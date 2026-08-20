/**
 * Seed-Basis: Bezugszeitpunkt, Zufallsquelle, Namenspools
 * =============================================================================
 * Die Demo-Welt ist vollständig deterministisch. Gleicher Build → gleiche Daten,
 * sonst wären Screenshots, Tests und Vorführungen nicht reproduzierbar.
 *
 * `JETZT` ist der Bezugszeitpunkt der Demo. Alle Fristen, Fälligkeiten und
 * "vor 12 Minuten"-Angaben rechnen dagegen — nicht gegen die Systemuhr.
 */

import { seededRandom } from "@/lib/utils";

export const JETZT = "2026-08-20T08:42:00+02:00";
export const HEUTE = "2026-08-20";
export const GESCHAEFTSJAHR = 2026;
export const ABRECHNUNGSJAHR = 2025;

export const rng = seededRandom(20260820);

export function tageVersetzt(tage: number, basis = HEUTE): string {
  const d = new Date(`${basis}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

export function stundenVersetzt(stunden: number, basis = JETZT): string {
  const d = new Date(basis);
  d.setTime(d.getTime() + stunden * 3_600_000);
  return d.toISOString();
}

export function minutenVersetzt(minuten: number, basis = JETZT): string {
  return stundenVersetzt(minuten / 60, basis);
}

export const VORNAMEN = [
  "Katharina", "Ferhat", "Miriam", "Jonas", "Aylin", "Tobias", "Svenja", "Hakan",
  "Beatrice", "Lennart", "Nadja", "Osman", "Clara", "Piotr", "Rebecca", "Younes",
  "Helga", "Dietmar", "Ingrid", "Marek", "Fatima", "Sebastian", "Annika", "Kwame",
  "Lucia", "Thorsten", "Sinem", "Mattis", "Elif", "Gregor", "Vanessa", "Halil",
  "Ute", "Robin", "Salma", "Bernd", "Josefine", "Andrej", "Melanie", "Kai",
];

export const NACHNAMEN = [
  "Böhmer", "Yilmaz", "Grabowski", "Ritter", "Öztürk", "Hoffmann", "Wenzel", "Demir",
  "Schnitzler", "Kruse", "Bauer", "Kaya", "Neumann", "Kowalski", "Voss", "El Amrani",
  "Sommer", "Lehmann", "Winkler", "Nowak", "Haddad", "Reinhardt", "Fischer", "Mensah",
  "Moretti", "Brandt", "Aydin", "Küpper", "Çelik", "Sander", "Thiele", "Arslan",
  "Peters", "Lorenz", "Bennani", "Kleinert", "Radtke", "Petrov", "Sauer", "Berger",
];

export function name(i: number): string {
  return `${VORNAMEN[i % VORNAMEN.length]} ${NACHNAMEN[(i * 7 + 3) % NACHNAMEN.length]}`;
}

export function emailVon(vollname: string, domain = "mail.example"): string {
  const [vor, nach] = vollname.split(" ");
  const normalisiert = (s: string) =>
    s
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/ç/g, "c")
      .replace(/[^a-z]/g, "");
  return `${normalisiert(vor ?? "a")}.${normalisiert(nach ?? "b")}@${domain}`;
}

/** Deterministische, formal plausible Test-IBAN (keine echten Konten). */
export function testIban(i: number): string {
  const blz = "37050198";
  const konto = String(100000000 + i * 7919).slice(0, 10);
  const pruef = String(10 + ((i * 37) % 89));
  return `DE${pruef}${blz}${konto}`;
}

export function telefon(i: number): string {
  return `0221 ${String(300000 + i * 137).slice(0, 6)}`;
}
