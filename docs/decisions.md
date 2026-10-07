# Entscheidungen

## 2026-10-07 – Technischer Stack

### Kontext

Die Spezialisierung des Workshop-Repositorys war noch nicht festgelegt. Die App braucht neun Bereiche, Formulare, Suche und berechnete Übersichten.

### Entscheidung

React + Vite + TypeScript mit react-router; Tests mit Vitest.

### Begründung

Klare Struktur für viele Bereiche, Typsicherheit für das Datenmodell und schnelle lokale Entwicklung. Von Sascha bestätigt.

## 2026-10-07 – Speicherung als Demo-Modus

### Kontext

Es ist kein dauerhaftes Backend konfiguriert.

### Entscheidung

Die Daten werden im Browser (localStorage) gespeichert. Die App kennzeichnet dies sichtbar als Demo und behauptet keine sichere oder dauerhafte Speicherung. Export und Import als JSON sind vorgesehen.

### Begründung

Ein funktionsfähiges Arbeiten ist ohne Server-Infrastruktur möglich, und die Grenzen sind ehrlich gekennzeichnet.

## 2026-10-07 – Keine erfundenen Daten

### Kontext

Die App soll Saschas tatsächliche Arbeit abbilden.

### Entscheidung

Vorbefüllt werden nur die in der Anfrage bzw. Saschas MD-Datei belegten Inhalte. Fehlende Angaben werden als Leerzustand dargestellt, Kennzahlen aus gespeicherten Daten berechnet.

### Begründung

Verlässlichkeit des Cockpits; keine irreführenden Kennzahlen oder Fortschritte.

## 2026-10-07 – CRM-Konzept und Gesamtarchitektur

### Kontext

Vor der Umsetzung sollte geklärt werden, welche CRM-Funktionen für Saschas persönliche Arbeitsorganisation sinnvoll sind.

### Entscheidung

Das CRM ist auf die Frage „Mit wem muss ich als Nächstes sprechen, und wozu?“ ausgerichtet:

- Kontakte mit Kontext-Kategorie (Jobsuche, Weiterbildung, PIKARTZ.AI, Sonstiges), Herkunft und LinkedIn-URL
- Unternehmen mit verknüpften Kontakten, Bewerbungen und Leads
- Kommunikationsverlauf
- Wiedervorlage je Kontakt, die im Cockpit erscheint
- Projektbezug für Kontakte
- Bewerbungen mit Zielrolle, Ansprechpartner und Quelle
- schlanke Leads mit optionalem Betrag

Bewusst ausgeschlossen sind:

- Umsatzprognosen, Abschlusswahrscheinlichkeiten und Lead-Scoring
- Massen-E-Mails
- Live-Integrationen
- Team- und Rechteverwaltung

Weitere Architekturentscheidungen:

- react-router v7 mit BrowserRouter
- zod zur Validierung
- Automation ist im Projekt eingebettet
- eine einheitliche Aufgabe mit Bezug
- KursAufgabe ist getrennt
- reiner Reducer mit Aktivitäten nur bei echter Änderung

Details stehen in `docs/architecture.md`.

### Begründung

Das CRM unterstützt Saschas tatsächliche Arbeit und wirkt nicht wie ein Vertriebs-CRM. Die zusätzlichen Felder passen in die bestehenden Tasks 3-1, 3-2 und 3-4; ihre Definition of Done wird beim Start dieser Tasks ergänzt.

## 2026-10-07 – Quellen, Logos und Abgleich der Seed-Inhalte (task-1-1)

### Kontext

Die Planung verweist auf „Saschas MD-Datei“ als maßgebliche Quelle. Eine solche Datei lag nicht vor; Sascha hat Claude gebeten, sie anzulegen. Die Logo-Dateien hat Sascha selbst unter `public/brand/` abgelegt.

### Entscheidung

