# Reflexion

> **Entwurf.** Die Abschnitte „Was mir wichtig war“ bis „Was ich beim nächsten Mal anders mache“ formuliert Sascha selbst. Die Fragen sind nur Anstöße und können gelöscht werden. Der Coding-Agent hat nur den sachlichen Teil am Ende ergänzt.

## Was mir wichtig war

_Warum wolltest du dieses Cockpit bauen? Was sollte es für dich leisten?_

## Was gut lief

_Was hat dich überrascht oder gefreut? Welche Funktion nutzt du am liebsten?_

## Was schwierig war

_Wo hast du gehakt, zum Beispiel bei Datenschutz, Verschlüsselung, Supabase, KI-Anbieter oder Kreditkarte?_

## Was ich gelernt habe

_Was kannst du jetzt erklären, das du vorher nicht erklären konntest?_

## Zusammenarbeit mit dem Coding-Agenten

_Wie hat das Arbeiten mit Roadmap, Tasks und Agent funktioniert? Was würdest du anderen Teilnehmern raten?_

## Was ich beim nächsten Mal anders mache

_…_

## Sachlicher Rückblick (vom Agenten ergänzt)

- **Umfang:** Aus einem MVP mit 21 Tasks (Roadmap v1/v2) wurden über sieben Roadmap-Versionen 19 Phasen. Jede Erweiterung wurde mit Sascha abgestimmt und in `docs/decisions.md` festgehalten.
- **Wendepunkt Datenschutz:** Ab Roadmap v3 hatte Datenschutz Vorrang. Persönliche Daten wurden aus dem öffentlichen Repository genommen, die Daten im Browser verschlüsselt, Verbindungen nach außen abgeschaltet. Jede spätere Anbindung musste sich daran messen lassen.
- **Ehrliche Daten:** Keine erfundenen Kennzahlen. Leerzustände statt Platzhalterwerten.
- **Offene Abhängigkeit von Konten:** Viele Funktionen sind fertig, laufen aber erst mit Supabase, Hosting und einem KI-Anbieter. Die fehlende Kreditkarte hat die KI-Planung verändert (siehe [limitations.md](limitations.md)).
- **Prüfen:** Seit dem Projekt-Setup laufen Typecheck, Lint, Tests und Build. Die Anzahl der Tests wuchs von 206 (Ende Roadmap v2) auf 454. Browserprüfungen laufen seit Roadmap v4 nur mit Wegwerfdaten in der gebauten App, damit echte Daten geschützt bleiben.
