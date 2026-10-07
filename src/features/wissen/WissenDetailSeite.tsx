import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ExternerLink } from '../../components/ui/ExternerLink.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, formatZeitpunkt } from '../../domain/dates.ts'
import { istWebadresse } from '../../domain/url.ts'
import { WISSEN_TYP } from '../../domain/selectors/wissen.ts'
import styles from '../kontakte/crm.module.css'
import { WissenDialog } from './WissenDialog.tsx'

export function WissenDetailSeite() {
  const { id = '' } = useParams()
  const { data } = useStore()
  const { zeige } = useToast()
  const navigate = useNavigate()
  const [bearbeiten, setBearbeiten] = useState(false)
  const w = data.wissen.find((x) => x.id === id)

  if (!w) {
    return (
      <Seite titel="Eintrag nicht gefunden">
        <EmptyState title="Diesen Eintrag gibt es nicht (mehr)." action={<Link to="/wissen">Zum Wissen</Link>} />
      </Seite>
    )
  }

  const kurs = data.kurse.find((k) => k.id === w.kursId)
  const projekte = data.projekte.filter((p) => w.projektIds.includes(p.id))
  const aufgaben = data.kursAufgaben.filter((k) => w.kursAufgabeIds.includes(k.id))

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(w.inhalt)
      zeige('In die Zwischenablage kopiert')
    } catch {
      zeige('Kopieren nicht möglich – bitte von Hand markieren')
    }
  }

  return (
    <Seite
      titel={w.titel}
      einleitung={
        <span className={styles.meta}>
          <Link to="/wissen">Wissen</Link>
          <Badge tone={w.typ === 'tagebuch' ? 'blue' : 'neutral'}>{WISSEN_TYP[w.typ].label}</Badge>
          {w.thema && <span>· {w.thema}</span>}
        </span>
      }
      aktionen={
        <>
          {w.inhalt && (
            <Button variant="secondary" onClick={kopieren}>
              Inhalt kopieren
            </Button>
          )}
          <Button variant="secondary" onClick={() => setBearbeiten(true)}>
            Bearbeiten
          </Button>
        </>
      }
    >
      <div className={styles.raster}>
        <div className={styles.spalte}>
          <Panel titel="Inhalt">{w.inhalt ? <p className={styles.text}>{w.inhalt}</p> : <p className={styles.leer}>Noch kein Inhalt.</p>}</Panel>
        </div>
        <div className={styles.spalte}>
          <Panel titel="Angaben">
            <dl className={styles.daten}>
              {w.datum && (
                <>
                  <dt>{w.typ === 'tagebuch' ? 'Kurstag' : 'Datum'}</dt>
                  <dd>{formatDatum(w.datum, 'lang')}</dd>
                </>
              )}
              <dt>Quelle</dt>
              <dd>{w.quelle ? istWebadresse(w.quelle) ? <ExternerLink href={w.quelle}>{w.quelle.replace(/^https?:\/\//, '')}</ExternerLink> : w.quelle : 'Nicht hinterlegt'}</dd>
              <dt>Schlagworte</dt>
              <dd>{w.schlagworte.length > 0 ? w.schlagworte.map((s) => `#${s}`).join(' ') : 'Keine'}</dd>
              <dt>Weiterbildung</dt>
              <dd>{kurs ? <Link to="/weiterbildung">{kurs.titel}</Link> : 'Nicht verknüpft'}</dd>
              {aufgaben.length > 0 && (
                <>
                  <dt>Kursaufgaben</dt>
                  <dd>{aufgaben.map((k) => k.code).join(', ')}</dd>
                </>
              )}
              <dt>Projekte</dt>
              <dd>
                {projekte.length === 0
                  ? 'Nicht verknüpft'
                  : projekte.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ', '}
                        <Link to={`/projekte/${p.id}`}>{p.titel}</Link>
                      </span>
                    ))}
              </dd>
              <dt>Zuletzt geändert</dt>
              <dd>{formatZeitpunkt(w.geaendertAm)}</dd>
            </dl>
          </Panel>
        </div>
      </div>
      {bearbeiten && <WissenDialog eintrag={w} onSchliessen={() => setBearbeiten(false)} onGeloescht={() => navigate('/wissen')} />}
    </Seite>
  )
}