- Quelle ist `docs/sources/arbeitskontext.md`. Sie wurde ausschließlich aus Angaben zusammengestellt, die bereits im Repository belegt waren (Projektbrief, Architektur, Roadmap). Stellen ohne belegten Inhalt sind dort mit `[offen]` markiert.
- Abgleich mit dem geplanten Seed (`docs/architecture.md`, Abschnitt Seed):
  - übereinstimmend: 5 Projekte; Status Make.com `in_arbeit` mit Notiz „Kern-Pipeline fertig“; übrige Projekte ohne Status; Routing des Klassifikators „geplant“ (Switch-Node offen); Kurs Aug–Dez 2026, Mo–Fr, ohne Aufgaben; 3 Zielrollen; Anzeigename „Sascha“; keine Kontakte, Unternehmen, Leads, Bewerbungen, Termine oder Aktivitäten
  - nicht belegt: Wortlaut der 3 offenen Klassifikator-Aufgaben, Automationsdetails (Modell, Schwelle, Datenquellen, Pipeline), Inhalt des Demo-Decks, 3 der 10 geplanten Designregeln (belegt sind 7)
  - Regel für task-1-5: Der Seed übernimmt nur, was zu diesem Zeitpunkt in `docs/sources/arbeitskontext.md` steht. Was dann noch `[offen]` ist, wird nicht vorbefüllt. Die 3 Klassifikator-Aufgaben werden nur angelegt, wenn ihr Wortlaut ergänzt wurde.
- Logos: `Pikartz-Logo.png` (Bildmarke) und `PIKARTZ - in Text - Liberation Sans Bold.png` (Wortmarke „PIKARTZ“) bleiben unverändert. Beide sind schwarz auf weißem, nicht transparentem Hintergrund, die Wortmarke enthält kein „.AI“.
  - Auf dunklen Flächen (Sidebar, Topbar) wird die Wortmarke „PIKARTZ.AI“ als Text in Liberation Sans Bold gesetzt, mit „.AI“ in `#2F5CFF`. Die PNG-Dateien werden nur auf hellen Flächen gezeigt.
  - Fehlende Assets: keine transparente oder helle Logo-Variante für dunkle Flächen und keine Wortmarke mit „.AI“. Diese Varianten werden nicht nachgezeichnet.

### Begründung

Keine erfundenen Inhalte; die Logos bleiben unverändert und werden trotzdem nicht als weiße Kästen auf dunklem Grund dargestellt.

## 2026-10-07 – Design-Tokens und Basis-Komponenten (task-1-3)

### Kontext

Die drei Markenfarben reichen nicht für alle Zustände; außerdem erreicht Grau `#4E525C` auf Dunkel nur etwa 2,5:1.

### Entscheidung

- Ergänzende Tokens in `src/styles/tokens.css`:
  - Blau kräftig `#1F45D6` für Links und Hover
  - Grau auf Dunkel `#A9AEB8`
  - Arbeitsfläche `#F6F7F9`
  - Rahmen `#DCDFE4` bzw. `#8A8F99` für Eingabefelder (≥ 3:1)
  - Statusfarben für Erfolg, Warnung und Gefahr mit hellen Hintergründen
- Alle Text- und Bedienelement-Paare prüft `src/styles/contrast.test.ts` gegen WCAG AA. Blau auf Dunkel (≈ 3,9:1) ist nur für große Schrift und Bedienelemente zugelassen.
- Liberation Sans wird über `local()` eingebunden, Fallback Arial. Es werden keine Schriftdateien ausgeliefert.
- Die Wortmarke „PIKARTZ.AI“ wird als Text gesetzt (Mindestgröße 20 px fett). Die `Logo`-Komponente zeigt die PNGs unverzerrt mit Originalseitenverhältnis und fällt bei Ladefehler auf einen dezenten Platzhalter zurück.

### Begründung

Barrierefreiheit ist testbar abgesichert, die Markenfarben bleiben unverändert.

## 2026-10-07 – Datenmodell und Speicherschicht (task-1-4)

### Kontext

Die Architektur legt Reducer, zod-Validierung und localStorage fest. Bei der Umsetzung waren einige Details zu klären.

### Entscheidung

