# Werkzeuge für den Workshop-Projektstand

Hilfsskripte für Coding-Agenten, die `.workshop/` gemäß `.workshop/AGENT_PROTOCOL.md` pflegen.

| Skript | Zweck |
|---|---|
| `node scripts/workshop/ws.cjs start <task-id>` | Task auf `in_progress` setzen, Aktivität protokollieren, Fortschritt neu berechnen |
| `node scripts/workshop/ws.cjs complete <task-id> <verifikation.json>` | Task mit Verifikation abschließen, abhängige Tasks freigeben |
| `node scripts/workshop/ws.cjs cancel <task-id> "<Grund>"` | Task abbrechen (zählt nicht mehr zum Fortschritt) |
| `node scripts/workshop/cs.cjs ["<Zeile>"]` | `.workshop/CURRENT_STATE.md` aus Roadmap und Fortschritt aktualisieren |
| `bash scripts/workshop/commit.sh …` | Typecheck, Lint, Tests, Task abschließen, Datenschutz-Wächter, Commit und Push |

Der Datenschutz-Wächter (`src/test/datenschutz.test.ts`) muss vor jedem Push grün sein. Er prüft gegen die lokale, nie versionierte Datei `src/data/seed.privat.ts`.
