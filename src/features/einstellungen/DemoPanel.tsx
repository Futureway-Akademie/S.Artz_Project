import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { demoEntfernen, demoHinzufuegen, hatDemoDaten } from '../../data/demoDaten.ts'
import { useStore } from '../../data/storeContext.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from './EinstellungenSeite.module.css'

/** Fiktive Demo-Daten für Präsentationen hinzufügen und vollständig wieder entfernen. */
export function DemoPanel() {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const now = useNow()
  const [frage, setFrage] = useState<'laden' | 'entfernen' | null>(null)
  const vorhanden = hatDemoDaten(data)

  return (
    <Panel titel="Demo für Präsentationen">
      <p className={styles.hinweis}>
        Fügt erfundene Firmen, Kontakte, Bewerbungen, Aufgaben und Termine hinzu – ideal zum Vorführen. Deine eigenen Daten bleiben unverändert, die Demo lässt sich
        vollständig wieder entfernen.
      </p>
      <div className={styles.knoepfe}>
        {vorhanden ? (
          <Button variant="secondary" onClick={() => setFrage('entfernen')}>
            Demo-Daten entfernen
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setFrage('laden')}>
            Demo-Daten hinzufügen
          </Button>
        )}
      </div>
      {frage && (
        <ConfirmDialog
          offen
          titel={frage === 'laden' ? 'Demo-Daten hinzufügen?' : 'Demo-Daten entfernen?'}
          bestaetigenLabel={frage === 'laden' ? 'Hinzufügen' : 'Entfernen'}
          onAbbrechen={() => setFrage(null)}
          onBestaetigen={() => {
            dispatch({ type: 'ersetzen', daten: frage === 'laden' ? demoHinzufuegen(data, now) : demoEntfernen(data) })
            zeige(frage === 'laden' ? 'Demo-Daten hinzugefügt' : 'Demo-Daten entfernt')
            setFrage(null)
          }}
        >
          <p>{frage === 'laden' ? 'Die Demo-Einträge erscheinen zusätzlich zu deinen Daten.' : 'Alle Demo-Einträge werden gelöscht. Deine eigenen Daten bleiben erhalten.'}</p>
        </ConfirmDialog>
      )}
    </Panel>
  )
}