- Das zod-Schema in `src/data/schema.ts` ist die einzige Quelle der Datenstruktur. Die Typen in `src/domain/types.ts` werden daraus abgeleitet.
- Der Kurs speichert Start- und Endmonat (`2026-08`, `2026-12`). Genaue Start- und Enddaten bleiben `null`, bis sie belegt sind.
- Weiterbildungsaufgaben verweisen über `kursId` auf ihren Kurs.
- Die Daten werden beim Start synchron aus localStorage geladen. Ein eigener Ladezustand des Stores entfällt, die Komponente `LoadingState` bleibt für spätere asynchrone Vorgänge.
- Löschfolgen:
  - Projekt: löscht Aufgaben und Termine mit Projektbezug, löst Kontakte und Verlaufseinträge
  - Kurs: löscht Kursaufgaben
  - Kontakt: löscht Verlauf und Aufgaben mit Kontaktbezug, löst Termine, Leads und Bewerbungen
  - Unternehmen und Zielrolle: lösen nur Verknüpfungen
  - `loeschfolgen()` liefert dieselbe Liste für den Bestätigungsdialog.
- Das Aktivitätsprotokoll ist auf 500 Einträge begrenzt, damit der Speicher nicht vollläuft.

### Begründung

Ein Schema für Laufzeitprüfung und Typen verhindert Abweichungen. Es wird nichts als Datum gespeichert, was nicht belegt ist.

## 2026-10-07 – Seed-Daten (task-1-5)

### Entscheidung

- `src/data/seed.ts` übernimmt ausschließlich Inhalte aus `docs/sources/arbeitskontext.md`:
  - 5 Projekte; Make.com mit Status `in_arbeit` und der Notiz „Kern-Pipeline fertig“, alle anderen ohne Status
  - Klassifikator-Routing „geplant“ mit dem Hinweis auf den offenen Switch-Node
  - Kurs mit Monaten statt Daten
  - 7 Designregeln, Demo-Deck Modul 1 / Tag 1
  - 3 Zielrollen
  - Anzeigename „Sascha“
- Die 3 offenen Klassifikator-Aufgaben sind nicht angelegt, weil ihr Wortlaut nicht belegt ist.
- Der Routing-Status einer Automation darf leer (`null`) sein. Beim Jobsuche-Assistenten und beim Make.com-Workflow ist dazu nichts belegt.
- Seed-IDs sind stabil (`seed-…`). Ein Test prüft die Regeln und gleicht Titel und Designregeln gegen die Quelldatei ab.
- Ergänzt Sascha die Quelle später, wird der Seed nachgezogen. Bereits gespeicherte Daten ändert das nur über „Zurücksetzen“.

## 2026-10-07 – App-Shell und Navigation (task-1-6)

### Entscheidung

- Routing mit `react-router` 7 (`BrowserRouter`). Die Routen stehen zentral in `src/app/routes.tsx`. Noch nicht umgesetzte Bereiche zeigen eine Platzhalterseite.
- Die Navigation ist dreistufig, rein über CSS gesteuert:
  - unter 768 px: Topbar und `<dialog>`-Schublade
  - 768–1199 px: Icon-Leiste mit Kurzlabels
  - ab 1200 px: Sidebar mit 256 px
- Der Bereich „Weiterbildung“ heißt in der Icon-Leiste „Kurs“, „Einstellungen“ heißt „Optionen“. Der volle Name steht als `aria-label`.
- Nach einem Seitenwechsel erhält die h1 (`#seitentitel`) den Fokus. Nach dem Schließen des Menüs per Esc oder Button kehrt der Fokus zum Menü-Button zurück. Nach einer Navigation aus dem Menü bleibt er auf der neuen Überschrift.
- `StoreGate` zeigt bei unlesbaren Daten eine Fehlerseite mit „Rohdaten exportieren“ und einem zweistufigen „Zurücksetzen“.
- Der Demo-Hinweis ist dauerhaft sichtbar und nicht schließbar. Speicherfehler und Änderungen in anderen Tabs erscheinen als Hinweis darunter.

## 2026-10-07 – Projekt-Übersicht als Quelle (Roadmap v2, task-1-7)

### Kontext

Sascha hat die eigentliche Projekt-Übersicht geliefert (12 Projekte). Die im Projektbrief angenommenen Automationsprojekte gibt es noch nicht. Das GitHub-Repository ist öffentlich.

### Entscheidung (mit Sascha abgestimmt)

