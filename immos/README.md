# ImmOS

Betriebssystem für Immobilienverwaltungen. Statt Formulare auszufüllen,
entscheidet der Verwalter über fertig aufbereitete Vorschläge: Agenten nehmen
jeden Eingang an, prüfen ihn gegen Akte, Vertrag, Buchhaltung und Rechtslage und
legen eine Karte vor — mit Begründung, Belegen, dem konkreten Diff der geplanten
Aktionen und einer benannten Alternative. Zustimmen oder ablehnen.

**Stand: klickbarer Prototyp mit Demo-Daten.** Alles läuft ohne externe Dienste,
ohne Datenbank und ohne Modellaufruf. Was noch fehlt, steht unten unter
[Was fehlt](#was-fehlt).

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 77 Tests (Rechenengines und Demo-Invarianten)
npm run typecheck
npm run build
```

## Aufbau

```
src/
  domain/            Fachlichkeit, framework-frei und testbar
    types.ts         Stammdaten mit Zeitscheiben (Objekt, Einheit, Vertrag, Postfach, Zähler)
    finance.ts       Journal, Sollstellung, offene Posten, Rechnungsprüfung, Umlage
    ops.ts           Vorgänge, Anlagen, Prüfpflichten, Fristen, Dokumente, Beschlüsse
    ai.ts            Vorschlag, Entscheidung, Autonomiestufe, Audit, Agentenkatalog
    modules.ts       Modul-Registry mit Abhängigkeitsauflösung
    accounting/      Rechenengines (siehe unten) inklusive Tests
  data/
    seed/            Demo-Welt: 6 Objekte, 148 Einheiten, Posteingang, Vorschläge
    world.ts         Repository-Schicht — die Naht zur späteren Datenbank
  components/        UI, nach Bereich getrennt (cockpit, posteingang, buchhaltung, …)
  state/             Sitzungszustand: Entscheidungen, Module, Autonomie, Chat
  app/               Next.js App Router; (app)/ enthält alles mit Rahmen
  hooks/             Sprachein- und -ausgabe (Web Speech API)
scripts/screenshot.mjs   Visuelle Prüfung: node scripts/screenshot.mjs "/cockpit::cockpit"
```

## Vier Entscheidungen, die alles andere bestimmen

**1. Die Engine rechnet, das Sprachmodell erklärt.**
Betriebs- und Heizkostenabrechnung, CO₂-Aufteilung, Sollstellung, Zahlungs­zuordnung
und Mahnstufen laufen in `src/domain/accounting/` als deterministischer,
getesteter Code. Ein Modell darf vorkontieren, zuordnen, formulieren und
Auffälligkeiten melden — summieren oder verteilen darf es nie. Jede Position
liefert ihren Rechenweg als Text mit, und die Summenkontrolle ist Teil des
Ergebnisses, nicht ein nachträglicher Test.

**2. Ein Vorschlag ist ein Domänenobjekt, kein Chatverlauf.**
`Vorschlag` trägt Belege mit Zitat, Aktionen als Feld-Diff, Alternativen mit
Folge, Risiko, Umkehrbarkeit, Konfidenz, Autonomiestufe und Frist. Wird
zugestimmt, führt das System exakt die beschriebenen Aktionen aus. Bei hohem
Risiko ist die Zustimmung gesperrt, bis die Belege geöffnet wurden, und die
Entscheidungsdauer wird protokolliert — sonst wäre „zugestimmt" kein Nachweis.

**3. Autonomie ist gestuft und nach oben begrenzt.**
Stufe 0 beobachten, 1 vorschlagen, 2 handeln mit Widerspruchsfenster, 3 autonom —
je Prozess und Betragsgrenze einstellbar (`/automationen`). Prozesse mit
`maxStufe` lassen sich nicht höher stellen; die Begründung steht am Datensatz.
Zahlungsanweisung, Kündigung, Mieterhöhung, Abrechnungsversand und die Änderung
einer Kreditoren-Bankverbindung bleiben dauerhaft beim Menschen.

**4. Module statt Funktionsumfang.**
Miet- und SEV-Verwaltung sind der Kern, WEG und Gewerbe werden bei der
Ersteinrichtung zugeschaltet (`/einrichtung`). Jede Route, jeder Agent und jede
Kennzahl deklariert ihr Modul; ist es aus, existiert die Funktion für den Nutzer
nicht. Abhängigkeiten löst `toggleModule` auf — Versammlung setzt WEG voraus, WEG
setzt Buchhaltung voraus, SEV setzt Mietverwaltung voraus.

## Rechenengines

| Datei | Inhalt | Rechtlicher Anker |
| --- | --- | --- |
| `accounting/betriebskosten.ts` | Umlage mit Zeitscheiben, Vorwegabzug, Leerstand beim Eigentümer, HeizkostenV-Aufteilung, CO₂-Stufenmodell, Summenkontrolle | §556a BGB, BetrKV, HeizkostenV §7/§8, CO2KostAufG |
| `accounting/sollstellung.ts` | Monatslauf mit Teilmonaten, Staffeln, Fälligkeit am 3. Werktag; Mahnstufen und Erkennung der Kündigungsschwelle | §556b, §543 Abs. 2 Nr. 3, §569 Abs. 3, §288 BGB |
| `accounting/matching.ts` | Regelkaskade für Zahlungszuordnung (SEPA-Referenz → IBAN → Kennung → Name), Verrechnungsreihenfolge | §366, §367 BGB |
| `accounting/verteilung.ts` | Centgenaue Verteilung nach größten Restwerten, Zeitraumschnitt | — |

Alle Rechtsparameter sind Daten, keine Logik: Intervalle von Prüfpflichten, die
CO₂-Stufentabelle, der Verbrauchsanteil, Mahnfristen und Gebühren stehen in
Tabellen. Ändert sich die Rechtslage, ändert sich ein Datensatz.

> **Wichtig:** Die Rechtsangaben im Code sind Arbeitsstand aus der Konzeption und
> vor produktivem Einsatz gegen die geltende Fassung zu verifizieren — besonders
> die CO₂-Stufentabelle, die Prüfintervalle und die landesrechtlichen
> Rauchwarnmelderpflichten.

## Demo-Welt

Deterministisch erzeugt (`src/data/seed/`), damit Vorführungen und Screenshots
reproduzierbar sind. Bezugszeitpunkt ist fest: **20.08.2026, 08:42 Uhr**.

Sechs Objekte in Köln, gemischt aus Miet-, SEV-, WEG- und Gewerbeverwaltung, 148
Einheiten, 26 objektbezogene E-Mail-Adressen. Die interessanten Fälle sind
gesetzt, nicht zufällig:

- gefälschte Rechnung mit geänderter IBAN, dazu eine Mail, die dem Assistenten
  Anweisungen gibt (Prompt Injection) — beides wird erkannt und gesperrt
- doppelt gestellte Rechnung desselben Leistungszeitraums
- Aufzugsrechnung 18,7 % über Wartungsvertrag ohne angekündigte Preisanpassung
- Zahlungsrückstand an der Kündigungsschwelle, mit gerissener Ratenvereinbarung
- überfällige Legionellenprüfung und ablaufende Gewährleistung
- in der Betriebskostenabrechnung 2.208 € doppelt erfasste Gartenpflege
- Mieterwechsel zur Jahresmitte und Leerstand ab November in derselben Abrechnung

29 Konsistenztests sichern die Invarianten dieser Welt (`src/data/seed/seed.test.ts`).

## Bedienung

| Taste | Wirkung |
| --- | --- |
| `⌘K` / `Strg+K` | Befehlspalette: Objekte, Entscheidungen, Sprachbefehle |
| `⏎` | aktuellen Vorschlag annehmen (bei hohem Risiko gesperrt) |
| `A` | ablehnen, mit Grunderfassung |
| `S` | zurückstellen |
| `J` / `K` | in der Warteschlange blättern |
| `M` | Push-to-Talk |
| `Alt+1…5` | zwischen den Bereichen der Tagesarbeit springen |

Sprachein- und -ausgabe nutzen im Prototyp die Web Speech API des Browsers
(Chromium). Fehlt sie, bleibt die Texteingabe unverändert nutzbar.

## Was fehlt

Der Prototyp zeigt Produkt und Fachlichkeit, nicht den Betrieb. Für den
Produktivgang fehlen:

- **Persistenz und Mandantentrennung**: Postgres mit Row Level Security, das
  Drizzle-Schema aus `src/domain/types.ts` als Quelle der Wahrheit, Migrationen
- **Echter Mail-Ingest**: Inbound-Provider im EU-Raum, Virenscan, ZUGFeRD- und
  XRechnung-Parsing (EN 16931), OCR, Idempotenz, Bounce-Handling
- **Bank-Anbindung**: EBICS oder Open-Banking-Aggregator, SEPA-Einreichung
  (pain.001/008), Kontoumsatzabruf (camt.053)
- **Modellanbindung**: Agentenläufe gegen ein Sprachmodell mit EU-Verarbeitung,
  Guardrails gegen Prompt Injection aus Dokumenten, Kostenbudget je Mandant,
  Evaluationssets für jeden Agenten
- **Revisionssichere Ablage**: GoBD-Journal mit Festschreibung, Verfahrens­dokumentation,
  Aufbewahrungs- und Löschkonzept
- **Datenmigration** aus DOMUS, Haufe PowerHaus, iX-Haus, Immoware24 und Excel —
  fachlich die größte Hürde beim Systemwechsel und deshalb eigenes Vorhaben
- **Zugriffsschutz**: Authentifizierung, Rollen, Zwei-Faktor-Pflicht, Protokollierung
  von Leseoperationen

Alle Namen, Adressen, IBANs, Belege und Beträge in diesem Repository sind
erfunden.
