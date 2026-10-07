# Architektur

Status: geplant und von Sascha freigegeben (2026-10-07). Noch nicht umgesetzt. Die Umsetzung erfolgt Task für Task laut `.workshop/roadmap.json`.

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

### Was sinnvoll ist (wird gebaut)

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
   - Verknüpft mit den 3 **Zielrollen** (vorbefüllt): Prompt Engineer, KI-Anwendungsspezialist, Grafikdesigner Social Media / E-Commerce
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

### Ordnerstruktur

```
src/
├─ main.tsx, App.tsx          Router, StoreProvider, StoreGate (laden/Fehler)
├─ styles/                    tokens.css, fonts.css, base.css
├─ domain/                    types.ts, labels.ts, dates.ts, kurs.ts, format.ts,
│                             selectors/{cockpit,projekte,aufgaben,weiterbildung,
│                             automationen,crm,aktivitaeten}.ts (+ Tests)
├─ data/                      schema.ts (zod), migrations.ts, storage.ts, seed.ts,
│                             actions.ts, reducer.ts, activity.ts, store.tsx
├─ hooks/                     useNow, usePageHeading, useForm
├─ components/layout|brand|ui AppShell, Sidebar, NavDrawer, SkipLink, DemoBanner,
│                             Wordmark, Logo (Platzhalter), Diamond, Button, Field*,
│                             Dialog, ConfirmDialog, Toast, EmptyState, ErrorState,
│                             LoadingState, SearchFilterBar, Tabs, DueLabel, TagInput
└─ features/                  cockpit, projekte, automationen, weiterbildung, marke,
                              aufgaben, kontakte, bewerbungen, einstellungen
public/brand/ (Logos unverändert), public/fonts/ (nur wenn bereitgestellt), docs/sources/ (MD)
```

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
- **Aufgabe**, einheitlich, mit `bezug`: ohne | projekt | weiterbildung | kontakt
  - „Nächste Schritte“ eines Projekts sind Aufgaben mit Projektbezug.
  - `faelligAm` ist nullable.
- **Termin**: Datum (Pflicht), Uhrzeit optional, Bezug
- **Kurs** (Zeitraum 2026-08 bis 2026-12, Arbeitstage Mo–Fr, Präfix `KIAutomSpez`) und **KursAufgabe** (Code `^KIAutomSpez_\d+_\d{2}$`, Status offen/in_arbeit/erledigt)
- **Designregel** und **Deck** (PIKARTZ.AI)
- **CRM**
  - Unternehmen
  - Kontakt: mit Kontext, Herkunft, LinkedIn, unternehmenId, projektIds, naechsteAktion
  - Interaktion
  - Lead: `betragEur: number | null`
- **Bewerbungen**: Zielrolle; Bewerbung mit Status, Zielrolle, Kontakt, Quelle, Datum, Link und nächstem Schritt
- **Aktivität**: Zeitpunkt, Art, Bezug mit Titel-Snapshot, deutsche Zusammenfassung
- **Einstellungen**: Anzeigename
- **AppData**: `schemaVersion: 1` plus alle Listen

### Zustand und Speicherung

- **Store-Status**: `loading | ready | error`
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
| `selectNaechsteSchritte` | offene Projektaufgaben und Kontakt-Wiedervorlagen; Reihenfolge: überfällig → mit Frist → ohne Frist |
| `selectAktuelleProjekte` | nicht abgeschlossen/pausiert, mit offenen und erledigten Schritten; **kein Prozentwert** |
| `selectAnstehend` | Aufgaben, Termine und KursAufgaben der nächsten 7 Tage |
| `selectWeiterbildung` | Kursrelation (vor/laufend/nach), Arbeitstage (gesamt/vergangen/verbleibend, ohne Feiertage); Fortschritt `null`, solange keine Aufgaben eingetragen sind |
| `selectAutomationenNachPlattform` / `…NachProjekt` | gruppierte Sicht |
| `selectLetzteAktivitaeten` | neueste zuerst; leer → Leerzustand |
| `selectCrmUebersicht` | fällige Wiedervorlagen, Bewerbungen nach Status, offene Leads |
| `selectLeadSumme` | Summe nur über Leads mit Betrag; ohne Beträge `null` |

