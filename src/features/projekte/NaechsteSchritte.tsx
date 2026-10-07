import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { projektSchritte } from '../../domain/selectors/projekte.ts'
import type { Aufgabe } from '../../domain/types.ts'
import { AufgabeDialog } from '../aufgaben/AufgabeDialog.tsx'
import styles from './NaechsteSchritte.module.css'

function Schritt({ aufgabe, onBearbeiten }: { aufgabe: Aufgabe; onBearbeiten: (a: Aufgabe) => void }) {
  const { dispatch } = useStore()
  const { zeige } = useToast()
  const umschalten = () => {
    dispatch({ type: 'aendern', sammlung: 'aufgaben', id: aufgabe.id, aenderung: { erledigt: !aufgabe.erledigt } })
    zeige(aufgabe.erledigt ? 'Schritt wieder geöffnet' : 'Schritt erledigt')
  }
  return (
    <li className={`${styles.schritt} ${aufgabe.erledigt ? styles.erledigt : ''}`}>
      <label className={styles.check}>
        <input type="checkbox" checked={aufgabe.erledigt} onChange={umschalten} />
        <span className={styles.titel}>{aufgabe.titel}</span>
      </label>
      <div className={styles.meta}>
        {!aufgabe.erledigt && <DueLabel faelligAm={aufgabe.faelligAm} />}
        <Button size="sm" variant="ghost" onClick={() => onBearbeiten(aufgabe)} aria-label={`„${aufgabe.titel}“ bearbeiten`}>
          Bearbeiten
        </Button>
      </div>
    </li>
  )
}

/** Nächste Schritte eines Projekts: hinzufügen, bearbeiten, als erledigt markieren. */
export function NaechsteSchritte({ projektId }: { projektId: string }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [titel, setTitel] = useState('')
  const [frist, setFrist] = useState('')
  const [fehler, setFehler] = useState<string | undefined>()
  const [bearbeiten, setBearbeiten] = useState<Aufgabe | null>(null)
  const { offen, erledigt } = projektSchritte(data, projektId)

  const hinzufuegen = (event: FormEvent) => {
    event.preventDefault()
    if (!titel.trim()) {
      setFehler('Bitte beschreibe den Schritt.')
      return
    }
    dispatch({
      type: 'anlegen',
      sammlung: 'aufgaben',
      daten: {
        titel: titel.trim(),
        notiz: '',
        erledigt: false,
        fokus: false,
        erledigtAm: null,
        faelligAm: frist || null,
        bezug: { art: 'projekt', id: projektId },
      },
    })
    zeige('Schritt hinzugefügt')
    setTitel('')
    setFrist('')
    setFehler(undefined)
  }

  return (
    <div className={styles.bereich}>
      <form className={styles.neu} onSubmit={hinzufuegen} noValidate>
        <TextField label="Neuer Schritt" value={titel} onChange={(e) => setTitel(e.target.value)} error={fehler} required />
        <TextField label="Frist" type="date" value={frist} onChange={(e) => setFrist(e.target.value)} />
        <Button type="submit" className={styles.knopf}>
          Hinzufügen
        </Button>
      </form>

      {offen.length === 0 ? (
        <EmptyState title="Keine offenen Schritte">Lege oben den nächsten konkreten Schritt an.</EmptyState>
      ) : (
        <ul className={styles.liste} aria-label="Offene Schritte">
          {offen.map((a) => (
            <Schritt key={a.id} aufgabe={a} onBearbeiten={setBearbeiten} />
          ))}
        </ul>
      )}

      {erledigt.length > 0 && (
        <details className={styles.erledigtBlock}>
          <summary>Erledigt ({erledigt.length})</summary>
          <ul className={styles.liste} aria-label="Erledigte Schritte">
            {erledigt.map((a) => (
              <Schritt key={a.id} aufgabe={a} onBearbeiten={setBearbeiten} />
            ))}
          </ul>
        </details>
      )}

      {bearbeiten && <AufgabeDialog aufgabe={bearbeiten} titel="Schritt bearbeiten" onSchliessen={() => setBearbeiten(null)} />}
    </div>
  )
}
