import { useState } from 'react'
import { Link } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { unternehmenListe } from '../../domain/selectors/crm.ts'
import styles from './crm.module.css'
import { KontakteNavigation } from './KontakteNavigation.tsx'
import { UnternehmenDialog } from './UnternehmenDialog.tsx'

export function UnternehmenSeite() {
  const { data } = useStore()
  const [suche, setSuche] = useState('')
  const [anlegen, setAnlegen] = useState(false)
  const zeilen = unternehmenListe(data, suche)

  return (
    <Seite titel="Unternehmen" aktionen={<Button onClick={() => setAnlegen(true)}>Unternehmen anlegen</Button>}>
      <KontakteNavigation />
      {data.unternehmen.length === 0 ? (
        <EmptyState title="Noch keine Unternehmen" action={<Button onClick={() => setAnlegen(true)}>Erstes Unternehmen anlegen</Button>}>
          Unternehmen bündeln Kontakte, Bewerbungen und Leads.
        </EmptyState>
      ) : (
        <>
          <div role="search" aria-label="Unternehmen filtern">
            <TextField label="Suche" optionalKennzeichnen={false} type="search" value={suche} onChange={(e) => setSuche(e.target.value)} />
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
