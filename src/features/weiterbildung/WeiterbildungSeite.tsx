import { useState } from 'react'
import { Link } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, formatMonat } from '../../domain/dates.ts'
import { KURSAUFGABE_STATUS } from '../../domain/labels.ts'
import { naechsterKursCode, selectWeiterbildung } from '../../domain/selectors/weiterbildung.ts'
import type { KursAufgabe } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import { Lerntagebuch } from '../wissen/Lerntagebuch.tsx'
import { KursAufgabeDialog } from './KursAufgabeDialog.tsx'
import { KursDialog } from './KursDialog.tsx'
import styles from './WeiterbildungSeite.module.css'

const RELATION = {
  vor: { label: 'Noch nicht begonnen', ton: 'neutral' },
  laufend: { label: 'Läuft', ton: 'blue' },
  nach: { label: 'Abgeschlossen', ton: 'success' },
} as const

export function WeiterbildungSeite() {
  const { data } = useStore()
  const now = useNow()
  const [kursBearbeiten, setKursBearbeiten] = useState(false)
  const [aufgabe, setAufgabe] = useState<KursAufgabe | 'neu' | null>(null)
  const w = selectWeiterbildung(data, now)

  if (!w) {
    return (
      <Seite titel="Weiterbildung">
        <EmptyState title="Keine Weiterbildung hinterlegt" />
      </Seite>
    )
  }

  const { kurs, arbeitstage: t, fortschritt } = w
  const zeitraum = w.genaueDaten
    ? `${formatDatum(w.start)} – ${formatDatum(w.ende)}`
    : `${formatMonat(kurs.startMonat)} – ${formatMonat(kurs.endeMonat)}`
  const weiterbildungsAufgaben = data.aufgaben.filter((a) => a.bezug.art === 'weiterbildung' && !a.erledigt).length

  return (
    <Seite
      titel="Weiterbildung"
      einleitung={
        <span className={styles.einleitung}>
          {kurs.titel} <Badge tone={RELATION[w.relation].ton}>{RELATION[w.relation].label}</Badge>
        </span>
      }
      aktionen={
        <Button variant="secondary" onClick={() => setKursBearbeiten(true)}>
          Kurs bearbeiten
        </Button>
      }
    >
      <div className={styles.kacheln}>
        <div className={styles.kachel}>
          <span className={styles.kachelLabel}>Heute</span>
          <span className={`num ${styles.kachelZahl}`}>
            {t.heuteKurstag !== null ? `Kurstag ${t.heuteKurstag}` : w.relation === 'laufend' ? 'Kein Kurstag' : '–'}
          </span>
          <span className={styles.kachelText}>von {t.gesamt} Arbeitstagen</span>
        </div>
        <div className={styles.kachel}>
          <span className={styles.kachelLabel}>Vergangen</span>
          <span className={`num ${styles.kachelZahl}`}>{t.vergangen}</span>
          <span className={styles.kachelText}>Arbeitstage</span>
        </div>
        <div className={styles.kachel}>
          <span className={styles.kachelLabel}>Verbleibend</span>
          <span className={`num ${styles.kachelZahl}`}>{t.verbleibend}</span>
          <span className={styles.kachelText}>Arbeitstage inkl. heute</span>
        </div>
      </div>
      <p className={styles.hinweis}>Arbeitstage Mo–Fr nach dem Datum dieses Geräts, ohne Feiertage.</p>

      <div className={styles.raster}>
        <Panel titel="Kurs">
          <dl className={styles.daten}>
            <dt>Anbieter</dt>
            <dd>{kurs.anbieter || 'Nicht hinterlegt'}</dd>
            {kurs.beschreibung && (
              <>
                <dt>Form</dt>
                <dd>{kurs.beschreibung}</dd>
              </>
            )}
            <dt>Zeitraum</dt>
            <dd>{zeitraum}</dd>
            <dt>Unterricht</dt>
            <dd>{kurs.unterrichtszeit || 'Nicht hinterlegt'}</dd>
            <dt>Umfang</dt>
            <dd>{kurs.umfang || 'Nicht hinterlegt'}</dd>
          </dl>
          {kurs.module.length > 0 && (
            <>
              <h3 className={styles.unter}>Module</h3>
              <ul className={styles.liste}>
                {kurs.module.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel titel="Fortschritt">
          {fortschritt ? (
            <div className={styles.fortschritt}>
              <div
                className={styles.balken}
                role="progressbar"
                aria-label="Erledigte Kursaufgaben"
                aria-valuemin={0}
                aria-valuemax={fortschritt.gesamt}
                aria-valuenow={fortschritt.erledigt}
                aria-valuetext={`${fortschritt.erledigt} von ${fortschritt.gesamt} erledigt`}
              >
                <span style={{ width: `${fortschritt.prozent}%` }} />
              </div>
              <p>
                <span className="num">{fortschritt.erledigt}</span> von <span className="num">{fortschritt.gesamt}</span> Kursaufgaben erledigt (
                <span className="num">{fortschritt.prozent} %</span>)
              </p>
            </div>
          ) : (
            <EmptyState title="Noch kein Fortschritt">
              Der Fortschritt ergibt sich aus erledigten Kursaufgaben. Es sind noch keine eingetragen.
            </EmptyState>
          )}
          {weiterbildungsAufgaben > 0 && (
            <p className={styles.hinweis}>
              Außerdem {weiterbildungsAufgaben} offene {weiterbildungsAufgaben === 1 ? 'Aufgabe' : 'Aufgaben'} mit Weiterbildungsbezug unter{' '}
              <Link to="/aufgaben">Aufgaben & Termine</Link>.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        titel="Kursaufgaben"
        aktionen={
          <Button size="sm" onClick={() => setAufgabe('neu')}>
            Kursaufgabe anlegen
          </Button>
        }
      >
        {w.aufgaben.length === 0 ? (
          <EmptyState title="Noch keine Kursaufgaben">Lege Aufgaben mit Code im Format {kurs.codePraefix}_X_YY an, z. B. {kurs.codePraefix}_1_01.</EmptyState>
        ) : (
          <ul className={styles.aufgaben}>
            {w.aufgaben.map((a) => (
              <li key={a.id} className={styles.aufgabe}>
                <span className={`label ${styles.code}`}>{a.code}</span>
                <span className={styles.titel}>{a.titel}</span>
                <span className={styles.meta}>
                  <Badge tone={KURSAUFGABE_STATUS[a.status].ton}>{KURSAUFGABE_STATUS[a.status].label}</Badge>
                  {a.status !== 'erledigt' && a.faelligAm && <DueLabel faelligAm={a.faelligAm} />}
                  <Button size="sm" variant="ghost" onClick={() => setAufgabe(a)} aria-label={`${a.code} bearbeiten`}>
                    Bearbeiten
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Lerntagebuch kursId={kurs.id} kurstag={t.heuteKurstag} />

      {kursBearbeiten && <KursDialog kurs={kurs} onSchliessen={() => setKursBearbeiten(false)} />}
      {aufgabe && (
        <KursAufgabeDialog
          kurs={kurs}
          aufgabe={aufgabe === 'neu' ? undefined : aufgabe}
          codeVorschlag={naechsterKursCode(kurs, w.aufgaben)}
          onSchliessen={() => setAufgabe(null)}
        />
      )}
    </Seite>
  )
}
