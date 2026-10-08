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

---

# Prüfprotokoll Roadmap v4 (task-9-4)

Abschlussprüfung am 2026-10-07 mit der gebauten App (Port 4173). Wegwerf-Testpasswort und Testdaten habe ich danach gelöscht.

## Automatische Prüfungen

| Befehl | Ergebnis |
|---|---|
| `npm run typecheck` | fehlerfrei |
| `npm run lint` | fehlerfrei |
| `npm test` | 322 Tests grün |
| `npm run build` | fehlerfrei; Bibliotheken als eigenes Paket, keine Größenwarnung mehr |

Neu getestet:

- **Tresor Version 2:** Datenschlüssel, Umstellung von Version 1, Passwortwechsel
- **Wiederherstellung per Link:** Schlüssel nur im Fragment, alter Link nach Erneuerung ungültig
- **Login:** mit Supabase-Ersatz (`createFakeCloud`)
- **Synchronisierung:**
  - nur Chiffretext, Klartext wird verweigert
  - zwei Geräte, Konflikt, fremder Tresor
- **Zweites Gehirn:** Lerntagebuch, Verknüpfungen, Suche
- **CSP:** ohne Supabase `connect-src 'none'`, mit Supabase genau die eigene https-Adresse; nur `src/data/cloud/supabase.ts` lädt Netzwerkcode

## Browser

- **Seiten:** alle 19 bei 375, 768 und 1280 px, inklusive `/wissen`, Kalender und Pipeline; ohne Überlauf und ohne Laufzeitfehler.
- **Wiederherstellung (task-5-7):** einrichten, Link öffnen (Schlüssel verschwindet sofort aus der Adresszeile), neues Passwort setzen; die Daten waren vollständig da.
- **Speicher:** Im localStorage steht nur der verschlüsselte Umschlag der Version 2.
- **Build mit Testwerten für Supabase:** Die CSP enthält genau die Testadresse, und die Supabase-Bibliothek liegt in einem eigenen, nur dann geladenen Paket.

## Offen (braucht Sascha)

- **Supabase:** Projekt anlegen und Werte in `.env.local` eintragen (Anleitung: `docs/supabase-einrichtung.md`). Erst dann sind Login und Synchronisierung echt nutzbar. Bis dahin ist die Funktion ausgeblendet, und es gibt keine Verbindung nach außen.
- **Git-Historie (task-5-6):** am 2026-10-08 auf Saschas Entscheidung abgebrochen (siehe unten).

---

# Prüfprotokoll Roadmap v6 (task-12-3)

Abschlussprüfung am 2026-10-08 mit der gebauten App (Port 4173, eigener Speicherbereich). Wegwerf-Testpasswort und Testdaten habe ich danach gelöscht; Saschas Daten auf Port 5173 blieben unberührt.

## Automatische Prüfungen

| Befehl | Ergebnis |
|---|---|
| `npm run typecheck` | fehlerfrei |
| `npm run lint` | fehlerfrei |
| `npm test` | 383 Tests grün |
| `npm run build` | fehlerfrei; Hinweis von Vite 8: Option `advancedChunks` gilt als veraltet (funktioniert, Umstellung bei Gelegenheit) |

Neu getestet:

- **Migrationen 7 → 8 → 9:** Wissens-Prompts werden Masterprompts, ohne Datenverlust
- **Werkzeugkasten:** Filter, Platzhalter, Kopieren, Verknüpfungen in beide Richtungen, Schritte mit Fortschritt, Integrationen, Schlüsselwarnung
- **Abos:** Monatskosten, fortgeschriebene Verlängerungen, Kündigungsfristen in Kalender, Cockpit und Dashboard
- **Gmail:** Anmeldeadresse, State-Prüfung, Token nur im Speicher, nichts ohne Anmeldung, 401 vergisst den Token, nur Kopfzeilen, Widerruf
- **Postfach:** Suche nur nach Kontakten und Unternehmensdomains, Zuordnung, Übernahme mit und ohne neuen Kontakt, Löschfolgen
- **CSP:** mit Client-ID genau Gmail-API und Widerruf zusätzlich; `fetch` nur im Gmail-Modul
- **axe:** alle neuen Seiten (Werkzeugkasten, Detailseiten, Abos, Anleitungen, Postfach) ohne Verstöße

