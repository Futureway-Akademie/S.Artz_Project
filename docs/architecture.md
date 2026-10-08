# Architektur

Status: von Sascha freigegeben und vollständig umgesetzt (2026-10-07, Roadmap v2, alle 21 Tasks). Abweichungen und Präzisierungen stehen in `docs/decisions.md`, das Prüfprotokoll in `docs/pruefprotokoll.md`.

## Teil A – CRM-Konzept: Was ergibt für Sascha Sinn?

### Leitidee

Ein normales Vertriebs-CRM fragt: „Wie viel Umsatz bringt dieser Kunde?“ Saschas CRM fragt: **„Mit wem muss ich als Nächstes sprechen, und wozu?“**

Saschas Kontakte kommen aus drei Lebensbereichen:

| Bereich | Typische Kontakte | Zweck im CRM |
|---|---|---|
| **Jobsuche** | Recruiter, Ansprechpartner in Unternehmen, Personalvermittler | Bewerbungen nachhalten, Rückmeldungen nicht verpassen |
| **Weiterbildung / Netzwerk** | Dozenten, Mitteilnehmende, Coaches der Akademie | Kontakte pflegen, Empfehlungen, Austausch |
| **PIKARTZ.AI / Automationen** | Interessenten für Schulungen oder Automationen, Partner | Anfragen erfassen, nächste Aktion festhalten |

Im CRM sind **keine dieser Kontakte vorbefüllt**. Die Tabelle beschreibt nur, wofür das CRM gebaut wird.

### Was sinnvoll ist (umgesetzt)

1. **Kontakte mit Kontext** (task-3-1)
   - Felder: Name, Rolle, Unternehmen, E-Mail, Telefon, LinkedIn-URL, Notiz
   - **Kontext-Kategorie** als Filter: Jobsuche · Weiterbildung · PIKARTZ.AI · Sonstiges. Das trennt die drei Lebensbereiche, ohne drei Systeme zu brauchen.
   - **Herkunft** als Freitext (z. B. „LinkedIn“, „Workshop“). Hilft später bei der Frage „Wo habe ich wen kennengelernt?“.
2. **Unternehmen** (task-3-1)
   - Felder: Name, Branche, Website, Notiz
   - Zeigt verknüpfte Kontakte, Bewerbungen und Leads. So sieht Sascha bei einer Firma sofort: Habe ich mich dort beworben? Kenne ich dort jemanden?
3. **Kommunikationsverlauf** (task-3-2)
   - Kurze Einträge: Art (E-Mail, Telefonat, Treffen, Nachricht, Notiz), Datum, 1–3 Sätze, optional Projektbezug
   - Kein E-Mail-Import, keine Synchronisation.
4. **Wiedervorlage / nächste Aktion** (task-3-2), das Herzstück
   - Pro Kontakt eine nächste Aktion mit optionalem Datum, z. B. „Nachfassen wegen Gespräch“.
   - Erscheint im Cockpit unter „Nächste Schritte“, zusammen mit den Projektaufgaben.
   - Ohne Datum: „Noch keine Frist hinterlegt“.
5. **Projektbezug** (task-3-2)
   - Kontakte lassen sich Projekten zuordnen, z. B. wer Feedback zum Make.com-Workflow gegeben hat.
   - Im Projektdetail erscheinen die zugehörigen Kontakte.
6. **Bewerbungen als eigene Pipeline** (task-3-4)
   - Status: Geplant → Beworben → Im Gespräch → Angebot / Absage / Zurückgezogen
   - Je Bewerbung: Stelle, Unternehmen, Zielrolle, Ansprechpartner (Kontakt), Bewerbungsdatum, Link zur Ausschreibung, nächster Schritt, Notiz
   - Verknüpft mit den 3 **Zielrollen** (lokal vorbefüllt)
   - **Bezug zum n8n Jobsuche-Assistenten**: Feld „Quelle“ (z. B. „Jobsuche-Assistent“, „LinkedIn“, „Direkt“). Nur Freitext, keine Live-Anbindung.
