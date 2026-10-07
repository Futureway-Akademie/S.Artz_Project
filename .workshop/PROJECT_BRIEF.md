# Projektbrief

## Projektname

PIKARTZ.AI – Arbeitscockpit

## Idee / Problem

Saschas Arbeit (Automationsprojekte, Weiterbildung „KI Automations Spezialist“, Marke PIKARTZ.AI, Kontakte, Bewerbungen) ist über viele Tools verteilt. Das Cockpit beantwortet:

- Woran arbeite ich gerade?
- Was ist der nächste konkrete Schritt?
- Was muss ich im Blick behalten?

Es soll Saschas tatsächliche Arbeit unterstützen und nicht wie ein Standard-Vertriebs-CRM wirken.

## Zielgruppe

Sascha Artz als einziger Nutzer.

## Zielplattform

Web-App im Browser, responsiv für Desktop, Tablet und Smartphone. Oberfläche vollständig auf Deutsch.

## Kernfunktionen

1. Arbeitscockpit
2. Projekte
3. Automationen
4. Weiterbildung
5. PIKARTZ.AI
6. Aufgaben
7. Kontakte & Leads
8. Bewerbungen
9. Einstellungen

## Nicht-Ziele

- kein Mehrbenutzer- oder Login-System
- kein Server-Backend und keine dauerhafte oder sichere Speicherung (Demo-Modus mit localStorage)
- keine echten Verbindungen zu n8n, Make.com, HubSpot, SeaTable usw.
- keine erfundenen Daten (Kennzahlen, Umsätze, Termine, Kontakte, Fortschritte)
- keine dekorativen Diagramme oder Animationen ohne Funktion

## MVP

Eine lauffähige App mit:

- responsiver Navigation über alle neun Bereiche
- berechnetem Arbeitscockpit
- bearbeitbaren Projekten, Aufgaben und Weiterbildungsaufgaben
- Automationsübersicht und PIKARTZ.AI-Designregeln
- CRM: Kontakte und Unternehmen, Verlauf, optionale Leads, Bewerbungen und Zielrollen
- Export, Import und Zurücksetzen der Daten

## Marke und Design

- Wortmarke PIKARTZ.AI, „.AI“ in Blau `#2F5CFF`
- Liberation Sans: Bold für Überschriften, Zahlen und Labels, Regular für Fließtext
- Farben: Blau `#2F5CFF`, Dunkel `#0A0A0B`, Grau `#4E525C`
- helle, ruhige Arbeitsflächen, klare dunkle Bereiche, gezielte blaue Akzente
- großzügige Abstände, starke Typografie, Diamantmotiv nur sparsam
- Logo-Dateien unverändert; fehlt ein Asset, erscheint ein dezenter Platzhalter

## Vorbefüllte Inhalte (nur belegt)

- Projekte: n8n Kontaktformular-Klassifikator, n8n Jobsuche-Assistent, Make.com Kontaktformular-Workflow, Digitales Weiterbildungs-Tagebuch, PIKARTZ.AI Präsentations-System – jeweils nur mit den genannten Angaben
- Weiterbildung „KI Automations Spezialist“, Aug–Dez 2026, Arbeitstage Mo–Fr, ohne eingetragene Aufgaben oder Fortschritte
- Zielrollen: Prompt Engineer, KI-Anwendungsspezialist, Grafikdesigner mit Social-Media- oder E-Commerce-Fokus
- Designregeln des PIKARTZ.AI Präsentations-Systems
- keine Kontakte, Unternehmen, Leads, Bewerbungen, Termine oder Aktivitäten

Maßgebliche Quelle für den Arbeitskontext ist Saschas MD-Datei (wird in `docs/sources/` abgelegt).

## Definition of Done

- `npm run build`, `npm run lint`, `npm run typecheck` und `npm test` laufen fehlerfrei.
- UI vollständig auf Deutsch, Datumsangaben über `Intl` mit `de-DE` und Gerätedatum, keine fest codierten Datumswerte.
- Keine erfundenen Daten; jede Kennzahl wird aus gespeicherten Daten berechnet.
- Demo-Modus sichtbar gekennzeichnet.
- Nutzbar bei 375 px, 768 px und ≥ 1280 px Breite, per Tastatur bedienbar, Kontrast mindestens WCAG AA.
- Lade-, Leer-, Fehler- und Bestätigungszustände vorhanden.

## Technische Rahmenbedingungen

React + Vite + TypeScript, react-router, Vitest. Speicherung in localStorage (Demo). Details in `.workshop/specialization/`.
