import { useState } from 'react'
import type { ReactNode } from 'react'
import { MIN_PASSWORT_LAENGE, pruefePasswort } from '../../data/krypto.ts'
import { TextField } from './Field.tsx'
import { FormDialog } from './FormDialog.tsx'

interface PasswortDialogProps {
  titel: string
  children?: ReactNode
  /** Neues Passwort mit Wiederholung (Sicherung erstellen) oder vorhandenes (Sicherung öffnen) */
  neu: boolean
  bestaetigenLabel: string
  /** Liefert eine Fehlermeldung oder `null` bei Erfolg. */
  onAbsenden: (passwort: string) => Promise<string | null>
  onSchliessen: () => void
}

/** Fragt ein Passwort für eine Sicherungsdatei ab. */
export function PasswortDialog({ titel, children, neu, bestaetigenLabel, onAbsenden, onSchliessen }: PasswortDialogProps) {
  const [passwort, setPasswort] = useState('')
  const [wiederholung, setWiederholung] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  const absenden = async () => {
    if (laeuft) return
    const problem = neu ? pruefePasswort(passwort, wiederholung) : passwort ? null : 'Bitte das Passwort eingeben.'
    setFehler(problem)
    if (problem) return
    setLaeuft(true)
    try {
      setFehler(await onAbsenden(passwort))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <FormDialog
      offen
      titel={titel}
      geaendert={false}
      speichernLabel={laeuft ? 'Bitte warten …' : bestaetigenLabel}
      onSpeichern={() => void absenden()}
      onSchliessen={onSchliessen}
    >
      {children}
      <TextField
        label={neu ? 'Passwort für die Sicherung' : 'Passwort der Sicherung'}
        type="password"
        autoComplete={neu ? 'new-password' : 'current-password'}
        required
        value={passwort}
        onChange={(e) => setPasswort(e.target.value)}
        hint={neu ? `Mindestens ${MIN_PASSWORT_LAENGE} Zeichen. Du kannst dasselbe Passwort wie für die App verwenden.` : undefined}
        error={fehler ?? undefined}
      />
      {neu && (
        <TextField
          label="Passwort wiederholen"
          type="password"
          autoComplete="new-password"
          required
          value={wiederholung}
          onChange={(e) => setWiederholung(e.target.value)}
        />
      )}
    </FormDialog>
  )
}