7. **Leads, optional und schlank** (task-3-3)
   - Für Anfragen rund um PIKARTZ.AI (Schulung, Automation)
   - Status: Neu → Im Austausch → Angebot → Zusage / Absage
   - Betrag **optional**; leer wird als „Kein Betrag“ angezeigt und nie als 0 €.
   - Keine Abschlusswahrscheinlichkeit, keine Prognose.
8. **Cockpit-Kompaktbereich** (task-3-5): drei berechnete Zeilen
   - fällige Wiedervorlagen (heute und überfällig)
   - laufende Bewerbungen nach Status
   - offene Leads
   - Jede Zeile führt in die gefilterte Liste. Ohne Daten erscheint ein Leerzustand.
9. **Suche und Filter** überall: Name, Unternehmen, Kontext, Status, „mit fälliger Aktion“.

### Was bewusst NICHT gebaut wird

- Umsatzprognosen, Abschlusswahrscheinlichkeiten, Lead-Scoring, Vertriebs-Funnel-Charts
- Massen-E-Mails, Newsletter, E-Mail-Versand aus der App
- Live-Integrationen mit HubSpot, Outlook, LinkedIn usw. (die Daten bleiben im Demo-Speicher)
- Team- und Rechteverwaltung
- Vorbefüllte Kontakte, Unternehmen, Bewerbungen oder Leads

### Kleine Roadmap-Präzisierung (keine neue Version nötig)

Die Felder Kontext-Kategorie, Herkunft, LinkedIn-URL, Ansprechpartner und Quelle bei Bewerbungen passen in die bestehenden Tasks 3-1, 3-2 und 3-4. Ihre `definitionOfDone` wird beim Start des jeweiligen Tasks um diese Punkte ergänzt; das wird in `activity.jsonl` protokolliert.

---

## Teil B – Technische Architektur

### Grundentscheidungen

- React 18 + Vite + TypeScript
- `react-router` v7 mit `BrowserRouter`; Fallback auf `HashRouter` ist dokumentiert
- **zod** validiert localStorage und Import
- Eigenes CSS mit Tokens und CSS-Modulen, eigene Inline-SVG-Icons, keine UI-Bibliothek
- ESLint 9 mit typescript-eslint, react-hooks und jsx-a11y
- Vitest + Testing Library + jsdom, Zeitzone `TZ=Europe/Berlin` in den Tests
- Datumsfelder als `YYYY-MM-DD` (lokal geparst), Zeitpunkte als ISO; `now` wird an Reducer und Selektoren übergeben

### Ordnerstruktur (umgesetzt, Roadmap v3)

```
csp.config.ts                 Content-Security-Policy (per Vite-Plugin nur im Build; mit Supabase genau eine Ausnahme)
supabase/schema.sql           Tabelle tresor mit Row Level Security und Check „nur verschlüsselt“
.env.example                  Vorlage für .env.local (Supabase-Adresse und anon key)
src/
├─ main.tsx, App.tsx          CloudProvider → TresorGate → CloudSync → StoreProvider → StoreGate → ToastProvider → BrowserRouter
├─ app/                       routes.tsx, TresorGate (Passwort, Sperre, Wiederherstellung), tresorContext,
│                             CloudProvider/cloudContext (Login), CloudSync/syncContext (Abgleich),
│                             StoreGate (Fehlerseite bei defekten Daten)
├─ styles/                    tokens.css, fonts.css, base.css, contrast.ts (+ Kontrast-Test)
├─ domain/                    types.ts (aus zod abgeleitet), dates.ts, labels.ts, url.ts
│  └─ selectors/              projekte, aufgaben, bezug, automationen, weiterbildung, cockpit,
│                             crm, leads, bewerbungen, datenschutz, verknuepft, suche,
│                             kalender, vorlagen, beziehung, schlagworte, wissen
├─ data/                      schema.ts (zod, Version 7), migrations.ts (1 → 7), storage.ts,
│                             tresorKrypto.ts (Datenschlüssel, Version 2), wiederherstellung.ts,
│                             cloud/ (cloud.ts Schnittstelle, supabase.ts einziges Netzwerkmodul, sync.ts),
│                             krypto.ts (AES-GCM/PBKDF2), tresor.ts (verschlüsselter Speicher),
│                             sicherung.ts (verschlüsselte Sicherung), exportImport.ts,
│                             empty.ts, seed.ts (+ lokal seed.privat.ts), vorlagen.ts,
│                             actions.ts, reducer.ts, activity.ts, store.tsx, storeContext.ts
├─ hooks/                     useForm, useNow
├─ components/
│  ├─ layout/                 AppShell (Suche/Neu, Sperren), NavList, NavDrawer, Seite, navigation.ts
│  ├─ brand/                  Wordmark, Logo (mit Platzhalter), Diamond
│  └─ ui/                     Button, Field, Badge, Panel, Tabs, Dialog, FormDialog,
│                             ConfirmDialog, PasswortDialog, Toast, DueLabel, Icon,
│                             ExternerLink, States
├─ features/                  cockpit, projekte, automationen, weiterbildung, marke,
│                             aufgaben (inkl. FokusKnopf), kalender, kontakte (Unternehmen,
│                             Leads, Vorlagen, E-Mail, Datenschutz), bewerbungen (Pipeline),
│                             gemeinsam (Gesamtsicht), suche (Suche, Schnellerfassung),
│                             wissen (zweites Gehirn, Lerntagebuch),
│                             einstellungen (Sicherheit, Wiederherstellung, Konto), NichtGefunden
└─ test/                      setup, fakes, renderApp, beispielStart (fiktive Startdaten),
                              barrierefreiheit (axe-core), datenschutz (Wächter),
                              keineVerbindung (CSP und Quellcode)
public/brand/                 Logos unverändert
```

