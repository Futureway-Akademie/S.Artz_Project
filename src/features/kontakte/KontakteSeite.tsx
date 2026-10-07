import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { KONTEXT } from '../../domain/labels.ts'
import { kontaktListe, LEERER_KONTAKT_FILTER, unternehmenName, type KontaktFilter } from '../../domain/selectors/crm.ts'
import { kontakteMitPruefbedarf, PRUEFUNG_NACH_MONATEN } from '../../domain/selectors/datenschutz.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from './crm.module.css'
import { KontaktDialog } from './KontaktDialog.tsx'
import { KontakteNavigation } from './KontakteNavigation.tsx'

export function KontakteSeite() {
  const { data } = useStore()
  const now = useNow()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [filter, setFilter] = useState<KontaktFilter>({ ...LEERER_KONTAKT_FILTER, nurFaellig: params.get('faellig') === '1', nurPruefen: params.get('pruefen') === '1' })
  const [anlegen, setAnlegen] = useState(false)
  const kontakte = useMemo(() => kontaktListe(data, filter, now), [data, filter, now])
  const pruefbedarf = useMemo(() => kontakteMitPruefbedarf(data, now).length, [data, now])

  return (
    <Seite
      titel="Kontakte & Leads"
      einleitung="Mit wem musst du als Nächstes sprechen – und wozu?"
      aktionen={<Button onClick={() => setAnlegen(true)}>Kontakt anlegen</Button>}
    >
      <KontakteNavigation />

      {pruefbedarf > 0 && (
        <p className={styles.hinweisBox} role="status">
          <strong>Datenschutz:</strong> {pruefbedarf === 1 ? '1 Kontakt braucht' : `${pruefbedarf} Kontakte brauchen`} eine Prüfung – Rechtsgrundlage oder Zweck fehlt, oder seit{' '}
          {PRUEFUNG_NACH_MONATEN} Monaten keine Aktivität.{' '}
          <Button size="sm" variant="ghost" onClick={() => setFilter({ ...LEERER_KONTAKT_FILTER, nurPruefen: true })}>
            Anzeigen
          </Button>
        </p>
      )}

      {data.kontakte.length === 0 ? (
        <EmptyState title="Noch keine Kontakte" action={<Button onClick={() => setAnlegen(true)}>Ersten Kontakt anlegen</Button>}>
          Lege Recruiter, Dozenten oder Interessenten an und halte die nächste Aktion fest.
        </EmptyState>
      ) : (
        <>
          <div className={styles.filter} role="search" aria-label="Kontakte filtern">
            <TextField label="Suche" optionalKennzeichnen={false} type="search" value={filter.suche} onChange={(e) => setFilter({ ...filter, suche: e.target.value })} />
            <SelectField
              label="Kontext"
              optionalKennzeichnen={false}
              value={filter.kontext}
              onChange={(e) => setFilter({ ...filter, kontext: e.target.value as KontaktFilter['kontext'] })}
              options={[{ value: 'alle', label: 'Alle' }, ...Object.entries(KONTEXT).map(([value, label]) => ({ value, label }))]}
            />
            <label className={styles.check}>
              <input type="checkbox" checked={filter.nurFaellig} onChange={(e) => setFilter({ ...filter, nurFaellig: e.target.checked })} />
              Mit fälliger Aktion
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={filter.nurPruefen} onChange={(e) => setFilter({ ...filter, nurPruefen: e.target.checked })} />
              Datenschutz prüfen
            </label>
          </div>
          <p className={styles.treffer} aria-live="polite">
            {kontakte.length} von {data.kontakte.length} Kontakten
          </p>
          {kontakte.length === 0 ? (
            <EmptyState
              title="Keine Kontakte passen zu deiner Auswahl"
              action={
                <Button variant="secondary" onClick={() => setFilter(LEERER_KONTAKT_FILTER)}>
                  Filter zurücksetzen
                </Button>
              }
            />
          ) : (
            <ul className={styles.liste} aria-label="Kontakte">
              {kontakte.map((k) => {
                const firma = unternehmenName(data, k.unternehmenId)
                return (
                  <li key={k.id} className={styles.zeile}>
                    <div className={styles.haupt}>
                      <Link to={`/kontakte/${k.id}`} className={styles.name}>
                        {k.name}
                      </Link>
                      <span className={styles.unter}>{[k.rolle, firma].filter(Boolean).join(' · ') || 'Keine Rolle oder Firma hinterlegt'}</span>
                      {k.naechsteAktion && <span>Nächste Aktion: {k.naechsteAktion.text}</span>}
                    </div>
                    <div className={styles.meta}>
                      <Badge>{KONTEXT[k.kontext]}</Badge>
                      {k.naechsteAktion && <DueLabel faelligAm={k.naechsteAktion.faelligAm} />}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {anlegen && <KontaktDialog onSchliessen={() => setAnlegen(false)} onAngelegt={(id) => navigate(`/kontakte/${id}`)} />}
    </Seite>
  )
}
