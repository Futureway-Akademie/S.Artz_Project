import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { Tabs } from '../../components/ui/Tabs.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { herunterladen } from '../../data/exportImport.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, formatMonat, heute, plusTage } from '../../domain/dates.ts'
import {
  alsIcs,
  istKurstag,
  KALENDER_ART,
  kalenderEintraege,
  monatsRaster,
  monatVerschieben,
  wochenTage,
  type KalenderArt,
  type KalenderEintrag,
} from '../../domain/selectors/kalender.ts'
import { useNow } from '../../hooks/useNow.ts'
import { AufgabeDialog } from '../aufgaben/AufgabeDialog.tsx'
import { TerminDialog } from '../aufgaben/TerminDialog.tsx'
import styles from './KalenderSeite.module.css'

type Ansicht = 'monat' | 'woche' | 'liste'
const ANSICHTEN: Array<{ key: Ansicht; label: string }> = [
  { key: 'monat', label: 'Monat' },
  { key: 'woche', label: 'Woche' },
  { key: 'liste', label: 'Liste' },
]
const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const LISTE_TAGE = 30
const ALLE_ARTEN: KalenderArt[] = ['termin', 'aufgabe', 'wiedervorlage', 'kursaufgabe']

const istDatum = (s: string | null): s is string => s !== null && /^\d{4}-\d{2}-\d{2}$/.test(s)

