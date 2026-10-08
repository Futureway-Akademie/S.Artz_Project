import { useState } from 'react'
import { Link } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { SelectField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { LEAD_STATUS } from '../../domain/labels.ts'
import { formatEuro, leadListe, selectLeadSumme, type LeadFilter } from '../../domain/selectors/leads.ts'
import type { Lead } from '../../domain/types.ts'
import styles from './crm.module.css'
import { KontakteNavigation } from './KontakteNavigation.tsx'
import { LeadDialog } from './LeadDialog.tsx'

export function LeadsSeite() {
  const { data } = useStore()
  const [filter, setFilter] = useState<LeadFilter>('offen')
  const [dialog, setDialog] = useState<Lead | 'neu' | null>(null)
  const leads = leadListe(data, filter)
  const summe = selectLeadSumme(leads)

  return (
    <Seite
      titel="Leads"
      einleitung="Optional: Anfragen rund um PIKARTZ.AI (Schulung, Automation). Ohne Prognosen oder Abschlusswahrscheinlichkeiten."
      aktionen={<Button onClick={() => setDialog('neu')}>Lead anlegen</Button>}
    >
      <KontakteNavigation />
      {data.leads.length === 0 ? (
        <EmptyState title="Noch keine Leads" action={<Button onClick={() => setDialog('neu')}>Ersten Lead anlegen</Button>}>
          Leads sind optional. Lege einen an, wenn eine konkrete Anfrage vorliegt.
        </EmptyState>
      ) : (
        <>
          <div className={styles.filter} role="search" aria-label="Leads filtern">
            <SelectField
              label="Status"
              optionalKennzeichnen={false}
              value={filter}
              onChange={(e) => setFilter(e.target.value as LeadFilter)}
              options={[
                { value: 'offen', label: 'Offen (Neu, Im Austausch, Angebot)' },
                { value: 'alle', label: 'Alle' },
                ...Object.entries(LEAD_STATUS).map(([value, s]) => ({ value, label: s.label })),
              ]}
            />
          </div>
          <p className={styles.treffer} aria-live="polite">
            {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'} · Summe der hinterlegten Beträge: {summe === null ? 'Keine Beträge hinterlegt' : formatEuro(summe)}
          </p>
          {leads.length === 0 ? (
            <EmptyState title="Keine Leads mit diesem Status" />
          ) : (
            <ul className={styles.liste} aria-label="Leads">
              {leads.map((l) => {
                const kontakt = data.kontakte.find((k) => k.id === l.kontaktId)
                const firma = data.unternehmen.find((u) => u.id === l.unternehmenId)
                return (
                  <li key={l.id} className={styles.zeile}>
                    <div className={styles.haupt}>
                      <Link to={`/kontakte/leads/${l.id}`} className={styles.name}>
                        {l.titel}
                      </Link>
                      <span className={styles.unter}>
                        {kontakt && <Link to={`/kontakte/${kontakt.id}`}>{kontakt.name}</Link>}
                        {kontakt && firma && ' · '}
                        {firma && <Link to={`/kontakte/unternehmen/${firma.id}`}>{firma.name}</Link>}
                        {!kontakt && !firma && 'Ohne Kontakt'}
                      </span>
                      {l.naechsterSchritt && <span>Nächster Schritt: {l.naechsterSchritt}</span>}
                    </div>
                    <div className={styles.meta}>
                      <span className={l.betragEur === null ? styles.leer : 'num'}>{formatEuro(l.betragEur)}</span>
                      <Badge tone={LEAD_STATUS[l.status].ton}>{LEAD_STATUS[l.status].label}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => setDialog(l)} aria-label={`Lead „${l.titel}“ bearbeiten`}>
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
      {dialog && <LeadDialog lead={dialog === 'neu' ? undefined : dialog} onSchliessen={() => setDialog(null)} />}
    </Seite>
  )
}
