import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ExternerLink } from '../../components/ui/ExternerLink.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { Icon } from '../../components/ui/Icon.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, formatZeitpunkt, heute } from '../../domain/dates.ts'
import { ABO_INTERVALL, aboUebersicht, kuendigenBis, monatsKosten, naechsteVerlaengerung } from '../../domain/selectors/abos.ts'
import { formatEuro } from '../../domain/selectors/leads.ts'
import { useNow } from '../../hooks/useNow.ts'
import { alleSchlagworte } from '../../domain/selectors/schlagworte.ts'
import {
  AVV_STATUS,
  INTEGRATION_ART,
  LEERER_WERKZEUG_FILTER,
  MIT_PLATZHALTERN,
  promptPlatzhalter,
  typAusSlug,
  WERKZEUG_STATUS,
  WERKZEUG_TYP,
  WERKZEUG_TYPEN,
  werkzeugLink,
  werkzeugListe,
  werkzeugPlattformen,
  werkzeugVerknuepft,
  werkzeugZaehler,
  zuletztGeaenderteWerkzeuge,
  type WerkzeugFilter,
} from '../../domain/selectors/werkzeug.ts'
import type { Werkzeug, WerkzeugTyp } from '../../domain/types.ts'
import { istWebadresse } from '../../domain/url.ts'
import { NichtGefunden } from '../NichtGefunden.tsx'
import crm from '../kontakte/crm.module.css'
import styles from './Werkzeug.module.css'
import { Ausfuellen } from './Ausfuellen.tsx'
import { Schritte } from './Schritte.tsx'
import { WerkzeugDialog } from './WerkzeugDialog.tsx'
import { inZwischenablage } from './zwischenablage.ts'

const statusTon = (s: Werkzeug['status']) => (s === 'aktiv' ? 'blue' : 'neutral')