### Routen

| Pfad | Seite |
|---|---|
| `/` | Arbeitscockpit |
| `/projekte`, `/projekte/:id` | Projektliste, Projektdetail mit nächsten Schritten |
| `/automationen` | Automationen nach Plattform oder Projekt |
| `/weiterbildung` | Kurs, Arbeitstage, Kursaufgaben, Fortschritt |
| `/pikartz-ai` | Marke, Designregeln, Präsentations-System |
| `/aufgaben` (`?ansicht=termine`) | Aufgaben (mit Fokus) und Termine |
| `/wissen`, `/wissen/:id` | Zweites Gehirn: Notizen, Tools, Erkenntnisse, Quellen, Lerntagebuch |
| `/werkzeug`, `/werkzeug/:art`, `/werkzeug/:art/:id` | KI-Werkzeugkasten: Übersicht, Liste je Typ (prompts, befehle, agenten, skills, anleitungen, integrationen, workflows, abos), Detail |
| `/postfach` | Gmail-Postfach: passende Mails abrufen, zuordnen, in den Verlauf übernehmen |
| `/assistent` | KI-Assistent: Fragen an die eigenen Daten (Bereiche wählbar, Freigabe-Dialog) |
| `/admin` | Nutzer & Rollen (nur Admin): einladen, Rollen, Bereiche je Nutzer, sperren, Bereiche teilen |
| `/geteilt` | Geteilt mit mir (eingeladene Nutzer): vom Admin geteilte Bereiche, nur lesen |
| `/bewerbungen/dokumente` | Dokumente: verschlüsselt ablegen, öffnen, an Bewerbungen hängen |
| `/wiederherstellen#schluessel=…` | Einstieg über den Wiederherstellungslink (vor dem Entsperren) |
| `/kalender` (`?ansicht=monat\|woche\|liste&datum=…`) | Kalender mit Terminen, Fristen, Wiedervorlagen, Kursaufgaben; .ics-Export |
| `/kontakte` (`?faellig=1`, `?pruefen=1`), `/kontakte/:id` | Kontakte, Kontaktdetail mit Verlauf, Wiedervorlage, E-Mail, Datenschutz, Gesamtsicht |
| `/kontakte/unternehmen`, `/kontakte/unternehmen/:id` | Unternehmen mit Gesamtsicht |
| `/kontakte/leads`, `/kontakte/leads/:id` | Leads, Lead-Detail mit Gesamtsicht |
| `/kontakte/vorlagen` | E-Mail-Vorlagen |
| `/bewerbungen` (`?ansicht=pipeline`), `/bewerbungen/:id`, `/bewerbungen/zielrollen` | Bewerbungen mit Kennzahlen und Pipeline, Detail, Zielrollen |
| `/einstellungen` | Speicherung, Sicherheit und Wiederherstellung, Konto und Synchronisierung, Datenschutz, Anzeigename, Sicherung und Import, Zurücksetzen |
| `*` | Seite nicht gefunden |

