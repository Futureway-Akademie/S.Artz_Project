# Aktueller Projektstand

## Projekt

PIKARTZ.AI – Arbeitscockpit. Persönliches Arbeitscockpit mit CRM-Funktionen für Sascha Artz (KI-Automationen, Weiterbildung, PIKARTZ.AI). Status: aktiv, Roadmap v1, Fortschritt 28,89 % (13 von 45 Gewichtspunkten, 6 von 20 Tasks).

## Aktive Phase

Phase 2 – Arbeitsbereiche. Phase 1 – Grundlage ist abgeschlossen.

## Aktive Aufgabe

Keine.

## Zuletzt abgeschlossen

- task-1-6 – App-Shell mit responsiver Navigation (2026-10-07T12:12:43Z). Routing für alle neun Bereiche, Topbar/Icon-Leiste/Sidebar, Skip-Link, Fokus auf h1, Demo-Hinweis, Fehlerseite für defekte Daten. Bereiche zeigen noch Platzhalter.
- task-1-5 – Seed-Daten aus belegten Inhalten (2026-10-07T12:07:05Z). Nur Inhalte aus `docs/sources/arbeitskontext.md`; Seed-Test grün.
- task-1-4 – Datenmodell, Speicherschicht und Aktivitätsprotokoll (2026-10-07T12:05:13Z). zod-Schema, versioniertes localStorage mit Fehlerzustand, reiner Reducer mit Aktivitäten nur bei echter Änderung, Löschfolgen, Store mit entprelltem Speichern.
- task-1-3 – Design-Tokens, Typografie und Basis-Komponenten (2026-10-07T11:57:51Z).
- task-1-2 – Projekt-Setup mit Vite, React und TypeScript (2026-10-07T11:52:08Z).
- task-1-1 – Quellen und Marken-Assets übernehmen (2026-10-07T11:44:14Z).

## Bereite nächste Aufgaben

- task-2-1 – Projekte
- task-2-2 – Aufgaben und Termine
- task-2-4 – Weiterbildung
- task-2-5 – PIKARTZ.AI-Bereich
- task-4-1 – Einstellungen

## Blockiert

Nichts.

## Wichtige Entscheidungen

Details in `docs/decisions.md`.

- Stack: React 18 + Vite 8 + TypeScript 6, react-router 7, zod 4; ESLint 9 (wegen jsx-a11y), Vitest 5 (`.workshop/specialization/STACK.md`).
- Speicherung im Browser (localStorage) als klar gekennzeichneter Demo-Modus; kein Backend.
- Das zod-Schema `src/data/schema.ts` ist die einzige Quelle der Datenstruktur; Typen werden daraus abgeleitet.
- Vorbefüllt werden nur belegte Inhalte aus `docs/sources/arbeitskontext.md`; `[offen]`-Stellen bleiben leer.
- CRM-Konzept und Gesamtarchitektur sind festgelegt (`docs/architecture.md`). Das CRM ist auf Wiedervorlagen ausgerichtet, nicht auf Umsatz.
- Ergänzende Farb-Tokens sind per Test gegen WCAG AA abgesichert.
- Logos bleiben unverändert und erscheinen nur auf hellen Flächen. Auf dunklen Flächen wird „PIKARTZ.AI“ als Text gesetzt.

## Bekannte Probleme

- `docs/sources/arbeitskontext.md` enthält offene Stellen: die drei Klassifikator-Aufgaben, Automationsdetails, 3 der 10 Designregeln, den Inhalt des Demo-Decks und die Kursdetails. Nach einer Ergänzung muss der Seed nachgezogen werden. Bereits gespeicherte Browser-Daten übernehmen das nur über „Zurücksetzen“.
- Die Logo-PNGs haben einen weißen, nicht transparenten Hintergrund. Es gibt keine Wortmarke mit „.AI“.

## Empfohlener nächster Schritt

task-2-1 – Projekte, weil task-2-3 (Automationen) und task-2-6 (Cockpit) davon abhängen.
