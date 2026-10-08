# Einrichtung

## Voraussetzungen

- Node.js 24 und npm 11 (so lokal geprüft)
- ein aktueller Browser (Chrome, Edge, Firefox oder Safari)
- Git

## Starten

```bash
npm install
npm run dev
```

Die App läuft danach unter http://localhost:5173. Beim ersten Öffnen legst du ein Passwort fest. Damit werden alle Daten im Browser verschlüsselt.

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver |
| `npm run build` | Typprüfung und Produktions-Build nach `dist/` |
| `npm run preview` | gebaute App lokal ansehen (Port 4173) |
| `npm test` | alle Tests einmal ausführen |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript ohne Ausgabe |

## Persönliche Startdaten (optional)

Das Repository ist öffentlich und enthält keine persönlichen Inhalte. Eigene Startdaten (Projekte, Weiterbildung, Zielrollen, Anzeigename) kommen in die Datei `src/data/seed.privat.ts`. Git ignoriert sie. Die Datei exportiert `STARTDATEN` vom Typ `StartDaten` aus `src/data/seed.ts`. Ohne diese Datei startet die App leer.

## Optionale Anbindungen

Ohne weitere Einrichtung hat die App keinen Server und keine Verbindung nach außen. Jede Anbindung wird über `.env.local` eingeschaltet (Vorlage: `.env.example`) und hat eine eigene Anleitung:

| Anbindung | Wofür | Anleitung |
|---|---|---|
| Supabase (Region Frankfurt) | Login, Ende-zu-Ende-verschlüsselte Synchronisierung, Mehrbenutzer, geteilte Bereiche, Dokumente | [supabase-einrichtung.md](supabase-einrichtung.md) |
| Google (nur lesend) | Gmail-Postfach und Google-Kalender | [gmail-einrichtung.md](gmail-einrichtung.md) |
| KI über Supabase-Funktion | KI-Assistent | [ki-einrichtung.md](ki-einrichtung.md) |
| Web-Push | Erinnerungen ohne Inhalte | [push-einrichtung.md](push-einrichtung.md) |

Zugangsdaten stehen nie im Repository und nie im Browser. Serverseitige Schlüssel liegen nur als Secrets bei Supabase.

## Automatische Prüfung auf GitHub

Bei jedem Push und Pull Request laufen Typecheck, Lint, Tests und Build (`.github/workflows/ci.yml`).