/** Übersicht über den ganzen Werkzeugkasten */
export function WerkzeugUebersicht() {
  const { data } = useStore()
  const zaehler = werkzeugZaehler(data)
  const zuletzt = zuletztGeaenderteWerkzeuge(data)
  const abos = aboUebersicht(data)

  return (
    <Seite titel="Werkzeugkasten" einleitung="Deine KI-Werkzeuge an einem Ort: Prompts, Befehle, Agenten, Pläne und Abos – verschlüsselt und mit Projekten verknüpft.">
      <ul className={styles.kacheln} aria-label="Bereiche des Werkzeugkastens">
        {WERKZEUG_TYPEN.map((t) => (
          <li key={t}>
            <Link to={`/werkzeug/${WERKZEUG_TYP[t].slug}`} className={styles.kachel}>
              <span className={styles.kachelKopf}>
                <Icon name={WERKZEUG_TYP[t].icon} />
                <span className={styles.kachelTitel}>{WERKZEUG_TYP[t].mehrzahl}</span>
                <span className={`num ${styles.anzahl}`}>{zaehler[t]}</span>
              </span>
              <span className={styles.kachelText}>{t === 'abo' && abos.anzahl > 0 ? `${formatEuro(abos.summe)} pro Monat` : WERKZEUG_TYP[t].hinweis}</span>
            </Link>
          </li>
        ))}
      </ul>
      {zuletzt.length > 0 && (
        <Panel titel="Zuletzt geändert">
          <ul className={crm.liste} aria-label="Zuletzt geändert">
            {zuletzt.map((w) => (
              <li key={w.id} className={crm.zeile}>
                <div className={crm.haupt}>
                  <Link to={werkzeugLink(w)} className={crm.name}>
                    {w.titel}
                  </Link>
                  <span className={crm.unter}>{formatZeitpunkt(w.geaendertAm)}</span>
                </div>
                <Badge>{WERKZEUG_TYP[w.typ].einzahl}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </Seite>
  )
}

/** Liste eines Werkzeugtyps mit Filter */
export function WerkzeugListeSeite() {
  const { art } = useParams()
  const typ = typAusSlug(art)
  return typ ? <WerkzeugListe key={typ} typ={typ} /> : <NichtGefunden />
}

function WerkzeugListe({ typ }: { typ: WerkzeugTyp }) {
  const { data } = useStore()
  const { zeige } = useToast()
  const navigate = useNavigate()
  const info = WERKZEUG_TYP[typ]
  const [filter, setFilter] = useState<WerkzeugFilter>(LEERER_WERKZEUG_FILTER)
  const [anlegen, setAnlegen] = useState(false)
  const alle = data.werkzeug.filter((w) => w.typ === typ)
  const liste = werkzeugListe(data, typ, filter)
  const plattformen = werkzeugPlattformen(data, typ)
  const schlagworte = alleSchlagworte(alle)
  const neuKnopf = <Button onClick={() => setAnlegen(true)}>Neu: {info.einzahl}</Button>

  return (
    <Seite
      titel={info.mehrzahl}
      einleitung={
        <span className={crm.meta}>
          <Link to="/werkzeug">Werkzeugkasten</Link>
          <span>· {info.hinweis}</span>
        </span>
      }
      aktionen={neuKnopf}
    >
      {alle.length === 0 ? (
        <EmptyState title={`Noch keine ${info.mehrzahl}`} action={neuKnopf}>
          {info.hinweis}
        </EmptyState>
      ) : (
        <>
          <div className={crm.filter} role="search" aria-label={`${info.mehrzahl} filtern`}>
            <TextField label="Suche" optionalKennzeichnen={false} type="search" value={filter.suche} onChange={(e) => setFilter({ ...filter, suche: e.target.value })} />
            <SelectField
              label="Status"
              optionalKennzeichnen={false}
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value as WerkzeugFilter['status'] })}
              placeholder="Alle"
              options={Object.entries(WERKZEUG_STATUS).map(([value, label]) => ({ value, label }))}
            />
            {plattformen.length > 0 && (
              <SelectField
                label={info.plattform.label}
                optionalKennzeichnen={false}
                value={filter.plattform}
                onChange={(e) => setFilter({ ...filter, plattform: e.target.value })}
                placeholder="Alle"
                options={plattformen.map((p) => ({ value: p, label: p }))}
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
          {typ === 'abo' && <AboSumme />}
          <p className={crm.treffer} aria-live="polite">
            {liste.length} von {alle.length} Einträgen
          </p>
          {liste.length === 0 ? (
            <EmptyState
              title="Keine Einträge passen zu deiner Auswahl"
              action={
                <Button variant="secondary" onClick={() => setFilter(LEERER_WERKZEUG_FILTER)}>
                  Filter zurücksetzen
                </Button>
              }
            />
          ) : (
            <ul className={crm.liste} aria-label={info.mehrzahl}>
              {liste.map((w) => (
                <li key={w.id} className={crm.zeile}>
                  <div className={crm.haupt}>
                    <Link to={werkzeugLink(w)} className={crm.name}>
                      {w.titel}
                    </Link>
                    <span className={crm.unter}>{[w.plattform, w.version].filter(Boolean).join(' · ') || `${info.plattform.label} nicht angegeben`}</span>
                    {w.beschreibung && <span className={crm.vorschau}>{w.beschreibung}</span>}
                    {w.schlagworte.length > 0 && (
                      <span className={crm.schlagworte}>
                        {w.schlagworte.map((s) => (
                          <Badge key={s}>#{s}</Badge>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className={crm.meta}>
                    {MIT_PLATZHALTERN.includes(w.typ) && w.inhalt && (
                      <Button variant="ghost" size="sm" aria-label={`${w.titel} kopieren`} onClick={() => inZwischenablage(w.inhalt, zeige)}>
                        Kopieren
                      </Button>
                    )}
                    {w.integration && <Badge>{INTEGRATION_ART[w.integration.art]}</Badge>}
                    <Badge tone={statusTon(w.status)}>{WERKZEUG_STATUS[w.status]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {anlegen && <WerkzeugDialog typ={typ} onSchliessen={() => setAnlegen(false)} onAngelegt={(id) => navigate(werkzeugLink({ typ, id }))} />}
    </Seite>
  )
}

/** Detailseite eines Werkzeugs */
export function WerkzeugDetailSeite() {
  const { art, id = '' } = useParams()
  const { data } = useStore()
  const { zeige } = useToast()
  const navigate = useNavigate()
  const [bearbeiten, setBearbeiten] = useState(false)
  const typ = typAusSlug(art)
  const w = data.werkzeug.find((x) => x.id === id && x.typ === typ)

  if (!typ || !w) {
    return (
      <Seite titel="Eintrag nicht gefunden">
        <EmptyState title="Diesen Eintrag gibt es nicht (mehr)." action={<Link to="/werkzeug">Zum Werkzeugkasten</Link>} />
      </Seite>
    )
  }

  const info = WERKZEUG_TYP[w.typ]
  const projekte = data.projekte.filter((p) => w.projektIds.includes(p.id))
  const verknuepft = werkzeugVerknuepft(data, w)

  const mitPlatzhaltern = MIT_PLATZHALTERN.includes(w.typ) && promptPlatzhalter(w.inhalt).length > 0

  return (
    <Seite
      titel={w.titel}
      einleitung={
        <span className={crm.meta}>
          <Link to={`/werkzeug/${info.slug}`}>{info.mehrzahl}</Link>
          <Badge tone={statusTon(w.status)}>{WERKZEUG_STATUS[w.status]}</Badge>
          {w.beschreibung && <span>· {w.beschreibung}</span>}
        </span>
      }
      aktionen={
        <>
          {w.inhalt && (
            <Button variant="secondary" onClick={() => inZwischenablage(w.inhalt, zeige)}>
              {info.inhalt.label} kopieren
            </Button>
          )}
          <Button variant="secondary" onClick={() => setBearbeiten(true)}>
            Bearbeiten
          </Button>
        </>
      }
    >
      <div className={crm.raster}>
        <div className={crm.spalte}>
          <Panel titel={info.inhalt.label}>
            {w.inhalt ? <pre className={styles.inhalt}>{w.inhalt}</pre> : <p className={crm.leer}>Noch nichts eingetragen.</p>}
          </Panel>
          {mitPlatzhaltern && <Ausfuellen key={w.inhalt} text={w.inhalt} label={info.inhalt.label} />}
          {info.schritte && <Schritte werkzeug={w} abhaken={info.schritte.abhaken} />}
          {w.abo && <AboAngaben abo={w.abo} />}
          {w.integration && (
            <Panel titel="Zugang und Datenschutz">
              <dl className={crm.daten}>
                <dt>Art</dt>
                <dd>{INTEGRATION_ART[w.integration.art]}</dd>
                <dt>Zugangsdaten</dt>
                <dd>{w.integration.schluesselOrt ? `liegen in: ${w.integration.schluesselOrt}` : 'Ablageort nicht notiert'}</dd>
                <dt>Region</dt>
                <dd>{w.integration.region || 'Nicht angegeben'}</dd>
                <dt>AVV</dt>
                <dd>{w.integration.avv ? AVV_STATUS[w.integration.avv] : 'Noch offen'}</dd>
              </dl>
              {w.integration.avv !== 'ja' && w.integration.avv !== 'nicht_noetig' && (
                <p className={styles.hinweis}>Ohne Auftragsverarbeitungsvertrag keine personenbezogenen Daten (z. B. Kontakte) über diese Integration verarbeiten.</p>
              )}
            </Panel>
          )}
        </div>
        <div className={crm.spalte}>
          <Panel titel="Angaben">
            <dl className={crm.daten}>
              <dt>{info.plattform.label}</dt>
              <dd>{w.plattform || 'Nicht angegeben'}</dd>
              {info.ausloeser && (
                <>
                  <dt>{info.ausloeser.label}</dt>
                  <dd>{w.ausloeser || 'Nicht angegeben'}</dd>
                </>
              )}
              {w.version && (
                <>
                  <dt>Version</dt>
                  <dd>{w.version}</dd>
                </>
              )}
              <dt>Link</dt>
              <dd>{w.link ? istWebadresse(w.link) ? <ExternerLink href={w.link}>{w.link.replace(/^https?:\/\//, '')}</ExternerLink> : w.link : 'Nicht hinterlegt'}</dd>
              <dt>Schlagworte</dt>
              <dd>{w.schlagworte.length > 0 ? w.schlagworte.map((s) => `#${s}`).join(' ') : 'Keine'}</dd>
              <dt>Projekte</dt>
              <dd>
                {projekte.length === 0
                  ? 'Nicht verknüpft'
                  : projekte.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ', '}
                        <Link to={`/projekte/${p.id}`}>{p.titel}</Link>
                      </span>
                    ))}
              </dd>
              {verknuepft.length > 0 && (
                <>
                  <dt>Verknüpft</dt>
                  <dd>
                    {verknuepft.map((x, i) => (
                      <span key={x.id}>
                        {i > 0 && ', '}
                        <Link to={werkzeugLink(x)}>{x.titel}</Link> ({WERKZEUG_TYP[x.typ].einzahl})
                      </span>
                    ))}
                  </dd>
                </>
              )}
              <dt>Zuletzt geändert</dt>
              <dd>{formatZeitpunkt(w.geaendertAm)}</dd>
            </dl>
          </Panel>
        </div>
      </div>
      {bearbeiten && <WerkzeugDialog typ={w.typ} eintrag={w} onSchliessen={() => setBearbeiten(false)} onGeloescht={() => navigate(`/werkzeug/${info.slug}`)} />}
    </Seite>
  )
}

function AboSumme() {
  const { data } = useStore()
  const u = aboUebersicht(data)
  return (
    <p className={styles.summe}>
      Laufende Kosten: <strong className="num">{formatEuro(u.summe)}</strong> pro Monat ({formatEuro(Math.round(u.summe * 1200) / 100)} pro Jahr) aus {u.anzahl} {u.anzahl === 1 ? 'Abo' : 'Abos'}
      {u.ohneBetrag > 0 && ` – ${u.ohneBetrag} ohne Betrag`}
    </p>
  )
}

function AboAngaben({ abo }: { abo: NonNullable<Werkzeug['abo']> }) {
  const now = useNow()
  const monat = monatsKosten(abo)
  const naechste = naechsteVerlaengerung(abo, heute(now))
  const bis = naechste ? kuendigenBis(naechste, abo) : null
  return (
    <Panel titel="Kosten und Fristen">
      <dl className={crm.daten}>
        <dt>Abrechnung</dt>
        <dd>{ABO_INTERVALL[abo.intervall]}</dd>
        {abo.intervall !== 'kostenlos' && (
          <>
            <dt>Kosten</dt>
            <dd>{abo.kostenEur === null ? 'Kein Betrag' : `${formatEuro(abo.kostenEur)} ${abo.intervall === 'jaehrlich' ? 'pro Jahr' : 'pro Monat'}`}</dd>
          </>
        )}
        {abo.intervall === 'jaehrlich' && monat !== null && (
          <>
            <dt>Pro Monat</dt>
            <dd>{formatEuro(monat)}</dd>
          </>
        )}
        <dt>Nächste Verlängerung</dt>
        <dd>{naechste ? formatDatum(naechste, 'lang') : 'Nicht eingetragen'}</dd>
        <dt>Kündigen bis</dt>
        <dd>{bis ? formatDatum(bis, 'lang') : abo.kuendigungsfristTage === null ? 'Frist nicht eingetragen' : '–'}</dd>
      </dl>
    </Panel>
  )
}
