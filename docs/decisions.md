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
  - übereinstimmend: 5 Projekte; Status Make.com `in_arbeit` mit Notiz „Kern-Pipeline fertig“; übrige Projekte ohne Status; Routing des Klassifikators „geplant“ (Switch-Node offen); Kurs „KI Automations Spezialist“ Aug–Dez 2026, Mo–Fr, ohne Aufgaben; 3 Zielrollen; Anzeigename „Sascha“; keine Kontakte, Unternehmen, Leads, Bewerbungen, Termine oder Aktivitäten
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
  - Kursaufgaben ohne `KIAutomSpez`-Code bleiben nächste Schritte des Tagebuch-Projekts.
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