- Vorbefüllt werden nur die 12 Projekte der Übersicht. Die angenommenen 5 Projekte entfallen. task-1-5 bleibt in der Historie, task-1-7 ersetzt dessen Seed.
- Statuszuordnung:
  - 🟢 und 🟡 → `in_arbeit`
  - ✅ → `abgeschlossen`
  - ⚪ Konzeptphase → `idee`
- Öffentlich vs. privat:
  - Im Repository (`src/data/seed.ts`) stehen je Projekt nur Titel, Kategorie, Status und „zuletzt aktiv“.
  - Beschreibungen, Tools, Bestandteile, Notizen und nächste Schritte liegen in `src/data/seed.privat.ts`. Git ignoriert diese Datei. Die App bindet sie über `import.meta.glob` ein, wenn sie vorhanden ist. Ohne sie haben die Projekte keine Details.
  - Die Originaldatei der Übersicht bleibt ebenfalls lokal.
  - Die Tests prüfen das Einbinden mit fiktiven Details.
- Aus der lokalen Datei gilt:
  - Offene Punkte werden zu nächsten Schritten ohne Frist, [x]-Punkte zu erledigten Schritten ohne Erledigungsdatum.
  - Kursaufgaben ohne `KURS`-Code bleiben nächste Schritte des Tagebuch-Projekts.
- Kein Projekt erhält ein Automationsprofil, weil Plattform, Modell und Routing nicht belegt sind.
- Zielrollen: nur die bisherigen drei.
- In der Übersicht genannte Personen und Firmen werden nicht als Kontakte oder Unternehmen angelegt. Das CRM startet leer.
- Schema-Version 2:
  - Projekt erhält `kategorie` und `zuletztAktiv`.
  - Kurs erhält `beschreibung`, `unterrichtszeit`, `umfang` und `module`.
  - Gespeicherte Version-1-Daten werden automatisch migriert. Die neuen Startdaten kommen erst über „Zurücksetzen“.
- Ein versehentlich öffentlich gepushter Zwischenstand mit allen Details wurde aus der Branch-Historie entfernt (Force-Push).

### Begründung

Das Cockpit bildet Saschas tatsächliche Projekte ab, ohne private Details öffentlich zu machen. Nichts wird erfunden.

## 2026-10-07 – Projekte und gemeinsame UI-Bausteine (task-2-1)

### Entscheidung

- Dialoge: `Dialog` nutzt `<dialog>` mit `showModal()`. Das bringt Fokusfang und Esc; beim Schließen kehrt der Fokus zum Auslöser zurück (Layout-Effekt vor dem Entfernen aus dem DOM).
- `FormDialog` fragt bei ungespeicherten Eingaben „Änderungen verwerfen?“.
- `ConfirmDialog` steht vor jedem Löschen und nennt die Löschfolgen aus `loeschfolgen()`.
- `ToastProvider` zeigt kurze Bestätigungen in einer Live-Region (`role="status"`).
- Formulare: `useForm` mit reiner Validierungsfunktion; Fehler erscheinen erst nach dem ersten Absenden.
- Nächste Schritte eines Projekts sind Aufgaben mit Projektbezug. Den Dialog `AufgabeDialog` nutzt auch task-2-2.
- Beim Anlegen darf der Aufrufer die ID vorgeben (`anlegen` mit `id`), damit die App direkt zur Detailseite springen kann.
- Der Projektstatus ändert sich nur manuell, über die Detailseite oder den Bearbeiten-Dialog. Erledigte Schritte ändern ihn nie.
- Die Projektliste zeigt Zähler (offen/erledigt) statt Prozentwerten.
- Such- und Filterfelder zeigen kein „(optional)“ (`optionalKennzeichnen={false}`).

## 2026-10-07 – Zustände und Barrierefreiheit (task-4-2)

### Entscheidung

