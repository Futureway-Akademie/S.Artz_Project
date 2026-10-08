# Zielgruppe

## Hauptnutzer

**Sascha Artz** arbeitet an KI-Automationen, macht eine Weiterbildung, baut die Marke PIKARTZ.AI auf und sucht eine neue Stelle. Er ist Admin des Cockpits.

Seine Kontakte kommen aus drei Lebensbereichen:

| Bereich | Typische Kontakte | Was das Cockpit leisten soll |
|---|---|---|
| Jobsuche | Recruiter, Ansprechpartner in Unternehmen, Personalvermittler | Bewerbungen nachhalten, keine Rückmeldung verpassen |
| Weiterbildung und Netzwerk | Dozenten, Mitteilnehmende, Coaches | Kontakte pflegen, Wissen festhalten |
| PIKARTZ.AI und Automationen | Interessenten für Schulungen oder Automationen, Partner | Anfragen erfassen, nächste Aktion festhalten |

Im Repository sind keine dieser Kontakte vorbefüllt. Die Tabelle beschreibt nur, wofür das CRM gebaut ist.

## Eingeladene Nutzer (ab Roadmap v7)

Andere Personen können sich anmelden, aber nur nach Einladung durch den Admin. Rollen dienen als Vorlage für die Rechte:

| Rolle | Bereiche in der Vorlage (`supabase/schema.sql`) |
|---|---|
| Kunde | Cockpit, Aufgaben, Kalender, Projekte |
| Mitarbeiter | Cockpit, Dashboard, Aufgaben, Kalender, Projekte, Automationen, Werkzeugkasten, Kontakte |
| Kursteilnehmer | Cockpit, Aufgaben, Kalender, Weiterbildung, Wissen, Werkzeugkasten |
| Familie/Freunde | Cockpit, Aufgaben, Kalender |

Jeder Nutzer hat einen eigenen verschlüsselten Datenbestand. Bereiche können je Nutzer ein- und ausgeschaltet werden, Nutzer lassen sich sperren. Der Admin kann einzelne Bereiche seiner Daten Ende-zu-Ende-verschlüsselt teilen.

## Nutzungssituationen

- **Am PC:** Wochenplanung, Bewerbungen schreiben, Wissen pflegen, Dashboard ansehen
- **Am Handy:** schnell eine Aufgabe oder einen Kontakt erfassen, fällige Punkte abhaken, Erinnerung per Push (ohne Inhalte)
- **In der Präsentation:** Demo mit fiktiven Daten, Mehrbenutzer und KI-Assistent
