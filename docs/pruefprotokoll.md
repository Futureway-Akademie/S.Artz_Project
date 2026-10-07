# Prüfprotokoll

End-to-End-Prüfung aller Bereiche (task-4-3) am 2026-10-07 im laufenden Dev-Server (`npm run dev`, Chromium im Browserbereich von Claude Code) mit den lokalen Daten.

## Automatische Prüfungen

| Befehl | Ergebnis |
|---|---|
| `npm run typecheck` | fehlerfrei |
| `npm run lint` | fehlerfrei |
| `npm test` | 28 Testdateien, 206 Tests grün |
| `npm run build` | fehlerfrei |

Die Tests umfassen Unit-Tests (Reducer, Speicherschicht, Migration, Seed, Datums-Hilfen, alle Selektoren), Bedienungstests je Bereich und eine axe-core-Prüfung aller Seiten (WCAG 2.1 A/AA, 0 Verstöße).

## Seiten bei 375, 768 und 1280 px

Geprüft je Breite:

- Überschrift (h1) korrekt
- passende Navigation:
  - 375 px: Topbar mit Menü
  - 768 px: Icon-Leiste
  - 1280 px: Sidebar
- aktiver Bereich markiert (`aria-current`)
- kein horizontaler Überlauf
- keine Laufzeitfehler

| Seite | 375 px | 768 px | 1280 px |
|---|---|---|---|
| `/` Arbeitscockpit | ✓ | ✓ | ✓ |
| `/projekte` | ✓ | ✓ | ✓ |
| `/projekte/:id` | ✓ | ✓ | ✓ |
| `/automationen` | ✓ | ✓ | ✓ |
| `/weiterbildung` | ✓ | ✓ | ✓ |
| `/pikartz-ai` | ✓ | ✓ | ✓ |
| `/aufgaben` | ✓ | ✓ | ✓ |
| `/aufgaben?ansicht=termine` | ✓ | ✓ | ✓ |
| `/kontakte` | ✓ | ✓ | ✓ |
| `/kontakte/unternehmen` | ✓ | ✓ | ✓ |
| `/kontakte/leads` | ✓ | ✓ | ✓ |
| `/bewerbungen` | ✓ | ✓ | ✓ |
| `/bewerbungen/zielrollen` | ✓ | ✓ | ✓ |
| `/einstellungen` | ✓ | ✓ | ✓ |

Detailseiten für Kontakt und Unternehmen sind in den Bedienungstests und der axe-Prüfung abgedeckt. Im Browser habe ich sie nicht geöffnet, um in Saschas lokalen Daten keine Testkontakte anzulegen.

## Tastatur und Fokus

- **Skip-Link:** erscheint beim ersten Tab.
- **Seitenwechsel:** Danach liegt der Fokus auf der Überschrift.
- **Mobiles Menü:** Esc schließt es, der Fokus kehrt zum Menü-Button zurück. Nach einer Navigation liegt der Fokus auf der neuen Überschrift.
- **Dialoge:** sind modal mit Fokusfang. Esc schließt sie und gibt den Fokus zurück. Bei ungespeicherten Änderungen fragt der Dialog „Änderungen verwerfen?“.
- **Fokusring:** Auf `/`, `/projekte`, `/aufgaben`, `/kontakte`, `/einstellungen` und `/weiterbildung` zeigen alle 234 fokussierbaren Elemente bei Tastaturfokus einen sichtbaren Fokusring.

## Bekannte Einschränkungen

- Speicherung nur im Browser (Demo-Modus); kein Backend, keine Synchronisierung zwischen Geräten.
- Arbeitstage ohne Feiertage.
- Ältere Browser-Daten übernehmen neue Startdaten nur über „Zurücksetzen“.
- Projektdetails liegen nur lokal in `src/data/seed.privat.ts`, weil das Repository öffentlich ist. Auf einem anderen Rechner starten die Projekte ohne Details.
