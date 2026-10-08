# Bekannte Einschränkungen

Stand: 2026-10-08.

## Noch nicht in Betrieb

- **Supabase ist noch nicht eingerichtet** (task-13-1). Login, Synchronisierung, Mehrbenutzer, geteilte Bereiche, Dokumente in der Cloud, KI und Workflows sind fertig gebaut und getestet, laufen aber erst mit einem echten Supabase-Projekt. Bis dahin sind diese Funktionen ausgeblendet.
- **KI-Anbieter offen:** Geplant war Claude über AWS Bedrock (Frankfurt). AWS verlangt eine Kreditkarte, die fehlt. Im Gespräch ist Mistral (EU-Anbieter, Gratistarif). Ob dort Daten zum Training genutzt werden, ist noch zu prüfen. Bis dahin dürfen dort nur Demo-Daten hin.
- **Kein Hosting** (task-18-1): Die App läuft lokal. Push auf dem Handy und die Installation als App brauchen eine https-Adresse.
- **Gmail und Google-Kalender** brauchen ein eigenes Google-Cloud-Projekt mit Client-ID.
- **Rechtstexte und AVVs** (task-19-2, task-19-3) fehlen noch. Sie sind Voraussetzung, bevor andere Personen das Cockpit nutzen.

## Bewusste Grenzen

- **Passwort vergessen ohne Wiederherstellungslink = Datenverlust.** Die Daten sind nur mit dem Passwort lesbar. Abhilfe: Wiederherstellungslink einrichten und regelmäßig verschlüsselt sichern.
- **Bereichsrechte im eigenen Tresor:** Der Server kann den Inhalt eines Nutzer-Tresors nicht lesen. Deshalb steuern Bereichsrechte dort nur die Oberfläche. Serverseitig durchgesetzt werden die Sperre, geteilte Bereiche und der KI-Zugang.
- **Geteilte Inhalte:** Nach dem Entzug kann ein Nutzer neue Stände nicht mehr lesen. Was er schon gesehen hat, lässt sich nicht zurückholen.
- **Nicht teilbar** sind Kontakte, Bewerbungen und Postfach, weil es personenbezogene Daten Dritter sind.
- **Keine Live-Anbindung** an HubSpot, LinkedIn, Outlook und Ähnliches. Gmail nur lesend, Mails werden nicht aus der App versendet.
- **Arbeitstage ohne Feiertage:** Die Weiterbildung zählt Montag bis Freitag.
- **Auskunft und Kalenderexport** sind absichtlich unverschlüsselt (sie gehen an Dritte bzw. in andere Programme). Die App weist darauf hin.

## Technische Punkte

- **Persönliche Startdaten** liegen nur lokal in `src/data/seed.privat.ts`. Auf einem anderen Rechner startet die App ohne sie, bis Synchronisierung aktiv ist.
- **Git-Historie:** Alte Commits enthalten Projekttitel, Kursangaben und Zielrollen, aber keine Beschreibungen, Kontakte oder Zugangsdaten. Sascha hat entschieden, die Historie nicht umzuschreiben (task-5-6 abgebrochen).
- **Vite-Hinweis:** Die Build-Option `advancedChunks` gilt als veraltet. Sie funktioniert noch und wird bei Gelegenheit umgestellt.
- **Tippflächen am Handy:** mindestens 44 px. Ausnahmen sind Tabellen-Umschalter und Monatstage im Kalender mit 32 px.
- **Mehrere Tabs:** Änderungen in einem anderen Tab werden nicht automatisch übernommen. Die App zeigt „In anderem Tab geändert – neu laden“.
