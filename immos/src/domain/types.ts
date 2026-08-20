/**
 * Stammdaten-Modell
 * =============================================================================
 * Ein Modell für Miet-, SEV-, WEG- und Gewerbeverwaltung. Die Verwaltungsart
 * hängt am Objekt und an der Einheit, nicht am Datenbankschema — sonst müsste
 * man für Mischbestände zwei Systeme betreiben.
 *
 * Konventionen:
 *  - Geld ist immer `Cent` (Integer). Nie Float, nie String.
 *  - Zeiträume sind ISO-Datumsstrings (YYYY-MM-DD), Zeitpunkte ISO-8601.
 *  - Alles, was sich fachlich ändern kann (Miete, Fläche, Umlageschlüssel,
 *    Eigentümer), ist zeitscheibenbasiert: `gueltigVon` / `gueltigBis`.
 */

export type Cent = number;
export type IsoDate = string;
export type IsoDateTime = string;

/** Zeitscheibe. `gueltigBis === null` bedeutet "offen". */
export interface Zeitraum {
  gueltigVon: IsoDate;
  gueltigBis: IsoDate | null;
}

export type Verwaltungsart = "miete" | "sev" | "weg" | "gewerbe";

export interface Mandant {
  id: string;
  name: string;
  kurz: string;
  /** Basis-Domain für objektbezogene Adressen: rechnung@obj-1042.hvm.immos.de */
  mailDomain: string;
  sitz: string;
  einheitenGesamt: number;
  mitarbeiter: number;
  ustIdNr?: string;
}

export interface Objekt {
  id: string;
  /** Sprechende Objektnummer, wie sie Verwalter im Gespräch nutzen. */
  nummer: string;
  bezeichnung: string;
  strasse: string;
  plz: string;
  ort: string;
  verwaltungsarten: Verwaltungsart[];
  baujahr: number;
  einheitenAnzahl: number;
  wohnflaecheM2: number;
  gewerbeflaecheM2: number;
  /** Eigentümer bei Miet-/SEV-Verwaltung; bei WEG die Gemeinschaft (GdWE). */
  eigentuemerId: string;
  verwalterId: string;
  /** Objektbezogene Postfächer (siehe `Postfach`). */
  postfachIds: string[];
  heizungsart: Heizungsart;
  energietraeger: Energietraeger;
  /** Abrechnungsperiode weicht oft vom Kalenderjahr ab. */
  abrechnungszeitraumStart: string; // MM-DD
  verwaltungsbeginn: IsoDate;
  hausmeisterId?: string;
  bankkontoId: string;
  notizen?: string;
  /** Geokoordinaten für die Objektkarte im Cockpit. */
  lat: number;
  lng: number;
}

export type Heizungsart = "zentral" | "etage" | "fernwaerme" | "waermepumpe" | "gas_zentral";
export type Energietraeger = "erdgas" | "fernwaerme" | "heizoel" | "strom" | "pellets";

export type EinheitTyp =
  | "wohnung"
  | "gewerbe"
  | "stellplatz"
  | "garage"
  | "keller"
  | "lager"
  | "dachboden";

export interface Einheit {
  id: string;
  objektId: string;
  /** Lagebezeichnung wie im Mietvertrag: "3. OG links". */
  nummer: string;
  lage: string;
  typ: EinheitTyp;
  wohnflaecheM2: number;
  zimmer: number;
  /** Miteigentumsanteil in Tausendstel — nur bei WEG relevant. */
  meaTausendstel?: number;
  /** Umsatzsteueroption nach §9 UStG — nur Gewerbe. */
  ustOption?: boolean;
  balkon: boolean;
  aufzug: boolean;
  status: "vermietet" | "leerstand" | "eigennutzung" | "sanierung";
  personenzahl: number;
  zaehlerIds: string[];
}

export type PersonTyp = "natuerlich" | "juristisch";

export type PersonRolle =
  | "mieter"
  | "eigentuemer"
  | "beirat"
  | "dienstleister"
  | "versorger"
  | "versicherung"
  | "behoerde"
  | "bank"
  | "hausmeister"
  | "interessent"
  | "mitarbeiter";

export interface Person {
  id: string;
  typ: PersonTyp;
  anrede?: "Herr" | "Frau" | "Firma" | "Divers";
  name: string;
  rollen: PersonRolle[];
  email?: string;
  telefon?: string;
  mobil?: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  iban?: string;
  /** Nur bei Dienstleistern: Gewerk, Reaktionszeit, Bewertung. */
  gewerk?: Gewerk;
  reaktionszeitStunden?: number;
  bewertung?: number;
  /** Kreditorennummer für die Buchhaltung. */
  kreditorNr?: string;
  /** Bevorzugter Kanal — steuert, wie ImmOS antwortet. */
  kanal?: "email" | "telefon" | "post" | "portal";
  seit?: IsoDate;
}