## Browser

- **Seiten:** Werkzeugkasten, Masterprompts mit Ausfüllen, Abo mit Fristen, Cockpit (Abo-Fristen), Dashboard und Postfach bei 375, 768 und 1280 px; ohne horizontalen Überlauf und ohne Konsolenfehler.
- **Gefunden und behoben:** Lange Seitentitel (z. B. „Bewerbungsanschreiben“) wurden bei 375 px abgeschnitten; sie brechen jetzt um.
- **Netzwerk:** nur Anfragen an localhost.

## Offen (braucht Sascha)

- **Gmail:** Google-Cloud-Projekt anlegen und `VITE_GOOGLE_CLIENT_ID` in `.env.local` eintragen (Anleitung: `docs/gmail-einrichtung.md`). Bis dahin ist das Postfach ausgeblendet und es gibt keine Verbindung zu Google.
- **Supabase:** wie bisher `docs/supabase-einrichtung.md`.
- **Fernsteuerung per Handy (Remote Control):** von der Organisations-Richtlinie gesperrt; nur ein Admin kann sie freigeben.
- **Git-Historie (task-5-6):** am 2026-10-08 auf Saschas Entscheidung abgebrochen (siehe unten).

## Nachtrag 2026-10-08: Git-Historie (task-5-6) abgebrochen

Geprüft wurde die gesamte Historie aller Zweige gegen die privaten Begriffe und gegen alle 110 längeren Detailtexte der lokalen Projektdaten (Beschreibungen, Notizen, nächste Schritte). In alten Commits stehen nur Projekttitel, Kategorien und Stand, zwei Firmennamen, die drei Zielrollen und Kursangaben (Anbieter, Zeitraum, Unterrichtszeit, Module). Keine Projektbeschreibungen, Notizen oder Schritte, keine Personennamen, E-Mail-Adressen, Telefonnummern, Passwörter oder Schlüssel. Sascha hat entschieden, dass das nicht stört; ein Umschreiben der Historie mit Force-Push entfällt.

---

# Zwischenstand Roadmap v7 (2026-10-08)

Ohne Saschas Konten umgesetzt und geprüft:
- task-13-2 und task-13-3
- task-14-1 bis task-14-5
- task-15-1 bis task-15-6
- task-16-1
- task-17-1 bis task-17-5
- task-18-2 bis task-18-4

## Automatische Prüfungen

| Befehl | Ergebnis |
|---|---|
| `npm run typecheck` | fehlerfrei |
| `npm run lint` | fehlerfrei |
| `npm test` | über 450 Tests grün, inklusive axe aller Seiten und Supabase-Regeln mit echtem Postgres (PGlite) |
| `npm run build` | fehlerfrei; Vite meldet weiterhin, dass `advancedChunks` veraltet ist |
| GitHub CI | läuft bei jedem Push (Typecheck, Lint, Tests, Build) |

## Browser (gebaute App, eigener Speicherbereich auf Port 4173, Testdaten danach gelöscht)

- **Handy (375 px):** Alle Seiten mit Demo-Daten geprüft, kein horizontaler Überlauf. Tippflächen auf Touch-Geräten mindestens 44 px; Ausnahme sind Tabellen-Umschalter und Monatstage mit 32 px.
- **Desktop (1280 px):** KI-Assistent und Bewerbung mit Dokumenten-Panel geprüft.
- **PWA:** Service Worker aktiv, App inklusive Assets zwischengespeichert.
- **Folien:** im Browser geprüft.

## Was nur live mit Sascha geht

- Supabase (task-13-1): Login, Synchronisierung, Einladung, Regeln im echten Projekt
- KI über AWS Bedrock: Live-Antworten
- Hosting (task-18-1): Push auf dem Handy, Installation über https
- Generalprobe (task-16-2) und Praxistest (task-19-1)
- Rechtstexte und AVVs (task-19-2, task-19-3)
