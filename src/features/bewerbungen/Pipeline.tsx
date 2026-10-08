import { Link } from 'react-router'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { SelectField } from '../../components/ui/Field.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { BEWERBUNG_STATUS, optionen } from '../../domain/labels.ts'
import { bewerbungKennzahlen, bewerbungPipeline, OHNE_ANTWORT_NACH_TAGEN } from '../../domain/selectors/bewerbungen.ts'
import type { Bewerbung } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from './Pipeline.module.css'

/** Kennzahlen über alle Bewerbungen – berechnet, nie geschätzt. */
export function BewerbungKennzahlen() {
  const { data } = useStore()
  const now = useNow()
  const k = bewerbungKennzahlen(data, now)
  const kacheln: Array<{ label: string; wert: string; hinweis?: string; warnung?: boolean }> = [
    { label: 'Laufend', wert: String(k.laufend), hinweis: `von ${k.gesamt} insgesamt` },
    { label: 'Gespräche', wert: String(k.gespraeche), hinweis: k.angebote > 0 ? `davon ${k.angebote} mit Angebot` : undefined },
    { label: 'Antwortquote', wert: k.antwortquote === null ? '–' : `${k.antwortquote} %`, hinweis: 'Gespräch, Angebot oder Absage' },
    { label: 'Ohne Rückmeldung', wert: String(k.ohneAntwort), hinweis: `seit ${OHNE_ANTWORT_NACH_TAGEN}+ Tagen`, warnung: k.ohneAntwort > 0 },
    { label: 'Wiedervorlage fällig', wert: String(k.faelligeWiedervorlagen), warnung: k.faelligeWiedervorlagen > 0 },
    { label: 'Absagen', wert: String(k.absagen) },
  ]
  return (
    <section aria-label="Kennzahlen">
      <dl className={styles.kennzahlen}>
        {kacheln.map((kachel) => (
          <div key={kachel.label} className={`${styles.kachel} ${kachel.warnung ? styles.warnung : ''}`}>
            <dt className={styles.kachelLabel}>{kachel.label}</dt>
            <dd className={`num ${styles.zahl}`}>{kachel.wert}</dd>
            {kachel.hinweis && <dd className={styles.kachelHinweis}>{kachel.hinweis}</dd>}
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Pipeline: eine Spalte je Status; der Status wechselt direkt an der Karte. */
export function BewerbungPipeline() {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const spalten = bewerbungPipeline(data)

  const wechseln = (b: Bewerbung, status: Bewerbung['status']) => {
    dispatch({ type: 'aendern', sammlung: 'bewerbungen', id: b.id, aenderung: { status } })
    zeige(`„${b.stelle}“: ${BEWERBUNG_STATUS[status].label}`)
  }

  return (
    <div className={styles.pipeline}>
      {spalten.map(({ status, bewerbungen }) => (
        <section key={status} className={styles.spalte} aria-labelledby={`spalte-${status}`}>
          <h2 id={`spalte-${status}`} className={styles.spaltenTitel}>
            {BEWERBUNG_STATUS[status].label} <span className={styles.anzahl}>{bewerbungen.length}</span>
          </h2>
          {bewerbungen.length === 0 ? (
            <p className={styles.leer}>Keine</p>
          ) : (
            <ul className={styles.karten}>
              {bewerbungen.map((b) => {
                const firma = data.unternehmen.find((u) => u.id === b.unternehmenId)
                return (
                  <li key={b.id} className={styles.karte}>
                    <Link to={`/bewerbungen/${b.id}`} className={styles.stelle}>
                      {b.stelle}
                    </Link>
                    {firma && <span className={styles.firma}>{firma.name}</span>}
                    {b.wiedervorlageAm && <DueLabel faelligAm={b.wiedervorlageAm} />}
                    <SelectField
                      label={`Status von „${b.stelle}“`}
                      optionalKennzeichnen={false}
                      className={styles.status}
                      value={b.status}
                      onChange={(e) => wechseln(b, e.target.value as Bewerbung['status'])}
                      options={optionen(BEWERBUNG_STATUS)}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