- `src/test/barrierefreiheit.test.tsx` prüft alle Seiten automatisch mit axe-core (WCAG 2.1 A/AA und Best Practices), mit Beispieldaten, im Leerzustand, mit offenem Formulardialog samt Fehlermeldungen und auf der Fehlerseite. Farbkontraste prüft `src/styles/contrast.test.ts`, weil jsdom kein Layout berechnet.
- Zustände:
  - Leerzustände: in jeder Liste und jedem Bereich
  - Fehlerzustände: Ladefehler (StoreGate), Speicherfehler (Hinweis mit Export-Verweis), Importfehler, Feldfehler in allen Formularen
  - Bestätigungen: vor jedem Löschen, Zurücksetzen und Import sowie „Änderungen verwerfen?“
  - Toasts nach jeder gespeicherten Aktion
- Ein Ladezustand ist nicht nötig: Die Daten werden synchron aus localStorage gelesen. `LoadingState` steht für spätere asynchrone Vorgänge bereit.
- Tastatur:
  - überall sichtbarer Fokusring (`:focus-visible`)
  - Skip-Link
  - Fokus auf die h1 nach Seitenwechsel
  - Dialoge mit Fokusfang, Esc und Fokusrückgabe
  - Tabs mit Pfeiltasten

## 2026-10-07 – Roadmap v3: Datenschutz zuerst (task-5-1)

**Anforderung:** Alles soll verbunden sein, ohne dass auch nur eine Information von außen einsehbar ist, DSGVO-konform. Dazu kommen Kalender, Kontakte, Mails und eine Bewerbungsübersicht.

**Entscheidungen:**

- **Startdaten:** Alle persönlichen Startdaten liegen nur lokal in `src/data/seed.privat.ts` (`STARTDATEN`): Projekte, Weiterbildung, Zielrollen und Anzeigename. Öffentlich bleiben nur die Designregeln und das Demo-Deck der Marke.
- **Tests und Doku:** Tests nutzen fiktive Beispieldaten (`src/test/beispielStart.ts`). `docs/sources/arbeitskontext.md` ist entfernt.
- **Wächter-Test:** `src/test/datenschutz.test.ts` liest die Begriffe aus der lokalen Datei (`PRIVATE_BEGRIFFE` plus Titel) und prüft jede versionierte Datei. Die Begriffe selbst stehen nie im Repository. Ohne lokale Datei wird der Test übersprungen.
- **Git-Historie:** wird neu geschrieben, damit die Begriffe auch in alten Commits fehlen; danach Force-Push von `main` und des Arbeitszweigs. Sascha hat die Entscheidung übertragen („mach, was am sinnvollsten ist“).
  - Kopien, die GitHub in geschlossenen Pull Requests aufbewahrt, kann nur der GitHub-Support löschen. Der Text dafür liegt Sascha vor.
- **Verschlüsselung:** wird Pflicht (Saschas Entscheidung). Ein vergessenes Passwort bedeutet Datenverlust; die verschlüsselte Sicherung ist das Backup.
- **E-Mails:** keine Anbindung an ein Postfach, denn das wäre eine Verbindung nach außen. Mails werden im Verlauf erfasst, und Entwürfe öffnen sich im eigenen Mailprogramm.

## 2026-10-07 – Keine Verbindung nach außen (task-5-2)

- **Content-Security-Policy:** `csp.config.ts` legt die Richtlinie fest. Ein Vite-Plugin schreibt sie beim Build in `index.html`.
  - Erlaubt ist nur der eigene Ursprung, `connect-src 'none'` verbietet alle Netzwerkabrufe.
  - Im Dev-Server ist sie nicht aktiv, weil Vite dort Inline-Skripte und einen Websocket braucht.
- **Referrer:** `index.html` setzt `referrer=no-referrer`.
- **Externe Links:** laufen über `ExternerLink`, mit `noopener noreferrer`.
  - Nur `http(s)`-Adressen werden zum Link, damit z. B. ein importiertes `javascript:` nichts ausführt.
- **Prüfung:** `src/test/keineVerbindung.test.tsx` deckt Richtlinie, Quellcode (kein `fetch`, XHR, WebSocket, Beacon, keine fremden Imports) und Links ab.
- **Im Browser geprüft:** gebaute App unter `npm run preview` lädt fehlerfrei mit Schriften; ein `fetch` nach außen wird blockiert.

## 2026-10-07 – Verschlüsselung mit Passwort (task-5-3)

