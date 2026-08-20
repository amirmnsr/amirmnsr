/**
 * Playbooks — die Betriebsabläufe als Daten
 * =============================================================================
 * Ein Verwalter arbeitet nicht in Modulen, sondern in Abläufen: eine Meldung
 * kommt herein und muss bis zur Abnahme und Rechnungsprüfung durchlaufen. Diese
 * Abläufe sind hier als Daten beschrieben, nicht als Code — mit der einzigen
 * Angabe, die zählt: Wer macht den Schritt?
 *
 *   AUTO      Das System führt aus, Nachweis im Audit-Trail.
 *   VORSCHLAG Das System bereitet vor, ein Mensch entscheidet.
 *   MENSCH    Muss ein Mensch tun oder verantworten (Recht, Haftung, Verhandlung).
 *
 * Die Summe der AUTO- und VORSCHLAG-Schritte ist die ehrliche Antwort auf die
 * Frage „wie viel spart das?" — und die MENSCH-Schritte sind die Antwort darauf,
 * warum eine Verwaltung nicht ohne Personal auskommt.
 */

import type { ModuleId } from "./modules";

export type Verantwortung = "auto" | "vorschlag" | "mensch";

export interface PlaybookSchritt {
  titel: string;
  verantwortung: Verantwortung;
  /** Was in diesem Schritt tatsächlich passiert. */
  beschreibung: string;
  /** Ergebnis des Schritts — Dokument, Nachricht, Buchung, Auftrag. */
  artefakt?: string;
  /** Zeitvorgabe oder gesetzliche Frist. */
  frist?: string;
  /** Warum dieser Schritt beim Menschen bleibt. */
  grund?: string;
  agentId?: string;
}

export interface Playbook {
  id: string;
  name: string;
  modulId: ModuleId;
  ausloeser: string;
  /** Häufigkeit im Bestand von rund 150 Einheiten. */
  haeufigkeit: string;
  /** Manueller Aufwand je Fall vor der Automatisierung. */
  aufwandVorherMinuten: number;
  /** Verbleibender Aufwand: Entscheidungen und menschliche Schritte. */
  aufwandNachherMinuten: number;
  schritte: PlaybookSchritt[];
}

