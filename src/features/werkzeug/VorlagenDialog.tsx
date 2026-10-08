import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { vorlagenSchluessel, werkzeugVorlagen } from '../../data/werkzeugVorlagen.ts'
import { WERKZEUG_TYP, WERKZEUG_TYPEN } from '../../domain/selectors/werkzeug.ts'
import crm from '../kontakte/crm.module.css'
import styles from './Werkzeug.module.css'

/** Neutrale Startvorlagen auswählen und in den Werkzeugkasten übernehmen; Vorhandenes wird erkannt. */
export function VorlagenDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const vorlagen = werkzeugVorlagen()
  const vorhanden = new Set(data.werkzeug.map(vorlagenSchluessel))
  const neu = vorlagen.filter((v) => !vorhanden.has(vorlagenSchluessel(v)))
  const [auswahl, setAuswahl] = useState<Set<string>>(() => new Set(neu.map(vorlagenSchluessel)))

  const umschalten = (schluessel: string, an: boolean) => {
    const naechste = new Set(auswahl)
    if (an) naechste.add(schluessel)
    else naechste.delete(schluessel)
    setAuswahl(naechste)
  }

  const uebernehmen = () => {
    const gewaehlt = neu.filter((v) => auswahl.has(vorlagenSchluessel(v)))
    for (const daten of gewaehlt) dispatch({ type: 'anlegen', sammlung: 'werkzeug', daten })
    zeige(`${gewaehlt.length} ${gewaehlt.length === 1 ? 'Vorlage' : 'Vorlagen'} übernommen`)
    onSchliessen()
  }

  return (
    <Dialog
      offen
      titel="Startvorlagen"
      onSchliessen={onSchliessen}
      aktionen={
        <>
          <Button variant="secondary" onClick={onSchliessen}>
            Abbrechen
          </Button>
          <Button onClick={uebernehmen} disabled={auswahl.size === 0}>
            Übernehmen ({auswahl.size})
          </Button>
        </>
      }
    >
      <p className={styles.hinweis}>Allgemeine Vorlagen zum Anpassen. Beträge bei Abos trägst du selbst ein – Preise ändern sich.</p>
      {WERKZEUG_TYPEN.map((typ) => {
        const liste = vorlagen.filter((v) => v.typ === typ)
        if (liste.length === 0) return null
        return (
          <fieldset key={typ} className={styles.vorlagenGruppe}>
            <legend>{WERKZEUG_TYP[typ].mehrzahl}</legend>
            {liste.map((v) => {
              const s = vorlagenSchluessel(v)
              const da = vorhanden.has(s)
              return (
                <label key={s} className={crm.check}>
                  <input type="checkbox" checked={da || auswahl.has(s)} disabled={da} onChange={(e) => umschalten(s, e.target.checked)} />
                  {v.titel}
                  {da && <span className={styles.vorhanden}> – schon vorhanden</span>}
                </label>
              )
            })}
          </fieldset>
        )
      })}
    </Dialog>
  )
}
