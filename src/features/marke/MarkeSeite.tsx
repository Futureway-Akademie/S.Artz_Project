import { useState } from 'react'
import { Diamond } from '../../components/brand/Diamond.tsx'
import { Logo } from '../../components/brand/Logo.tsx'
import { Wordmark } from '../../components/brand/Wordmark.tsx'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import type { Deck, Designregel } from '../../domain/types.ts'
import { DeckDialog } from './DeckDialog.tsx'
import styles from './MarkeSeite.module.css'
import { RegelDialog } from './RegelDialog.tsx'

const FARBEN = [
  { name: 'Blau', hex: '#2F5CFF', hinweis: 'Akzente, „.AI“, Bedienelemente', dunkel: false },
  { name: 'Dunkel', hex: '#0A0A0B', hinweis: 'Text, dunkle Bereiche', dunkel: true },
  { name: 'Grau', hex: '#4E525C', hinweis: 'Sekundärtext auf hellen Flächen', dunkel: true },
]

export function MarkeSeite() {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [regel, setRegel] = useState<Designregel | 'neu' | null>(null)
  const [deck, setDeck] = useState<Deck | 'neu' | null>(null)

  const regeln = [...data.designregeln].sort((a, b) => a.reihenfolge - b.reihenfolge)

  /** Vertauscht die Reihenfolge zweier benachbarter Regeln. */
  const verschieben = (index: number, richtung: -1 | 1) => {
    const a = regeln[index]
    const b = regeln[index + richtung]
    if (!a || !b) return
    dispatch({ type: 'aendern', sammlung: 'designregeln', id: a.id, aenderung: { reihenfolge: b.reihenfolge } })
    dispatch({ type: 'aendern', sammlung: 'designregeln', id: b.id, aenderung: { reihenfolge: a.reihenfolge } })
    zeige(`„${a.titel}“ verschoben`)
  }

  return (
    <Seite titel="PIKARTZ.AI" einleitung="Marke, Designregeln und Präsentations-System.">
      <div className={styles.band}>
        <Wordmark tone="dark" size="lg" />
        <Diamond size={32} className={styles.diamant} />
      </div>

      <Panel titel="Marke">
        <div className={styles.markenRaster}>
          <figure className={styles.figur}>
            <div className={styles.hell}>
              <Logo variant="bildmarke" height={120} alt="PIKARTZ Bildmarke" />
            </div>
            <figcaption>Bildmarke (Originaldatei, nur auf hellen Flächen)</figcaption>
          </figure>
          <figure className={styles.figur}>
            <div className={styles.hell}>
              <Logo variant="wortmarke" height={40} alt="PIKARTZ Wortmarke" />
            </div>
            <figcaption>Wortmarke „PIKARTZ“ (Originaldatei)</figcaption>
          </figure>
          <figure className={styles.figur}>
            <div className={styles.dunkel}>
              <Wordmark tone="dark" size="lg" />
            </div>
            <figcaption>Wortmarke „PIKARTZ.AI“ als Text, „.AI“ in Blau</figcaption>
          </figure>
        </div>

        <h3 className={styles.unter}>Farben</h3>
        <ul className={styles.farben}>
          {FARBEN.map((f) => (
            <li key={f.hex} className={styles.farbe}>
              <span className={styles.feld} style={{ background: f.hex }} aria-hidden="true" />
              <span>
                <span className="label">{f.name}</span> <code>{f.hex}</code>
                <br />
                <span className={styles.hinweis}>{f.hinweis}</span>
              </span>
            </li>
          ))}
        </ul>

        <h3 className={styles.unter}>Schrift</h3>
        <p className={styles.schriftBold}>Liberation Sans Bold – Überschriften, Zahlen, Labels</p>
        <p>Liberation Sans Regular – Fließtext</p>
      </Panel>

      <Panel
        titel="Designregeln"
        aktionen={
          <Button size="sm" onClick={() => setRegel('neu')}>
            Regel hinzufügen
          </Button>
        }
      >
        {regeln.length === 0 ? (
          <EmptyState title="Noch keine Designregeln hinterlegt" />
        ) : (
          <ol className={styles.regeln}>
            {regeln.map((r, index) => (
              <li key={r.id} className={styles.regel}>
                <div className={styles.regelText}>
                  <span className="label">{r.titel}</span>
                  {r.beschreibung ? <span>{r.beschreibung}</span> : <span className={styles.hinweis}>Keine Beschreibung</span>}
                </div>
                <div className={styles.regelAktionen}>
                  <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => verschieben(index, -1)} aria-label={`„${r.titel}“ nach oben`}>
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={index === regeln.length - 1}
                    onClick={() => verschieben(index, 1)}
                    aria-label={`„${r.titel}“ nach unten`}
                  >
                    ↓
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRegel(r)} aria-label={`„${r.titel}“ bearbeiten`}>
                    Bearbeiten
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel
        titel="Präsentations-System"
        aktionen={
          <Button size="sm" variant="secondary" onClick={() => setDeck('neu')}>
            Präsentation hinzufügen
          </Button>
        }
      >
        <p>
          Präsentationen von PIKARTZ.AI folgen den Designregeln oben: Wortmarke, die drei Markenfarben, Liberation Sans, ruhige
          Flächen mit gezielten blauen Akzenten. Die Tages-Präsentationen der Weiterbildung entstehen mit dem PIKARTZ.AI-HTML-Template.
        </p>
        {data.decks.length === 0 ? (
          <EmptyState title="Noch keine Präsentation hinterlegt" />
        ) : (
          <ul className={styles.decks}>
            {data.decks.map((d) => (
              <li key={d.id} className={styles.deck}>
                <div>
                  <span className="label">{d.titel}</span>
                  <p className={styles.hinweis}>
                    {[d.modul !== null && `Modul ${d.modul}`, d.tag !== null && `Tag ${d.tag}`].filter(Boolean).join(' · ') || 'Ohne Modul/Tag'}
                  </p>
                  <p className={d.beschreibung ? undefined : styles.hinweis}>{d.beschreibung || 'Inhalt noch nicht hinterlegt.'}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setDeck(d)} aria-label={`„${d.titel}“ bearbeiten`}>
                  Bearbeiten
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {regel && <RegelDialog regel={regel === 'neu' ? undefined : regel} onSchliessen={() => setRegel(null)} />}
      {deck && <DeckDialog deck={deck === 'neu' ? undefined : deck} onSchliessen={() => setDeck(null)} />}
    </Seite>
  )
}
