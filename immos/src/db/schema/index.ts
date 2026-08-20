/**
 * MVP-Kern: 25 Tabellen
 * =============================================================================
 * Stammdaten (10) · Finanzen (9) · Nachweis (6)
 *
 * Bewusst NICHT im MVP-Kern, mit benannter Anschlussnaht:
 *  - Vorgang/Nachricht/Postfach      → hängt per `bezug` an allem, eigenes Modul
 *  - Versammlung/Beschluss/Sammlung  → `umlageregel.beschluss_ref` ist die Naht
 *  - Anlage/Pruefpflicht/Zaehler     → `frist.anker_ref` ist die Naht
 *  - Abrechnungslauf/-position       → Projektion über Journal + Umlageregel
 *  - Zustellung                      → vorläufig Spalten an `frist`
 *  - Bewerber/Vermietung             → eigener DSGVO-Löschraum, eigenes Modul
 *  - Regelwerk/Normfassung           → `frist.norm_fassung` ist die Naht
 */

// Enums muessen aus dem Schema-Entrypoint exportiert werden, sonst erzeugt
// drizzle-kit keine CREATE TYPE-Anweisungen.
export * from "../enums";
export * from "./stammdaten";
export * from "./finanzen";
export * from "./nachweis";