- **Verfahren** (Web Crypto, keine Fremdbibliothek): AES-GCM mit 256 Bit; Schlüssel per PBKDF2-SHA-256 mit 600.000 Runden und zufälligem Salt; neues IV bei jedem Speichern. Der Schlüssel ist nicht exportierbar, das Passwort wird nirgends gespeichert. Code: `src/data/krypto.ts`.
- **Speicher** (`src/data/tresor.ts`):
  - `VerschluesselterSpeicher` hält den Klartext nur im Arbeitsspeicher und schreibt ausschließlich den verschlüsselten Umschlag in den localStorage.
  - Der StoreProvider bleibt unverändert und bekommt nur einen anderen Speicher.
  - Schreibvorgänge laufen asynchron der Reihe nach; geschrieben wird nur der neueste Stand.
- **TresorGate** (`src/app/TresorGate.tsx`):
  - zeigt vor der App „Passwort festlegen“, „Daten verschlüsseln“ (bestehende Klartext-Daten werden sofort verschlüsselt übernommen), „Gesperrt“ oder „Passwort vergessen“.
  - „Passwort vergessen“ bietet nur Löschen und Neubeginn, denn eine Wiederherstellung gibt es bewusst nicht.
- **Sperre:**
  - automatisch nach 5, 15 (Standard), 30 oder 60 Minuten ohne Eingabe; geprüft alle 15 Sekunden und beim Zurückkehren in den Tab.
  - außerdem „Jetzt sperren“ im Hinweisband und in den Einstellungen.
  - Beim Sperren wird der Speicher abgebaut. Der StoreProvider speichert dabei noch wartende Änderungen, und zusätzlich wird beim Verstecken des Tabs gespeichert.
- **Passwort ändern:** prüft das bisherige Passwort am gespeicherten Umschlag und verschlüsselt mit neuem Salt.
- **Nicht verschlüsselt:** nur die Sperrzeit (`…:sicherheit`), weil sie nicht persönlich ist.
- **Ohne Browser-Speicher** läuft die App wie bisher flüchtig; es wird nichts abgelegt.
- **Im Browser geprüft** (gebaute App, Port 4173, Testpasswort): im localStorage steht nur der Umschlag. Nach dem Neuladen ist die App gesperrt, Entsperren funktioniert. Die Testdaten sind danach gelöscht.

## 2026-10-07 – Verschlüsselte Sicherung und Erinnerung (task-5-4)

- **Export:** gibt es nur noch als verschlüsselte Sicherung (`src/data/sicherung.ts`). Das Verfahren ist dasselbe wie im Browser-Speicher, aber die Sicherung hat ein eigenes Passwort, das auch dem App-Passwort entsprechen darf. Der Schlüssel der App ist nicht exportierbar, deshalb wird das Passwort abgefragt.
- **Import:**
  - erkennt verschlüsselte Dateien und fragt nach deren Passwort; danach folgen dieselbe Prüfung und Bestätigung wie bisher.
  - Ältere, unverschlüsselte Exporte lassen sich weiter importieren, da Lesen nichts nach außen gibt.
- **Fehlerseite:** Auch „Rohdaten sichern“ lädt nur noch verschlüsselt herunter.
- **Erinnerung:**
  - Schema v3 speichert `einstellungen.letzteSicherungAm`; die Migration 2 → 3 ergänzt `null`.
  - Das Cockpit erinnert, wenn noch nie oder vor mindestens 7 Tagen gesichert wurde. Die Einstellungen zeigen die letzte Sicherung, und das Protokoll vermerkt „Sicherung erstellt“.
- **Dauerhafter Speicher:** Beim Entsperren bittet die App den Browser per `navigator.storage.persist()`, die Daten nicht automatisch zu löschen.
- **Nicht im Browser geprüft:** Ich habe auf Saschas Rechner bewusst keine Datei heruntergeladen. Abgedeckt ist das durch Bedienungstests: Datei verschlüsselt, mit dem Passwort lesbar, Import mit falschem und richtigem Passwort.

## 2026-10-07 – DSGVO-Funktionen für Kontakte (task-5-5)

