#!/bin/bash
# ===========================================================================
# ImmOS · Nachweis der Datenbank-Garantien
# ===========================================================================
# Baut eine leere Datenbank auf, wendet Prelude + Migration + Guards an und
# greift dann jede zugesagte Garantie an. Jeder Test gilt als erfolgreich,
# wenn die Datenbank den Angriff ABWEIST.
#
#   A Mandantentrennung (RLS)      E Zahlungszuordnung
#   B Journal / GoBD               F KI-Entscheidungsschleife
#   C Zeitscheiben                 G Audit-Trail
#   D Fachinvarianten              H Dokumente und Verknuepfung
#
# Aufruf:  bash scripts/db-garantien.sh
# Voraussetzung: laufender Postgres, Verbindung unten in PGH anpassen.
# ===========================================================================
PGH="-h /var/tmp/immos_sock -p 5433 -U immos_test"
cd /home/user/amirmnsr/immos
PASS=0; FAIL=0
q() { psql $PGH -d immos -qtAX -c "$1" 2>&1; }
# erwartet_fehler <name> <sql> ; Erfolg = SQL scheitert
erwartet_fehler() {
  local name="$1"; shift
  local out; out=$(psql $PGH -d immos -qtAX -v ON_ERROR_STOP=1 -c "$1" 2>&1)
  if [ $? -ne 0 ]; then
    printf "  OK   %-56s %s\n" "$name" "$(echo "$out"|grep -oE 'ERROR:.*'|head -1|cut -c1-58)"; PASS=$((PASS+1))
  else
    printf "  FAIL %-56s wurde AKZEPTIERT\n" "$name"; FAIL=$((FAIL+1))
  fi
}
# erwartet_wert <name> <sql> <erwartet>
erwartet_wert() {
  local name="$1" sql="$2" exp="$3"
  local got; got=$(q "$sql")
  if [ "$got" == "$exp" ]; then printf "  OK   %-56s = %s\n" "$name" "$got"; PASS=$((PASS+1))
  else printf "  FAIL %-56s = %s (erwartet %s)\n" "$name" "$got" "$exp"; FAIL=$((FAIL+1)); fi
}
# --- Neuaufbau ---
psql $PGH -d postgres -qc "drop database if exists immos" >/dev/null
psql $PGH -d postgres -qc "create database immos" >/dev/null
psql $PGH -d immos -q -v ON_ERROR_STOP=1 -f src/db/sql/0000_prelude.sql >/dev/null
psql $PGH -d immos -q -v ON_ERROR_STOP=1 -f src/db/migrations/0000_mvp_kern.sql >/dev/null
psql $PGH -d immos -q -v ON_ERROR_STOP=1 -f src/db/sql/0002_guards.sql >/dev/null
psql $PGH -d immos -q -v ON_ERROR_STOP=1 -f src/db/sql/seed_test.sql >/dev/null || { echo "SEED FEHLER"; exit 1; }

MA=aaaaaaaa-0000-0000-0000-000000000001
MB=bbbbbbbb-0000-0000-0000-000000000002
BK=a1000000-0000-0000-0000-000000000001
OBJ=a2000000-0000-0000-0000-000000000001
EIN=a3000000-0000-0000-0000-000000000001
VTR=a5000000-0000-0000-0000-000000000001
KF=a6000000-0000-0000-0000-000000000002
KE=a6000000-0000-0000-0000-000000000001
KH=a6000000-0000-0000-0000-000000000003
P=a4000000-0000-0000-0000-000000000001

echo ""
echo "A · MANDANTENTRENNUNG (RLS)"
erwartet_wert "A1 ohne Mandantenkontext sichtbare Objekte" \
  "set role immos_app; select count(*) from objekt;" "0"
erwartet_wert "A2 mit Mandant A sichtbare Objekte (von 2)" \
  "begin; set local role immos_app; set local immos.mandant_id='$MA'; select count(*) from objekt; commit;" "1"
erwartet_wert "A3 Objekt von B trotz bekannter UUID" \
  "begin; set local role immos_app; set local immos.mandant_id='$MA'; select count(*) from objekt where id='b2000000-0000-0000-0000-000000000001'; commit;" "0"
erwartet_fehler "A4 INSERT mit fremder mandant_id" \
  "begin; set local role immos_app; set local immos.mandant_id='$MA';
   insert into einheit (mandant_id,objekt_id,nummer,lage,typ) values ('$MB','b2000000-0000-0000-0000-000000000001','X','X','wohnung'); commit;"
