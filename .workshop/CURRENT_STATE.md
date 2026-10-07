# Aktueller Projektstand

## Projekt

PIKARTZ.AI – Arbeitscockpit. Persönliches Arbeitscockpit mit CRM-Funktionen für Sascha Artz (KI-Automationen, Weiterbildung, PIKARTZ.AI). Status: aktiv, Roadmap v2, Fortschritt 38,3 % (18 von 47 Gewichtspunkten, 8 von 21 Tasks).

## Aktive Phase

Arbeitsbereiche (phase-2).

## Aktive Aufgabe

Keine.

## Zuletzt abgeschlossen

- task-2-1 – Projekte (2026-10-07T13:02:50Z). Liste mit Suche und Filtern, Detailseite, Anlegen/Bearbeiten/Löschen mit Bestätigung, nächste Schritte mit Frist, manueller Status; gemeinsame Bausteine (Dialoge, Toast, useForm, Datums-Hilfen).
- task-1-7 – Startdaten auf Projekt-Übersicht umstellen (2026-10-07T12:27:52Z). 12 echte Projekte aus Saschas Projekt-Übersicht mit 43 nächsten Schritten, Weiterbildungsdetails, Schema-Version 2 mit Migration.
- task-1-6 – App-Shell mit responsiver Navigation (2026-10-07T12:12:43Z). Routing für alle neun Bereiche, Topbar/Icon-Leiste/Sidebar, Skip-Link, Fokus auf h1, Demo-Hinweis, Fehlerseite für defekte Daten. Bereiche zeigen noch Platzhalter.
- task-1-5 – Seed-Daten aus belegten Inhalten (2026-10-07T12:07:05Z). Nur Inhalte aus `docs/sources/arbeitskontext.md`; Seed-Test grün.
- task-1-4 – Datenmodell, Speicherschicht und Aktivitätsprotokoll (2026-10-07T12:05:13Z). zod-Schema, versioniertes localStorage mit Fehlerzustand, reiner Reducer mit Aktivitäten nur bei echter Änderung, Löschfolgen, Store mit entprelltem Speichern.
- task-1-3 – Design-Tokens, Typografie und Basis-Komponenten (2026-10-07T11:57:51Z).
- task-1-2 – Projekt-Setup mit Vite, React und TypeScript (2026-10-07T11:52:08Z).
- task-1-1 – Quellen und Marken-Assets übernehmen (2026-10-07T11:44:14Z).

## Bereite nächste Aufgaben

- task-2-2 – Aufgaben und Termine
- task-2-3 – Automationen
- task-2-4 – Weiterbildung
- task-2-5 – PIKARTZ.AI-Bereich
- task-4-1 – Einstellungen

## Gesamtplan (aus roadmap.json)

### Grundlage

| Task | Aufgabe | Status | Wartet auf |
|---|---|---|---|
| task-1-1 | Quellen und Marken-Assets übernehmen | ✅ erledigt |  |
| task-1-2 | Projekt-Setup mit Vite, React und TypeScript | ✅ erledigt |  |
| task-1-3 | Design-Tokens, Typografie und Basis-Komponenten | ✅ erledigt |  |
| task-1-4 | Datenmodell, Speicherschicht und Aktivitätsprotokoll | ✅ erledigt |  |
| task-1-5 | Seed-Daten aus belegten Inhalten | ✅ erledigt |  |
| task-1-6 | App-Shell mit responsiver Navigation | ✅ erledigt |  |
| task-1-7 | Startdaten auf Projekt-Übersicht umstellen | ✅ erledigt |  |

### Arbeitsbereiche

| Task | Aufgabe | Status | Wartet auf |
|---|---|---|---|
| task-2-1 | Projekte | ✅ erledigt |  |
| task-2-2 | Aufgaben und Termine | ▶️ startbar | – |
| task-2-3 | Automationen | ▶️ startbar | – |
| task-2-4 | Weiterbildung | ▶️ startbar | – |
| task-2-5 | PIKARTZ.AI-Bereich | ▶️ startbar | – |
| task-2-6 | Arbeitscockpit | ⏳ geplant | task-2-2, task-2-4 |

### CRM und Bewerbungen

| Task | Aufgabe | Status | Wartet auf |
|---|---|---|---|
| task-3-1 | Kontakte und Unternehmen | ⏳ geplant | task-2-6 |
| task-3-2 | Kommunikationsverlauf und nächste Aktion | ⏳ geplant | task-3-1 |
| task-3-3 | Leads | ⏳ geplant | task-3-1 |
| task-3-4 | Bewerbungen und Zielrollen | ⏳ geplant | task-3-1 |
| task-3-5 | Cockpit-Bereich für Kontakte und Bewerbungen | ⏳ geplant | task-3-2, task-3-4 |

### Abschluss

| Task | Aufgabe | Status | Wartet auf |
|---|---|---|---|
| task-4-1 | Einstellungen | ▶️ startbar | – |
| task-4-2 | Zustände und Barrierefreiheit | ⏳ geplant | task-3-5, task-4-1 |
| task-4-3 | End-to-End-Prüfung und Dokumentation | ⏳ geplant | task-4-2 |

## Blockiert

Nichts.

## Wichtige Entscheidungen

Details in `docs/decisions.md`.

- Stack: React 18 + Vite 8 + TypeScript 6, react-router 7, zod 4; ESLint 9 (wegen jsx-a11y), Vitest 5 (`.workshop/specialization/STACK.md`).
- Speicherung im Browser (localStorage) als klar gekennzeichneter Demo-Modus; kein Backend.
- Das zod-Schema `src/data/schema.ts` ist die einzige Quelle der Datenstruktur; Typen werden daraus abgeleitet.
- Vorbefüllt werden nur belegte Inhalte aus `docs/sources/arbeitskontext.md`, das Saschas lokale Projekt-Übersicht (12 Projekte, Stand 2026-10-07) zusammenfasst. Die Originaldatei bleibt lokal. Kontakte/Unternehmen werden nicht vorbefüllt.
- CRM-Konzept und Gesamtarchitektur sind festgelegt (`docs/architecture.md`). Das CRM ist auf Wiedervorlagen ausgerichtet, nicht auf Umsatz.
- Ergänzende Farb-Tokens sind per Test gegen WCAG AA abgesichert.
- Logos bleiben unverändert und erscheinen nur auf hellen Flächen. Auf dunklen Flächen wird „PIKARTZ.AI“ als Text gesetzt.

## Bekannte Probleme

- Offen in der Quelle: 3 der 10 geplanten Designregeln und der Inhalt des Demo-Decks. Browser-Daten älterer Stände übernehmen neue Startdaten nur über „Zurücksetzen“.
- Keines der 12 Projekte hat ein belegtes Automationsprofil; der Bereich „Automationen“ startet leer.
- Die Logo-PNGs haben einen weißen, nicht transparenten Hintergrund. Es gibt keine Wortmarke mit „.AI“.

## Empfohlener nächster Schritt

task-2-2 – Aufgaben und Termine (danach task-2-4 Weiterbildung; beide sind Voraussetzung für das Arbeitscockpit task-2-6).