export type Gewerk =
  | "sanitaer_heizung"
  | "elektro"
  | "dach"
  | "maler"
  | "schluesseldienst"
  | "aufzug"
  | "garten"
  | "reinigung"
  | "schaedlingsbekaempfung"
  | "trockenbau"
  | "glaser"
  | "kaminkehrer";

export type MietvertragArt = "wohnraum" | "gewerbe" | "stellplatz" | "sonstiges";
export type Mietanpassungsart = "vergleichsmiete" | "index" | "staffel" | "umsatz" | "keine";

export interface Mietvertrag {
  id: string;
  einheitId: string;
  objektId: string;
  art: MietvertragArt;
  mieterIds: string[];
  beginn: IsoDate;
  /** Befristung; bei unbefristeten Wohnraumverträgen null. */
  ende: IsoDate | null;
  gekuendigtZum: IsoDate | null;
  kuendigungEingang: IsoDate | null;
  /** Nettokaltmiete. */
  mieteKaltCent: Cent;
  /** Vorauszahlung Betriebskosten (ohne Heizung). */
  bkVorauszahlungCent: Cent;
  /** Vorauszahlung Heizkosten. */
  hkVorauszahlungCent: Cent;
  stellplatzCent: Cent;
  kautionCent: Cent;
  kautionsart: "barkaution" | "buergschaft" | "verpfaendetes_konto" | "keine";
  kautionEingegangen: boolean;
  anpassungsart: Mietanpassungsart;
  /** Bei Index: Referenzindex und letzter Anpassungsstand. */
  indexBasis?: number;
  letzteAnpassung?: IsoDate;
  /** Bei Staffel: nächste Stufe. */
  naechsteStaffelAm?: IsoDate;
  naechsteStaffelCent?: Cent;
  sepaMandatId?: string;
  ustPflichtig: boolean;
  /** Sonderabsprachen, die die KI kennen muss (z. B. "Katze erlaubt", "Renovierung übernommen"). */
  besondereVereinbarungen: string[];
}

/** Eigentumsverhältnis: bei WEG je Einheit, bei SEV der Auftraggeber. */
export interface Eigentumsverhaeltnis extends Zeitraum {
  id: string;
  einheitId: string;
  eigentuemerId: string;
  meaTausendstel?: number;
  /** Selbstnutzer oder vermietend — wichtig für Abrechnung und Kommunikation. */
  selbstnutzer: boolean;
  /** Bei SEV: erteilt uns Verwaltungsauftrag für das Sondereigentum. */
  sevAuftrag: boolean;
}

/** Objektbezogene E-Mail-Adresse — Kernfeature des Ingest. */
export interface Postfach {
  id: string;
  objektId: string | null;
  zweck: PostfachZweck;
  adresse: string;
  aktiv: boolean;
  /** Was mit Eingängen passiert, die keiner Regel entsprechen. */
  fallback: "triage" | "verwalter" | "ablehnen";
  /** Nur diese Absender dürfen buchungsrelevante Belege schicken (Betrugsschutz). */
  absenderWhitelist: string[];
  eingaengeMonat: number;
  autoQuote: number;
}

export type PostfachZweck =
  | "rechnung"
  | "schaden"
  | "allgemein"
  | "versammlung"
  | "kuendigung"
  | "zaehler";

export interface Zaehler {
  id: string;
  objektId: string;
  einheitId: string | null;
  art: "waerme" | "warmwasser" | "kaltwasser" | "strom" | "gas" | "heizkostenverteiler";
  nummer: string;
  fernablesbar: boolean;
  /** HeizkostenV §5 verlangt fernablesbare Zähler im Neubestand. */
  einbau: IsoDate;
  eichungBis: IsoDate;
  letzterStand: number;
  einheit: "kWh" | "m³" | "Einheiten";
}

export interface Bankkonto {
  id: string;
  objektId: string | null;
  bezeichnung: string;
  iban: string;
  bic: string;
  bank: string;
  /** Treuhand/Fremdgeld strikt getrennt vom Verwaltervermögen. */
  art: "treuhand" | "eigen" | "kaution" | "ruecklage";
  saldoCent: Cent;
  letzterAbrufIso: IsoDateTime;
}
