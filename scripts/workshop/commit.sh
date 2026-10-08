#!/usr/bin/env bash
# Prüfen, Task abschließen, committen und pushen.
# Aufruf: bash scripts/workshop/commit.sh <task-id> "<Zusammenfassung>" "<Kurzfassung>" "<Commit-Nachricht>" [nächste-task-id]
set -e
cd "$(dirname "$0")/../.."
W=scripts/workshop
npx tsc --noEmit -p tsconfig.app.json
npx eslint src
npx vitest run > "${TMPDIR:-/tmp}/letzter-test.txt" 2>&1 || { grep -E "×|FAIL|Error" "${TMPDIR:-/tmp}/letzter-test.txt" | head -30; echo TESTS_FEHLER; exit 1; }
grep -E "Tests " "${TMPDIR:-/tmp}/letzter-test.txt"
V="${TMPDIR:-/tmp}/verifikation.json"
node -e "require('fs').writeFileSync(process.argv[1], JSON.stringify({summary: process.argv[2], commands: ['npx tsc --noEmit -p tsconfig.app.json','npx eslint src','npx vitest run'], short: process.argv[3]}))" "$V" "$2" "$3"
node $W/ws.cjs complete "$1" "$V"
if [ -n "$5" ]; then node $W/ws.cjs start "$5"; fi
node $W/cs.cjs > /dev/null
# Datenschutz-Wächter: keine privaten Begriffe im Repository
npx vitest run src/test/datenschutz.test.ts > /dev/null 2>&1 || { echo WAECHTER_FEHLER; exit 1; }
git add -A
git commit -q -m "$4

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q origin "$(git branch --show-current)" 2>&1 | grep -v "^warning" || true
git log --oneline -1
