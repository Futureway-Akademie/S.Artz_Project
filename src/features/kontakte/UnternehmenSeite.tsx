import { useState } from 'react'
import { Link } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { unternehmenListe } from '../../domain/selectors/crm.ts'
import { alleSchlagworte } from '../../domain/selectors/schlagworte.ts'
import styles from './crm.module.css'
import { KontakteNavigation } from './KontakteNavigation.tsx'
import { UnternehmenDialog } from './UnternehmenDialog.tsx'

export function UnternehmenSeite() {
  const { data } = useStore()
  const [suche, setSuche] = useState('')
  const [schlagwort, setSchlagwort] = useState('')
  const schlagworte = alleSchlagworte(data.unternehmen)
  const [anlegen, setAnlegen] = useState(false)
  const zeilen = unternehmenListe(data, suche, schlagwort)

  return (
    <Seite titel="Unternehmen" aktionen={<Button onClick={() => setAnlegen(true)}>Unternehmen anlegen</Button>}>
      <KontakteNavigation />
      {data.unternehmen.length === 0 ? (
        <EmptyState title="Noch keine Unternehmen" action={<Button onClick={() => setAnlegen(true)}>Erstes Unternehmen anlegen</Button>}>
          Unternehmen bündeln Kontakte, Bewerbungen und Leads.
        </EmptyState>
      ) : (
        <>
          <div role="search" aria-label="Unternehmen filtern" className={styles.filter}>
            <TextField label="Suche" optionalKennzeichnen={false} type="search" value={suche} onChange={(e) => setSuche(e.target.value)} />
            {schlagworte.length > 0 && (
              <SelectField
                label="Schlagwort"
                optionalKennzeichnen={false}
                value={schlagwort}
                onChange={(e) => setSchlagwort(e.target.value)}
                placeholder="Alle"
                options={schlagworte.map((s) => ({ value: s, label: s }))}
              />
            )}
          </div>
          {zeilen.length === 0 ? (
            <EmptyState title="Keine Unternehmen passen zu deiner Suche" />
          ) : (
            <ul className={styles.liste} aria-label="Unternehmen">
              {zeilen.map(({ unternehmen, kontakte, bewerbungen, leads }) => (
                <li key={unternehmen.id} className={styles.zeile}>
                  <div className={styles.haupt}>
                    <Link to={`/kontakte/unternehmen/${unternehmen.id}`} className={styles.name}>
                      {unternehmen.name}
                    </Link>
                    {unternehmen.branche && <span className={styles.unter}>{unternehmen.branche}</span>}
                    {unternehmen.schlagworte.length > 0 && (
                      <span className={styles.schlagworte}>
                        {unternehmen.schlagworte.map((s) => (
                          <Badge key={s}>#{s}</Badge>
                        ))}
                      </span>
                    )}
                  </div>
                  <span className={styles.unter}>
                    {kontakte.length} Kontakte · {bewerbungen.length} Bewerbungen · {leads.length} Leads
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {anlegen && <UnternehmenDialog onSchliessen={() => setAnlegen(false)} />}
    </Seite>
  )
}
