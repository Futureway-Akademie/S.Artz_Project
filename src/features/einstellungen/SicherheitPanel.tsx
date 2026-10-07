import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTresor } from '../../app/tresorContext.ts'
import { Button } from '../../components/ui/Button.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { FalschesPasswort, MIN_PASSWORT_LAENGE, pruefePasswort } from '../../data/krypto.ts'
import { SPERRE_OPTIONEN } from '../../data/tresor.ts'
import styles from './EinstellungenSeite.module.css'
import { WiederherstellungBlock } from './WiederherstellungBlock.tsx'

/** Sperre und Passwort; nur sichtbar, wenn die Daten verschlüsselt gespeichert werden. */
export function SicherheitPanel() {
  const tresor = useTresor()
  const { zeige } = useToast()
  const [alt, setAlt] = useState('')
  const [neu, setNeu] = useState('')
  const [wiederholung, setWiederholung] = useState('')
  const [fehler, setFehler] = useState<{ alt?: string; neu?: string }>({})
  const [laeuft, setLaeuft] = useState(false)

  if (!tresor) return null

  const aendern = async (event: FormEvent) => {
    event.preventDefault()
    const problem = pruefePasswort(neu, wiederholung)
    if (problem || !alt) {
      setFehler({ alt: alt ? undefined : 'Bitte das bisherige Passwort eingeben.', neu: problem ?? undefined })
      return
    }
    setLaeuft(true)
    try {
      await tresor.passwortAendern(alt, neu)
      setAlt('')
      setNeu('')
      setWiederholung('')
      setFehler({})
      zeige('Passwort geändert')
    } catch (error) {
      setFehler({ alt: error instanceof FalschesPasswort ? 'Das bisherige Passwort ist falsch.' : String(error) })
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Panel titel="Sicherheit">
      <div className={styles.block}>
        <p className={styles.hinweis}>
          Die Daten sind mit deinem Passwort verschlüsselt (AES-256). Das Passwort wird nirgends gespeichert – richte deshalb die
          Wiederherstellung per E-Mail ein und erstelle regelmäßig eine Sicherung.
        </p>
        <div className={styles.zeile}>
          <SelectField
            label="Automatisch sperren nach"
            optionalKennzeichnen={false}
            value={String(tresor.sperreMinuten)}
            onChange={(e) => tresor.setSperreMinuten(Number(e.target.value))}
            options={SPERRE_OPTIONEN.map((m) => ({ value: String(m), label: `${m} Minuten ohne Eingabe` }))}
          />
          <Button variant="secondary" onClick={tresor.sperren}>
            Jetzt sperren
          </Button>
        </div>
      </div>
      <WiederherstellungBlock />
      <form className={styles.block} onSubmit={aendern} noValidate aria-labelledby="passwort-aendern">
        <h3 id="passwort-aendern" className={styles.unter}>
          Passwort ändern
        </h3>
        <TextField label="Bisheriges Passwort" type="password" autoComplete="current-password" required value={alt} onChange={(e) => setAlt(e.target.value)} error={fehler.alt} />
        <TextField
          label="Neues Passwort"
          type="password"
          autoComplete="new-password"
          required
          value={neu}
          onChange={(e) => setNeu(e.target.value)}
          hint={`Mindestens ${MIN_PASSWORT_LAENGE} Zeichen.`}
          error={fehler.neu}
        />
        <TextField label="Neues Passwort wiederholen" type="password" autoComplete="new-password" required value={wiederholung} onChange={(e) => setWiederholung(e.target.value)} />
        <div>
          <Button type="submit" variant="secondary" disabled={laeuft}>
            {laeuft ? 'Wird neu verschlüsselt …' : 'Passwort ändern'}
          </Button>
        </div>
      </form>
    </Panel>
  )
}
