# Quality Gate

Das Quality Gate ergänzt den zentralen Workshop-Workflow und darf ihn nicht überschreiben.

## Vor jedem Task-Abschluss

Alle vier Befehle müssen fehlerfrei laufen. Ihr Ergebnis steht im `verification`-Objekt des Tasks.

1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`

## Zusätzlich, sobald Oberfläche betroffen ist

- Sichtprüfung im laufenden Dev-Server bei 375 px, 768 px und ≥ 1280 px Breite
- vollständig per Tastatur bedienbar, sichtbarer Fokus
- Kontrast mindestens WCAG AA
- Oberfläche vollständig auf Deutsch
- Lade-, Leer- und Fehlerzustand für neue Datenansichten

## Zusätzlich bei Daten und Logik

- reine Funktionen (Reducer, Selektoren, Datums-Hilfen) haben Unit-Tests
- keine fest codierten Datumswerte, `now` wird übergeben
- keine erfundenen Daten im Seed; der Seed-Test muss grün sein
