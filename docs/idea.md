# Projektidee

## Name

PIKARTZ.AI – Arbeitscockpit

## Problem

Saschas Arbeit ist über viele Werkzeuge verteilt: Automationsprojekte, Weiterbildung, die eigene Marke PIKARTZ.AI, Kontakte und Bewerbungen. Dadurch geht der Überblick verloren, und Wiedervorlagen werden leicht vergessen.

## Idee

Ein persönliches Arbeitscockpit mit CRM-Funktionen, das drei Fragen beantwortet:

1. Woran arbeite ich gerade?
2. Was ist der nächste konkrete Schritt?
3. Was muss ich im Blick behalten?

Ein normales Vertriebs-CRM fragt: „Wie viel Umsatz bringt dieser Kunde?“ Dieses CRM fragt: **„Mit wem muss ich als Nächstes sprechen, und wozu?“** Im Mittelpunkt stehen deshalb Wiedervorlagen und nächste Schritte, nicht Umsatz.

## Leitlinien

- **Alles verbunden:** Projekte, Aufgaben, Termine, Kontakte, Unternehmen, Bewerbungen, Wissen und KI-Werkzeuge sind miteinander verknüpft. Jede Detailseite zeigt „Alles dazu“.
- **Nichts nach außen:** Daten werden im Browser verschlüsselt. Jede Verbindung nach außen ist optional, abschaltbar und Ende-zu-Ende-verschlüsselt oder nur lesend.
- **Keine erfundenen Daten:** Jede Kennzahl wird aus gespeicherten Daten berechnet. Wo nichts eingetragen ist, steht ein Leerzustand.
- **Deutsch und barrierearm:** Oberfläche komplett auf Deutsch, per Tastatur bedienbar, WCAG-AA-Kontraste, nutzbar am Handy, Tablet und PC.

## MVP

Der erste lauffähige Stand (Roadmap v1/v2) umfasste:

- responsive Navigation über alle Bereiche
- berechnetes Arbeitscockpit
- Projekte, Aufgaben und Weiterbildungsaufgaben zum Bearbeiten
- Automationsübersicht und PIKARTZ.AI-Designregeln
- CRM: Kontakte und Unternehmen, Verlauf, optionale Leads, Bewerbungen und Zielrollen
- Export, Import und Zurücksetzen der Daten

Danach wuchs das Projekt in Roadmap-Versionen weiter: Datenschutz (v3), Login und zweites Gehirn (v4), Dashboard (v5), KI-Werkzeugkasten und Gmail (v6), Mehrbenutzer, KI-Assistent und Handy (v7). Details in [features.md](features.md) und [progress.md](progress.md).

## Nicht-Ziele

- keine offene Registrierung, neue Nutzer nur per Einladung
- kein eigener Server neben Supabase
- keine Umsatzprognosen, kein Lead-Scoring, keine Massen-Mails
- keine dekorativen Diagramme oder Animationen ohne Funktion
