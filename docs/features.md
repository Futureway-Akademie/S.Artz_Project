# Funktionen

Stand: Roadmap v7, 2026-10-08. Alle hier genannten Funktionen sind umgesetzt und getestet. Was noch fehlt, steht in [limitations.md](limitations.md) und [progress.md](progress.md).

## Arbeit

| Bereich | Funktionen |
|---|---|
| **Arbeitscockpit** (`/`) | Begrüßung, Tagesübersicht, nächste Schritte (überfällig → mit Frist → ohne Frist), Fokus mit Abhaken, Wochenvorschau, aktuelle Projekte, Weiterbildung, fällige Wiedervorlagen, Bewerbungen, offene Leads, Abo-Fristen, letzte Aktivitäten, Sicherungserinnerung |
| **Dashboard** (`/dashboard`) | Kennzahlen und 11 Diagramme (Balken, Ring, Wochenverlauf, Fortschritt, Aktivitäts-Heatmap), jeweils auch als Tabelle; Links in die Bereiche |
| **Projekte** | Liste mit Suche und Filtern, Detailseite, Status, Auftraggeber, Schlagworte, nächste Schritte, „zuletzt aktiv“ wird automatisch nachgezogen |
| **Aufgaben und Termine** | zentrale Liste, Suche, Filter nach Status, Frist und Bezug; Termine mit optionaler Uhrzeit; Bezug zu Projekt, Weiterbildung, Kontakt, Unternehmen, Lead oder Bewerbung |
| **Kalender** | Monat, Woche, Liste; Termine, Fristen, Wiedervorlagen, Kurstage, Kündigungsfristen; `.ics`-Export; optional Google-Kalender lesen und Termine nach Bestätigung eintragen |
| **Automationen** | Übersicht nach Plattform (n8n, Make.com) oder Projekt mit Modell, Datenquellen, Schwellen und Routing; Workflows lassen sich per Webhook über eine Supabase-Funktion starten |

## KI-Werkzeugkasten

Masterprompts mit Platzhaltern zum Ausfüllen und Kopieren, Befehle, Agenten, Skills, Anleitungen mit abhakbaren Schritten, Integrationen (nur Ablageort der Zugangsdaten), Workflows, Modelle und Abos mit Monatskosten und Kündigungsfristen. Eingaben, die wie Schlüssel oder Passwörter aussehen, werden erkannt und nicht ungefragt gespeichert. Neutrale Startvorlagen lassen sich übernehmen.

## Lernen

| Bereich | Funktionen |
|---|---|
| **Weiterbildung** | Kurszeitraum, Arbeitstage Mo–Fr, Kursaufgaben im Format `KURS_X_YY`, Fortschritt nur aus erledigten Aufgaben |
| **Wissen (zweites Gehirn)** | Notizen, Tools, Erkenntnisse, Quellen, Lerntagebuch je Kurstag; Themen, Schlagworte, Verknüpfung mit Projekten und Kursaufgaben |

## Netzwerk und Karriere

| Bereich | Funktionen |
|---|---|
| **Kontakte und Unternehmen** | Kontext (Jobsuche, Weiterbildung, PIKARTZ.AI, Sonstiges), Herkunft, LinkedIn, Verlauf, nächste Aktion als Wiedervorlage, letzter Kontakt und Funkstille-Hinweis, Schlagworte, Dubletten-Warnung |
| **DSGVO** | Rechtsgrundlage und Zweck je Kontakt, Auskunft nach Art. 15, vollständiges Löschen inklusive Protokoll, Prüfhinweis nach 12 Monaten |
| **Leads** | Status von „Neu“ bis „Zusage/Absage“, Betrag optional (leer = „Kein Betrag“, nie 0 €) |
| **E-Mails** | Vorlagen mit Platzhaltern, Entwurf im eigenen Mailprogramm öffnen, Mails als Verlaufseintrag |
| **Postfach** (optional) | Gmail nur lesend: nur Mails von und an bekannte Kontakte oder Unternehmensdomains abrufen, zuordnen, in den Verlauf übernehmen |
| **Bewerbungen** | Pipeline nach Status, Kennzahlen, Zielrollen, Detailseite mit Verlauf und Terminen, Stellenanzeige per Link oder Text übernehmen, verschlüsselte Dokumente (Lebenslauf, Zeugnisse, Anschreiben) |

## KI-Assistent (optional)

Anschreiben entwerfen, Mails und Verlauf zusammenfassen, nächsten Schritt vorschlagen, Tagesplanung („Was soll ich heute tun?“), Chat mit den eigenen Daten mit Links zu den Einträgen. Vor jedem Aufruf zeigt ein Freigabe-Dialog genau, welche Daten gesendet werden. Protokolliert werden nur Zeitpunkt, Aufgabe und Tokens, nie der Inhalt.

## Übergreifend

- **Suche und Schnellerfassung:** Strg+K sucht über alle Bereiche; Aufgabe, Termin und Kontakt lassen sich überall anlegen.
- **Gesamtsicht:** Jede Detailseite zeigt „Alles dazu“, auch indirekte Verknüpfungen.
- **Sicherheit:** AES-256-Verschlüsselung mit Passwort, automatische Sperre, Wiederherstellung per Link in der eigenen Mail, verschlüsselte Sicherung und verschlüsselter Import.
- **Synchronisierung** (optional): Ende-zu-Ende-verschlüsselt über Supabase, mit Konfliktbehandlung zwischen Geräten.
- **Mehrbenutzer** (optional): Einladung, Rollen, Bereiche je Nutzer, Sperre, Ende-zu-Ende-verschlüsselt geteilte Bereiche, Freigabe-Kreis (wer mit wem teilen und Aufgaben übergeben darf) und Recht „Teilen und Aufgaben übergeben“ je Rolle oder Nutzer.
- **Handy:** als App installierbar (PWA), Tippflächen ab 44 px, Push-Erinnerungen ohne Inhalte.
- **PIKARTZ.AI:** Marke mit Logos, Farben, Designregeln und Präsentations-System.
