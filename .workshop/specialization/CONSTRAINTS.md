# Technische Rahmenbedingungen

Diese Rahmenbedingungen ergänzen den zentralen Workshop-Workflow und dürfen ihn nicht überschreiben.

## Parallele Arbeit

Keine Ausnahme: Es ist höchstens ein Task `in_progress`.

## Daten und Speicherung

- Werkzeuge: Claude Pro, Claude Code, Claude Design, Lovable, Git, GitHub, Supabase
- Daten im Browser nur verschlüsselt; optional Supabase für Login und Ende-zu-Ende-verschlüsselte Synchronisierung (nur E-Mail-Adresse und Chiffretext beim Anbieter, Region EU)
- keine echten Verbindungen zu n8n, Make.com, HubSpot, SeaTable oder anderen Diensten
- vorbefüllt wird nur Belegtes; persönliche Startdaten nur lokal in `src/data/seed.privat.ts`, nie im Repository (Wächter-Test); Kennzahlen werden immer berechnet
- keine Verbindung nach außen außer – falls eingerichtet – zur eigenen Supabase-Adresse; keine Telemetrie, keine fremden Skripte oder Schriften

## Abhängigkeiten

- keine UI-Bibliothek; eigenes CSS mit Tokens und CSS-Modulen, eigene Inline-SVG-Icons
- neue Laufzeit-Abhängigkeiten nur mit Begründung in `docs/decisions.md`

## Oberfläche

- Sprache Deutsch; Datumsformatierung über `Intl` mit `de-DE`
- Datumsfelder als `YYYY-MM-DD`, lokal geparst; Zeitpunkte als ISO-8601
- Markenfarben `#2F5CFF`, `#0A0A0B`, `#4E525C`; Schrift Liberation Sans mit Fallback Arial
- Logo-Dateien unter `public/brand/` unverändert verwenden, nur auf hellen Flächen
- WCAG AA, Tastaturbedienung, nutzbar ab 375 px Breite

## Werkzeuge

- ESLint bleibt auf Version 9, bis `eslint-plugin-jsx-a11y` ESLint 10 unterstützt
