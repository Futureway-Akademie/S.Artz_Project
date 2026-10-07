import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import type { Datenpunkt, Reihenpunkt } from '../../domain/selectors/dashboard.ts'
import styles from './Diagramme.module.css'
import { DIAGRAMM_FARBEN } from './farben.ts'


const zahl = (n: number) => n.toLocaleString('de-DE')

interface RahmenProps {
  titel: string
  /** Kurze Beschreibung für Screenreader und unter dem Titel */
  zusammenfassung: string
  kopfzeilen: string[]
  zeilen: Array<Array<string | number>>
  children: ReactNode
  aktion?: ReactNode
}

/** Gemeinsamer Rahmen: Titel, Diagramm, Legende/Werte und umschaltbare Tabellenansicht. */
export function Diagramm({ titel, zusammenfassung, kopfzeilen, zeilen, children, aktion }: RahmenProps) {
  const [tabelle, setTabelle] = useState(false)
  const id = useId()
  return (
    <figure className={styles.diagramm} aria-labelledby={`${id}-titel`}>
      <div className={styles.kopf}>
        <h3 id={`${id}-titel`} className={styles.titel}>
          {titel}
        </h3>
        <span className={styles.aktionen}>
          {aktion}
          <button type="button" className={styles.umschalten} aria-pressed={tabelle} onClick={() => setTabelle(!tabelle)}>
            {tabelle ? 'Grafik' : 'Tabelle'}
          </button>
        </span>
      </div>
      <figcaption className={styles.zusammenfassung}>{zusammenfassung}</figcaption>
      {tabelle ? (
        <table className={styles.tabelle}>
          <caption className="visually-hidden">{titel}</caption>
          <thead>
            <tr>
              {kopfzeilen.map((k) => (
                <th key={k} scope="col">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z, i) => (
              <tr key={i}>
                {z.map((zelle, j) =>
                  j === 0 ? (
                    <th key={j} scope="row">
                      {zelle}
                    </th>
                  ) : (
                    <td key={j} className="num">
                      {typeof zelle === 'number' ? zahl(zelle) : zelle}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        children
      )}
    </figure>
  )
}

/** Waagerechte Balken mit Beschriftung und Wert – gut lesbar auch auf schmalen Bildschirmen. */
export function Balken({ punkte, format = zahl, farbe }: { punkte: Datenpunkt[]; format?: (n: number) => string; farbe?: string }) {
  const max = Math.max(1, ...punkte.map((p) => p.wert))
  return (
    <ul className={styles.balkenListe}>
      {punkte.map((p, i) => (
        <li key={p.schluessel} className={styles.balkenZeile}>
          <span className={styles.balkenLabel}>{p.label}</span>
          <span className={styles.balkenSpur} aria-hidden="true">
            <span className={styles.balken} style={{ width: `${(p.wert / max) * 100}%`, background: farbe ?? DIAGRAMM_FARBEN[i % DIAGRAMM_FARBEN.length] }} />
          </span>
          <span className={`num ${styles.balkenWert}`}>{format(p.wert)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Ringdiagramm mit Summe in der Mitte und Legende mit Werten und Anteilen. */
export function Ring({ punkte, einheit }: { punkte: Datenpunkt[]; einheit: string }) {
  const summe = punkte.reduce((s, p) => s + p.wert, 0)
  const r = 15.915 // Umfang 100
  // Start oben (Versatz 25), jedes Segment beginnt dort, wo das vorige endet
  const segmente = punkte.map((p, i) => {
    const vorher = punkte.slice(0, i).reduce((s, q) => s + q.wert, 0)
    return { p, i, anteil: summe ? (p.wert / summe) * 100 : 0, versatz: 25 - (summe ? (vorher / summe) * 100 : 0) }
  })
  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 42 42" className={styles.ringSvg} aria-hidden="true">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--color-surface)" strokeWidth="6" />
        {summe > 0 &&
          segmente.map(({ p, i, anteil, versatz }) => (
            <circle
              key={p.schluessel}
              cx="21"
              cy="21"
              r={r}
              fill="none"
              stroke={DIAGRAMM_FARBEN[i % DIAGRAMM_FARBEN.length]}
              strokeWidth="6"
              strokeDasharray={`${anteil} ${100 - anteil}`}
              strokeDashoffset={versatz}
            />
          ))}
        <text x="21" y="21" textAnchor="middle" dominantBaseline="central" className={styles.ringSumme}>
          {zahl(summe)}
        </text>
        <text x="21" y="27.5" textAnchor="middle" className={styles.ringEinheit}>
          {einheit}
        </text>
      </svg>
      <ul className={styles.legende}>
        {punkte.map((p, i) => (
          <li key={p.schluessel}>
            <span className={styles.farbe} style={{ background: DIAGRAMM_FARBEN[i % DIAGRAMM_FARBEN.length] }} aria-hidden="true" />
            <span className={styles.legendeLabel}>{p.label}</span>
            <span className="num">
              {zahl(p.wert)} <span className={styles.anteil}>({summe ? Math.round((p.wert / summe) * 100) : 0} %)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Gruppierte Säulen je Woche (z. B. neu und erledigt). */
export function Wochenverlauf({ reihe, serien }: { reihe: Reihenpunkt[]; serien: Array<{ schluessel: string; label: string }> }) {
  const max = Math.max(1, ...reihe.flatMap((p) => serien.map((s) => p.werte[s.schluessel] ?? 0)))
  const hoehe = 100
  const breiteJe = 100 / reihe.length
  const saeule = (breiteJe * 0.7) / serien.length
  const raster = [0, 0.5, 1].map((f) => Math.round(max * f))
  return (
    <div className={styles.verlauf}>
      <svg viewBox={`-8 -4 ${108} ${hoehe + 16}`} className={styles.verlaufSvg} aria-hidden="true" preserveAspectRatio="none">
        {raster.map((w) => (
          <g key={w}>
            <line x1="0" x2="100" y1={hoehe - (w / max) * hoehe} y2={hoehe - (w / max) * hoehe} stroke="var(--color-border)" strokeWidth="0.3" />
            <text x="-1.5" y={hoehe - (w / max) * hoehe} textAnchor="end" dominantBaseline="central" className={styles.achse}>
              {w}
            </text>
          </g>
        ))}
        {reihe.map((p, i) => (
          <g key={p.start}>
            {serien.map((s, j) => {
              const wert = p.werte[s.schluessel] ?? 0
              const h = (wert / max) * hoehe
              return <rect key={s.schluessel} x={i * breiteJe + breiteJe * 0.15 + j * saeule} y={hoehe - h} width={saeule * 0.9} height={h} fill={DIAGRAMM_FARBEN[j]} rx="0.6" />
            })}
            <text x={i * breiteJe + breiteJe / 2} y={hoehe + 8} textAnchor="middle" className={styles.achse}>
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <ul className={styles.legendeZeile}>
        {serien.map((s, j) => (
          <li key={s.schluessel}>
            <span className={styles.farbe} style={{ background: DIAGRAMM_FARBEN[j] }} aria-hidden="true" />
            {s.label}: <span className="num">{zahl(reihe.reduce((sum, p) => sum + (p.werte[s.schluessel] ?? 0), 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Fortschrittsbalken mit Prozent und Beschriftung */
export function Fortschritt({ wert, gesamt, label }: { wert: number; gesamt: number; label: string }) {
  const prozent = gesamt ? Math.round((wert / gesamt) * 100) : 0
  return (
    <div className={styles.fortschritt}>
      <div className={styles.fortschrittKopf}>
        <span>{label}</span>
        <span className="num">
          {zahl(wert)} von {zahl(gesamt)} ({prozent} %)
        </span>
      </div>
      <div className={styles.fortschrittSpur} role="progressbar" aria-valuemin={0} aria-valuemax={gesamt} aria-valuenow={wert} aria-label={label}>
        <span className={styles.fortschrittBalken} style={{ width: `${prozent}%` }} />
      </div>
    </div>
  )
}

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

/** Aktivität je Tag: Spalten = Wochen, Zeilen = Wochentage; je dunkler, desto mehr. */
export function Heatmap({ tage }: { tage: Array<{ datum: string; anzahl: number }> }) {
  const max = Math.max(1, ...tage.map((t) => t.anzahl))
  const wochen = Math.ceil(tage.length / 7)
  const stufe = (n: number) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  const farben = ['var(--color-surface)', '#b9c8ff', '#7f9bff', 'var(--color-blue)', 'var(--color-blue-strong)']
  return (
    <div className={styles.heatmap}>
      <svg viewBox={`0 0 ${wochen * 12 + 14} ${7 * 12}`} className={styles.heatmapSvg} aria-hidden="true">
        {WOCHENTAGE.map((w, i) =>
          i % 2 === 0 ? (
            <text key={w} x="0" y={i * 12 + 8} className={styles.achse}>
              {w}
            </text>
          ) : null,
        )}
        {tage.map((t, i) => (
          <rect key={t.datum} x={14 + Math.floor(i / 7) * 12} y={(i % 7) * 12} width="10" height="10" rx="2" fill={farben[stufe(t.anzahl)]} stroke="var(--color-border)" strokeWidth="0.5">
            <title>{`${t.datum}: ${t.anzahl}`}</title>
          </rect>
        ))}
      </svg>
      <p className={styles.heatmapLegende} aria-hidden="true">
        weniger
        {farben.map((f) => (
          <span key={f} className={styles.farbe} style={{ background: f }} />
        ))}
        mehr
      </p>
    </div>
  )
}

/** Kennzahl-Kachel */
export function Kennzahl({ label, wert, hinweis, warnung }: { label: string; wert: string; hinweis?: string; warnung?: boolean }) {
  return (
    <div className={`${styles.kennzahl} ${warnung ? styles.warnung : ''}`}>
      <span className={`num ${styles.kennzahlWert}`}>{wert}</span>
      <span className={styles.kennzahlLabel}>{label}</span>
      {hinweis && <span className={styles.kennzahlHinweis}>{hinweis}</span>}
    </div>
  )
}
