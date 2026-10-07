import { useState } from 'react'
import { ExternerLink } from '../../components/ui/ExternerLink.tsx'
import { Link } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum } from '../../domain/dates.ts'
import { BEWERBUNG_STATUS } from '../../domain/labels.ts'
import {
  bewerbungenNachStatus,
  bewerbungListe,
  STANDARD_BEWERBUNGS_FILTER,
  type BewerbungFilter,
  type BewerbungsFilter,
} from '../../domain/selectors/bewerbungen.ts'
import type { Bewerbung } from '../../domain/types.ts'
import styles from '../kontakte/crm.module.css'
import { BewerbungDialog } from './BewerbungDialog.tsx'
import { BewerbungenNavigation } from './BewerbungenNavigation.tsx'

export function BewerbungenSeite() {
  const { data } = useStore()
  const [filter, setFilter] = useState<BewerbungsFilter>(STANDARD_BEWERBUNGS_FILTER)
  const [dialog, setDialog] = useState<Bewerbung | 'neu' | null>(null)
  const liste = bewerbungListe(data, filter)
  const status = bewerbungenNachStatus(data.bewerbungen)

  return (
    <Seite titel="Bewerbungen" einleitung="Deine Bewerbungen nach Status, verknüpft mit Zielrolle und Ansprechpartner." aktionen={<Button onClick={() => setDialog('neu')}>Bewerbung anlegen</Button>}>
      <BewerbungenNavigation />
      {data.bewerbungen.length === 0 ? (
        <EmptyState title="Noch keine Bewerbungen" action={<Button onClick={() => setDialog('neu')}>Erste Bewerbung anlegen</Button>}>
          Halte Stelle, Unternehmen, Zielrolle, Quelle und den nächsten Schritt fest.
        </EmptyState>
      ) : (
        <>
          <p className={styles.treffer}>{status.map((s) => `${BEWERBUNG_STATUS[s.status].label}: ${s.anzahl}`).join(' · ')}</p>
          <div className={styles.filter} role="search" aria-label="Bewerbungen filtern">
            <TextField label="Suche" optionalKennzeichnen={false} type="search" value={filter.suche} onChange={(e) => setFilter({ ...filter, suche: e.target.value })} />
            <SelectField
              label="Status"
              optionalKennzeichnen={false}
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value as BewerbungFilter })}
              options={[
                { value: 'laufend', label: 'Laufend' },
                { value: 'alle', label: 'Alle' },
                ...Object.entries(BEWERBUNG_STATUS).map(([value, s]) => ({ value, label: s.label })),
              ]}
            />
            <SelectField
              label="Zielrolle"
              optionalKennzeichnen={false}
              value={filter.zielrolleId}
              onChange={(e) => setFilter({ ...filter, zielrolleId: e.target.value })}
              placeholder="Alle"
              options={data.zielrollen.map((z) => ({ value: z.id, label: z.titel }))}
            />
          </div>
          {liste.length === 0 ? (
            <EmptyState
              title="Keine Bewerbungen passen zu deiner Auswahl"
              action={
                <Button variant="secondary" onClick={() => setFilter(STANDARD_BEWERBUNGS_FILTER)}>
                  Filter zurücksetzen
                </Button>
              }
            />
          ) : (
            <ul className={styles.liste} aria-label="Bewerbungen">
              {liste.map((b) => {
                const firma = data.unternehmen.find((u) => u.id === b.unternehmenId)
                const rolle = data.zielrollen.find((z) => z.id === b.zielrolleId)
                const kontakt = data.kontakte.find((k) => k.id === b.kontaktId)
                return (
                  <li key={b.id} className={styles.zeile}>
                    <div className={styles.haupt}>
                      <Link to={`/bewerbungen/${b.id}`} className={styles.name}>
                        {b.stelle}
                      </Link>
                      <span className={styles.unter}>
                        {firma ? <Link to={`/kontakte/unternehmen/${firma.id}`}>{firma.name}</Link> : 'Ohne Unternehmen'}
                        {rolle && ` · ${rolle.titel}`}
                        {b.quelle && ` · Quelle: ${b.quelle}`}
                        {b.beworbenAm && ` · beworben ${formatDatum(b.beworbenAm)}`}
                      </span>
                      {kontakt && (
                        <span className={styles.unter}>
                          Ansprechpartner: <Link to={`/kontakte/${kontakt.id}`}>{kontakt.name}</Link>
                        </span>
                      )}
                      {b.naechsterSchritt && <span>Nächster Schritt: {b.naechsterSchritt}</span>}
                    </div>
                    <div className={styles.meta}>
                      {b.link && (
                        <ExternerLink href={b.link} aria-label={`Ausschreibung „${b.stelle}“ öffnen`}>
                          Ausschreibung
                        </ExternerLink>
                      )}
                      <Badge tone={BEWERBUNG_STATUS[b.status].ton}>{BEWERBUNG_STATUS[b.status].label}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => setDialog(b)} aria-label={`Bewerbung „${b.stelle}“ bearbeiten`}>
                        Bearbeiten
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
      {dialog && <BewerbungDialog bewerbung={dialog === 'neu' ? undefined : dialog} onSchliessen={() => setDialog(null)} />}
    </Seite>
  )
}
