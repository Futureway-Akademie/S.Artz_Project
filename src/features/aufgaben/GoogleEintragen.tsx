import { useState } from 'react'
import { useGmailDienst, useGoogle } from '../../app/gmailContext.ts'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { anmeldungStarten, GOOGLE_SCOPES, hatBerechtigung, KALENDER_SCHREIBEN_SCOPE } from '../../data/gmail/googleAuth.ts'
import { formatDatum } from '../../domain/dates.ts'
import type { Termin } from '../../domain/types.ts'

const MIT_SCHREIBEN = [...GOOGLE_SCOPES, KALENDER_SCHREIBEN_SCOPE]

/**
 * Einen Termin nach Bestätigung in Google-Kalender eintragen. Die Schreibberechtigung wird erst beim ersten Mal
 * bei Google angefragt; übertragen werden nur Titel, Datum, Uhrzeit und Ort.
 */
export function GoogleEintragen({ termin, onBerechtigungAnfragen = () => anmeldungStarten(window.location, sessionStorage, undefined, MIT_SCHREIBEN) }: { termin: Termin; onBerechtigungAnfragen?: () => void }) {
  const google = useGoogle()
  const dienst = useGmailDienst()
  const { zeige } = useToast()
  const [frage, setFrage] = useState(false)
  if (!google.konfiguriert) return null
  const darfSchreiben = google.verbunden && hatBerechtigung(KALENDER_SCHREIBEN_SCOPE)

  const eintragen = async () => {
    setFrage(false)
    try {
      await dienst.terminEintragen({ titel: termin.titel, datum: termin.datum, uhrzeit: termin.uhrzeit, ort: termin.ort })
      zeige('In Google-Kalender eingetragen')
    } catch (e) {
      zeige(e instanceof Error ? e.message : 'Eintragen fehlgeschlagen')
    }
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setFrage(true)} aria-label={`„${termin.titel}“ in Google-Kalender eintragen`}>
        In Google eintragen
      </Button>
      {frage &&
        (darfSchreiben ? (
          <ConfirmDialog offen titel="In Google-Kalender eintragen?" bestaetigenLabel="Eintragen" onAbbrechen={() => setFrage(false)} onBestaetigen={() => void eintragen()}>
            <p>
              „{termin.titel}“ am {formatDatum(termin.datum)}
              {termin.uhrzeit && ` um ${termin.uhrzeit} Uhr`} wird in deinem Google-Kalender angelegt. Übertragen werden nur Titel, Zeit und Ort.
            </p>
          </ConfirmDialog>
        ) : (
          <ConfirmDialog
            offen
            titel="Berechtigung bei Google anfragen?"
            bestaetigenLabel="Zu Google"
            onAbbrechen={() => setFrage(false)}
            onBestaetigen={() => {
              setFrage(false)
              onBerechtigungAnfragen()
            }}
          >
            <p>
              Zum Eintragen braucht das Cockpit die Berechtigung, Termine in deinem Google-Kalender anzulegen. Du wirst zu Google weitergeleitet; danach ist der Tresor
              gesperrt – einfach wieder entsperren und erneut „In Google eintragen“ wählen.
            </p>
          </ConfirmDialog>
        ))}
    </>
  )
}
