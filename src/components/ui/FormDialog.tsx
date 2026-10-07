import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'
import styles from './FormDialog.module.css'

interface FormDialogProps {
  offen: boolean
  titel: string
  /** Ungespeicherte Änderungen vorhanden? Dann wird vor dem Schließen nachgefragt. */
  geaendert: boolean
  speichernLabel?: string
  onSpeichern: () => void
  onSchliessen: () => void
  /** Zusätzliche Aktion links, z. B. „Löschen“ */
  nebenaktion?: ReactNode
  children: ReactNode
}

/** Formular im Dialog mit Rückfrage „Änderungen verwerfen?“ bei ungespeicherten Eingaben. */
export function FormDialog({
  offen,
  titel,
  geaendert,
  speichernLabel = 'Speichern',
  onSpeichern,
  onSchliessen,
  nebenaktion,
  children,
}: FormDialogProps) {
  const [rueckfrage, setRueckfrage] = useState(false)

  const schliessenAnfragen = () => {
    if (geaendert) setRueckfrage(true)
    else onSchliessen()
  }

  const verwerfen = () => {
    setRueckfrage(false)
    onSchliessen()
  }

  const absenden = (event: FormEvent) => {
    event.preventDefault()
    onSpeichern()
  }

  const formId = `form-${titel.replace(/\W+/g, '-')}`

  return (
    <Dialog
      offen={offen}
      titel={titel}
      onSchliessen={schliessenAnfragen}
      aktionen={
        rueckfrage ? (
          <div className={styles.rueckfrage} role="alert">
            <span className={styles.frage}>Änderungen verwerfen?</span>
            <Button variant="secondary" onClick={() => setRueckfrage(false)}>
              Weiter bearbeiten
            </Button>
            <Button variant="danger" onClick={verwerfen}>
              Verwerfen
            </Button>
          </div>
        ) : (
          <>
            {nebenaktion && <div className={styles.neben}>{nebenaktion}</div>}
            <Button variant="secondary" onClick={schliessenAnfragen}>
              Abbrechen
            </Button>
            <Button type="submit" form={formId}>
              {speichernLabel}
            </Button>
          </>
        )
      }
    >
      <form id={formId} className={styles.form} onSubmit={absenden} noValidate>
        {children}
      </form>
    </Dialog>
  )
}
