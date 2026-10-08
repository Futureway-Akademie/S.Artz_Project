import { useState } from 'react'
import { NurMit } from '../../components/NurMit.tsx'
import { formatDatum, heute } from '../../domain/dates.ts'
import { anschreibenEingabe, naechsterSchrittAusAntwort, wiedervorlageAusAntwort, zusammenfassungEingabe } from '../../domain/selectors/kiEingaben.ts'
import { useNow } from '../../hooks/useNow.ts'
import { KiDialog } from '../ki/KiDialog.tsx'
import { Link, useNavigate, useParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { ExternerLink } from '../../components/ui/ExternerLink.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { SelectField } from '../../components/ui/Field.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { BEWERBUNG_STATUS, optionen } from '../../domain/labels.ts'
import type { Bewerbung } from '../../domain/types.ts'
import styles from '../kontakte/crm.module.css'
import { Gesamtsicht } from '../gemeinsam/Gesamtsicht.tsx'
import { BewerbungDialog } from './BewerbungDialog.tsx'

/** Eine Bewerbung mit allen Angaben und allem, was dazugehört (Verlauf, Termine, Aufgaben). */
export function BewerbungDetailSeite() {
  const { id = '' } = useParams()
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const navigate = useNavigate()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [kiAnschreiben, setKiAnschreiben] = useState(false)
  const [kiZusammenfassung, setKiZusammenfassung] = useState(false)
  const now = useNow()
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
        <>
          <NurMit bereich="ki">
            <Button variant="secondary" onClick={() => setKiAnschreiben(true)}>
              Anschreiben mit KI
            </Button>
            {data.interaktionen.some((i) => i.bewerbungId === b.id) && (
              <Button variant="secondary" onClick={() => setKiZusammenfassung(true)}>
                Zusammenfassen mit KI
              </Button>
            )}
          </NurMit>
          <Button variant="secondary" onClick={() => setBearbeiten(true)}>
            Bearbeiten
          </Button>
        </>
      }
    >
      <div className={styles.raster}>
        <div className={styles.spalte}>
          <Gesamtsicht ziel={{ art: 'bewerbung', id: b.id }} ohne={['kontakte', 'unternehmen']} />
        </div>
        <div className={styles.spalte}>
          <Panel titel="Angaben">
            <SelectField
              label="Status"
              optionalKennzeichnen={false}
              value={b.status}
              onChange={(e) => {
                dispatch({ type: 'aendern', sammlung: 'bewerbungen', id: b.id, aenderung: { status: e.target.value as Bewerbung['status'] } })
                zeige('Status gespeichert')
              }}
              options={optionen(BEWERBUNG_STATUS)}
            />
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
      {kiZusammenfassung && (
        <KiDialog
          aufgabe="zusammenfassung"
          eingabe={zusammenfassungEingabe(data, { bewerbungId: b.id }, now)}
          uebernehmenLabel="Nächsten Schritt und Wiedervorlage übernehmen"
          onUebernehmen={(antwort) => {
            const schritt = naechsterSchrittAusAntwort(antwort)
            dispatch({
              type: 'aendern',
              sammlung: 'bewerbungen',
              id: b.id,
              aenderung: { naechsterSchritt: schritt ?? b.naechsterSchritt, wiedervorlageAm: wiedervorlageAusAntwort(antwort) ?? b.wiedervorlageAm },
            })
            zeige('Nächster Schritt übernommen')
          }}
          onSchliessen={() => setKiZusammenfassung(false)}
        />
      )}
      {kiAnschreiben && (
        <KiDialog
          aufgabe="anschreiben"
          eingabe={anschreibenEingabe(data, b)}
          uebernehmenLabel="In die Notizen übernehmen"
          onUebernehmen={(text) => {
            const kopf = `— Anschreiben (KI-Entwurf, ${formatDatum(heute(now))}) —`
            dispatch({ type: 'aendern', sammlung: 'bewerbungen', id: b.id, aenderung: { notiz: [b.notiz, `${kopf}\n${text}`].filter(Boolean).join('\n\n') } })
            zeige('Entwurf in die Notizen übernommen')
          }}
          onSchliessen={() => setKiAnschreiben(false)}
        />
      )}
    </Seite>
  )
}
