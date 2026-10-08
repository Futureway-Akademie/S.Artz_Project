# Tests

Das ausführliche Protokoll mit den Seitenlisten und Ergebnissen je Roadmap-Version steht in [pruefprotokoll.md](pruefprotokoll.md).

## Aktueller Stand (2026-10-08)

| Befehl | Ergebnis |
|---|---|
| `npm test` | 69 Testdateien, 454 Tests grün |
| `npm run typecheck` | fehlerfrei |
| `npm run lint` | fehlerfrei |
| `npm run build` | fehlerfrei (Hinweis von Vite: Option `advancedChunks` gilt als veraltet) |
| GitHub CI | läuft bei jedem Push und Pull Request (Typecheck, Lint, Tests, Build) |

## Was automatisch geprüft wird

- **Logik:** Reducer, Speicherschicht, Migrationen (Schema 1 → 11), Seed, Datums-Hilfen und alle Selektoren (Cockpit, Kalender, Suche, Kennzahlen, Abos, Postfach usw.)
- **Bedienung:** Tests mit Testing Library je Bereich, zum Beispiel Anlegen, Bearbeiten, Löschen mit Bestätigung, Filter, Suche, Passwortschutz, Sicherung, Kalender, E-Mail
- **Barrierefreiheit:** axe-core prüft alle Seiten und Dialoge auf WCAG 2.1 A/AA, ohne Verstöße (`src/test/barrierefreiheit.test.tsx`); ein Kontrast-Test prüft die Farb-Tokens
- **Verschlüsselung:** Tresor, Datenschlüssel, Passwortwechsel, Wiederherstellung per Link, verschlüsselte Sicherung, geteilte Bereiche
- **Synchronisierung und Login:** mit einem Supabase-Ersatz (`src/test/fakeCloud.ts`); nur Chiffretext, zwei Geräte, Konflikte
- **Supabase-Regeln:** Row Level Security und Spaltenrechte mit echtem Postgres über PGlite (`src/test/supabaseRegeln.test.ts`)
- **Datenschutz-Wächter:** keine persönlichen Begriffe in versionierten Dateien (`src/test/datenschutz.test.ts`)
- **Keine Verbindung nach außen:** strikte Content-Security-Policy, Netzwerkcode nur in den erlaubten Modulen (`src/test/keineVerbindung.test.tsx`)
- **PWA:** Manifest und Service Worker (`src/test/pwa.test.ts`)

Alle Tests laufen mit der Zeitzone Europe/Berlin und mit fiktiven Beispieldaten (`src/test/beispielStart.ts`).

## Manuelle Prüfung im Browser

- Alle Seiten bei 375, 768 und 1280 px Breite: richtige Navigation, kein horizontaler Überlauf, keine Konsolenfehler
- Tastatur: Skip-Link, Fokus auf der Überschrift nach Seitenwechsel, Fokusfang in Dialogen, sichtbarer Fokusring
- Datenschutz: im Browser-Speicher steht nur der verschlüsselte Umschlag; Abrufe nach außen werden blockiert
- Geprüft wird mit der gebauten App auf Port 4173 und einem Wegwerf-Passwort, damit echte Daten unberührt bleiben. Die Testdaten werden danach gelöscht.

## Was nur live geht

Login, Synchronisierung und Einladungen im echten Supabase-Projekt, Live-Antworten der KI, Push auf dem Handy und die Installation über https brauchen eingerichtete Konten. Diese Prüfungen sind geplant (task-13-1, task-16-2, task-18-1, task-19-4).
