# Arbeitskontext – Sascha Artz

Maßgebliche Quelle für die vorbefüllten Inhalte des Arbeitscockpits (Seed-Daten in `src/data/seed.ts`).

**Herkunft**

- **Projekte und Weiterbildung:** Saschas Projekt-Übersicht (`projekte-uebersicht.md`, Stand 2026-10-07). Die Datei bleibt auf Saschas Wunsch lokal und liegt nicht im Repository, das öffentlich ist. Im Repository (`src/data/seed.ts`) stehen nur Titel, Kategorie, Status und „zuletzt aktiv“. Beschreibung, Tools, Bestandteile, Notizen und nächste Schritte je Projekt liegen in der lokalen, von Git ignorierten Datei `src/data/seed.privat.ts`. Status-Angaben sind der letzte bekannte Stand laut Saschas Notizen.
- **Designregeln, Demo-Deck und Zielrollen:** aus dem Projektbrief (`.workshop/PROJECT_BRIEF.md`).
- **Ersetzt:** Die ursprünglich angenommenen Projekte (n8n Kontaktformular-Klassifikator, n8n Jobsuche-Assistent, Make.com Kontaktformular-Workflow, PIKARTZ.AI Präsentations-System) gibt es laut Sascha noch nicht. Sie werden nicht vorbefüllt (Roadmap v2, task-1-7).

---

## 1. Projekte (12)

| # | Projekt | Kategorie | Stand laut Übersicht | Status in der App | Zuletzt aktiv |
|---|---|---|---|---|---|
| 1 | Diamond World (Videospiel) | Privat / Kreativ | Aktiv – Planung & Setup | In Arbeit | 2026-10-07 |
| 2 | PikArtz Portfolio-Website | Karriere | In Arbeit – Platzhalter befüllen | In Arbeit | 2026-10-01 |
| 3 | Kleinanzeigen / Keller-Sammlung | Privat | Aktiv – Inserate | In Arbeit | 2026-09-18 |
| 4 | Amazon Gallery Generator (Bud Voyage Easy-Grow-Kit) | E-Commerce | Phase 4 offen | In Arbeit | 2026-09-07 |
| 5 | KI-Weiterbildung: Tagebuch → Schulungsplattform | Weiterbildung | Läuft bis 18.12.2026 | In Arbeit | 2026-09-07 |
| 6 | Lebenslauf Optimierung | Karriere | Weitgehend fertig / Paket fertig | Abgeschlossen | 2026-09-07 |
| 7 | Karriere Booster (LinkedIn) | Karriere | In Arbeit | In Arbeit | 2026-09-07 |
| 8 | Jobsuche Festanstellung | Karriere | Aktiv | In Arbeit | 2026-08-19 |
| 9 | CI-Skills (ci-entwurf / ci-board) | KI-Agenten | Optimierung offen | In Arbeit | 2026-08-19 |
| 10 | Datenschutz-Agent (DSGVO) | KI-Agenten | Konzeptphase | Idee | 2026-08-19 |
| 11 | Handwerker-Leadmagnet (navis5) | Kundenprojekt | In Arbeit | In Arbeit | 2026-08-19 |
| 12 | Fidelio-Homepage | Kundenprojekt / Verein | In Arbeit – prüfen | In Arbeit | 2026-08-19 |

Zuordnung der Statussymbole: 🟢 und 🟡 → „In Arbeit“, ✅ → „Abgeschlossen“, ⚪ Konzeptphase → „Idee“. Der Wortlaut „Stand laut Übersicht“ steht in den Projektnotizen.

Nächste Schritte:

- Offene Punkte („[ ]“) sind nächste Schritte ohne Frist.
- Erledigte Punkte („[x]“) sind als erledigt hinterlegt, ohne Erledigungsdatum.
- Die Kursaufgaben „Stand August, ggf. schon erledigt“ sind offene Schritte des Tagebuch-Projekts mit genau diesem Hinweis. Sie haben keine Codes im Format `KIAutomSpez_X_YY`.

Automationen: Keines der 12 Projekte hat ein belegtes Automationsprofil (Plattform, Modell, Schwelle, Routing). Der Bereich „Automationen“ startet deshalb leer.

## 2. Weiterbildung

- Kurs: „KI Automations Spezialist“
- Anbieter: FutureWay KI Akademie GmbH
- Form: Vollzeit Online-Live
- Zeitraum: 03.08.2026 – 18.12.2026
- Unterrichtszeit: Mo–Fr 09:00–16:05
- Umfang: 800 UE
- Module: KI (Langdock, Claude, Mistral) · Automatisierung (n8n, Make, Claude Code) · Software (Supabase, Azure, Vercel, Hetzner) · Portfolio-Projekt · Zertifizierungen (Abschlusstest + Microsoft AI-901) · Karriere-Coaching
- Aufgaben-Kürzel: `KIAutomSpez` (Format `KIAutomSpez_<Nummer>_<zweistellig>`)
- Eingetragene Kursaufgaben mit Code: keine
- Fortschritt: keiner hinterlegt, er wird nur aus erledigten Kursaufgaben berechnet

## 3. PIKARTZ.AI – Marke und Designregeln

1. Wortmarke „PIKARTZ.AI“; „.AI“ in Blau `#2F5CFF`
2. Farben: Blau `#2F5CFF`, Dunkel `#0A0A0B`, Grau `#4E525C`
3. Schrift: Liberation Sans – Bold für Überschriften, Zahlen und Labels, Regular für Fließtext
4. Helle, ruhige Arbeitsflächen, klare dunkle Bereiche, gezielte blaue Akzente
5. Großzügige Abstände, starke Typografie
6. Diamantmotiv nur sparsam einsetzen
7. Logo-Dateien unverändert verwenden; fehlt ein Asset, erscheint ein dezenter Platzhalter

[offen: In der Planung ist von 10 Designregeln die Rede. Belegt sind nur diese 7.]

Demo-Deck „Modul 1, Tag 1“: Inhalt [offen]. Laut Projekt-Übersicht entstehen die Tages-Präsentationen der Weiterbildung mit dem PIKARTZ.AI-HTML-Template.

Logo-Dateien (unverändert unter `public/brand/`):

- `Pikartz-Logo.png` – Bildmarke: großes „A“ mit „RTZ“, Lorbeerkranz und Diamant; schwarz auf weißem, nicht transparentem Hintergrund; 1500 × 1500 px
- `PIKARTZ - in Text - Liberation Sans Bold.png` – Wortmarke „PIKARTZ“ in Liberation Sans Bold; schwarz auf weißem, nicht transparentem Hintergrund; 1230 × 233 px; ohne „.AI“

## 4. Berufliche Ziele

Zielrollen, die als Zielrollen und nicht als Bewerbungen hinterlegt sind (laut Saschas Entscheidung vom 2026-10-07 nur diese drei):

- Prompt Engineer
- KI-Anwendungsspezialist
- Grafikdesigner mit Social-Media- oder E-Commerce-Fokus

Laufende Bewerbungen: keine hinterlegt.

## 5. Nicht vorbefüllt

- keine Kontakte, Unternehmen, Leads oder Bewerbungen. Personen und Firmen aus der Projekt-Übersicht stehen nur im jeweiligen Projekttext (Entscheidung Sascha, 2026-10-07).
- keine Termine, Fristen oder Aktivitäten
- keine Fortschrittswerte oder Kennzahlen

## 6. Einstellungen

- Anzeigename: „Sascha“
