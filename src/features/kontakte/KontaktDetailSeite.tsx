import { useState } from 'react'
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
import { KONTEXT } from '../../domain/labels.ts'
import styles from './crm.module.css'
import { KontaktDialog } from './KontaktDialog.tsx'
import { KontaktVerlauf } from './KontaktVerlauf.tsx'

export function KontaktDetailSeite() {
  const { id = '' } = useParams()
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const navigate = useNavigate()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [loeschen, setLoeschen] = useState(false)
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
                  <a href={kontakt.linkedinUrl} target="_blank" rel="noreferrer noopener">
                    Profil öffnen
                  </a>
                ) : (
                  'Nicht hinterlegt'
                )}
              </dd>
              <dt>Herkunft</dt>
              <dd>{kontakt.herkunft || 'Nicht hinterlegt'}</dd>
            </dl>
          </Panel>
          {kontakt.notiz && (
            <Panel titel="Notiz">
              <p className={styles.text}>{kontakt.notiz}</p>
            </Panel>
          )}
        </div>
      </div>

      {bearbeiten && <KontaktDialog kontakt={kontakt} onSchliessen={() => setBearbeiten(false)} />}
      {loeschen && (
        <ConfirmDialog
          offen
          titel="Kontakt löschen?"
          bestaetigenLabel="Kontakt löschen"
          gefahr
          onAbbrechen={() => setLoeschen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'kontakte', id: kontakt.id })
            zeige(`Kontakt „${kontakt.name}“ gelöscht`)
            navigate('/kontakte')
          }}
        >
          <p>„{kontakt.name}“ wird endgültig gelöscht.</p>
          {folge.geloescht.length > 0 && (
            <p className={styles.folge}>
              Dabei werden auch {folge.geloescht.length} verknüpfte Einträge gelöscht (
              {[...new Set(folge.geloescht.map((e) => SAMMLUNG_INFO[e.sammlung].einzahl))].join(', ')}).
            </p>
          )}
          {folge.entknuepft.length > 0 && <p className={styles.folge}>{folge.entknuepft.length} weitere Einträge verlieren die Verknüpfung.</p>}
        </ConfirmDialog>
      )}
    </Seite>
  )
}