### Qualitätssicherung

- `npm test`: Vitest mit jsdom (Zeitzone Europe/Berlin)
  - Unit-Tests für Reducer, Speicherschicht, Migrationen, Seed, Verschlüsselung, Datums-Hilfen und alle Selektoren
  - Bedienungstests je Bereich (Testing Library), inkl. Passwortschutz, Sicherung, Suche, Kalender, E-Mail
  - axe-core-Prüfung aller Seiten und Dialoge
  - Wächter: keine persönlichen Begriffe im Repository (`datenschutz.test.ts`), keine Netzwerkzugriffe und strikte CSP (`keineVerbindung.test.tsx`)
- `npm run lint` (ESLint 9 mit jsx-a11y und react-hooks), `npm run typecheck`, `npm run build`

### Datenschutz und Sicherheit (Roadmap v3)

- Keine Verbindung nach außen (CSP `connect-src 'none'`, keine fremden Skripte, Schriften oder Bilder).
- Daten im Browser nur verschlüsselt (AES-GCM 256, Schlüssel per PBKDF2-SHA-256 mit 600 000 Runden); Klartext nur im Arbeitsspeicher; automatische Sperre nach Inaktivität.
- Sicherungen nur verschlüsselt; Auskunft (Art. 15) und Kalenderexport bewusst unverschlüsselt mit Hinweis.
- Kontakte mit Rechtsgrundlage und Zweck; Löschen entfernt die Person auch aus dem Protokoll; Prüfhinweis nach 12 Monaten.
- Persönliche Startdaten nur lokal (`seed.privat.ts`), Tests mit fiktiven Daten.
- Tresor Version 2: zufälliger Datenschlüssel, verpackt per Passwort und optional per Wiederherstellungsschlüssel (der nur im #-Teil des Links in Saschas eigener Mail steht).
- Optional Supabase (Roadmap v4): Login per E-Mail-Link, Ende-zu-Ende-verschlüsselte Synchronisierung; Supabase speichert nur E-Mail-Adresse und Chiffretext.
- Optional Gmail (Roadmap v6): nur `gmail.readonly`, Anmeldung per Weiterleitung ohne Google-Skript, Token nur im Arbeitsspeicher; CSP öffnet dann genau `gmail.googleapis.com` und `oauth2.googleapis.com`. Einziges Modul mit `fetch`: `src/data/gmail/gmail.ts`.
- **Mehrbenutzer (Roadmap v7):**
  - Supabase-Tabellen `rollen`, `profile` (erstes Konto = Admin), `schluessel`, `freigaben`, `freigabe_schluessel`, `freigabe_kreis`, `ki_nutzung`, `webhooks`, `push_abos`, dazu der Bucket `dokumente`.
  - **Freigabe-Kreis (Roadmap v8):** Der Admin legt Paare fest, die miteinander teilen und Aufgaben übergeben dürfen. Dazu kommt das Recht „darf teilen“ je Rolle, je Nutzer abweichend. Die Funktionen `darf_teilen()`, `darf_teilen_mit(anderer)` und `meine_kreis_partner()` prüfen das in der Datenbank; Empfänger-Schlüssel lassen sich nur für erlaubte Partner schreiben.
  - Alle Regeln (RLS, Spaltenrechte) stehen in `supabase/schema.sql` und sind mit PGlite getestet (`src/test/supabaseRegeln.test.ts`).
  - Server-Funktionen in `supabase/functions`: `einladen`, `ki` (Claude über AWS Bedrock Frankfurt), `workflow` (n8n/Make), `erinnern` (Push).
- Werkzeugkasten speichert nie Schlüssel: Eingaben, die wie Schlüssel oder Passwörter aussehen, werden erkannt und erst nach Entfernen oder ausdrücklicher Bestätigung gespeichert; bei Integrationen wird nur der Ablageort notiert.

### Datenmodell (Kern)

- **Projekt**
  - Felder: Titel, Beschreibung, Status (`idee | in_arbeit | pausiert | abgeschlossen | null`), Tools, Bestandteile, Notizen
  - optional eingebettetes **AutomationProfil**:
    - Plattform: n8n · Make.com · Sonstige
    - Modell, Prompt-Version, Schwelle in %, Statuswerte, Datenquellen
    - Pipeline: geordnet
    - Routing-Regeln, inklusive Fallback, mit `routingStatus: geplant | umgesetzt`
    - Logik-Hinweise
    - `verbindung: 'nicht_verbunden'` (fest)
- **Aufgabe**, einheitlich, mit `bezug`: ohne | projekt | weiterbildung | kontakt | unternehmen | lead | bewerbung; `fokus` für den Tagesfokus
  - „Nächste Schritte“ eines Projekts sind Aufgaben mit Projektbezug.
  - `faelligAm` ist nullable.
- **Termin**: Datum (Pflicht), Uhrzeit optional, Bezug
- **Kurs** (Zeitraum 2026-08 bis 2026-12, Arbeitstage Mo–Fr, Präfix `KURS`) und **KursAufgabe** (Code `^KURS_\d+_\d{2}$`, Status offen/in_arbeit/erledigt)
- **Designregel** und **Deck** (PIKARTZ.AI)
- **CRM**
  - Unternehmen
  - Kontakt: mit Kontext, Herkunft, LinkedIn, unternehmenId, projektIds, naechsteAktion, Rechtsgrundlage, Zweck, Schlagworte
  - Interaktion (Verlauf): optional zu Projekt, Bewerbung oder Lead; bei E-Mails Betreff und Richtung
  - Lead: `betragEur: number | null`, Projekt, Wiedervorlage
  - Vorlage: E-Mail-Vorlage mit Platzhaltern
- **Bewerbungen**: Zielrolle; Bewerbung mit Status, Zielrolle, Kontakt, Quelle, Datum, Link, nächstem Schritt und Wiedervorlage
- **Aktivität**: Zeitpunkt, Art, Bezug mit Titel-Snapshot, deutsche Zusammenfassung
- **Projekt** zusätzlich: Auftraggeber (Unternehmen), Schlagworte, „zuletzt aktiv“ wird automatisch nachgezogen
- **Einstellungen**: Anzeigename, Zeitpunkt der letzten Sicherung
- **Wissen** (zweites Gehirn): Typ, Titel, Inhalt, Thema, Quelle, Schlagworte, Datum/Kurstag, Projekte, Kurs, Kursaufgaben
- **Werkzeug** (KI-Werkzeugkasten): Typ (`prompt | befehl | agent | skill | anleitung | integration | workflow | abo`), Titel, Wofür, Inhalt, Plattform/Zielmodell/Umgebung/Anbieter, Status, Version, Link, Auslöser, Schritte (mit Erledigt), Integration (Art, Ablageort der Zugangsdaten, Region, AVV), Abo (Kosten, Abrechnung, nächste Verlängerung, Kündigungsfrist), verknüpfte Werkzeuge, Projekte, Schlagworte
- **Mail** (Postfach): Gmail-ID, Thread, Zeitpunkt, Von, An, Betreff, Auszug, Richtung, Kontakt/Unternehmen/Bewerbung, Status `neu | uebernommen | verworfen`; nach Übernahme oder Verwerfen werden die Inhalte gelöscht
- **Einstellungen** zusätzlich: Zeitpunkt des letzten Mailabrufs
- **KI-Protokoll**: Zeitpunkt, Aufgabe, Zeichen, Tokens – nie der Inhalt
- **Dokument**: Name, Typ, Größe, Pfad des verschlüsselten Inhalts (IndexedDB, angemeldet zusätzlich Supabase Storage), verknüpfte Bewerbungen
- **AppData**: `schemaVersion: 11` plus alle Listen; Migrationen 1 → 11 ohne Datenverlust (v8 übernimmt Wissens-Prompts als Masterprompts mit gleicher ID)

### Zustand und Speicherung

- **Store-Status**: `loading | ready | error`
- **Verschlüsselung**: Der TresorGate liefert dem StoreProvider einen `VerschluesselterSpeicher`; der Store selbst arbeitet unverändert synchron, geschrieben wird nur der verschlüsselte Umschlag.
- **Laden**: fehlt der Eintrag, wird der Seed geschrieben. Defektes JSON, ungültiges Schema oder eine neuere Version führt in den Fehlerzustand mit „Rohdaten exportieren“ und „Zurücksetzen“; in diesem Zustand wird nicht automatisch gespeichert. Ist localStorage nicht verfügbar, läuft die App im Speicher weiter und zeigt einen deutlichen Hinweis.
- **Speichern**: entprellt (400 ms) und zusätzlich bei `pagehide`. Bei Speicherfehler (z. B. Speicher voll) erscheint ein Banner mit Export.
- **Reiner Reducer**: `now` und `newId` kommen über `meta`.
  - Eine Aktivität entsteht nur bei echter Änderung (Felddiff). Speichern ohne Änderung erzeugt keine Aktivität.
  - Der Seed enthält keine Aktivitäten.
  - Lösch-Kaskaden sind definiert, der Bestätigungsdialog nennt die betroffenen Einträge.
- **Mehrere Tabs**: Auf das `storage`-Event folgt der Hinweis „In anderem Tab geändert – neu laden“.

### Zentrale Selektoren (rein, getestet)

| Selektor | Inhalt |
|---|---|
| `selectBegruessung` | Gruß nach Tageszeit, Name, Datum lang (de-DE) |
| `selectTagesuebersicht` | heute fällig, überfällig, Termine heute, Arbeitstag ja/nein |
| `selectNaechsteSchritte` | offene Projektaufgaben und Wiedervorlagen (Kontakte, laufende Bewerbungen, offene Leads); Reihenfolge: überfällig → mit Frist → ohne Frist |
| `selectFokus`, `selectWoche` | Aufgaben im Fokus mit Vorschlägen; die nächsten 7 Tage aus den Kalenderdaten |
| `selectSicherungHinweis` | Erinnerung ohne Sicherung oder ab 7 Tagen |
| `kalenderEintraege`, `alsIcs` | datierte Einträge aller Bereiche; iCalendar-Export |
| `selectVerknuepft` | „Alles dazu“ für Kontakt, Unternehmen, Projekt, Bewerbung, Lead (auch indirekt) |
| `suche` | Volltextsuche mit Relevanz über alle Bereiche |
| `bewerbungKennzahlen`, `bewerbungPipeline` | Kennzahlen und Spalten je Status |
| `kontaktpflege`, `kontakteMitPruefbedarf`, `datenauskunft` | letzter Kontakt und Funkstille; DSGVO-Prüfbedarf; Auskunft nach Art. 15 |
| `selectAktuelleProjekte` | nicht abgeschlossen/pausiert, mit offenen und erledigten Schritten; **kein Prozentwert** |
| `selectWeiterbildung` | Kursrelation (vor/laufend/nach), Arbeitstage (gesamt/vergangen/verbleibend, ohne Feiertage); Fortschritt `null`, solange keine Aufgaben eingetragen sind |
| `selectAutomationenNachPlattform` / `…NachProjekt` | gruppierte Sicht |
| `selectLetzteAktivitaeten` | neueste zuerst; leer → Leerzustand |
| `selectCrmUebersicht` | fällige Wiedervorlagen, Bewerbungen nach Status, offene Leads |
| `selectLeadSumme` | Summe nur über Leads mit Betrag; ohne Beträge `null` |
| `werkzeugListe`, `werkzeugVerknuepft`, `promptPlatzhalter`, `promptAusfuellen`, `geheimnisVerdacht` | Werkzeugkasten: Filter, Verknüpfungen in beide Richtungen, Platzhalter, Schlüsselwarnung |
| `aboUebersicht`, `aboTermine`, `selectAboFristen` | Monatskosten, fortgeschriebene Verlängerungen und letzte Kündigungstage (Kalender, Cockpit, Dashboard) |
| `abrufZiele`, `abfragen`, `mailZuordnen`, `kontaktAusMail` | Postfach: Suche nur nach Kontaktadressen und Unternehmensdomains, Zuordnung zu Kontakt, Unternehmen und Bewerbung |

Datums-Hilfen in `dates.ts`: `isWorkday`, `nextWorkday`, `countWorkdays`, `relativeDueLabel` (z. B. „Noch keine Frist hinterlegt“, „Überfällig seit 3 Tagen“, „Heute fällig“) sowie Formatierer über `Intl` mit `de-DE`.

### Navigation, Layout und Design

- **Breiten**
  - ≥ 1200 px: dunkle Sidebar (256 px) mit Wortmarke und Gruppen (Arbeit, KI-Werkzeugkasten – einklappbar, Lernen, Netzwerk & Karriere, Marke & System); der aktive Punkt hat einen blauen Balken und `aria-current`
  - 768–1199 px: Icon-Leiste mit kurzem Label; Gruppen durch Linien getrennt, der Werkzeugkasten als ein Punkt
  - < 768 px: dunkle Topbar und Menü als `<dialog>`-Schublade (Fokusfang, Esc schließt, Fokus kehrt zurück)
- **Immer sichtbar**: Skip-Link; Fokus auf das h1 bei Routenwechsel; Demo-Banner, nicht schließbar
- **Routen**: `/`, `/projekte(/:id)`, `/automationen`, `/weiterbildung`, `/pikartz-ai`, `/aufgaben`, `/kontakte` (plus `/unternehmen`, `/leads`, `/:id`), `/bewerbungen(/zielrollen)`, `/einstellungen`, NotFound
- **Farben**: Blau, Dunkel und Grau als Tokens, helle Fläche `#F6F7F9`. Kontrast: Blau auf Dunkel nur für große Schrift und Bedienelemente, Grau auf Dunkel aufgehellt. Ein Kontrast-Test prüft die Token-Paare.
- **Schrift**: Liberation Sans per `local()` bzw. mitgelieferten OFL-Dateien, Fallback Arial (metrisch gleich)
- **Diamant**: nur im Cockpit-Kopf und im PIKARTZ.AI-Kopf
- **Formulare**: kontrolliert über `useForm`, Validierung pro Entität als reine Funktion. Anlegen und Bearbeiten im Dialog, auf Mobil im Vollbild. Leere Zahlen werden zu `null`. Rückfrage „Änderungen verwerfen?“; nach dem Speichern ein Toast.

### Seed (öffentlich neutral, persönlich nur lokal)

Das Repository ist öffentlich. Alle persönlichen Startdaten (Projekte, Weiterbildung, Zielrollen, Anzeigename) stehen nur in `src/data/seed.privat.ts` (export `STARTDATEN`, von Git ignoriert). Ohne diese Datei startet die App ohne Projekte, Kurs und Zielrollen. Tests verwenden fiktive Beispieldaten aus `src/test/beispielStart.ts`; der Wächter `src/test/datenschutz.test.ts` prüft alle versionierten Dateien gegen die Begriffe der lokalen Datei (`PRIVATE_BEGRIFFE` plus Titel).

- **Projekte** (lokal): mit Kategorie, Status (🟢/🟡 → `in_arbeit`, ✅ → `abgeschlossen`, Konzeptphase → `idee`), „zuletzt aktiv“; ohne Automationsprofil
- **Private Details**: Beschreibung, Tools, Bestandteile, Notizen und nächste Schritte stehen nur lokal in `src/data/seed.privat.ts` (von Git ignoriert, Repository ist öffentlich). `seed.ts` bindet die Datei über `import.meta.glob` ein, wenn sie existiert.
- **Aufgaben** (aus den lokalen Details): offene Punkte als nächste Schritte ohne Frist, [x]-Punkte als erledigt ohne Datum
- **Weiterbildung** (lokal): Kurs mit Anbieter, Zeitraum, Unterrichtszeit, Umfang und Modulen; ohne Kursaufgaben
- **PIKARTZ.AI** (öffentlich): 7 belegte Designregeln, Demo-Deck Modul 1 / Tag 1
- **Bewerbungen** (lokal): Zielrollen
- **Einstellungen** (lokal): Anzeigename
- **Leer**: Kontakte, Unternehmen, Leads, Bewerbungen, Termine, Aktivitäten
- **Schema**: Version 2 (Projekt mit `kategorie` und `zuletztAktiv`, Kurs mit Details); Migration 1 → 2 in `src/data/migrations.ts`