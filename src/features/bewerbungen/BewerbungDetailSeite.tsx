import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { ExternerLink } from '../../components/ui/ExternerLink.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum } from '../../domain/dates.ts'
import { BEWERBUNG_STATUS } from '../../domain/labels.ts'
import styles from '../kontakte/crm.module.css'
import { Gesamtsicht } from '../gemeinsam/Gesamtsicht.tsx'
import { BewerbungDialog } from './BewerbungDialog.tsx'

/** Eine Bewerbung mit allen Angaben und allem, was dazugehört (Verlauf, Termine, Aufgaben). */
export function BewerbungDetailSeite() {
  const { id = '' } = useParams()
  const { data } = useStore()
  const navigate = useNavigate()
  const [bearbeiten, setBearbeiten] = useState(false)
  const b = data.bewerbungen.find((x) => x.id === id)

  if (!b) {
    return (
      <Seite titel="Bewerbung nicht gefunden">
        <EmptyState title="Diese Bewerbung gibt es nicht (mehr)." action={<Link to="/bewerbungen">Zu den Bewerbungen</Link>} />
      </Seite>
    )
  }

  const firma = data.unternehmen.find((u) => u.id === b.unternehmenId)
  const rolle = data.zielrollen.find((z) => z.id === b.zielrolleId)
  const kontakt = data.kontakte.find((k) => k.id === b.kontaktId)

  return (
    <Seite
      titel={b.stelle}
      einleitung={
        <span className={styles.meta}>
          <Link to="/bewerbungen">Bewerbungen</Link>
          {firma && <span>· {firma.name}</span>}
          <Badge tone={BEWERBUNG_STATUS[b.status].ton}>{BEWERBUNG_STATUS[b.status].label}</Badge>
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
          <Gesamtsicht ziel={{ art: 'bewerbung', id: b.id }} ohne={['kontakte', 'unternehmen']} />
        </div>
        <div className={styles.spalte}>
          <Panel titel="Angaben">
            <dl className={styles.daten}>
              <dt>Unternehmen</dt>
              <dd>{firma ? <Link to={`/kontakte/unternehmen/${firma.id}`}>{firma.name}</Link> : 'Nicht hinterlegt'}</dd>
              <dt>Ansprechpartner</dt>
              <dd>{kontakt ? <Link to={`/kontakte/${kontakt.id}`}>{kontakt.name}</Link> : 'Nicht hinterlegt'}</dd>
              <dt>Zielrolle</dt>
              <dd>{rolle?.titel ?? 'Nicht hinterlegt'}</dd>
              <dt>Quelle</dt>
              <dd>{b.quelle || 'Nicht hinterlegt'}</dd>
              <dt>Beworben am</dt>
              <dd>{b.beworbenAm ? formatDatum(b.beworbenAm) : 'Noch nicht'}</dd>
              <dt>Wiedervorlage</dt>
              <dd>{b.wiedervorlageAm ? <DueLabel faelligAm={b.wiedervorlageAm} /> : 'Keine'}</dd>
              <dt>Ausschreibung</dt>
              <dd>{b.link ? <ExternerLink href={b.link}>Öffnen</ExternerLink> : 'Nicht hinterlegt'}</dd>
              <dt>Nächster Schritt</dt>
              <dd>{b.naechsterSchritt || 'Nicht hinterlegt'}</dd>
            </dl>
            {b.notiz && <p className={styles.text}>{b.notiz}</p>}
          </Panel>
        </div>
      </div>
      {bearbeiten && <BewerbungDialog bewerbung={b} onSchliessen={() => setBearbeiten(false)} onGeloescht={() => navigate('/bewerbungen')} />}
    </Seite>
  )
}
