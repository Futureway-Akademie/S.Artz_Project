import { useMemo, useState } from 'react'
import { GoogleEintragen } from './GoogleEintragen.tsx'
import { Link, useSearchParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { SelectField, TextField } from '../../components/ui/Field.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { Tabs } from '../../components/ui/Tabs.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum } from '../../domain/dates.ts'
import {
  filtereAufgaben,
  gruppiereAufgaben,
  STANDARD_AUFGABEN_FILTER,
  terminListen,
  type AufgabenFilter,
  type ErledigtFilter,
  type FristFilter,
} from '../../domain/selectors/aufgaben.ts'
import { bezugInfo, bezugOptionen } from '../../domain/selectors/bezug.ts'
import type { Aufgabe, Termin } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import { AufgabeDialog } from './AufgabeDialog.tsx'
import { FokusKnopf } from './FokusKnopf.tsx'
import styles from './AufgabenSeite.module.css'
import { TerminDialog } from './TerminDialog.tsx'

type Ansicht = 'aufgaben' | 'termine'

function BezugLink({ aufgabe }: { aufgabe: Pick<Aufgabe, 'bezug'> }) {
  const { data } = useStore()
  const info = bezugInfo(data, aufgabe.bezug)
  if (!info) return null
  return info.link ? (
    <Link to={info.link} className={styles.bezug}>
      {info.text}
    </Link>
  ) : (
    <span className={styles.bezug}>{info.text}</span>
  )
}

