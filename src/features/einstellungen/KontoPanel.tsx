import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useCloud } from '../../app/cloudContext.ts'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import styles from './EinstellungenSeite.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Login für die Ende-zu-Ende-verschlüsselte Synchronisierung (Supabase, Anmeldung per E-Mail-Link). */
export function KontoPanel({ children }: { children?: ReactNode }) {
  const cloud = useCloud()
  const { zeige } = useToast()
  const [email, setEmail] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [gesendet, setGesendet] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  if (!cloud?.konfiguriert) {
    return (
      <Panel titel="Konto und Synchronisierung">
        <p className={styles.hinweis}>
          Nicht eingerichtet – die App arbeitet nur auf diesem Gerät und hat keinerlei Verbindung nach außen. Für Login und
          geräteübergreifende, Ende-zu-Ende-verschlüsselte Speicherung wird Supabase eingerichtet (Anleitung: docs/supabase-einrichtung.md).
        </p>
      </Panel>
    )
  }

  const senden = async (event: FormEvent) => {
    event.preventDefault()
    if (!EMAIL.test(email.trim())) {
      setFehler('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setFehler(null)
    setLaeuft(true)
    try {
      await cloud.anmelden(email)
      setGesendet(email.trim())
    } catch (error) {
      setFehler(error instanceof Error ? `Anmeldelink konnte nicht gesendet werden: ${error.message}` : 'Anmeldelink konnte nicht gesendet werden.')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Panel titel="Konto und Synchronisierung">
      <p className={styles.hinweis}>
        Deine Daten werden auf diesem Gerät verschlüsselt und nur verschlüsselt bei Supabase (EU) gespeichert – Supabase kann sie nicht
        lesen. Gespeichert werden nur deine E-Mail-Adresse und der verschlüsselte Datenblock.
      </p>
      {cloud.nutzer === undefined ? (
        <p className={styles.status}>Anmeldung wird geprüft …</p>
      ) : cloud.nutzer ? (
        <div className={styles.block}>
          <p className={styles.status}>Angemeldet als {cloud.nutzer.email}</p>
          {children}
          <div>
            <Button
              variant="secondary"
              onClick={async () => {
                await cloud.abmelden()
                setGesendet(null)
                zeige('Abgemeldet – die Daten bleiben auf diesem Gerät')
              }}
            >
              Abmelden
            </Button>
          </div>
        </div>
      ) : gesendet ? (
        <p className={styles.status} role="status">
          Anmeldelink an {gesendet} geschickt. Öffne die Mail auf diesem Gerät und klicke auf den Link.
        </p>
      ) : (
        <form className={styles.zeile} onSubmit={senden} noValidate aria-label="Anmelden">
          <TextField label="E-Mail-Adresse" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fehler ?? undefined} />
          <Button type="submit" disabled={laeuft}>
            {laeuft ? 'Wird gesendet …' : 'Anmeldelink senden'}
          </Button>
        </form>
      )}
    </Panel>
  )
}
