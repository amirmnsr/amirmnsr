


INSERT INTO mandant (id,name,kurz,mail_domain,sitz) VALUES
 ('aaaaaaaa-0000-0000-0000-000000000001','Hausverwaltung Alpha','alpha','alpha.immos.de','Muenchen'),
 ('bbbbbbbb-0000-0000-0000-000000000002','Hausverwaltung Beta','beta','beta.immos.de','Hamburg');

INSERT INTO buchungskreis (id,mandant_id,art,bezeichnung,fremdgeld) VALUES
 ('a1000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','gdwe','WEG Hauptstr 12',true),
 ('b1000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','gdwe','WEG Elbchaussee 3',true);

INSERT INTO objekt (id,mandant_id,buchungskreis_id,nummer,bezeichnung,strasse,plz,ort,bundesland,verwaltungsarten,verwaltungsbeginn) VALUES
 ('a2000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','1042','Hauptstr 12','Hauptstr 12','80331','Muenchen','BY','{weg}','2020-01-01'),
 ('b2000000-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000001','2001','Elbchaussee 3','Elbchaussee 3','22765','Hamburg','HH','{weg}','2021-01-01');

INSERT INTO einheit (id,mandant_id,objekt_id,nummer,lage,typ) VALUES
 ('a3000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','01','EG links','wohnung');

INSERT INTO partei (id,mandant_id,typ,name) VALUES
 ('a4000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','natuerlich','Maria Schulz'),
 ('a4000000-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000001','natuerlich','Verwalter Mensch');

INSERT INTO vertrag (id,mandant_id,buchungskreis_id,objekt_id,art,nummer,beginn) VALUES
 ('a5000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','a2000000-0000-0000-0000-000000000001','miete_wohnraum','MV-1042-01','2022-01-01');

INSERT INTO konto (id,mandant_id,nummer,bezeichnung,art,ea_klasse,betrkv_ziffer,umlagefaehig_miete) VALUES
 ('a6000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','8100','Mieterträge','ertrag','einnahme',NULL,false),
 ('a6000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','1400','Forderungen Mieter','forderung','vermoegen',NULL,false),
 ('a6000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','4300','Hausmeister','aufwand','ausgabe',14,true);

-- Perioden 2026: Jahresanker (monat 0) + Monate
INSERT INTO periode (mandant_id,buchungskreis_id,jahr,monat,status,journal_nr_naechste)
 VALUES ('aaaaaaaa-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',2026,0,'offen',1);
INSERT INTO periode (mandant_id,buchungskreis_id,jahr,monat,status)
 SELECT 'aaaaaaaa-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',2026,g,'offen' FROM generate_series(1,12) g;