Datums-Hilfen in `dates.ts`: `isWorkday`, `nextWorkday`, `countWorkdays`, `relativeDueLabel` (z. B. „Noch keine Frist hinterlegt“, „Überfällig seit 3 Tagen“, „Heute fällig“) sowie Formatierer über `Intl` mit `de-DE`.

### Navigation, Layout und Design

- **Breiten**
  - ≥ 1200 px: dunkle Sidebar (256 px) mit Wortmarke und 9 Punkten; der aktive Punkt hat einen blauen Balken und `aria-current`
  - 768–1199 px: Icon-Leiste mit kurzem Label
  - < 768 px: dunkle Topbar und Menü als `<dialog>`-Schublade (Fokusfang, Esc schließt, Fokus kehrt zurück)
- **Immer sichtbar**: Skip-Link; Fokus auf das h1 bei Routenwechsel; Demo-Banner, nicht schließbar
- **Routen**: `/`, `/projekte(/:id)`, `/automationen`, `/weiterbildung`, `/pikartz-ai`, `/aufgaben`, `/kontakte` (plus `/unternehmen`, `/leads`, `/:id`), `/bewerbungen(/zielrollen)`, `/einstellungen`, NotFound
- **Farben**: Blau, Dunkel und Grau als Tokens, helle Fläche `#F6F7F9`. Kontrast: Blau auf Dunkel nur für große Schrift und Bedienelemente, Grau auf Dunkel aufgehellt. Ein Kontrast-Test prüft die Token-Paare.
- **Schrift**: Liberation Sans per `local()` bzw. mitgelieferten OFL-Dateien, Fallback Arial (metrisch gleich)
- **Diamant**: nur im Cockpit-Kopf und im PIKARTZ.AI-Kopf
- **Formulare**: kontrolliert über `useForm`, Validierung pro Entität als reine Funktion. Anlegen und Bearbeiten im Dialog, auf Mobil im Vollbild. Leere Zahlen werden zu `null`. Rückfrage „Änderungen verwerfen?“; nach dem Speichern ein Toast.

### Seed (nur belegte Inhalte)

Quelle: `docs/sources/arbeitskontext.md` (Saschas Projekt-Übersicht vom 2026-10-07, Roadmap v2 / task-1-7)

- **Projekte**: 12 Projekte mit Kategorie, Status (🟢/🟡 → `in_arbeit`, ✅ → `abgeschlossen`, Konzeptphase → `idee`), „zuletzt aktiv“; ohne Automationsprofil
- **Private Details**: Beschreibung, Tools, Bestandteile, Notizen und nächste Schritte stehen nur lokal in `src/data/seed.privat.ts` (von Git ignoriert, Repository ist öffentlich). `seed.ts` bindet die Datei über `import.meta.glob` ein, wenn sie existiert.
- **Aufgaben** (aus den lokalen Details): offene Punkte als nächste Schritte ohne Frist, [x]-Punkte als erledigt ohne Datum
- **Weiterbildung**: Kurs mit Anbieter, 03.08.–18.12.2026, Unterrichtszeit, Umfang und Modulen; ohne Kursaufgaben
- **PIKARTZ.AI**: 7 belegte Designregeln, Demo-Deck Modul 1 / Tag 1
- **Bewerbungen**: 3 Zielrollen
- **Einstellungen**: Anzeigename „Sascha“
- **Leer**: Kontakte, Unternehmen, Leads, Bewerbungen, Termine, Aktivitäten
- **Schema**: Version 2 (Projekt mit `kategorie` und `zuletztAktiv`, Kurs mit Details); Migration 1 → 2 in `src/data/migrations.ts`