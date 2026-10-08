import { useState } from 'react'
import { ExternerLink } from '../../components/ui/ExternerLink.tsx'
import { Link, useNavigate, useParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { unternehmenVerknuepfungen } from '../../domain/selectors/crm.ts'
import styles from './crm.module.css'
import { KontaktDialog } from './KontaktDialog.tsx'
import { Gesamtsicht } from '../gemeinsam/Gesamtsicht.tsx'
import { UnternehmenDialog } from './UnternehmenDialog.tsx'

export function UnternehmenDetailSeite() {
  const { id = '' } = useParams()
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const navigate = useNavigate()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [kontaktAnlegen, setKontaktAnlegen] = useState(false)
  const [loeschen, setLoeschen] = useState(false)
  const unternehmen = data.unternehmen.find((u) => u.id === id)

  if (!unternehmen) {
    return (
      <Seite titel="Unternehmen nicht gefunden">
        <EmptyState title="Dieses Unternehmen gibt es nicht (mehr)." action={<Link to="/kontakte/unternehmen">Zur Liste</Link>} />
      </Seite>
    )
  }

  const { kontakte, bewerbungen, leads } = unternehmenVerknuepfungen(data, unternehmen.id)
  const verknuepft = kontakte.length + bewerbungen.length + leads.length

  return (
    <Seite
      titel={unternehmen.name}
      einleitung={
        <span className={styles.meta}>
          <Link to="/kontakte/unternehmen">Unternehmen</Link>
          {unternehmen.branche && <span>· {unternehmen.branche}</span>}
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
          <Panel
            titel={`Kontakte (${kontakte.length})`}
            aktionen={
              <Button size="sm" variant="secondary" onClick={() => setKontaktAnlegen(true)}>
                Kontakt hinzufügen
              </Button>
            }
          >
            {kontakte.length === 0 ? (
              <p className={styles.leer}>Noch keine Kontakte bei diesem Unternehmen.</p>
            ) : (
              <ul className={styles.einfach}>
                {kontakte.map((k) => (
                  <li key={k.id}>
                    <Link to={`/kontakte/${k.id}`}>{k.name}</Link>
                    {k.rolle && <span className={styles.unter}> · {k.rolle}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Gesamtsicht ziel={{ art: 'unternehmen', id: unternehmen.id }} ohne={['kontakte']} />
        </div>
        <div className={styles.spalte}>
          <Panel titel="Angaben">
            <dl className={styles.daten}>
              <dt>Schlagworte</dt>
              <dd>{unternehmen.schlagworte.length > 0 ? unternehmen.schlagworte.map((s) => `#${s}`).join(' ') : 'Keine'}</dd>
              <dt>Branche</dt>
              <dd>{unternehmen.branche || 'Nicht hinterlegt'}</dd>
              <dt>Website</dt>
              <dd>
                {unternehmen.website ? (
                  <ExternerLink href={unternehmen.website}>
                    {unternehmen.website.replace(/^https?:\/\//, '')}
                  </ExternerLink>
                ) : (
                  'Nicht hinterlegt'
                )}
              </dd>
            </dl>
            {unternehmen.notiz && <p className={styles.text}>{unternehmen.notiz}</p>}
          </Panel>
        </div>
      </div>

      {bearbeiten && <UnternehmenDialog unternehmen={unternehmen} onSchliessen={() => setBearbeiten(false)} />}
      {kontaktAnlegen && <KontaktDialog vorgabeUnternehmenId={unternehmen.id} onSchliessen={() => setKontaktAnlegen(false)} />}
      {loeschen && (
        <ConfirmDialog
          offen
          titel="Unternehmen löschen?"
          bestaetigenLabel="Unternehmen löschen"
          gefahr
          onAbbrechen={() => setLoeschen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'unternehmen', id: unternehmen.id })
            zeige(`Unternehmen „${unternehmen.name}“ gelöscht`)
            navigate('/kontakte/unternehmen')
          }}
        >
          <p>„{unternehmen.name}“ wird endgültig gelöscht.</p>
          {verknuepft > 0 && (
            <p className={styles.folge}>{verknuepft} Kontakte, Bewerbungen oder Leads bleiben erhalten, verlieren aber die Zuordnung zum Unternehmen.</p>
          )}
        </ConfirmDialog>
      )}
    </Seite>
  )
}