- **Rechtsgrundlage und Zweck** je Kontakt (Schema v4, Migration 3 → 4 ergänzt `null` bzw. leer).
  - Zur Auswahl stehen Einwilligung, Vertrag oder Anbahnung und berechtigtes Interesse (Art. 6 Abs. 1 a, b, f), jeweils mit Kurzhinweis.
  - Fehlende Angaben zeigt die Kontaktseite deutlich an.
- **Auskunft (Art. 15):** „Auskunft erstellen“ lädt eine Textdatei mit allem herunter, was zur Person gespeichert ist: Stammdaten, Zweck, Rechtsgrundlage, Verlauf, Aufgaben, Termine, Leads, Bewerbungen, Projekte und ihre Rechte. Die Datei ist bewusst unverschlüsselt, weil sie für die betroffene Person bestimmt ist.
- **Löschen (Art. 17):**
  - entfernt Name und E-Mail der Person auch aus allen Einträgen im Aktivitätsprotokoll, ersetzt durch „Gelöschter Kontakt“.
  - Der Löschdialog nennt die verknüpften Einträge, die bleiben, damit Sascha sie auf Personenangaben prüfen kann, und weist auf ältere Sicherungsdateien hin.
- **Datenminimierung (Art. 5):**
  - Kontakte ohne Aktivität seit 12 Monaten oder ohne Rechtsgrundlage bzw. Zweck gelten als „Prüfbedarf“.
  - Die Kontaktliste zeigt dafür einen Hinweis und den Filter „Datenschutz prüfen“ (auch per `?pruefen=1`).
- **Datenschutzhinweis** in den Einstellungen: was die App tut (lokal, verschlüsselt, keine Verbindung nach außen) und was Sascha als Verantwortlicher beachten sollte, inklusive Informationspflicht nach Art. 13/14.

## 2026-10-07 – Verknüpfungen erweitern (task-6-1)

- **Schema v5** (Migration 4 → 5 ohne Datenverlust):
  - Projekt: `auftraggeberId` (Unternehmen). Ansprechpartner bleiben Kontakte mit dem Projekt in `projektIds`.
  - Bezug von Aufgaben und Terminen: zusätzlich `unternehmen`, `lead` und `bewerbung`.
  - Verlauf: `bewerbungId`, `leadId`, für E-Mails `betreff` und `richtung`.
  - Lead: `projektId` und `wiedervorlageAm`; Bewerbung: `wiedervorlageAm`.
  - Fokus bei Aufgaben und Schlagworte bei Projekten, Kontakten und Unternehmen sind schon angelegt, damit spätere Tasks keine weitere Migration brauchen.
- **Löschen löst die neuen Verknüpfungen,** ohne Einträge mitzulöschen: Unternehmen → Auftraggeber, Aufgaben und Termine; Lead oder Bewerbung → Verlauf, Aufgaben und Termine; Projekt → Lead.
- **Bedienung:**
  - Projektdialog: Auftraggeber und Schlagworte; die Projektseite zeigt den Auftraggeber und die Ansprechpartner.
  - Leaddialog: Projekt und Wiedervorlage; Bewerbungsdialog: Wiedervorlage.
  - Verlauf: „Gehört zu“ (Projekt, Bewerbung oder Lead, die eigenen der Person zuerst). Bei E-Mails gibt es Betreff und Richtung.
  - Aufgaben und Termine lassen sich allen Bereichen zuordnen.
  - Kontakt- und Unternehmensdialog: Schlagworte.

## 2026-10-07 – Gesamtsicht auf jeder Detailseite (task-6-2)

- **„Alles dazu“** (`src/features/gemeinsam/Gesamtsicht.tsx`, Selektor `selectVerknuepft`) zeigt zu einem Kontakt, Unternehmen, Projekt, einer Bewerbung oder einem Lead:
  - offene Aufgaben, kommende Termine und den Verlauf
  - die verknüpften Kontakte, Unternehmen, Projekte, Bewerbungen und Leads