erwartet_fehler "A5 eigene Zeile in fremden Mandanten umhaengen" \
  "begin; set local role immos_app; set local immos.mandant_id='$MA';
   update einheit set mandant_id='$MB' where id='$EIN'; commit;"
erwartet_wert "A6 Objekt-Scope Beirat (nur Objekt B sichtbar)" \
  "begin; set local role immos_app; set local immos.mandant_id='$MA'; set local immos.objekt_scope='11111111-1111-1111-1111-111111111111'; select count(*) from frist; commit;" "0"

echo ""
echo "B · JOURNAL / GoBD-UNVERAENDERBARKEIT"
# Digest exakt so berechnet wie im Trigger (siehe immos_sec.buchung_pruefen)
D1=$(q "with z(nr,konto,sh,betrag,objekt) as (values ('1','$KF','S','85000','$OBJ'),('2','$KE','H','85000','$OBJ'))
        select encode(digest(string_agg(concat_ws('|',nr,konto,sh,betrag,objekt,'','',''),E'\n' order by nr),'sha256'),'hex') from z")
psql $PGH -d immos -q -v ON_ERROR_STOP=1 -c "
begin;
insert into buchung (id,mandant_id,buchungskreis_id,jahr,belegdatum,buchungsdatum,buchungstext,quelle,zeilen_digest,hash)
 values ('a7000000-0000-0000-0000-000000000001','$MA','$BK',2026,'2026-01-03','2026-01-03','Miete 01/2026','regel','$D1','x');
insert into buchungszeile (mandant_id,buchung_id,zeilen_nr,konto_id,sh,betrag_cent,objekt_id) values
 ('$MA','a7000000-0000-0000-0000-000000000001',1,'$KF','S',85000,'$OBJ'),
 ('$MA','a7000000-0000-0000-0000-000000000001',2,'$KE','H',85000,'$OBJ');
commit;" >/dev/null 2>&1
erwartet_wert "B1 gueltige Buchung: journal_nr" \
  "select journal_nr from buchung where id='a7000000-0000-0000-0000-000000000001'" "1"
erwartet_wert "B2 Hash gesetzt (Laenge)" \
  "select length(hash) from buchung where id='a7000000-0000-0000-0000-000000000001'" "64"
erwartet_fehler "B3 UPDATE Buchungstext" \
  "update buchung set buchungstext='manipuliert' where id='a7000000-0000-0000-0000-000000000001'"
erwartet_fehler "B4 DELETE Buchung" \
  "delete from buchung where id='a7000000-0000-0000-0000-000000000001'"
erwartet_fehler "B5 UPDATE Betrag einer Journalzeile" \
  "update buchungszeile set betrag_cent=1 where buchung_id='a7000000-0000-0000-0000-000000000001'"
DBAD=$(q "with z(nr,konto,sh,betrag) as (values ('1','$KF','S','50000'),('2','$KE','H','40000'))
        select encode(digest(string_agg(concat_ws('|',nr,konto,sh,betrag,'','','',''),E'\n' order by nr),'sha256'),'hex') from z")
erwartet_fehler "B6 Soll <> Haben (Pruefung bei COMMIT)" \
  "begin;
   insert into buchung (id,mandant_id,buchungskreis_id,jahr,belegdatum,buchungsdatum,buchungstext,quelle,zeilen_digest,hash)
    values ('a7000000-0000-0000-0000-0000000000b6','$MA','$BK',2026,'2026-02-01','2026-02-01','unausgeglichen','regel','$DBAD','x');
   insert into buchungszeile (mandant_id,buchung_id,zeilen_nr,konto_id,sh,betrag_cent) values
    ('$MA','a7000000-0000-0000-0000-0000000000b6',1,'$KF','S',50000),
    ('$MA','a7000000-0000-0000-0000-0000000000b6',2,'$KE','H',40000);
   commit;"
erwartet_fehler "B7 nachtraeglich eingeschmuggelte 3. Zeile" \
  "begin;
   insert into buchung (id,mandant_id,buchungskreis_id,jahr,belegdatum,buchungsdatum,buchungstext,quelle,zeilen_digest,hash)
    values ('a7000000-0000-0000-0000-0000000000b7','$MA','$BK',2026,'2026-02-02','2026-02-02','geschmuggelt','regel','$D1','x');
   insert into buchungszeile (mandant_id,buchung_id,zeilen_nr,konto_id,sh,betrag_cent,objekt_id) values
    ('$MA','a7000000-0000-0000-0000-0000000000b7',1,'$KF','S',85000,'$OBJ'),
    ('$MA','a7000000-0000-0000-0000-0000000000b7',2,'$KE','H',85000,'$OBJ'),
    ('$MA','a7000000-0000-0000-0000-0000000000b7',3,'$KH','S',0,'$OBJ');
   commit;"
q "update periode set status='festgeschrieben' where mandant_id='$MA' and jahr=2026 and monat=3" >/dev/null
erwartet_fehler "B8 Buchung in festgeschriebene Periode" \
  "insert into buchung (id,mandant_id,buchungskreis_id,jahr,belegdatum,buchungsdatum,buchungstext,quelle,zeilen_digest,hash)
   values (gen_random_uuid(),'$MA','$BK',2026,'2026-03-05','2026-03-05','zu spaet','regel','$D1','x')"
erwartet_wert "B9 keine Luecke im Nummernkreis nach 3 Fehlversuchen" \
  "select count(*) from buchung where mandant_id='$MA'" "1"

echo ""
echo "C · ZEITSCHEIBEN (Ausschluss-Constraints)"
q "insert into nutzungszeitraum (mandant_id,einheit_id,vertrag_id,art,gueltig_von,gueltig_bis)
   values ('$MA','$EIN','$VTR','miete','2022-01-01','2025-12-31')" >/dev/null
erwartet_fehler "C1 Mieterwechsel mit Ueberlappung (1 Tag)" \
  "insert into nutzungszeitraum (mandant_id,einheit_id,art,gueltig_von,gueltig_bis)
   values ('$MA','$EIN','leerstand','2025-12-31','2026-01-31')"
erwartet_wert "C2 lueckenloser Anschluss am Folgetag" \
  "insert into nutzungszeitraum (mandant_id,einheit_id,art,gueltig_von,gueltig_bis)
   values ('$MA','$EIN','leerstand','2026-01-01','2026-01-31') returning 1" "1"
erwartet_fehler "C3 zweite offene Scheibe (bis = NULL) kollidiert" \
  "insert into nutzungszeitraum (mandant_id,einheit_id,art,gueltig_von,gueltig_bis)
   values ('$MA','$EIN','leerstand','2026-06-01',NULL);
   insert into nutzungszeitraum (mandant_id,einheit_id,art,gueltig_von,gueltig_bis)
   values ('$MA','$EIN','leerstand','2026-09-01',NULL)"
erwartet_wert "C4 geteilte Gewerbeflaeche: zwei Mieter gleichzeitig" \
  "insert into nutzungszeitraum (mandant_id,einheit_id,vertrag_id,art,teilflaeche,gueltig_von,gueltig_bis)
   values ('$MA','$EIN','$VTR','miete','Nordfluegel','2022-01-01','2025-12-31') returning 1" "1"
q "insert into einheit_bezugswert (mandant_id,einheit_id,art,wert,quelle,gueltig_von,gueltig_bis)
   values ('$MA','$EIN','wohnflaeche',72.40,'aufmass','2022-01-01','2025-06-30')" >/dev/null
erwartet_fehler "C5 Flaechenaenderung mit Ueberlappung" \
  "insert into einheit_bezugswert (mandant_id,einheit_id,art,wert,quelle,gueltig_von,gueltig_bis)
   values ('$MA','$EIN','wohnflaeche',75.10,'aufmass','2025-01-01',NULL)"
erwartet_wert "C6 andere Bezugswert-Art parallel erlaubt" \
  "insert into einheit_bezugswert (mandant_id,einheit_id,art,wert,quelle,gueltig_von)
   values ('$MA','$EIN','personen',3,'meldung','2022-01-01') returning 1" "1"
q "insert into vertrag_kondition (mandant_id,vertrag_id,art,betrag_cent,gueltig_von,gueltig_bis)
   values ('$MA','$VTR','miete_kalt',85000,'2022-01-01','2024-12-31')" >/dev/null
erwartet_fehler "C7 Mieterhoehung mit Ueberlappung" \
  "insert into vertrag_kondition (mandant_id,vertrag_id,art,betrag_cent,gueltig_von)
   values ('$MA','$VTR','miete_kalt',91000,'2024-06-01')"

echo ""
echo "D · FACHINVARIANTEN"
erwartet_fehler "D1 Umlageschluessel-Wechsel ohne Beschluss" \
  "insert into umlageregel (mandant_id,objekt_id,konto_id,schluessel,ist_gesetzlicher_default,gueltig_von)
   values ('$MA','$OBJ','$KH','personen',false,'2026-01-01')"
erwartet_wert "D2 Umlageschluessel-Wechsel MIT Beschluss" \
  "insert into umlageregel (mandant_id,objekt_id,konto_id,schluessel,ist_gesetzlicher_default,beschluss_ref,gueltig_von)
   values ('$MA','$OBJ','$KH','personen',false,gen_random_uuid(),'2026-01-01') returning 1" "1"
erwartet_fehler "D3 HeizkostenV: Grundkosten 60 % (zulaessig 30-50)" \
  "insert into umlageregel (mandant_id,objekt_id,konto_id,schluessel,grundkosten_prozent,gueltig_von)
   values ('$MA','$OBJ','$KE','verbrauch',60,'2026-01-01')"
erwartet_fehler "D4 zweite Umlageregel fuer dieselbe Kostenart" \
  "insert into umlageregel (mandant_id,objekt_id,konto_id,schluessel,gueltig_von)
   values ('$MA','$OBJ','$KH','flaeche','2026-06-01')"
erwartet_fehler "D5 umlagefaehig ohne BetrKV-Fundstelle" \
  "insert into konto (mandant_id,nummer,bezeichnung,art,ea_klasse,umlagefaehig_miete)
   values ('$MA','4999','Erfundene Umlage','aufwand','ausgabe',true)"
erwartet_fehler "D6 Fremdgeld auf Eigenkreis (MaBV)" \
  "insert into buchungskreis (mandant_id,art,bezeichnung,fremdgeld)
   values ('$MA','verwalter','Eigenbuecher',true)"
erwartet_fehler "D7 Leerstand mit Vertragsbezug" \
  "insert into nutzungszeitraum (mandant_id,einheit_id,vertrag_id,art,gueltig_von)
   values ('$MA','$EIN','$VTR','leerstand','2030-01-01')"

echo ""
echo "E · ZAHLUNGSZUORDNUNG"
q "insert into sollstellung (id,mandant_id,buchungskreis_id,objekt_id,einheit_id,vertrag_id,schuldner_partei_id,art,periode,betrag_cent,faellig_am,restbetrag_cent)
   values ('a8000000-0000-0000-0000-000000000001','$MA','$BK','$OBJ','$EIN','$VTR','$P','miete_kalt','2026-01',85000,'2026-01-03',85000)" >/dev/null
q "insert into bankumsatz (id,mandant_id,buchungskreis_id,konto_iban,buchungstag,valuta,betrag_cent,import_hash,offen_cent)
   values ('a9000000-0000-0000-0000-000000000001','$MA','$BK','DE02120300000000202051','2026-01-05','2026-01-05',50000,'h1',50000)" >/dev/null
q "insert into zahlungszuordnung (mandant_id,bankumsatz_id,sollstellung_id,betrag_cent)
   values ('$MA','a9000000-0000-0000-0000-000000000001','a8000000-0000-0000-0000-000000000001',50000)" >/dev/null
erwartet_wert "E1 Teilzahlung -> Restbetrag per Trigger" \
  "select restbetrag_cent from sollstellung where id='a8000000-0000-0000-0000-000000000001'" "35000"
erwartet_wert "E2 Teilzahlung -> Status" \
  "select status from sollstellung where id='a8000000-0000-0000-0000-000000000001'" "teilbezahlt"
erwartet_wert "E3 Bankumsatz vollstaendig zugeordnet" \
  "select offen_cent from bankumsatz where id='a9000000-0000-0000-0000-000000000001'" "0"
erwartet_fehler "E4 Ueberzuordnung des Bankumsatzes" \
  "insert into zahlungszuordnung (mandant_id,bankumsatz_id,sollstellung_id,betrag_cent)
   values ('$MA','a9000000-0000-0000-0000-000000000001','a8000000-0000-0000-0000-000000000001',1)"
erwartet_fehler "E5 Zuordnung ohne Ziel (weder Soll noch Rechnung)" \
  "insert into zahlungszuordnung (mandant_id,bankumsatz_id,betrag_cent)
   values ('$MA','a9000000-0000-0000-0000-000000000001',100)"
q "insert into eingangsrechnung (id,mandant_id,buchungskreis_id,format,kreditor_name_roh,rechnungs_nr,rechnungsdatum,faellig_am,brutto_cent,netto_cent,ust_cent,restbetrag_cent)
     values ('aa000000-0000-0000-0000-000000000001','$MA','$BK','zugferd','Meier GmbH','R-1','2026-01-02','2026-02-01',11900,10000,1900,11900)" >/dev/null
erwartet_fehler "E6 Zuordnung an Soll UND Rechnung gleichzeitig" \
  "insert into zahlungszuordnung (mandant_id,bankumsatz_id,sollstellung_id,eingangsrechnung_id,betrag_cent)
     values ('$MA','a9000000-0000-0000-0000-000000000001','a8000000-0000-0000-0000-000000000001','aa000000-0000-0000-0000-000000000001',1)"
erwartet_fehler "E7 Rechnung brutto <> netto + ust" \
  "insert into eingangsrechnung (mandant_id,buchungskreis_id,format,kreditor_name_roh,rechnungs_nr,rechnungsdatum,faellig_am,brutto_cent,netto_cent,ust_cent,restbetrag_cent)
   values ('$MA','$BK','zugferd','Meier GmbH','R-2','2026-01-02','2026-02-01',12000,10000,1900,12000)"

echo ""
echo "F · KI-ENTSCHEIDUNGSSCHLEIFE"
erwartet_fehler "F1 Gestaltungsrecht mit Autonomiestufe 3" \
  "insert into vorschlag (mandant_id,agent_id,agent_version,modell_version,prozess,kategorie,titel,kurzfassung,begruendung,plan,plan_hash,rechtsnatur,konfidenz,risiko,reversibel,autonomiestufe)
   values ('$MA','kuendigung','1','m1','M-06','eskalation','Kuendigung','K','B','{}','h1','gestaltungsrecht',0.99,'hoch',false,'s3')"
erwartet_wert "F2 Wissenserklaerung autonom erlaubt" \
  "insert into vorschlag (mandant_id,agent_id,agent_version,modell_version,prozess,kategorie,titel,kurzfassung,begruendung,plan,plan_hash,rechtsnatur,konfidenz,risiko,reversibel,autonomiestufe)
   values ('$MA','abrechnung','1','m1','M-14','abrechnung','BK-Abrechnung','A','B','{}','h2','wissenserklaerung',0.97,'niedrig',true,'s3') returning 1" "1"
erwartet_fehler "F3 derselbe Plan-Hash zweimal (Idempotenz)" \
  "insert into vorschlag (mandant_id,agent_id,agent_version,modell_version,prozess,kategorie,titel,kurzfassung,begruendung,plan,plan_hash,rechtsnatur,konfidenz,risiko,reversibel,autonomiestufe)
   values ('$MA','abrechnung','1','m1','M-14','abrechnung','Dublette','A','B','{}','h2','wissenserklaerung',0.97,'niedrig',true,'s3')"
VS=$(q "select id from vorschlag where plan_hash='h2'")
q "insert into entscheidung (mandant_id,vorschlag_id,stufe,entscheider_partei_id,art,plan_hash)
   values ('$MA','$VS',1,'a4000000-0000-0000-0000-000000000009','zustimmen','h2')" >/dev/null
erwartet_fehler "F4 zweite Entscheidung auf derselben Stufe" \
  "insert into entscheidung (mandant_id,vorschlag_id,stufe,entscheider_partei_id,art,plan_hash)
   values ('$MA','$VS',1,'a4000000-0000-0000-0000-000000000001','zustimmen','h2')"
erwartet_wert "F5 Vier-Augen: zweite Stufe erlaubt" \
  "insert into entscheidung (mandant_id,vorschlag_id,stufe,entscheider_partei_id,art,plan_hash)
   values ('$MA','$VS',2,'a4000000-0000-0000-0000-000000000001','zustimmen','h2') returning 1" "1"
erwartet_fehler "F6 Entscheidung nachtraeglich aendern" \
  "update entscheidung set art='ablehnen' where vorschlag_id='$VS' and stufe=1"
erwartet_fehler "F7 'aendern_zustimmen' ohne geaenderten Plan-Hash" \
  "insert into entscheidung (mandant_id,vorschlag_id,stufe,entscheider_partei_id,art,plan_hash)
   values ('$MA','$VS',2,'a4000000-0000-0000-0000-000000000001','aendern_zustimmen','h2')"

echo ""
echo "G · AUDIT-TRAIL"
q "insert into audit_ereignis (mandant_id,akteur_art,akteur_id,akteur_name,aktion,entitaet,entitaet_id,legitimation,hash)
   values ('$MA','agent','abrechnung','Abrechnungsagent v1','buchung.erstellt','buchung','a7000000-0000-0000-0000-000000000001','entscheidung','x')" >/dev/null
q "insert into audit_ereignis (mandant_id,akteur_art,akteur_id,akteur_name,aktion,entitaet,entitaet_id,legitimation,hash,idempotenz_schluessel)
   values ('$MA','mensch','u1','Verwalter Mensch','vorschlag.freigegeben','vorschlag','$VS','vier_augen','x','k1')" >/dev/null
erwartet_wert "G1 Folgenummern lueckenlos" \
  "select string_agg(folge_nr::text,',' order by folge_nr) from audit_ereignis where mandant_id='$MA'" "1,2"
erwartet_wert "G2 Hash-Kette verkettet (hash_prev = Vorgaenger)" \
  "select count(*) from audit_ereignis a join audit_ereignis b
     on b.mandant_id=a.mandant_id and b.folge_nr=a.folge_nr-1 and a.hash_prev=b.hash" "1"
erwartet_fehler "G3 Audit-Eintrag nachtraeglich aendern" \
  "update audit_ereignis set akteur_name='jemand anderes' where folge_nr=1 and mandant_id='$MA'"
erwartet_fehler "G4 Audit-Eintrag loeschen" \
  "delete from audit_ereignis where folge_nr=1 and mandant_id='$MA'"
erwartet_fehler "G5 doppelte Ausfuehrung (Idempotenzschluessel)" \
  "insert into audit_ereignis (mandant_id,akteur_art,akteur_id,akteur_name,aktion,entitaet,entitaet_id,legitimation,hash,idempotenz_schluessel)
   values ('$MA','agent','a1','Agent','erneut','vorschlag','$VS','entscheidung','x','k1')"

echo ""
echo "H · DOKUMENTE UND VERKNUEPFUNG"
q "insert into dokument (id,mandant_id,objekt_id,art,titel,aktenplan,dateiname,mime,groesse_bytes,sha256,blob_uri)
   values ('ab000000-0000-0000-0000-000000000001','$MA','$OBJ','rechnung','R-1 Meier','03 Rechnungen','r1.pdf','application/pdf',1024,'sha-1','s3://a/r1')" >/dev/null
erwartet_wert "H1 Dokument an Rechnung haengen (bezug)" \
  "insert into bezug (mandant_id,quelle_art,quelle_id,ziel_art,ziel_id,rolle)
   values ('$MA','dokument','ab000000-0000-0000-0000-000000000001','eingangsrechnung','aa000000-0000-0000-0000-000000000001','beleg') returning 1" "1"
erwartet_fehler "H2 bezug auf nicht existierendes Ziel" \
  "insert into bezug (mandant_id,quelle_art,quelle_id,ziel_art,ziel_id,rolle)
   values ('$MA','dokument','ab000000-0000-0000-0000-000000000001','buchung',gen_random_uuid(),'beleg')"
erwartet_fehler "H3 bezug auf Zeile eines fremden Mandanten" \
  "insert into bezug (mandant_id,quelle_art,quelle_id,ziel_art,ziel_id,rolle)
   values ('$MA','dokument','ab000000-0000-0000-0000-000000000001','objekt','b2000000-0000-0000-0000-000000000001','betrifft')"
erwartet_fehler "H4 Dokumentinhalt (sha256) aendern" \
  "update dokument set sha256='gefaelscht' where id='ab000000-0000-0000-0000-000000000001'"
erwartet_wert "H5 Metadaten (Aktenplan) bleiben pflegbar" \
  "update dokument set aktenplan='04 Vertraege' where id='ab000000-0000-0000-0000-000000000001' returning 1" "1"
q "update dokument set rechtlicher_halt=true where id='ab000000-0000-0000-0000-000000000001'" >/dev/null
erwartet_fehler "H6 rechtlichen Halt aufheben" \
  "update dokument set rechtlicher_halt=false where id='ab000000-0000-0000-0000-000000000001'"

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
printf "  ERFOLGREICH: %s    FEHLGESCHLAGEN: %s\n" "$PASS" "$FAIL"
echo "═══════════════════════════════════════════════════════════════════════"
[ "$FAIL" -eq 0 ]
