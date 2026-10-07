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

---

# Prüfprotokoll Roadmap v3 (task-8-4)

Abschlussprüfung am 2026-10-07 mit der gebauten App (`npm run build` und `npm run preview`, Port 4173) im Browserbereich von Claude Code.

- Für die Prüfung habe ich ein Wegwerf-Testpasswort gesetzt und die Testdaten danach gelöscht.
- Saschas Daten auf Port 5173 habe ich nicht berührt.

## Automatische Prüfungen

| Befehl | Ergebnis |
|---|---|
| `npm run typecheck` | fehlerfrei |
| `npm run lint` | fehlerfrei |
| `npm test` | 295 Tests grün |
| `npm run build` | fehlerfrei |

Die Tests enthalten neu:

- Verschlüsselung und Passwortschutz
- verschlüsselte Sicherung
- DSGVO-Funktionen
- Verknüpfungen und Gesamtsicht
- Suche, Kalender mit .ics-Export, E-Mail-Vorlagen und Pipeline
- Fokus, Beziehungspflege, Schlagworte
- axe-core auf allen neuen Seiten und Dialogen
- zwei Wächter:
  - keine persönlichen Begriffe im Repository
  - keine Netzwerkzugriffe, strikte Content-Security-Policy

## Seiten bei 375, 768 und 1280 px

Geprüft je Breite: Überschrift (h1), aktiver Navigationspunkt (`aria-current`), kein horizontaler Überlauf, keine Laufzeitfehler.

| Seite | 375 | 768 | 1280 |
|---|---|---|---|
| `/` Arbeitscockpit (Fokus, Diese Woche, Sicherungs-Erinnerung) | ✓ | ✓ | ✓ |
| `/projekte`, `/projekte/:id` | ✓ | ✓ | ✓ |
| `/automationen`, `/weiterbildung`, `/pikartz-ai` | ✓ | ✓ | ✓ |
| `/aufgaben`, `/aufgaben?ansicht=termine` | ✓ | ✓ | ✓ |
| `/kalender` (Monat, Woche, Liste) | ✓ | ✓ | ✓ |
| `/kontakte`, `/kontakte/unternehmen`, `/kontakte/leads`, `/kontakte/vorlagen` | ✓ | ✓ | ✓ |
| `/bewerbungen`, `/bewerbungen/zielrollen` | ✓ | ✓ | ✓ |
| `/einstellungen` | ✓ | ✓ | ✓ |
| Seite nicht gefunden | ✓ | ✓ | ✓ |

- **Detailseiten** von Kontakt, Unternehmen, Lead und Bewerbung sowie die Pipeline mit Einträgen: abgedeckt durch Bedienungstests und axe-Prüfung. Die Startdaten enthalten bewusst keine Kontakte oder Bewerbungen.

## Datenschutz im Browser

- **Speicher:** Im localStorage steht nur der Schlüssel `pikartz-arbeitscockpit` mit dem verschlüsselten Umschlag (`format: pikartz-verschluesselt`). Kein Projekttitel ist im Klartext lesbar.
- **Sperre:** Nach dem Neuladen ist die App gesperrt; Entsperren funktioniert.
- **Netzwerk:** Ein Abruf nach außen (`fetch`) wird von der Content-Security-Policy blockiert.
- **Suche:** Strg+K öffnet die Suche mit Fokus im Suchfeld (Fehler gefunden und behoben, task-6-3).

## Bekannte Einschränkungen

- **Passwort:** Vergessen bedeutet Datenverlust. Die verschlüsselte Sicherung ist das Backup.
- **Datei-Abrufe:** Downloads (Sicherung, Auskunft, .ics) habe ich auf Saschas Rechner nicht im Browser ausgelöst, sondern über Tests geprüft.
- **Git-Historie:** Alte Commits auf GitHub enthalten noch persönliche Begriffe (task-5-6, blockiert). Bereinigen geht nur per Force-Push mit Saschas Freigabe oder indem das Repository privat wird.
- **Vorhandene Browserdaten:** Ältere Daten auf Port 5173 sind noch unverschlüsselt, bis Sascha beim nächsten Öffnen ein Passwort festlegt. Die App fragt danach automatisch.
