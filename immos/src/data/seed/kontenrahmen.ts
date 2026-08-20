/**
 * Kontenrahmen (Auszug, immobilienspezifisch)
 * =============================================================================
 * Die Umlagefähigkeit hängt am Konto, nicht am Buchungstext. Damit ist jede
 * Betriebskostenabrechnung aus der Buchhaltung heraus begründbar: Konto →
 * BetrKV-Fundstelle → Umlageschlüssel. Das ist der Grund, warum ein Agent
 * überhaupt sinnvoll vorkontieren kann.
 */

import type { Konto } from "@/domain";

export const kontenrahmen: Konto[] = [
  // Erträge
  { nummer: "8100", bezeichnung: "Mieterträge Wohnen", art: "ertrag" },
  { nummer: "8110", bezeichnung: "Mieterträge Gewerbe (19 % USt)", art: "ertrag" },
  { nummer: "8120", bezeichnung: "Erträge Stellplätze", art: "ertrag" },
  { nummer: "8200", bezeichnung: "Vorauszahlungen Betriebskosten", art: "ertrag" },
  { nummer: "8210", bezeichnung: "Vorauszahlungen Heizkosten", art: "ertrag" },
  { nummer: "8300", bezeichnung: "Hausgeld-Vorschüsse (WEG)", art: "ertrag" },
  { nummer: "8310", bezeichnung: "Zuführung Erhaltungsrücklage", art: "ruecklage" },

  // Umlagefähige Betriebskosten (BetrKV §2)
  { nummer: "4200", bezeichnung: "Grundsteuer", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 1", paragraf35a: null },
  { nummer: "4210", bezeichnung: "Wasserversorgung", art: "aufwand", umlagefaehig: true, standardSchluessel: "verbrauch_wasser", betrkv: "§2 Nr. 2", paragraf35a: null },
  { nummer: "4215", bezeichnung: "Entwässerung", art: "aufwand", umlagefaehig: true, standardSchluessel: "verbrauch_wasser", betrkv: "§2 Nr. 3", paragraf35a: null },
  { nummer: "4300", bezeichnung: "Heizung und Warmwasser", art: "aufwand", umlagefaehig: true, standardSchluessel: "verbrauch_waerme", betrkv: "§2 Nr. 4", paragraf35a: null },
  { nummer: "4310", bezeichnung: "Betriebsstrom Heizung", art: "aufwand", umlagefaehig: true, standardSchluessel: "verbrauch_waerme", betrkv: "§2 Nr. 4a", paragraf35a: null },
  { nummer: "4320", bezeichnung: "Wartung Heizung", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 4a", paragraf35a: "handwerker" },
  { nummer: "4330", bezeichnung: "Schornsteinfeger / Emissionsmessung", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 12", paragraf35a: "handwerker" },
  { nummer: "4400", bezeichnung: "Aufzug (Betrieb und Wartung)", art: "aufwand", umlagefaehig: true, standardSchluessel: "einheiten", betrkv: "§2 Nr. 7", paragraf35a: "handwerker" },
  { nummer: "4420", bezeichnung: "Straßenreinigung", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 8", paragraf35a: null },
  { nummer: "4430", bezeichnung: "Müllbeseitigung", art: "aufwand", umlagefaehig: true, standardSchluessel: "personen", betrkv: "§2 Nr. 8", paragraf35a: null },
  { nummer: "4440", bezeichnung: "Gebäudereinigung", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 9", paragraf35a: "haushaltsnah" },
  { nummer: "4450", bezeichnung: "Gartenpflege", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 10", paragraf35a: "haushaltsnah" },
  { nummer: "4460", bezeichnung: "Allgemeinstrom", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 11", paragraf35a: null },
  { nummer: "4470", bezeichnung: "Sach- und Haftpflichtversicherung", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 13", paragraf35a: null },
  { nummer: "4480", bezeichnung: "Hausmeister", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 14", paragraf35a: "haushaltsnah" },
  { nummer: "4490", bezeichnung: "Winterdienst", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 8", paragraf35a: "haushaltsnah" },
  { nummer: "4500", bezeichnung: "Trinkwasseruntersuchung (Legionellen)", art: "aufwand", umlagefaehig: true, standardSchluessel: "wohnflaeche", betrkv: "§2 Nr. 17", paragraf35a: "handwerker" },
  { nummer: "4510", bezeichnung: "Wartung Rauchwarnmelder", art: "aufwand", umlagefaehig: true, standardSchluessel: "einheiten", betrkv: "§2 Nr. 17", paragraf35a: "handwerker" },
  { nummer: "4520", bezeichnung: "Kabelanschluss / Multimedia", art: "aufwand", umlagefaehig: true, standardSchluessel: "einheiten", betrkv: "§2 Nr. 15", paragraf35a: null },

  // Nicht umlagefähig
  { nummer: "4600", bezeichnung: "Instandhaltung und Instandsetzung", art: "aufwand", umlagefaehig: false, standardSchluessel: "nicht_umlegen" },
  { nummer: "4610", bezeichnung: "Verwaltervergütung", art: "aufwand", umlagefaehig: false, standardSchluessel: "nicht_umlegen" },
  { nummer: "4620", bezeichnung: "Rechts- und Beratungskosten", art: "aufwand", umlagefaehig: false, standardSchluessel: "nicht_umlegen" },
  { nummer: "4630", bezeichnung: "Kontoführung / Bankgebühren", art: "aufwand", umlagefaehig: false, standardSchluessel: "nicht_umlegen" },
  { nummer: "4640", bezeichnung: "Mietausfall / Leerstandskosten", art: "aufwand", umlagefaehig: false, standardSchluessel: "nicht_umlegen" },
  { nummer: "4650", bezeichnung: "CO₂-Kosten Vermieteranteil", art: "aufwand", umlagefaehig: false, standardSchluessel: "nicht_umlegen" },

  // Bestand
  { nummer: "1200", bezeichnung: "Treuhandkonto Objekt", art: "bank" },
  { nummer: "1210", bezeichnung: "Kautionskonto", art: "kaution" },
  { nummer: "1220", bezeichnung: "Rücklagenkonto", art: "ruecklage" },
  { nummer: "1400", bezeichnung: "Forderungen Mieter", art: "forderung" },
  { nummer: "1410", bezeichnung: "Forderungen Eigentümer (Hausgeld)", art: "forderung" },
  { nummer: "1600", bezeichnung: "Verbindlichkeiten Lieferanten", art: "verbindlichkeit" },
  { nummer: "1900", bezeichnung: "Abgrenzung Vorjahr", art: "abgrenzung" },
];

export const kontoMap = new Map(kontenrahmen.map((k) => [k.nummer, k]));
