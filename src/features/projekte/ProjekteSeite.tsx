import { useMemo, useState } from 'react'
import { alleSchlagworte } from '../../domain/selectors/schlagworte.ts'
import { Link, useNavigate } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum } from '../../domain/dates.ts'
import { KEIN_STATUS, PROJEKT_STATUS } from '../../domain/labels.ts'
import {
  LEERER_FILTER,
  projektKategorien,
  projektListe,
  projektZaehler,
  type ProjektFilter,
  type StatusFilter,
} from '../../domain/selectors/projekte.ts'
import { ProjektDialog } from './ProjektDialog.tsx'
import styles from './ProjekteSeite.module.css'

export function ProjekteSeite() {
  const { data } = useStore()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<ProjektFilter>(LEERER_FILTER)
  const [anlegen, setAnlegen] = useState(false)

  const zeilen = useMemo(() => projektListe(data, filter), [data, filter])
  const zaehler = projektZaehler(data)
  const gefiltert = filter.suche !== '' || filter.status !== 'alle' || filter.kategorie !== '' || filter.schlagwort !== ''
  const schlagworte = alleSchlagworte(data.projekte)

  const einleitung =
    zaehler.gesamt === 0
      ? 'Noch keine Projekte angelegt.'
      : `${zaehler.gesamt} Projekte · ${zaehler.nachStatus.in_arbeit ?? 0} in Arbeit`

  return (
    <Seite titel="Projekte" einleitung={einleitung} aktionen={<Button onClick={() => setAnlegen(true)}>Projekt anlegen</Button>}>
      {zaehler.gesamt > 0 && (
        <div className={styles.filter} role="search" aria-label="Projekte filtern">
          <TextField
            label="Suche"
            optionalKennzeichnen={false}
            type="search"
            value={filter.suche}
            onChange={(e) => setFilter({ ...filter, suche: e.target.value })}
            placeholder="Titel, Beschreibung, Tool …"
          />
          <SelectField
            label="Status"
            optionalKennzeichnen={false}
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as StatusFilter })}
            options={[
              { value: 'alle', label: 'Alle' },
              ...Object.entries(PROJEKT_STATUS).map(([value, s]) => ({ value, label: s.label })),
              { value: 'ohne', label: KEIN_STATUS },
            ]}
          />
          <SelectField
            label="Kategorie"
            optionalKennzeichnen={false}
            value={filter.kategorie}
            onChange={(e) => setFilter({ ...filter, kategorie: e.target.value })}
            placeholder="Alle"
            options={projektKategorien(data).map((k) => ({ value: k, label: k }))}
          />
          {schlagworte.length > 0 && (
            <SelectField
              label="Schlagwort"
              optionalKennzeichnen={false}
              value={filter.schlagwort}
              onChange={(e) => setFilter({ ...filter, schlagwort: e.target.value })}
              placeholder="Alle"
              options={schlagworte.map((s) => ({ value: s, label: s }))}
            />
          )}
        </div>
      )}

      {zaehler.gesamt === 0 ? (
        <EmptyState title="Noch keine Projekte" action={<Button onClick={() => setAnlegen(true)}>Erstes Projekt anlegen</Button>}>
          Lege ein Projekt an, um nächste Schritte, Tools und Notizen festzuhalten.
        </EmptyState>
      ) : zeilen.length === 0 ? (
        <EmptyState
          title="Keine Projekte passen zu deiner Auswahl"
          action={
            <Button variant="secondary" onClick={() => setFilter(LEERER_FILTER)}>
              Filter zurücksetzen
            </Button>
          }
        />
      ) : (
        <>
          {gefiltert && (
            <p className={styles.treffer} aria-live="polite">
              {zeilen.length} von {zaehler.gesamt} Projekten
            </p>
          )}
          <ul className={styles.raster}>
            {zeilen.map(({ projekt, offen, erledigt, naechsterSchritt }) => {
              const status = projekt.status ? PROJEKT_STATUS[projekt.status] : null
              return (
                <li key={projekt.id} className={styles.karte}>
                  <div className={styles.kopf}>
                    {projekt.kategorie && <span className={styles.kategorie}>{projekt.kategorie}</span>}
                    <Badge tone={status?.ton ?? 'neutral'}>{status?.label ?? KEIN_STATUS}</Badge>
                  </div>
                  <h2 className={styles.titel}>
                    <Link to={`/projekte/${projekt.id}`} className={styles.link}>
                      {projekt.titel}
                    </Link>
                  </h2>
                  {projekt.beschreibung && <p className={styles.beschreibung}>{projekt.beschreibung}</p>}
                  <div className={styles.schritt}>
                    {naechsterSchritt ? (
                      <>
                        <span className={styles.label}>Nächster Schritt</span>
                        <span>{naechsterSchritt.titel}</span>
                        <DueLabel faelligAm={naechsterSchritt.faelligAm} />
                      </>
                    ) : (
                      <span className={styles.leer}>Kein offener Schritt</span>
                    )}
                  </div>
                  <div className={styles.fuss}>
                    <span>
                      <span className="num">{offen}</span> offen · <span className="num">{erledigt}</span> erledigt
                    </span>
                    {projekt.zuletztAktiv && <span>Zuletzt aktiv: {formatDatum(projekt.zuletztAktiv)}</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {anlegen && <ProjektDialog onSchliessen={() => setAnlegen(false)} onAngelegt={(id) => navigate(`/projekte/${id}`)} />}
    </Seite>
  )
}
