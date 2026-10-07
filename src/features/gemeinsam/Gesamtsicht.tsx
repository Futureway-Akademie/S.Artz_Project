import { useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum } from '../../domain/dates.ts'
import { BEWERBUNG_STATUS, INTERAKTION_ART, LEAD_STATUS, PROJEKT_STATUS } from '../../domain/labels.ts'
import { bezugInfo } from '../../domain/selectors/bezug.ts'
import { selectVerknuepft, type Verknuepft, type Ziel } from '../../domain/selectors/verknuepft.ts'
import { WERKZEUG_TYP, werkzeugLink } from '../../domain/selectors/werkzeug.ts'
import { WISSEN_TYP } from '../../domain/selectors/wissen.ts'
import type { Aufgabe, Termin } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import { AufgabeDialog } from '../aufgaben/AufgabeDialog.tsx'
import { TerminDialog } from '../aufgaben/TerminDialog.tsx'
import styles from './Gesamtsicht.module.css'

type Abschnitt = keyof Pick<Verknuepft, 'aufgaben' | 'termine' | 'verlauf' | 'kontakte' | 'unternehmen' | 'projekte' | 'bewerbungen' | 'leads' | 'wissen' | 'werkzeug'>

interface GesamtsichtProps {
  ziel: Ziel
  /** Abschnitte, die die Seite schon selbst zeigt */
  ohne?: Abschnitt[]
}

const VERLAUF_MAX = 5

