import { useState } from 'react'
import { ExternerLink } from '../../components/ui/ExternerLink.tsx'
import { Link, useNavigate, useParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { SAMMLUNG_INFO } from '../../data/activity.ts'
import { loeschfolgen } from '../../data/reducer.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum } from '../../domain/dates.ts'
import { KONTEXT } from '../../domain/labels.ts'
import { kontaktpflege, vorTagen } from '../../domain/selectors/beziehung.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from './crm.module.css'
import { Gesamtsicht } from '../gemeinsam/Gesamtsicht.tsx'
import { DatenschutzPanel } from './DatenschutzPanel.tsx'
import { EmailDialog } from './EmailDialog.tsx'
import { KontaktDialog } from './KontaktDialog.tsx'
import { KontaktVerlauf } from './KontaktVerlauf.tsx'

export function KontaktDetailSeite() {
  const { id = '' } = useParams()
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const navigate = useNavigate()
  const now = useNow()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [loeschen, setLoeschen] = useState(false)
  const [email, setEmail] = useState(false)
  const kontakt = data.kontakte.find((k) => k.id === id)

  if (!kontakt) {
    return (
      <Seite titel="Kontakt nicht gefunden">
        <EmptyState title="Diesen Kontakt gibt es nicht (mehr)." action={<Link to="/kontakte">Zur Kontaktliste</Link>} />
      </Seite>
    )
  }

  const firma = data.unternehmen.find((u) => u.id === kontakt.unternehmenId)
  const folge = loeschfolgen(data, 'kontakte', kontakt.id)
  const pflege = kontaktpflege(data, kontakt, now)

  return (
    <Seite
      titel={kontakt.name}
      einleitung={
        <span className={styles.meta}>
          <Link to="/kontakte">Kontakte</Link>
          <span>· {[kontakt.rolle, firma?.name].filter(Boolean).join(' bei ') || 'Ohne Rolle'}</span>
          <Badge>{KONTEXT[kontakt.kontext]}</Badge>
        </span>
      }
      aktionen={
        <>
          {kontakt.email && <Button onClick={() => setEmail(true)}>E-Mail schreiben</Button>}
          <Button variant="secondary" onClick={() => setBearbeiten(true)}>
            Bearbeiten
          </Button>
          <Button variant="ghost" onClick={() => setLoeschen(true)}>
            Löschen
          </Button>
        </>
      }
    >
      <div className={styles.raster}>
        <div className={styles.spalte}>
          <KontaktVerlauf kontakt={kontakt} />
          <Gesamtsicht ziel={{ art: 'kontakt', id: kontakt.id }} ohne={['verlauf', 'projekte', 'unternehmen']} />
        </div>
        <div className={styles.spalte}>
          <Panel titel="Kontaktdaten">
            <dl className={styles.daten}>
              <dt>Unternehmen</dt>
              <dd>{firma ? <Link to={`/kontakte/unternehmen/${firma.id}`}>{firma.name}</Link> : 'Nicht hinterlegt'}</dd>
              <dt>E-Mail</dt>
              <dd>{kontakt.email ? <a href={`mailto:${kontakt.email}`}>{kontakt.email}</a> : 'Nicht hinterlegt'}</dd>
              <dt>Telefon</dt>
              <dd>{kontakt.telefon ? <a href={`tel:${kontakt.telefon.replace(/\s/g, '')}`}>{kontakt.telefon}</a> : 'Nicht hinterlegt'}</dd>
              <dt>LinkedIn</dt>
              <dd>
                {kontakt.linkedinUrl ? (
                  <ExternerLink href={kontakt.linkedinUrl}>
                    Profil öffnen
                  </ExternerLink>
                ) : (
                  'Nicht hinterlegt'
                )}
              </dd>
              <dt>Letzter Kontakt</dt>
              <dd>
                {pflege.letzter ? `${formatDatum(pflege.letzter)} (${vorTagen(pflege.tage)})` : 'Noch keiner'}
                {pflege.funkstille && (
                  <>
                    {' '}
                    <Badge tone="warning">Funkstille</Badge>
                  </>
                )}
              </dd>
              <dt>Schlagworte</dt>
              <dd>{kontakt.schlagworte.length > 0 ? kontakt.schlagworte.map((s) => `#${s}`).join(' ') : 'Keine'}</dd>
              <dt>Herkunft</dt>
              <dd>{kontakt.herkunft || 'Nicht hinterlegt'}</dd>
            </dl>
          </Panel>
          {kontakt.notiz && (
            <Panel titel="Notiz">
              <p className={styles.text}>{kontakt.notiz}</p>
            </Panel>
          )}
          <DatenschutzPanel kontakt={kontakt} onBearbeiten={() => setBearbeiten(true)} />
        </div>
      </div>

      {bearbeiten && <KontaktDialog kontakt={kontakt} onSchliessen={() => setBearbeiten(false)} />}
      {email && <EmailDialog kontakt={kontakt} onSchliessen={() => setEmail(false)} />}
      {loeschen && (
        <ConfirmDialog
          offen
          titel="Kontakt löschen?"
          bestaetigenLabel="Kontakt löschen"
          gefahr
          onAbbrechen={() => setLoeschen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'kontakte', id: kontakt.id })
            zeige('Kontakt vollständig gelöscht')
            navigate('/kontakte')
          }}
        >
          <p>
            „{kontakt.name}“ wird endgültig gelöscht – mit Verlauf und auch aus dem Aktivitätsprotokoll. Ältere Sicherungsdateien enthalten
            die Daten weiterhin; erstelle danach eine neue Sicherung.
          </p>
          {folge.geloescht.length > 0 && (
            <p className={styles.folge}>
              Dabei werden auch {folge.geloescht.length} verknüpfte Einträge gelöscht (
              {[...new Set(folge.geloescht.map((e) => SAMMLUNG_INFO[e.sammlung].einzahl))].join(', ')}).
            </p>
          )}
          {folge.entknuepft.length > 0 && (
            <>
              <p className={styles.folge}>Diese Einträge bleiben, verlieren aber die Verknüpfung. Prüfe, ob sie Angaben zur Person enthalten:</p>
              <ul>
                {folge.entknuepft.map((e) => (
                  <li key={`${e.sammlung}-${e.id}`}>
                    {SAMMLUNG_INFO[e.sammlung].einzahl}: {e.titel}
                  </li>
                ))}
              </ul>
            </>
          )}
        </ConfirmDialog>
      )}
    </Seite>
  )
}
