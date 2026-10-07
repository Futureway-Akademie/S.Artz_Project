import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { SAMMLUNG_INFO } from '../../data/activity.ts'
import { loeschfolgen } from '../../data/reducer.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, formatZeitpunkt } from '../../domain/dates.ts'
import { KEIN_STATUS, optionen, PLATTFORM, PROJEKT_STATUS } from '../../domain/labels.ts'
import type { ProjektStatus } from '../../domain/types.ts'
import { NaechsteSchritte } from './NaechsteSchritte.tsx'
import { ProjektDialog } from './ProjektDialog.tsx'
import styles from './ProjektDetailSeite.module.css'

export function ProjektDetailSeite() {
  const { id = '' } = useParams()
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const navigate = useNavigate()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [loeschen, setLoeschen] = useState(false)

  const projekt = data.projekte.find((p) => p.id === id)

  if (!projekt) {
    return (
      <Seite titel="Projekt nicht gefunden">
        <EmptyState title="Dieses Projekt gibt es nicht (mehr)." action={<Link to="/projekte">Zur Projektliste</Link>} />
      </Seite>
    )
  }

  const status = projekt.status ? PROJEKT_STATUS[projekt.status] : null
  const folge = loeschfolgen(data, 'projekte', projekt.id)
  const kontakte = data.kontakte.filter((k) => k.projektIds.includes(projekt.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'))

  const statusAendern = (wert: string) => {
    dispatch({ type: 'aendern', sammlung: 'projekte', id: projekt.id, aenderung: { status: (wert || null) as ProjektStatus | null } })
    zeige('Status geändert')
  }

  const endgueltigLoeschen = () => {
    dispatch({ type: 'loeschen', sammlung: 'projekte', id: projekt.id })
    zeige(`Projekt „${projekt.titel}“ gelöscht`)
    navigate('/projekte')
  }

  return (
    <Seite
      titel={projekt.titel}
      einleitung={
        <span className={styles.einleitung}>
          <Link to="/projekte">Projekte</Link>
          {projekt.kategorie && <span> · {projekt.kategorie}</span>}
          <Badge tone={status?.ton ?? 'neutral'}>{status?.label ?? KEIN_STATUS}</Badge>
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
        <div className={styles.haupt}>
          {projekt.beschreibung && (
            <Panel titel="Beschreibung">
              <p className={styles.text}>{projekt.beschreibung}</p>
            </Panel>
          )}
          <Panel titel="Nächste Schritte">
            <NaechsteSchritte projektId={projekt.id} />
          </Panel>
          {projekt.notizen && (
            <Panel titel="Notizen">
              <p className={styles.text}>{projekt.notizen}</p>
            </Panel>
          )}
        </div>

        <div className={styles.seite}>
          <Panel titel="Überblick">
            <SelectField
              label="Status"
              optionalKennzeichnen={false}
              value={projekt.status ?? ''}
              onChange={(e) => statusAendern(e.target.value)}
              placeholder={KEIN_STATUS}
              options={optionen(PROJEKT_STATUS)}
              hint="Du setzt den Status selbst; er ändert sich nie automatisch."
            />
            <dl className={styles.daten}>
              <dt>Zuletzt aktiv</dt>
              <dd>{projekt.zuletztAktiv ? formatDatum(projekt.zuletztAktiv) : 'Nicht hinterlegt'}</dd>
              <dt>Zuletzt geändert</dt>
              <dd>{formatZeitpunkt(projekt.geaendertAm)}</dd>
            </dl>
          </Panel>
          <Panel titel="Tools">
            {projekt.tools.length > 0 ? (
              <ul className={styles.tags}>
                {projekt.tools.map((t) => (
                  <li key={t}>
                    <Badge>{t}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.leer}>Keine Tools hinterlegt.</p>
            )}
          </Panel>
          {kontakte.length > 0 && (
            <Panel titel="Kontakte">
              <ul className={styles.liste}>
                {kontakte.map((k) => (
                  <li key={k.id}>
                    <Link to={`/kontakte/${k.id}`}>{k.name}</Link>
                    {k.rolle && ` · ${k.rolle}`}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {projekt.bestandteile.length > 0 && (
            <Panel titel="Bestandteile">
              <ul className={styles.liste}>
                {projekt.bestandteile.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Panel>
          )}
          {projekt.automation && (
            <Panel titel="Automation">
              <p>
                {PLATTFORM[projekt.automation.plattform]} · nicht verbunden.{' '}
                <Link to="/automationen">Details unter Automationen</Link>
              </p>
            </Panel>
          )}
        </div>
      </div>

      {bearbeiten && <ProjektDialog projekt={projekt} onSchliessen={() => setBearbeiten(false)} />}
      {loeschen && (
        <ConfirmDialog
          offen
          titel="Projekt löschen?"
          bestaetigenLabel="Projekt löschen"
          gefahr
          onBestaetigen={endgueltigLoeschen}
          onAbbrechen={() => setLoeschen(false)}
        >
          <p>„{projekt.titel}“ wird endgültig gelöscht.</p>
          {folge.geloescht.length > 0 && (
            <p className={styles.folge}>
              Dabei werden auch {folge.geloescht.length} verknüpfte Einträge gelöscht (
              {[...new Set(folge.geloescht.map((e) => SAMMLUNG_INFO[e.sammlung].einzahl))].join(', ')}).
            </p>
          )}
          {folge.entknuepft.length > 0 && (
            <p className={styles.folge}>{folge.entknuepft.length} weitere Einträge verlieren die Verknüpfung zum Projekt.</p>
          )}
        </ConfirmDialog>
      )}
    </Seite>
  )
}
