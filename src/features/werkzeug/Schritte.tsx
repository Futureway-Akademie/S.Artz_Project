import { Fortschritt } from '../../components/diagramme/Diagramme.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useStore } from '../../data/storeContext.ts'
import { schrittFortschritt } from '../../domain/selectors/werkzeug.ts'
import type { Werkzeug } from '../../domain/types.ts'
import crm from '../kontakte/crm.module.css'
import styles from './Werkzeug.module.css'

/** Schritte eines Werkzeugs: als Checkliste mit Fortschritt (Anleitungen) oder als nummerierter Ablauf (Workflows). */
export function Schritte({ werkzeug: w, abhaken }: { werkzeug: Werkzeug; abhaken: boolean }) {
  const { dispatch } = useStore()
  const { erledigt, gesamt } = schrittFortschritt(w)

  const umschalten = (index: number, an: boolean) =>
    dispatch({ type: 'aendern', sammlung: 'werkzeug', id: w.id, aenderung: { schritte: w.schritte.map((s, i) => (i === index ? { ...s, erledigt: an } : s)) } })

  return (
    <Panel titel={abhaken ? 'Schritte' : 'Ablauf'}>
      {gesamt === 0 ? (
        <p className={crm.leer}>Noch keine Schritte – über „Bearbeiten“ ergänzen.</p>
      ) : abhaken ? (
        <>
          <Fortschritt wert={erledigt} gesamt={gesamt} label="Schritte erledigt" />
          <ol className={styles.schritte}>
            {w.schritte.map((s, i) => (
              <li key={i}>
                <label className={`${crm.check} ${s.erledigt ? styles.erledigt : ''}`}>
                  <input type="checkbox" checked={s.erledigt} onChange={(e) => umschalten(i, e.target.checked)} />
                  {s.text}
                </label>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <ol className={styles.ablauf}>
          {w.schritte.map((s, i) => (
            <li key={i}>{s.text}</li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