export function KalenderSeite() {
  const { data } = useStore()
  const { zeige } = useToast()
  const now = useNow()
  const h = heute(now)
  const [params, setParams] = useSearchParams()
  const ansicht: Ansicht = (['monat', 'woche', 'liste'] as const).find((a) => a === params.get('ansicht')) ?? 'monat'
  const datum = istDatum(params.get('datum')) ? params.get('datum')! : h
  const [arten, setArten] = useState<KalenderArt[]>(ALLE_ARTEN)
  const [dialog, setDialog] = useState<{ art: 'termin'; id?: string; datum?: string } | { art: 'aufgabe'; id: string } | null>(null)
  const [exportFragen, setExportFragen] = useState(false)

  const setze = (neu: { ansicht?: Ansicht; datum?: string }) =>
    setParams({ ansicht: neu.ansicht ?? ansicht, datum: neu.datum ?? datum }, { replace: true })

  const tage = ansicht === 'monat' ? monatsRaster(datum.slice(0, 7)) : ansicht === 'woche' ? wochenTage(datum) : Array.from({ length: LISTE_TAGE }, (_, i) => plusTage(datum, i))
  const von = tage[0]!
  const bis = tage[tage.length - 1]!
  const eintraege = kalenderEintraege(data, von, bis).filter((e) => arten.includes(e.art))
  const proTag = new Map<string, KalenderEintrag[]>()
  for (const e of eintraege) proTag.set(e.datum, [...(proTag.get(e.datum) ?? []), e])

  const blaettern = (richtung: -1 | 1) => {
    if (ansicht === 'monat') setze({ datum: `${monatVerschieben(datum.slice(0, 7), richtung)}-01` })
    else setze({ datum: plusTage(datum, richtung * (ansicht === 'woche' ? 7 : LISTE_TAGE)) })
  }

  const zeitraum =
    ansicht === 'monat' ? formatMonat(datum.slice(0, 7)) : `${formatDatum(von)} – ${formatDatum(bis)}`

  const exportieren = () => {
    const alle = kalenderEintraege(data, '0000-01-01', '9999-12-31').filter((e) => e.datum >= plusTage(h, -30))
    herunterladen(alsIcs(alle, new Date()), `pikartz-kalender-${h}.ics`, 'text/calendar;charset=utf-8')
    setExportFragen(false)
    zeige('Kalenderdatei erstellt')
  }

  const eintragOeffnen = (e: KalenderEintrag) => {
    if (e.art === 'termin') setDialog({ art: 'termin', id: e.id })
    else if (e.art === 'aufgabe') setDialog({ art: 'aufgabe', id: e.id })
  }

  const eintrag = (e: KalenderEintrag, kompakt = false) => {
    const bearbeitbar = e.art === 'termin' || e.art === 'aufgabe'
    const titel = `${e.uhrzeit ? `${e.uhrzeit} ` : ''}${e.titel}`
    return (
      <span className={`${styles.eintrag} ${styles[`art_${e.art}`]} ${e.erledigt ? styles.erledigt : ''}`}>
        <span className="visually-hidden">{KALENDER_ART[e.art]}: </span>
        {bearbeitbar ? (
          <button type="button" className={styles.eintragKnopf} onClick={() => eintragOeffnen(e)}>
            {titel}
          </button>
        ) : e.link ? (
          <Link to={e.link} className={styles.eintragKnopf}>
            {titel}
          </Link>
        ) : (
          <span>{titel}</span>
        )}
        {!kompakt && e.zusatz && <span className={styles.zusatz}>{e.zusatz}</span>}
      </span>
    )
  }

  const tagesliste = (tag: string) => {
    const liste = proTag.get(tag) ?? []
    return (
      <section className={styles.tag} aria-labelledby={`tag-${tag}`} key={tag}>
        <div className={styles.tagKopf}>
          <h3 id={`tag-${tag}`} className={`${styles.tagTitel} ${tag === h ? styles.heute : ''}`}>
            {formatDatum(tag, 'lang')}
            {tag === h && ' · heute'}
            {istKurstag(data, tag) && <span className={styles.kurs}> · Kurstag</span>}
          </h3>
          <Button size="sm" variant="ghost" onClick={() => setDialog({ art: 'termin', datum: tag })} aria-label={`Termin am ${formatDatum(tag, 'lang')} anlegen`}>
            + Termin
          </Button>
        </div>
        {liste.length === 0 ? (
          <p className={styles.leer}>Nichts geplant.</p>
        ) : (
          <ul className={styles.tagesListe}>
            {liste.map((e) => (
              <li key={e.schluessel}>
                <span className={styles.artLabel}>{KALENDER_ART[e.art]}</span>
                {eintrag(e)}
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  return (
    <Seite
      titel="Kalender"
      einleitung="Termine, Fristen, Wiedervorlagen und Kursaufgaben an einem Ort."
      aktionen={
        <>
          <Button onClick={() => setDialog({ art: 'termin', datum })}>Termin anlegen</Button>
          <Button variant="secondary" onClick={() => setExportFragen(true)}>
            Als .ics exportieren
          </Button>
        </>
      }
    >
      <Tabs label="Ansicht" tabs={ANSICHTEN} aktiv={ansicht} onWechsel={(a) => setze({ ansicht: a })}>
        <div className={styles.leiste}>
          <div className={styles.blaettern}>
            <Button size="sm" variant="secondary" onClick={() => blaettern(-1)} aria-label="Zurück">
              ‹
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setze({ datum: h })}>
              Heute
            </Button>
            <Button size="sm" variant="secondary" onClick={() => blaettern(1)} aria-label="Weiter">
              ›
            </Button>
            <h2 className={styles.zeitraum} aria-live="polite">
              {zeitraum}
            </h2>
          </div>
          <fieldset className={styles.filter}>
            <legend className="visually-hidden">Anzeigen</legend>
            {ALLE_ARTEN.map((a) => (
              <label key={a} className={`${styles.check} ${styles[`art_${a}`]}`}>
                <input type="checkbox" checked={arten.includes(a)} onChange={(e) => setArten(e.target.checked ? [...arten, a] : arten.filter((x) => x !== a))} />
                {a === 'aufgabe' ? 'Fristen' : a === 'termin' ? 'Termine' : a === 'wiedervorlage' ? 'Wiedervorlagen' : 'Kursaufgaben'}
              </label>
            ))}
          </fieldset>
        </div>

        {ansicht === 'monat' && (
          <>
            <table className={styles.monat}>
              <caption className="visually-hidden">{zeitraum}</caption>
              <thead>
                <tr>
                  {WOCHENTAGE.map((w) => (
                    <th key={w} scope="col">
                      {w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, w) => (
                  <tr key={w}>
                    {tage.slice(w * 7, w * 7 + 7).map((tag) => {
                      const liste = proTag.get(tag) ?? []
                      const fremd = tag.slice(0, 7) !== datum.slice(0, 7)
                      return (
                        <td key={tag} className={`${styles.zelle} ${fremd ? styles.fremd : ''} ${tag === datum ? styles.gewaehlt : ''} ${istKurstag(data, tag) ? styles.kurstag : ''}`}>
                          <button
                            type="button"
                            className={`${styles.tagNummer} ${tag === h ? styles.heute : ''}`}
                            aria-pressed={tag === datum}
                            aria-label={`${formatDatum(tag, 'lang')}${tag === h ? ', heute' : ''}, ${liste.length === 0 ? 'keine Einträge' : liste.length === 1 ? '1 Eintrag' : `${liste.length} Einträge`}`}
                            onClick={() => setze({ datum: tag })}
                          >
                            {Number(tag.slice(8))}
                          </button>
                          {liste.length > 0 && (
                            <>
                              <span className={styles.punkte} aria-hidden="true">
                                {liste.length}
                              </span>
                              <ul className={styles.zellListe}>
                                {liste.slice(0, 3).map((e) => (
                                  <li key={e.schluessel}>
                                    {eintrag(e, true)}
                                  </li>
                                ))}
                                {liste.length > 3 && <li className={styles.mehr}>+{liste.length - 3} weitere</li>}
                              </ul>
                            </>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.auswahl}>{tagesliste(datum)}</div>
          </>
        )}

        {ansicht === 'woche' && <div className={styles.woche}>{tage.map((t) => tagesliste(t))}</div>}

        {ansicht === 'liste' &&
          (eintraege.length === 0 ? (
            <EmptyState title={`Nichts in den nächsten ${LISTE_TAGE} Tagen`}>Termine, Fristen und Wiedervorlagen erscheinen hier.</EmptyState>
          ) : (
            <div className={styles.woche}>{[...proTag.keys()].map((t) => tagesliste(t))}</div>
          ))}
      </Tabs>

      {dialog?.art === 'termin' && (
        <TerminDialog termin={dialog.id ? data.termine.find((t) => t.id === dialog.id) : undefined} vorgabeDatum={dialog.datum} onSchliessen={() => setDialog(null)} />
      )}
      {dialog?.art === 'aufgabe' && <AufgabeDialog aufgabe={data.aufgaben.find((a) => a.id === dialog.id)} onSchliessen={() => setDialog(null)} />}
      {exportFragen && (
        <ConfirmDialog offen titel="Kalender exportieren?" bestaetigenLabel="Datei herunterladen" onAbbrechen={() => setExportFragen(false)} onBestaetigen={exportieren}>
          <p>
            Die .ics-Datei enthält Termine, Fristen und Wiedervorlagen ab 30 Tagen vor heute – auch Namen von Kontakten. Sie ist{' '}
            <strong>nicht verschlüsselt</strong>. Importiere sie nur in deinen eigenen Kalender und lösche sie danach.
          </p>
        </ConfirmDialog>
      )}
    </Seite>
  )
}