/** „Alles dazu“: verknüpfte Aufgaben, Termine, Verlauf und Einträge anderer Bereiche – mit Links und Schnellanlage. */
export function Gesamtsicht({ ziel, ohne = [] }: GesamtsichtProps) {
  const { data } = useStore()
  const now = useNow()
  const v = selectVerknuepft(data, ziel, now)
  const [dialog, setDialog] = useState<{ art: 'aufgabe'; aufgabe?: Aufgabe } | { art: 'termin'; termin?: Termin } | null>(null)
  const zeigen = (a: Abschnitt) => !ohne.includes(a)
  const bezug = { art: ziel.art, id: ziel.id }

  // Hinweis, wenn ein Eintrag nur indirekt verknüpft ist (z. B. Aufgabe eines Kontakts beim Unternehmen)
  const ueber = (e: { bezug: { art: string; id: string | null } }) =>
    e.bezug.art === ziel.art && e.bezug.id === ziel.id ? null : bezugInfo(data, e.bezug as Aufgabe['bezug'])

  return (
    <Panel
      titel="Alles dazu"
      aktionen={
        <span className={styles.knoepfe}>
          <Button size="sm" variant="secondary" onClick={() => setDialog({ art: 'aufgabe' })}>
            + Aufgabe
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDialog({ art: 'termin' })}>
            + Termin
          </Button>
        </span>
      }
    >
      <div className={styles.abschnitte}>
        {zeigen('aufgaben') && (
          <section aria-labelledby={`${ziel.id}-aufgaben`}>
            <h3 id={`${ziel.id}-aufgaben`} className={styles.titel}>
              Offene Aufgaben ({v.aufgaben.length}){v.erledigteAufgaben > 0 && <span className={styles.leise}> · {v.erledigteAufgaben} erledigt</span>}
            </h3>
            {v.aufgaben.length === 0 ? (
              <p className={styles.leise}>Keine offenen Aufgaben.</p>
            ) : (
              <ul className={styles.liste}>
                {v.aufgaben.map((a) => {
                  const info = ueber(a)
                  return (
                    <li key={a.id} className={styles.zeile}>
                      <button type="button" className={styles.link} onClick={() => setDialog({ art: 'aufgabe', aufgabe: a })}>
                        {a.titel}
                      </button>
                      {info && <span className={styles.leise}>· {info.text}</span>}
                      <DueLabel faelligAm={a.faelligAm} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {zeigen('termine') && (
          <section aria-labelledby={`${ziel.id}-termine`}>
            <h3 id={`${ziel.id}-termine`} className={styles.titel}>
              Kommende Termine ({v.termine.length}){v.vergangeneTermine > 0 && <span className={styles.leise}> · {v.vergangeneTermine} vergangen</span>}
            </h3>
            {v.termine.length === 0 ? (
              <p className={styles.leise}>Keine kommenden Termine.</p>
            ) : (
              <ul className={styles.liste}>
                {v.termine.map((t) => {
                  const info = ueber(t)
                  return (
                    <li key={t.id} className={styles.zeile}>
                      <span className="label">
                        {formatDatum(t.datum)}
                        {t.uhrzeit && ` ${t.uhrzeit}`}
                      </span>
                      <button type="button" className={styles.link} onClick={() => setDialog({ art: 'termin', termin: t })}>
                        {t.titel}
                      </button>
                      {info && <span className={styles.leise}>· {info.text}</span>}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {zeigen('verlauf') && v.verlauf.length > 0 && (
          <section aria-labelledby={`${ziel.id}-verlauf`}>
            <h3 id={`${ziel.id}-verlauf`} className={styles.titel}>
              Verlauf ({v.verlauf.length})
            </h3>
            <ul className={styles.liste}>
              {v.verlauf.slice(0, VERLAUF_MAX).map((i) => {
                const person = data.kontakte.find((k) => k.id === i.kontaktId)
                return (
                  <li key={i.id} className={styles.zeile}>
                    <span className="label">
                      {formatDatum(i.datum)} · {INTERAKTION_ART[i.art]}
                    </span>
                    {person && <Link to={`/kontakte/${person.id}`}>{person.name}</Link>}
                    <span className={styles.text}>{i.betreff || i.text}</span>
                  </li>
                )
              })}
            </ul>
            {v.verlauf.length > VERLAUF_MAX && <p className={styles.leise}>und {v.verlauf.length - VERLAUF_MAX} ältere Einträge beim Kontakt</p>}
          </section>
        )}

        {zeigen('kontakte') && v.kontakte.length > 0 && (
          <Liste
            id={`${ziel.id}-kontakte`}
            titel={ziel.art === 'projekt' ? 'Ansprechpartner' : 'Kontakte'}
            eintraege={v.kontakte.map((k) => ({ id: k.id, text: k.name, link: `/kontakte/${k.id}`, zusatz: k.rolle }))}
          />
        )}
        {zeigen('unternehmen') && v.unternehmen.length > 0 && (
          <Liste
            id={`${ziel.id}-unternehmen`}
            titel={ziel.art === 'projekt' ? 'Auftraggeber' : 'Unternehmen'}
            eintraege={v.unternehmen.map((u) => ({ id: u.id, text: u.name, link: `/kontakte/unternehmen/${u.id}`, zusatz: u.branche }))}
          />
        )}
        {zeigen('projekte') && v.projekte.length > 0 && (
          <Liste
            id={`${ziel.id}-projekte`}
            titel="Projekte"
            eintraege={v.projekte.map((p) => ({ id: p.id, text: p.titel, link: `/projekte/${p.id}`, badge: p.status ? PROJEKT_STATUS[p.status] : undefined }))}
          />
        )}
        {zeigen('bewerbungen') && v.bewerbungen.length > 0 && (
          <Liste
            id={`${ziel.id}-bewerbungen`}
            titel="Bewerbungen"
            eintraege={v.bewerbungen.map((b) => ({ id: b.id, text: b.stelle, link: `/bewerbungen/${b.id}`, badge: BEWERBUNG_STATUS[b.status] }))}
          />
        )}
        {zeigen('wissen') && v.wissen.length > 0 && (
          <Liste
            id={`${ziel.id}-wissen`}
            titel="Wissen"
            eintraege={v.wissen.map((w) => ({ id: w.id, text: w.titel, link: `/wissen/${w.id}`, zusatz: WISSEN_TYP[w.typ].label }))}
          />
        )}
        {zeigen('werkzeug') && v.werkzeug.length > 0 && (
          <Liste
            id={`${ziel.id}-werkzeug`}
            titel="Werkzeugkasten"
            eintraege={v.werkzeug.map((w) => ({ id: w.id, text: w.titel, link: werkzeugLink(w), zusatz: WERKZEUG_TYP[w.typ].einzahl }))}
          />
        )}
        {zeigen('leads') && v.leads.length > 0 && (
          <Liste
            id={`${ziel.id}-leads`}
            titel="Leads"
            eintraege={v.leads.map((l) => ({ id: l.id, text: l.titel, link: `/kontakte/leads/${l.id}`, badge: LEAD_STATUS[l.status] }))}
          />
        )}
      </div>

      {dialog?.art === 'aufgabe' && <AufgabeDialog aufgabe={dialog.aufgabe} vorgabeBezug={bezug} onSchliessen={() => setDialog(null)} />}
      {dialog?.art === 'termin' && <TerminDialog termin={dialog.termin} vorgabeBezug={bezug} onSchliessen={() => setDialog(null)} />}
    </Panel>
  )
}

interface ListenEintrag {
  id: string
  text: string
  link: string
  zusatz?: string
  badge?: { label: string; ton: Parameters<typeof Badge>[0]['tone'] }
}

function Liste({ id, titel, eintraege }: { id: string; titel: string; eintraege: ListenEintrag[] }) {
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className={styles.titel}>
        {titel} ({eintraege.length})
      </h3>
      <ul className={styles.liste}>
        {eintraege.map((e) => (
          <li key={e.id} className={styles.zeile}>
            <Link to={e.link}>{e.text}</Link>
            {e.zusatz && <span className={styles.leise}>· {e.zusatz}</span>}
            {e.badge && <Badge tone={e.badge.ton}>{e.badge.label}</Badge>}
          </li>
        ))}
      </ul>
    </section>
  )
}