export const PLAYBOOKS: readonly Playbook[] = [
  {
    id: "pb-schaden-heizung",
    name: "Schadenmeldung bis Rechnungsprüfung",
    modulId: "technik",
    ausloeser: "Mieter meldet einen Mangel per Mail, Telefon oder Portal",
    haeufigkeit: "30–50 pro Monat",
    aufwandVorherMinuten: 55,
    aufwandNachherMinuten: 6,
    schritte: [
      {
        titel: "Eingang lesen und zuordnen",
        verantwortung: "auto",
        beschreibung:
          "Objekt, Einheit und Mietverhältnis werden aus der Adresse des Postfachs und dem Text bestimmt, die Absicht klassifiziert.",
        artefakt: "Vorgang mit Zusammenfassung",
        agentId: "triage",
      },
      {
        titel: "Mehrfachmeldungen zusammenführen",
        verantwortung: "auto",
        beschreibung:
          "Meldungen aus demselben Strang innerhalb kurzer Zeit werden zu einem Vorgang gebündelt, statt sechs Aufträge zu erzeugen.",
        artefakt: "Sammelvorgang",
        agentId: "vorgangs_dispatcher",
      },
      {
        titel: "Dringlichkeit und Gewerk bestimmen",
        verantwortung: "auto",
        beschreibung:
          "Ausfall von Heizung, Warmwasser oder Strom gilt als dringend; daraus folgen Reaktionszeit und Gewerk.",
        frist: "Notfall sofort, sonst 24 h",
        agentId: "schaden_dispatcher",
      },
      {
        titel: "Handwerker beauftragen",
        verantwortung: "vorschlag",
        beschreibung:
          "Auswahl aus dem Pool nach Gewerk, Reaktionszeit, Bewertung und Rahmenvertrag; unterhalb der Budgetgrenze auch autonom.",
        artefakt: "Auftrag mit Budget und Termin",
        agentId: "schaden_dispatcher",
      },
      {
        titel: "Mieter informieren",
        verantwortung: "auto",
        beschreibung:
          "Sammelinformation mit Zeitfenster und Ansprechpartner — nachweisbar zugestellt, das senkt Nachfragen und Minderungsrisiko.",
        artefakt: "Nachricht im Vorgang",
        agentId: "korrespondenz",
      },
      {
        titel: "Termin koordinieren und Zugang klären",
        verantwortung: "mensch",
        beschreibung:
          "Wenn Schlüssel, Hausmeister oder Zugang zu fremden Wohnungen im Spiel sind, koordiniert ein Mensch.",
        grund: "Zugang zu Wohnraum ist Verhandlung, keine Datenlage.",
      },
      {
        titel: "Abnahme dokumentieren",
        verantwortung: "vorschlag",
        beschreibung:
          "Rückmeldung von Handwerker oder Hausmeister wird zum Abnahmevermerk, Fotos landen in der Objektakte.",
        artefakt: "Abnahmevermerk, Fotos",
      },
      {
        titel: "Rechnung gegen Auftrag prüfen",
        verantwortung: "vorschlag",
        beschreibung:
          "Formal, rechnerisch und sachlich gegen Auftrag, Angebot und Rahmenvertrag; Abweichung über 5 Prozent wird vorgelegt.",
        artefakt: "Prüfergebnis mit Kürzungsvorschlag",
        agentId: "rechnungspruefer",
      },
      {
        titel: "Zahlung freigeben",
        verantwortung: "mensch",
        beschreibung:
          "Zahlungen werden nie autonom angewiesen; ab Betragsgrenze zusätzlich im Vier-Augen-Prinzip.",
        grund: "Zahlungsverkehr ist der teuerste Fehler und das häufigste Betrugsziel.",
      },
      {
        titel: "Gewährleistung merken",
        verantwortung: "auto",
        beschreibung:
          "Gewährleistungsende wird als Frist gesetzt und vor Ablauf zur Mängelanzeige vorgelegt.",
        frist: "5 Jahre bei Bauwerken (§634a BGB)",
        agentId: "fristenwaechter",
      },
    ],
  },
  {
    id: "pb-mahnwesen",
    name: "Zahlungsverzug bis Lösung",
    modulId: "miete",
    ausloeser: "Offener Posten nach Fälligkeit, erkannt beim Kontoabruf",
    haeufigkeit: "60–90 Vorgänge pro Monat",
    aufwandVorherMinuten: 25,
    aufwandNachherMinuten: 3,
    schritte: [
      {
        titel: "Zahlungseingänge zuordnen",
        verantwortung: "auto",
        beschreibung:
          "Deterministische Regelkaskade: SEPA-Referenz, dann IBAN, dann Kennung im Verwendungszweck. Erst darunter wird vorgelegt.",
        artefakt: "Buchung und Zuordnung",
        agentId: "zahlungsmatcher",
      },
      {
        titel: "Verzug feststellen und verrechnen",
        verantwortung: "auto",
        beschreibung:
          "Teilzahlungen werden nach §366 und §367 BGB verrechnet: erst Kosten, dann die älteste Forderung.",
        agentId: "mahnwesen",
      },
      {
        titel: "Zahlungserinnerung senden",
        verantwortung: "auto",
        beschreibung:
          "Freundlicher Ton, konkreter Betrag, offene Perioden einzeln benannt. Erfahrungswert: rund die Hälfte erledigt sich hier.",
        frist: "7 Tage nach Fälligkeit",
        artefakt: "Mahnung Stufe 1",
        agentId: "mahnwesen",
      },
      {
        titel: "Zweite Mahnung mit Gebühr",
        verantwortung: "vorschlag",
        beschreibung:
          "Sachlicher Ton, Mahngebühr und Verzugszinsen nach §288 BGB, Hinweis auf die Folgen.",
        frist: "21 Tage nach Fälligkeit",
        agentId: "mahnwesen",
      },
      {
        titel: "Kündigungsschwelle erkennen",
        verantwortung: "auto",
        beschreibung:
          "Erreicht der Rückstand zwei Monatsmieten, wird der Fall markiert und aus der Automatik genommen.",
        frist: "§543 Abs. 2 Nr. 3 BGB",
        agentId: "mahnwesen",
      },
      {
        titel: "Über Ratenvereinbarung oder Kündigung entscheiden",
        verantwortung: "mensch",
        beschreibung:
          "Beides ist begründet vorbereitet, inklusive Wirtschaftlichkeitsvergleich: Räumungsverfahren kosten erfahrungsgemäß 4 bis 7 Monatsmieten.",
        grund: "Existenzielle Folge für den Mieter — nie eine Maschinenentscheidung.",
      },
      {
        titel: "Vereinbarung überwachen",
        verantwortung: "auto",
        beschreibung:
          "Ratenzahlung wird als Frist geführt; bei Ausfall kommt der Fall mit Historie erneut zur Entscheidung.",
        agentId: "fristenwaechter",
      },
    ],
  },
  {
    id: "pb-mieterwechsel",
    name: "Kündigung bis Neuvermietung",
    modulId: "miete",
    ausloeser: "Kündigung des Mieters oder Eigenbedarf des Eigentümers",
    haeufigkeit: "1–3 pro Monat",
    aufwandVorherMinuten: 240,
    aufwandNachherMinuten: 55,
    schritte: [
      {
        titel: "Kündigung prüfen und bestätigen",
        verantwortung: "vorschlag",
        beschreibung:
          "Form, Zugang und Fristberechnung werden geprüft, das Vertragsende gesetzt und schriftlich bestätigt.",
        artefakt: "Bestätigungsschreiben, Vertragsende",
        agentId: "mieterwechsel",
      },
      {
        titel: "Vorabnahme terminieren",
        verantwortung: "auto",
        beschreibung:
          "Termin rund vier Wochen vor Rückgabe, damit Instandsetzungen noch in die Leerstandszeit fallen.",
        agentId: "mieterwechsel",
      },
      {
        titel: "Zustand feststellen und bewerten",
        verantwortung: "mensch",
        beschreibung:
          "Vor Ort, mit Protokoll und Fotos. Was normale Abnutzung ist und was Schaden, entscheidet ein Mensch.",
        grund: "Bewertung von Abnutzung ist Ermessen und regelmäßig Streitpunkt.",
      },
      {
        titel: "Zählerstände und Übergabe erfassen",
        verantwortung: "vorschlag",
        beschreibung:
          "Stände werden ins Protokoll übernommen, an den Messdienst gemeldet und für die Zwischenabrechnung vorgemerkt.",
        artefakt: "Übergabeprotokoll",
      },
      {
        titel: "Kaution abrechnen",
        verantwortung: "vorschlag",
        beschreibung:
          "Offene Forderungen, Schäden und Betriebskosten-Nachbehalt werden gegengerechnet, Zinsen berücksichtigt.",
        artefakt: "Kautionsabrechnung",
        agentId: "mieterwechsel",
      },
      {
        titel: "Marktmiete bestimmen",
        verantwortung: "vorschlag",
        beschreibung:
          "Vergleich mit aktuellen Angeboten im Umfeld und dem Mietspiegel; Kappungsgrenzen und Vormiete werden beachtet.",
        agentId: "vermietung",
      },
      {
        titel: "Bewerber auswählen",
        verantwortung: "mensch",
        beschreibung:
          "Unterlagen werden auf Vollständigkeit geprüft und aufbereitet. Die Auswahl trifft ein Mensch.",
        grund: "Diskriminierungsrisiko und Ermessen — keine Maschinenentscheidung.",
      },
      {
        titel: "Vertrag erstellen und Übergabe durchführen",
        verantwortung: "vorschlag",
        beschreibung:
          "Vertrag aus geprüfter Vorlage, Wohnungsgeberbestätigung, Übergabeprotokoll, Anlage der Sollstellungen.",
        artefakt: "Mietvertrag, Sollstellungen",
      },
    ],
  },
  {
    id: "pb-abrechnung",
    name: "Betriebskostenabrechnung",
    modulId: "betriebskosten",
    ausloeser: "Abrechnungszeitraum beendet, Belege vollständig",
    haeufigkeit: "einmal je Objekt und Jahr",
    aufwandVorherMinuten: 900,
    aufwandNachherMinuten: 150,
    schritte: [
      {
        titel: "Kosten sammeln und abgrenzen",
        verantwortung: "auto",
        beschreibung:
          "Buchungen des Zeitraums werden nach Konto und Leistungszeitraum zusammengeführt; periodenfremde Beträge werden abgegrenzt.",
        agentId: "abrechnung",
      },
      {
        titel: "Umlagefähigkeit und Schlüssel bestimmen",
        verantwortung: "auto",
        beschreibung:
          "Beides hängt am Konto und damit an der BetrKV-Fundstelle, nicht am Buchungstext.",
        agentId: "kontierer",
      },
      {
        titel: "Plausibilität gegen Vorjahr prüfen",
        verantwortung: "vorschlag",
        beschreibung:
          "Abweichungen über 15 Prozent, doppelt erfasste Leistungen und fehlende Zählerstände werden gemeldet, statt sie mitzurechnen.",
        agentId: "abrechnung",
      },
      {
        titel: "Rechnen",
        verantwortung: "auto",
        beschreibung:
          "Deterministische Engine: Vorwegabzug, Zeitscheiben, HeizkostenV-Aufteilung, CO₂-Stufenmodell, centgenaue Verteilung mit Summenkontrolle.",
        artefakt: "Ergebnis je Nutzer mit Rechenweg",
      },
      {
        titel: "Freigeben und versenden",
        verantwortung: "mensch",
        beschreibung:
          "Die Abrechnung ist eine Erklärung gegenüber Dritten mit Ausschlussfrist — sie geht nie ohne menschliche Freigabe hinaus.",
        frist: "§556 Abs. 3 BGB: Ende des Folgejahres",
        grund: "Nach Fristablauf sind Nachforderungen ausgeschlossen.",
      },
      {
        titel: "Widersprüche bearbeiten",
        verantwortung: "vorschlag",
        beschreibung:
          "Einwände werden gegen die Belege geprüft; berechtigte Punkte werden anerkannt und korrigiert, unberechtigte begründet zurückgewiesen.",
        agentId: "widerspruch",
      },
      {
        titel: "Vorauszahlungen anpassen",
        verantwortung: "vorschlag",
        beschreibung:
          "Nach der Abrechnung wird die Vorauszahlung angepasst — der Schritt, der im Tagesgeschäft am häufigsten liegen bleibt.",
        artefakt: "Anpassungsschreiben, neue Sollstellung",
      },
    ],
  },
  {
    id: "pb-versammlung",
    name: "Eigentümerversammlung",
    modulId: "versammlung",
    ausloeser: "Jahresturnus oder Verlangen von Eigentümern",
    haeufigkeit: "einmal je Gemeinschaft und Jahr",
    aufwandVorherMinuten: 720,
    aufwandNachherMinuten: 210,
    schritte: [
      {
        titel: "Termin und Ort planen",
        verantwortung: "vorschlag",
        beschreibung:
          "Rückwärts von der Einberufungsfrist gerechnet, inklusive Zustellzeit bei Postversand.",
        frist: "§24 Abs. 4 WEG: drei Wochen",
        agentId: "versammlung",
      },
      {
        titel: "Tagesordnung erstellen",
        verantwortung: "vorschlag",
        beschreibung:
          "Pflichtpunkte, Anträge von Eigentümern und Beirat, Statusberichte laufender Beschlüsse.",
        agentId: "versammlung",
      },
      {
        titel: "Beschlussanträge prüfen",
        verantwortung: "vorschlag",
        beschreibung:
          "Beschlusskompetenz, Formulierung und Anfechtungsrisiko werden geprüft — etwa ob eine Kostenverteilung mitzubeschließen ist.",
        agentId: "beschluss_pruefer",
      },
      {
        titel: "Einladen und Zugang nachweisen",
        verantwortung: "mensch",
        beschreibung:
          "Versand vorbereitet, Freigabe durch den Verwalter: ein Formfehler macht alle Beschlüsse der Versammlung anfechtbar.",
        grund: "Fristen- und Formfehler sind der häufigste Anfechtungsgrund.",
      },
      {
        titel: "Vollmachten und Stimmkraft prüfen",
        verantwortung: "vorschlag",
        beschreibung:
          "Form und Umfang der Vollmachten, Stimmkraft nach Miteigentumsanteilen, Beschlussfähigkeit.",
        agentId: "versammlung",
      },
      {
        titel: "Versammlung leiten",
        verantwortung: "mensch",
        beschreibung:
          "Diskussion, Anträge zur Geschäftsordnung, Abstimmung — das ist Moderation und nicht delegierbar.",
        grund: "Versammlungsleitung ist Aufgabe des Verwalters.",
      },
      {
        titel: "Protokoll und Beschluss-Sammlung",
        verantwortung: "auto",
        beschreibung:
          "Live-Protokoll mit Ergebnissen, danach Übernahme in die Beschluss-Sammlung mit Anfechtungsfrist und Umsetzungsauftrag.",
        frist: "§24 Abs. 7 WEG",
        agentId: "versammlung",
      },
      {
        titel: "Beschlüsse umsetzen",
        verantwortung: "vorschlag",
        beschreibung:
          "Aus jedem Beschluss mit Budget entsteht ein Vorgang mit Frist — Beschlüsse, die niemand umsetzt, sind der Klassiker.",
        agentId: "vorgangs_dispatcher",
      },
    ],
  },
  {
    id: "pb-rechnungseingang",
    name: "Rechnungseingang bis Zahlung",
    modulId: "buchhaltung",
    ausloeser: "Beleg trifft an einer objektbezogenen Adresse ein",
    haeufigkeit: "250–300 pro Monat",
    aufwandVorherMinuten: 12,
    aufwandNachherMinuten: 1.5,
    schritte: [
      {
        titel: "Empfangen und unveränderbar ablegen",
        verantwortung: "auto",
        beschreibung:
          "Original wird mit Hash gespeichert, bevor irgendetwas daran interpretiert wird — Grundlage der Belegkette.",
        artefakt: "Dokument mit SHA-256",
      },
      {
        titel: "Auslesen",
        verantwortung: "auto",
        beschreibung:
          "ZUGFeRD und XRechnung strukturiert nach EN 16931, sonst Layout-Erkennung mit ausgewiesener Konfidenz.",
        agentId: "rechnungspruefer",
      },
      {
        titel: "Sicherheit prüfen",
        verantwortung: "auto",
        beschreibung:
          "SPF, DKIM, DMARC, Abgleich der IBAN mit dem Kreditorenstamm, Dublettenerkennung, Anweisungsversuche im Text.",
        agentId: "rechnungspruefer",
      },
      {
        titel: "Sachlich prüfen",
        verantwortung: "auto",
        beschreibung:
          "Gegen Auftrag, Angebot, Wartungsvertrag und Preisliste; Abweichungen werden mit Betrag benannt.",
        agentId: "rechnungspruefer",
      },
      {
        titel: "Vorkontieren",
        verantwortung: "auto",
        beschreibung:
          "Konto, Umlagefähigkeit, Leistungszeitraum und §35a-Anteil — bei unbekannter Kostenart wird gefragt.",
        agentId: "kontierer",
      },
      {
        titel: "Freigeben",
        verantwortung: "mensch",
        beschreibung:
          "Freigabe nach Betragsgrenze, ab Schwelle im Vier-Augen-Prinzip. Skontofristen werden im Vorschlag berücksichtigt.",
        grund: "Zahlungsanweisung braucht eine zurechenbare menschliche Entscheidung.",
      },
      {
        titel: "Zahlen und buchen",
        verantwortung: "auto",
        beschreibung:
          "SEPA-Einreichung zum optimalen Termin, Buchung mit Belegkette, Rückmeldung in den Vorgang.",
        artefakt: "Zahlung, Buchung",
        agentId: "zahllauf",
      },
    ],
  },
  {
    id: "pb-pruefpflicht",
    name: "Betreiberpflichten überwachen",
    modulId: "technik",
    ausloeser: "Intervallende einer Prüfpflicht oder neue Anlage",
    haeufigkeit: "laufend, 5–15 Termine pro Monat",
    aufwandVorherMinuten: 40,
    aufwandNachherMinuten: 4,
    schritte: [
      {
        titel: "Pflichten je Anlage führen",
        verantwortung: "auto",
        beschreibung:
          "Intervall und Rechtsgrundlage hängen am Datensatz. Eine Rechtsänderung ist eine Datenänderung, kein Release.",
      },
      {
        titel: "Fällige Prüfung erkennen",
        verantwortung: "auto",
        beschreibung:
          "Vorlauf nach Haftungsrisiko: bei Aufzug, Trinkwasser und Brandschutz früher als bei einem Garagentor.",
        agentId: "pruefpflicht",
      },
      {
        titel: "Prüfung beauftragen",
        verantwortung: "vorschlag",
        beschreibung:
          "Fachbetrieb aus dem Pool, Kosten und Umlagefähigkeit werden gleich mit ausgewiesen.",
        agentId: "pruefpflicht",
      },
      {
        titel: "Zugang und Mieterinformation",
        verantwortung: "auto",
        beschreibung:
          "Ankündigung mit Zeitfenster; ohne Zugang keine Probenahme, das ist der häufigste Grund für Nachtermine.",
        agentId: "korrespondenz",
      },
      {
        titel: "Nachweis prüfen und ablegen",
        verantwortung: "auto",
        beschreibung:
          "Prüfbericht wird der Pflicht zugeordnet, Intervall neu berechnet, Mängel werden zu Vorgängen.",
        artefakt: "Nachweisdokument, Folgetermin",
        agentId: "dokument_klassifizierer",
      },
      {
        titel: "Mängel mit Gefahr im Verzug",
        verantwortung: "mensch",
        beschreibung:
          "Wenn ein Prüfbericht eine Anlage stilllegt oder eine Gefahr feststellt, entscheidet ein Mensch über Sofortmaßnahmen.",
        grund: "Personengefahr und Betriebsunterbrechung sind keine Regelfälle.",
      },
    ],
  },
];

