import { useState } from 'react'
import type { ReactNode } from 'react'
import { Wordmark } from '../components/brand/Wordmark.tsx'
import { Button } from '../components/ui/Button.tsx'
import { ErrorState } from '../components/ui/States.tsx'
import { LADEFEHLER_TEXT } from '../data/storage.ts'
import { useStore } from '../data/storeContext.ts'
import styles from './StoreGate.module.css'

function rohdatenHerunterladen(rohdaten: string) {
  const blob = new Blob([rohdaten], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pikartz-rohdaten-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/** Zeigt bei unlesbaren Daten einen Fehlerzustand statt der App. */
export function StoreGate({ children }: { children: ReactNode }) {
  const { zustand, zuruecksetzen } = useStore()
  const [bestaetigen, setBestaetigen] = useState(false)

  if (zustand.phase === 'bereit') return children

  return (
    <main className={styles.seite}>
      <Wordmark size="lg" />
      <h1 className={styles.titel}>Daten konnten nicht geladen werden</h1>
      <ErrorState
        title={LADEFEHLER_TEXT[zustand.grund]}
        action={
          <div className={styles.aktionen}>
            <Button variant="secondary" onClick={() => rohdatenHerunterladen(zustand.rohdaten)}>
              Rohdaten exportieren
            </Button>
            {bestaetigen ? (
              <>
                <Button variant="danger" onClick={zuruecksetzen}>
                  Ja, Daten zurücksetzen
                </Button>
                <Button variant="ghost" onClick={() => setBestaetigen(false)}>
                  Abbrechen
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={() => setBestaetigen(true)}>
                Zurücksetzen
              </Button>
            )}
          </div>
        }
      >
        <p>
          Die gespeicherten Daten bleiben unverändert, bis du sie zurücksetzt. Exportiere sie vorher, wenn du sie behalten
          möchtest.
        </p>
        {bestaetigen && (
          <p className={styles.warnung}>
            Zurücksetzen löscht die gespeicherten Daten in diesem Browser und startet mit den Ausgangsdaten neu.
          </p>
        )}
        {zustand.details && <p className={styles.details}>Details: {zustand.details}</p>}
      </ErrorState>
    </main>
  )
}
