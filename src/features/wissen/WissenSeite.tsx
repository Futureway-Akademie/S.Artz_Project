import { useState } from 'react'
import { Link } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum } from '../../domain/dates.ts'
import { alleSchlagworte } from '../../domain/selectors/schlagworte.ts'
import { LEERER_WISSEN_FILTER, WISSEN_TYP, wissenListe, wissenThemen, wissenZaehler, type WissenFilter } from '../../domain/selectors/wissen.ts'
import type { Wissen } from '../../domain/types.ts'
import styles from '../kontakte/crm.module.css'
import { WissenDialog } from './WissenDialog.tsx'

/** Zweites Gehirn: Notizen, Tools, Erkenntnisse, Quellen und Lerntagebuch zu KI und Weiterbildung. */
export function WissenSeite() {
  const { data } = useStore()
  const [filter, setFilter] = useState<WissenFilter>(LEERER_WISSEN_FILTER)
  const [anlegen, setAnlegen] = useState<Wissen['typ'] | null>(null)
  const liste = wissenListe(data, filter)
  const zaehler = wissenZaehler(data)
  const themen = wissenThemen(data)
  const schlagworte = alleSchlagworte(data.wissen)

  return (
    <Seite
      titel="Wissen"
      einleitung="Dein zweites Gehirn zu KI und Weiterbildung – alles verschlüsselt, verknüpft mit Projekten und Kurs."
      aktionen={
        <>
          <Button onClick={() => setAnlegen('notiz')}>Wissen festhalten</Button>
          <Button variant="secondary" onClick={() => setAnlegen('tagebuch')}>
            Lerntagebuch
          </Button>
        </>
      }
    >
      {data.wissen.length === 0 ? (
        <EmptyState title="Noch kein Wissen festgehalten" action={<Button onClick={() => setAnlegen('notiz')}>Ersten Eintrag anlegen</Button>}>
          Halte Tools mit Erfahrungen, Erkenntnisse aus dem Kurs und Quellen fest – oder führe dein
          Lerntagebuch je Kurstag.
        </EmptyState>
      ) : (
        <>
          <p className={styles.treffer}>
            {(Object.keys(WISSEN_TYP) as Array<Wissen['typ']>)
              .filter((t) => zaehler[t] > 0)
              .map((t) => `${WISSEN_TYP[t].mehrzahl}: ${zaehler[t]}`)
              .join(' · ')}
          </p>
          <div className={styles.filter} role="search" aria-label="Wissen filtern">
            <TextField label="Suche" optionalKennzeichnen={false} type="search" value={filter.suche} onChange={(e) => setFilter({ ...filter, suche: e.target.value })} />
            <SelectField
              label="Art"
              optionalKennzeichnen={false}
              value={filter.typ}
              onChange={(e) => setFilter({ ...filter, typ: e.target.value as WissenFilter['typ'] })}
              placeholder="Alle"
              options={Object.entries(WISSEN_TYP).map(([value, t]) => ({ value, label: t.label }))}
            />
            {themen.length > 0 && (
              <SelectField
                label="Thema"
                optionalKennzeichnen={false}
                value={filter.thema}
                onChange={(e) => setFilter({ ...filter, thema: e.target.value })}
                placeholder="Alle"
                options={themen.map((t) => ({ value: t, label: t }))}
              />
            )}
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
          <p className={styles.treffer} aria-live="polite">
            {liste.length} von {data.wissen.length} Einträgen
          </p>
          {liste.length === 0 ? (
            <EmptyState
              title="Keine Einträge passen zu deiner Auswahl"
              action={
                <Button variant="secondary" onClick={() => setFilter(LEERER_WISSEN_FILTER)}>
                  Filter zurücksetzen
                </Button>
              }
            />
          ) : (
            <ul className={styles.liste} aria-label="Wissen">
              {liste.map((w) => (
                <li key={w.id} className={styles.zeile}>
                  <div className={styles.haupt}>
                    <Link to={`/wissen/${w.id}`} className={styles.name}>
                      {w.titel}
                    </Link>
                    <span className={styles.unter}>
                      {[w.thema, w.datum && formatDatum(w.datum)].filter(Boolean).join(' · ') || 'Ohne Thema'}
                    </span>
                    {w.inhalt && <span className={styles.vorschau}>{w.inhalt.slice(0, 160)}{w.inhalt.length > 160 ? ' …' : ''}</span>}
                    {w.schlagworte.length > 0 && (
                      <span className={styles.schlagworte}>
                        {w.schlagworte.map((s) => (
                          <Badge key={s}>#{s}</Badge>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className={styles.meta}>
                    <Badge tone={w.typ === 'tagebuch' ? 'blue' : 'neutral'}>{WISSEN_TYP[w.typ].label}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {anlegen && <WissenDialog vorgabe={{ typ: anlegen }} onSchliessen={() => setAnlegen(null)} />}
    </Seite>
  )
}
