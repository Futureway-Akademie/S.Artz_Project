import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, heute } from '../../domain/dates.ts'
import { letzteTagebuchEintraege, tagebuchEintrag } from '../../domain/selectors/wissen.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from '../kontakte/crm.module.css'
import { WissenDialog } from './WissenDialog.tsx'

/** Lerntagebuch auf der Weiterbildungsseite: ein Eintrag je Kurstag, die letzten Einträge im Blick. */
export function Lerntagebuch({ kursId, kurstag }: { kursId: string; kurstag: number | null }) {
  const { data } = useStore()
  const now = useNow()
  const h = heute(now)
  const [anlegen, setAnlegen] = useState(false)
  const heutig = tagebuchEintrag(data, h)
  const letzte = letzteTagebuchEintraege(data)

  return (
    <Panel
      titel="Lerntagebuch"
      aktionen={
        heutig ? (
          <Link to={`/wissen/${heutig.id}`}>Heutigen Eintrag öffnen</Link>
        ) : (
          <Button size="sm" onClick={() => setAnlegen(true)}>
            Heute eintragen
          </Button>
        )
      }
    >
      {letzte.length === 0 ? (
        <p className={styles.leer}>Noch keine Einträge. Halte nach jedem Kurstag in ein paar Sätzen fest, was du gelernt hast.</p>
      ) : (
        <ul className={styles.einfach} aria-label="Letzte Tagebucheinträge">
          {letzte.map((w) => (
            <li key={w.id}>
              <span className="label">{w.datum ? formatDatum(w.datum) : ''}</span> <Link to={`/wissen/${w.id}`}>{w.titel}</Link>
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link to="/wissen">Alles Wissen ansehen</Link>
      </p>
      {anlegen && (
        <WissenDialog
          vorgabe={{ typ: 'tagebuch', datum: h, kursId, titel: kurstag ? `Kurstag ${kurstag} – ${formatDatum(h)}` : `Lerntagebuch ${formatDatum(h)}` }}
          onSchliessen={() => setAnlegen(false)}
        />
      )}
    </Panel>
  )
}