function AufgabenListe({ onBearbeiten }: { onBearbeiten: (a: Aufgabe) => void }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const now = useNow()
  const [filter, setFilter] = useState<AufgabenFilter>(STANDARD_AUFGABEN_FILTER)
  const gefiltert = useMemo(() => filtereAufgaben(data, filter, now), [data, filter, now])
  const gruppen = gruppiereAufgaben(gefiltert, now)
  const istStandard = JSON.stringify(filter) === JSON.stringify(STANDARD_AUFGABEN_FILTER)

  const umschalten = (a: Aufgabe) => {
    dispatch({ type: 'aendern', sammlung: 'aufgaben', id: a.id, aenderung: { erledigt: !a.erledigt } })
    zeige(a.erledigt ? 'Aufgabe wieder geöffnet' : 'Aufgabe erledigt')
  }

  if (data.aufgaben.length === 0) {
    return <EmptyState title="Noch keine Aufgaben">Lege oben eine Aufgabe an, mit oder ohne Frist.</EmptyState>
  }

  return (
    <div className={styles.bereich}>
      <div className={styles.filter} role="search" aria-label="Aufgaben filtern">
        <TextField label="Suche" optionalKennzeichnen={false} type="search" value={filter.suche} onChange={(e) => setFilter({ ...filter, suche: e.target.value })} />
        <SelectField
          label="Status"
          optionalKennzeichnen={false}
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value as ErledigtFilter })}
          options={[
            { value: 'offen', label: 'Offen' },
            { value: 'erledigt', label: 'Erledigt' },
            { value: 'alle', label: 'Alle' },
          ]}
        />
        <SelectField
          label="Frist"
          optionalKennzeichnen={false}
          value={filter.frist}
          onChange={(e) => setFilter({ ...filter, frist: e.target.value as FristFilter })}
          options={[
            { value: 'alle', label: 'Alle' },
            { value: 'ueberfaellig', label: 'Überfällig' },
            { value: 'heute', label: 'Heute' },
            { value: 'woche', label: 'Nächste 7 Tage' },
            { value: 'ohne', label: 'Ohne Frist' },
          ]}
        />
        <SelectField
          label="Bezug"
          optionalKennzeichnen={false}
          value={filter.bezug}
          onChange={(e) => setFilter({ ...filter, bezug: e.target.value })}
          options={[
            { value: 'alle', label: 'Alle' },
            { value: 'ohne', label: 'Ohne Bezug' },
            { value: 'projekt', label: 'Alle Projekte' },
            { value: 'weiterbildung', label: 'Weiterbildung' },
            { value: 'kontakt', label: 'Alle Kontakte' },
            ...bezugOptionen(data, ['projekt', 'kontakt']),
          ]}
        />
      </div>

      <p className={styles.treffer} aria-live="polite">
        <span>
          {gefiltert.length} {gefiltert.length === 1 ? 'Aufgabe' : 'Aufgaben'}
        </span>
        {!istStandard && (
          <>
            {' '}
            ·{' '}
            <button type="button" className={styles.linkKnopf} onClick={() => setFilter(STANDARD_AUFGABEN_FILTER)}>
              Filter zurücksetzen
            </button>
          </>
        )}
      </p>

      {gruppen.length === 0 ? (
        <EmptyState title="Keine Aufgaben passen zu deiner Auswahl" />
      ) : (
        gruppen.map((g) => (
          <section key={g.schluessel} aria-labelledby={`gruppe-${g.schluessel}`} className={styles.gruppe}>
            <h2 id={`gruppe-${g.schluessel}`} className={styles.gruppenTitel}>
              {g.titel} <span className={styles.zahl}>({g.aufgaben.length})</span>
            </h2>
            <ul className={styles.liste}>
              {g.aufgaben.map((a) => (
                <li key={a.id} className={`${styles.eintrag} ${a.erledigt ? styles.erledigt : ''}`}>
                  <label className={styles.check}>
                    <input type="checkbox" checked={a.erledigt} onChange={() => umschalten(a)} />
                    <span className={styles.titel}>{a.titel}</span>
                  </label>
                  <div className={styles.meta}>
                    <BezugLink aufgabe={a} />
                    {!a.erledigt && <DueLabel faelligAm={a.faelligAm} />}
                    {!a.erledigt && <FokusKnopf aufgabe={a} />}
                    <Button size="sm" variant="ghost" onClick={() => onBearbeiten(a)} aria-label={`„${a.titel}“ bearbeiten`}>
                      Bearbeiten
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function TerminListe({ onBearbeiten }: { onBearbeiten: (t: Termin) => void }) {
  const { data } = useStore()
  const now = useNow()
  const { anstehend, vergangen } = terminListen(data, now)

  const zeile = (t: Termin) => (
    <li key={t.id} className={styles.eintrag}>
      <div className={styles.termin}>
        <span className={`label ${styles.datum}`}>
          {formatDatum(t.datum)}
          {t.uhrzeit && `, ${t.uhrzeit} Uhr`}
        </span>
        <span className={styles.titel}>{t.titel}</span>
        {t.ort && <span className={styles.ort}>{t.ort}</span>}
      </div>
      <div className={styles.meta}>
        <BezugLink aufgabe={t} />
        <GoogleEintragen termin={t} />
        <Button size="sm" variant="ghost" onClick={() => onBearbeiten(t)} aria-label={`Termin „${t.titel}“ bearbeiten`}>
          Bearbeiten
        </Button>
      </div>
    </li>
  )

  return (
    <div className={styles.bereich}>
      <section aria-labelledby="termine-anstehend" className={styles.gruppe}>
        <h2 id="termine-anstehend" className={styles.gruppenTitel}>
          Anstehend
        </h2>
        {anstehend.length === 0 ? (
          <EmptyState title="Keine anstehenden Termine">Lege einen Termin mit Datum und optionaler Uhrzeit an.</EmptyState>
        ) : (
          <ul className={styles.liste}>{anstehend.map(zeile)}</ul>
        )}
      </section>
      {vergangen.length > 0 && (
        <details className={styles.vergangen}>
          <summary>Vergangene Termine ({vergangen.length})</summary>
          <ul className={styles.liste}>{vergangen.map(zeile)}</ul>
        </details>
      )}
    </div>
  )
}

export function AufgabenSeite() {
  const { data } = useStore()
  const [params, setParams] = useSearchParams()
  const ansicht: Ansicht = params.get('ansicht') === 'termine' ? 'termine' : 'aufgaben'
  const [aufgabe, setAufgabe] = useState<Aufgabe | 'neu' | null>(null)
  const [termin, setTermin] = useState<Termin | 'neu' | null>(null)

  const offen = data.aufgaben.filter((a) => !a.erledigt).length

  return (
    <Seite
      titel="Aufgaben & Termine"
      einleitung="Alle Aufgaben aus Projekten, Weiterbildung und Kontakten an einem Ort."
      aktionen={
        <>
          <Button onClick={() => setAufgabe('neu')}>Aufgabe anlegen</Button>
          <Button variant="secondary" onClick={() => setTermin('neu')}>
            Termin anlegen
          </Button>
        </>
      }
    >
      <Tabs
        label="Ansicht"
        aktiv={ansicht}
        onWechsel={(k) => setParams(k === 'termine' ? { ansicht: 'termine' } : {}, { replace: true })}
        tabs={[
          { key: 'aufgaben', label: 'Aufgaben', zahl: offen },
          { key: 'termine', label: 'Termine', zahl: data.termine.length },
        ]}
      >
        {ansicht === 'aufgaben' ? <AufgabenListe onBearbeiten={setAufgabe} /> : <TerminListe onBearbeiten={setTermin} />}
      </Tabs>

      {aufgabe && <AufgabeDialog aufgabe={aufgabe === 'neu' ? undefined : aufgabe} onSchliessen={() => setAufgabe(null)} />}
      {termin && <TerminDialog termin={termin === 'neu' ? undefined : termin} onSchliessen={() => setTermin(null)} />}
    </Seite>
  )
}