- **Indirekte Verknüpfungen zählen mit:** Beim Unternehmen erscheinen auch Aufgaben seiner Kontakte, Bewerbungen, Leads und beauftragten Projekte. Die Herkunft steht jeweils dabei.
- **Schnellanlage:** „+ Aufgabe“ und „+ Termin“ legen direkt mit dem passenden Bezug an. Ein Klick auf eine Aufgabe oder einen Termin öffnet sie zum Bearbeiten.
- **Neue Detailseiten:**
  - `/bewerbungen/:id` und `/kontakte/leads/:id` mit Angaben und Gesamtsicht.
  - Die Listen verlinken dorthin, und Bezug, Verlauf und Gesamtsicht verlinken direkt auf die Detailseite.
- **Keine doppelten Abschnitte:** Eine Seite blendet aus, was sie schon selbst zeigt, z. B. Verlauf und Projekte beim Kontakt, nächste Schritte und Ansprechpartner beim Projekt.

## 2026-10-07 – Globale Suche und Schnellerfassung (task-6-3)

- **Suche** (Strg+K oder Cmd+K, oder der Knopf „Suchen“ in Topbar, Icon-Leiste und Sidebar):
  - durchsucht Projekte, Kontakte, Unternehmen, Bewerbungen, Leads, Aufgaben, Termine, Verlauf und Kursaufgaben (`src/domain/selectors/suche.ts`).
  - Akzente und Groß-/Kleinschreibung spielen keine Rolle. Alle Wörter müssen vorkommen.
  - Sortiert wird nach Relevanz: zuerst Titelanfang, dann Wortanfang, dann im Titel, dann in weiteren Feldern.
  - Bedienung als Combobox: Pfeiltasten wählen, Enter öffnet, Esc schließt. Beim Öffnen liegt der Fokus im Suchfeld.
- **Schnellerfassung** („Neu anlegen“):
  - wählt die Art (Aufgabe, Termin, Kontakt, Unternehmen, Projekt, Bewerbung, Lead) und öffnet den bekannten Dialog.
  - Auf einer Detailseite werden Aufgaben und Termine mit dem geöffneten Eintrag verknüpft; ein Kontakt bekommt auf der Unternehmensseite das Unternehmen vorbelegt.
- **Im Browser geprüft** (gebaute App, Testpasswort, danach gelöscht):
  - Strg+K öffnet die Suche mit Fokus im Feld, und Enter öffnet den Treffer.
  - Die Knöpfe sind bei 375, 768 und 1280 px sichtbar, ohne horizontalen Überlauf.
  - Gefundener Fehler: Der Fokus lag zuerst auf „Schließen“. Er ist behoben und mit einem Test abgesichert.

## 2026-10-07 – Kalender (task-7-1)

- **Neuer Bereich „Kalender“** (`/kalender`, in der Navigation nach „Aufgaben & Termine“):
  - Ansichten Monat, Woche und Liste (30 Tage), umschaltbar über Tabs; Zeitraum und Ansicht stehen in der URL.
  - zeigt Termine, Aufgabenfristen, Wiedervorlagen von Kontakten, Bewerbungen und Leads sowie Kursaufgaben (Selektor `kalenderEintraege`). Erledigtes wird ausgeblendet.
  - Kurstage sind markiert, und jede Art lässt sich ein- und ausblenden.
- **Monatsansicht:** zugängliche Tabelle mit einem Tagesknopf je Tag; die Beschriftung nennt Datum und Anzahl der Einträge. Darunter steht die Liste des gewählten Tages.
  - Auf schmalen Bildschirmen zeigt die Zelle nur die Anzahl, ab 900 px die ersten drei Einträge.
- **Bedienung:**
  - Termine und Fristen öffnen sich zum Bearbeiten; Wiedervorlagen verlinken auf ihren Eintrag.
  - „+ Termin“ legt am jeweiligen Tag an, dafür hat `TerminDialog` die neue Eigenschaft `vorgabeDatum`.
- **Export als .ics** (RFC 5545):
  - Termine mit Uhrzeit sind einstündige Ereignisse in Ortszeit, alles andere ist ganztägig. Lange Zeilen werden gefaltet und Sonderzeichen maskiert.
  - Vor dem Download weist die App darauf hin, dass die Datei unverschlüsselt ist und Namen enthalten kann. Sie gehört nur in den eigenen Kalender.
- **Im Browser geprüft:** gebaute App bei 1280 und 375 px, ohne Überlauf; die Tagesknöpfe sind 32 × 32 px groß.
