# Projektbrief

## Projektname

PIKARTZ.AI – Arbeitscockpit

## Idee / Problem

Saschas Arbeit (Automationsprojekte, Weiterbildung, Marke PIKARTZ.AI, Kontakte, Bewerbungen) ist über viele Tools verteilt. Das Cockpit beantwortet:

- Woran arbeite ich gerade?
- Was ist der nächste konkrete Schritt?
- Was muss ich im Blick behalten?

Es soll Saschas tatsächliche Arbeit unterstützen und nicht wie ein Standard-Vertriebs-CRM wirken.

## Zielgruppe

Sascha Artz als Admin. Ab Roadmap v7 zusätzlich eingeladene Nutzer (Kunden, Team, Kursteilnehmer, Familie/Freunde) mit Rollen und je Nutzer freigeschalteten Bereichen.

## Zielplattform

Web-App im Browser, responsiv für Desktop, Tablet und Smartphone. Oberfläche vollständig auf Deutsch.

## Kernfunktionen

1. Arbeitscockpit und Dashboard
2. Projekte, Aufgaben & Termine, Kalender
3. Automationen
4. KI-Werkzeugkasten: Masterprompts, Befehle, Agenten, Skills, Anleitungen, Integrationen, Workflows, Modelle & Abos (Roadmap v6)
5. Weiterbildung und Wissen (zweites Gehirn)
6. Kontakte & Leads, Postfach (Gmail, nur lesend, Roadmap v6), Bewerbungen
7. PIKARTZ.AI
8. Einstellungen
9. Mehrbenutzer mit Rollen, Admin-Bereich und geteilten Bereichen (Roadmap v7)
10. KI-Assistent: Bewerbungen, Mails und Verlauf, Tagesplanung, Chat mit den eigenen Daten – Claude über AWS Frankfurt, nur nach Freigabe (Roadmap v7)
11. Anbindungen: Google-Kalender, n8n/Make, Stellenanzeigen, Dokumente (Roadmap v7)
12. Online in Deutschland gehostet, als App auf dem Handy installierbar (Roadmap v7)

## Nicht-Ziele

- keine offene Registrierung: neue Nutzer nur per Einladung durch den Admin
- kein eigener Server neben Supabase; Daten verschlüsselt im Browser, Ende-zu-Ende-verschlüsselt über Supabase (Region Frankfurt) synchronisiert; serverseitige Funktionen (KI-Zugang, Webhooks) als Supabase-Funktionen
- keine echten Verbindungen zu n8n, Make.com, HubSpot, SeaTable usw.; einzige Ausnahme ist optional Gmail nur lesend (Roadmap v6), Zugangsdaten werden nie im Cockpit gespeichert
- keine erfundenen Daten (Kennzahlen, Umsätze, Termine, Kontakte, Fortschritte)
- keine dekorativen Diagramme oder Animationen ohne Funktion

## MVP

Eine lauffähige App mit:

- responsiver Navigation über alle Bereiche (seit Roadmap v6 in Gruppen)
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

- Projekte mit Kategorie, Status, „zuletzt aktiv“, Beschreibung, Notizen und nächsten Schritten ohne Frist – nur aus der lokalen, nicht versionierten Datei `src/data/seed.privat.ts`
- Die laufende Weiterbildung mit Zeitraum, Unterrichtszeit, Umfang und Modulen (Details nur lokal), ohne eingetragene Kursaufgaben oder Fortschritte
- Drei Zielrollen (Titel nur lokal)
- Designregeln des PIKARTZ.AI Präsentations-Systems
- keine Kontakte, Unternehmen, Leads, Bewerbungen, Termine oder Aktivitäten

Alle persönlichen Startdaten liegen nur lokal (`src/data/seed.privat.ts`). Das Repository ist öffentlich und enthält keine persönlichen Inhalte.

## Datenschutz (Roadmap v3)

- keine Information von außen einsehbar: keine externen Verbindungen, Daten verschlüsselt im Browser, Sicherungen verschlüsselt
- DSGVO: Rechtsgrundlage und Zweck je Kontakt, Auskunft, vollständiges Löschen, Prüfhinweis für ruhende Kontakte

## Definition of Done

- `npm run build`, `npm run lint`, `npm run typecheck` und `npm test` laufen fehlerfrei.
- UI vollständig auf Deutsch, Datumsangaben über `Intl` mit `de-DE` und Gerätedatum, keine fest codierten Datumswerte.
- Keine erfundenen Daten; jede Kennzahl wird aus gespeicherten Daten berechnet.
- Demo-Modus sichtbar gekennzeichnet.
- Nutzbar bei 375 px, 768 px und ≥ 1280 px Breite, per Tastatur bedienbar, Kontrast mindestens WCAG AA.
- Lade-, Leer-, Fehler- und Bestätigungszustände vorhanden.

## Technische Rahmenbedingungen

React + Vite + TypeScript, react-router, Vitest. Speicherung in localStorage (Demo). Details in `.workshop/specialization/`.
