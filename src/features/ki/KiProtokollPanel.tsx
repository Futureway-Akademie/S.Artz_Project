import { KI_AUFGABEN } from '../../../supabase/functions/_gemeinsam/ki.ts'
import { Button } from '../../components/ui/Button.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useStore } from '../../data/storeContext.ts'
import { formatZeitpunkt } from '../../domain/dates.ts'
import styles from './KiDialog.module.css'

/** Was wann an die KI ging – Aufgabe, Länge, Verbrauch; nie der Inhalt. */
export function KiProtokollPanel() {
  const { data, dispatch } = useStore()
  const eintraege = data.kiProtokoll.slice(0, 20)
  return (
    <Panel
      titel="KI-Protokoll"
      aktionen={
        data.kiProtokoll.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => dispatch({ type: 'kiProtokoll', eintrag: null })}>
            Protokoll leeren
          </Button>
        )
      }
    >
      <p className={styles.hinweis}>Festgehalten wird nur, wann welche Aufgabe mit wie vielen Zeichen an die KI ging – nie der Inhalt.</p>
      {eintraege.length === 0 ? (
        <p>Noch keine KI-Aufrufe.</p>
      ) : (
        <ul aria-label="KI-Aufrufe">
          {eintraege.map((e) => (
            <li key={e.id}>
              {formatZeitpunkt(e.zeitpunkt)} · {KI_AUFGABEN[e.aufgabe].titel} · {e.zeichen.toLocaleString('de-DE')} Zeichen · {e.tokens.toLocaleString('de-DE')} Tokens
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
