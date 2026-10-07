# Entscheidungen

## 2026-10-07 – Technischer Stack

### Kontext

Die Spezialisierung des Workshop-Repositorys war noch nicht festgelegt. Die App braucht neun Bereiche, Formulare, Suche und berechnete Übersichten.

### Entscheidung

React + Vite + TypeScript mit react-router; Tests mit Vitest.

### Begründung

Klare Struktur für viele Bereiche, Typsicherheit für das Datenmodell und schnelle lokale Entwicklung. Von Sascha bestätigt.

## 2026-10-07 – Speicherung als Demo-Modus

### Kontext

Es ist kein dauerhaftes Backend konfiguriert.

### Entscheidung

Die Daten werden im Browser (localStorage) gespeichert. Die App kennzeichnet dies sichtbar als Demo und behauptet keine sichere oder dauerhafte Speicherung. Export und Import als JSON sind vorgesehen.

### Begründung

Ein funktionsfähiges Arbeiten ist ohne Server-Infrastruktur möglich, und die Grenzen sind ehrlich gekennzeichnet.

## 2026-10-07 – Keine erfundenen Daten

### Kontext

Die App soll Saschas tatsächliche Arbeit abbilden.

### Entscheidung

Vorbefüllt werden nur die in der Anfrage bzw. Saschas MD-Datei belegten Inhalte. Fehlende Angaben werden als Leerzustand dargestellt, Kennzahlen aus gespeicherten Daten berechnet.

### Begründung

Verlässlichkeit des Cockpits; keine irreführenden Kennzahlen oder Fortschritte.
