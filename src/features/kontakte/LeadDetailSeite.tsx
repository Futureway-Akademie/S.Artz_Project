import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { LEAD_STATUS } from '../../domain/labels.ts'
import { formatEuro } from '../../domain/selectors/leads.ts'
import { Gesamtsicht } from '../gemeinsam/Gesamtsicht.tsx'
import styles from './crm.module.css'
import { LeadDialog } from './LeadDialog.tsx'

/** Ein Lead mit Angaben und allem, was dazugehört. */
export function LeadDetailSeite() {
  const { id = '' } = useParams()
  const { data } = useStore()
  const navigate = useNavigate()
  const [bearbeiten, setBearbeiten] = useState(false)
  const lead = data.leads.find((l) => l.id === id)

  if (!lead) {
    return (
      <Seite titel="Lead nicht gefunden">
        <EmptyState title="Diesen Lead gibt es nicht (mehr)." action={<Link to="/kontakte/leads">Zu den Leads</Link>} />
      </Seite>
    )
  }

  const kontakt = data.kontakte.find((k) => k.id === lead.kontaktId)
  const firma = data.unternehmen.find((u) => u.id === lead.unternehmenId)
  const projekt = data.projekte.find((p) => p.id === lead.projektId)

  return (
    <Seite
      titel={lead.titel}
      einleitung={
        <span className={styles.meta}>
          <Link to="/kontakte/leads">Leads</Link>
          <Badge tone={LEAD_STATUS[lead.status].ton}>{LEAD_STATUS[lead.status].label}</Badge>
        </span>
      }
      aktionen={
        <Button variant="secondary" onClick={() => setBearbeiten(true)}>
          Bearbeiten
        </Button>
      }
    >
      <div className={styles.raster}>
        <div className={styles.spalte}>
          <Gesamtsicht ziel={{ art: 'lead', id: lead.id }} ohne={['kontakte', 'unternehmen', 'projekte']} />
        </div>
        <div className={styles.spalte}>
          <Panel titel="Angaben">
            <dl className={styles.daten}>
              <dt>Kontakt</dt>
              <dd>{kontakt ? <Link to={`/kontakte/${kontakt.id}`}>{kontakt.name}</Link> : 'Nicht hinterlegt'}</dd>
              <dt>Unternehmen</dt>
              <dd>{firma ? <Link to={`/kontakte/unternehmen/${firma.id}`}>{firma.name}</Link> : 'Nicht hinterlegt'}</dd>
              <dt>Projekt</dt>
              <dd>{projekt ? <Link to={`/projekte/${projekt.id}`}>{projekt.titel}</Link> : 'Nicht hinterlegt'}</dd>
              <dt>Betrag</dt>
              <dd>{formatEuro(lead.betragEur)}</dd>
              <dt>Wiedervorlage</dt>
              <dd>{lead.wiedervorlageAm ? <DueLabel faelligAm={lead.wiedervorlageAm} /> : 'Keine'}</dd>
              <dt>Nächster Schritt</dt>
              <dd>{lead.naechsterSchritt || 'Nicht hinterlegt'}</dd>
            </dl>
            {lead.notiz && <p className={styles.text}>{lead.notiz}</p>}
          </Panel>
        </div>
      </div>
      {bearbeiten && <LeadDialog lead={lead} onSchliessen={() => setBearbeiten(false)} onGeloescht={() => navigate('/kontakte/leads')} />}
    </Seite>
  )
}
