import { useState } from 'react'
import type { ReactNode } from 'react'
import { Wordmark } from '../components/brand/Wordmark.tsx'
import { Button } from '../components/ui/Button.tsx'
import { ErrorState } from '../components/ui/States.tsx'
import { PasswortDialog } from '../components/ui/PasswortDialog.tsx'
import { herunterladen } from '../data/exportImport.ts'
import { sicherungDateiname, sicherungErstellen } from '../data/sicherung.ts'
import { LADEFEHLER_TEXT } from '../data/storage.ts'
import { useStore } from '../data/storeContext.ts'
import styles from './StoreGate.module.css'

/** Zeigt bei unlesbaren Daten einen Fehlerzustand statt der App. */
export function StoreGate({ children }: { children: ReactNode }) {
  const { zustand, zuruecksetzen } = useStore()
  const [bestaetigen, setBestaetigen] = useState(false)
  const [sichern, setSichern] = useState(false)

  if (zustand.phase === 'bereit') return children

  return (
    <main className={styles.seite}>
      <Wordmark size="lg" />
      <h1 className={styles.titel}>Daten konnten nicht geladen werden</h1>
      <ErrorState
        title={LADEFEHLER_TEXT[zustand.grund]}
        action={
          <div className={styles.aktionen}>
            <Button variant="secondary" onClick={() => setSichern(true)}>
              Rohdaten verschlüsselt sichern
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
      {sichern && (
        <PasswortDialog
          titel="Rohdaten verschlüsselt sichern"
          neu
          bestaetigenLabel="Sicherung herunterladen"
          onSchliessen={() => setSichern(false)}
          onAbsenden={async (passwort) => {
            herunterladen(await sicherungErstellen(zustand.rohdaten, passwort), sicherungDateiname(new Date(), 'rohdaten'))
            setSichern(false)
            return null
          }}
        />
      )}
    </main>
  )
}