export function playbookById(id: string | undefined): Playbook | undefined {
  return id ? PLAYBOOKS.find((p) => p.id === id) : undefined;
}

export interface AutomatisierungsBilanz {
  schritteGesamt: number;
  auto: number;
  vorschlag: number;
  mensch: number;
  aufwandVorherMinuten: number;
  aufwandNachherMinuten: number;
  /** Anteil der eingesparten Bearbeitungszeit über alle Abläufe. */
  ersparnisAnteil: number;
}

export function bilanz(playbooks: readonly Playbook[] = PLAYBOOKS): AutomatisierungsBilanz {
  const schritte = playbooks.flatMap((p) => p.schritte);
  const vorher = playbooks.reduce((s, p) => s + p.aufwandVorherMinuten, 0);
  const nachher = playbooks.reduce((s, p) => s + p.aufwandNachherMinuten, 0);
  return {
    schritteGesamt: schritte.length,
    auto: schritte.filter((s) => s.verantwortung === "auto").length,
    vorschlag: schritte.filter((s) => s.verantwortung === "vorschlag").length,
    mensch: schritte.filter((s) => s.verantwortung === "mensch").length,
    aufwandVorherMinuten: vorher,
    aufwandNachherMinuten: nachher,
    ersparnisAnteil: vorher > 0 ? (vorher - nachher) / vorher : 0,
  };
}
