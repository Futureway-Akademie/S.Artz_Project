import { Link } from 'react-router'
import { Diamond } from '../../components/brand/Diamond.tsx'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { DueLabel } from '../../components/ui/DueLabel.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { formatDatum, formatZeitpunkt } from '../../domain/dates.ts'
import { BEWERBUNG_STATUS, KEIN_STATUS, PROJEKT_STATUS } from '../../domain/labels.ts'
import { bezugInfo } from '../../domain/selectors/bezug.ts'
import {
  kurzesDatum,
  selectAboFristen,
  selectAktuelleProjekte,
  selectBegruessung,
  selectFokus,
  selectLetzteAktivitaeten,
  selectNaechsteSchritte,
  selectSicherungHinweis,
  selectTagesuebersicht,
  selectWoche,
} from '../../domain/selectors/cockpit.ts'
import { selectCrmUebersicht } from '../../domain/selectors/crm.ts'
import { KALENDER_ART } from '../../domain/selectors/kalender.ts'
import { formatEuro } from '../../domain/selectors/leads.ts'
import { werkzeugLink } from '../../domain/selectors/werkzeug.ts'
import { selectWeiterbildung } from '../../domain/selectors/weiterbildung.ts'
import { useToast } from '../../components/ui/toastContext.ts'
import type { Aufgabe } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import { FokusKnopf } from '../aufgaben/FokusKnopf.tsx'
import styles from './CockpitSeite.module.css'

export function CockpitSeite() {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const now = useNow()
  const b = selectBegruessung(data, now)
  const tag = selectTagesuebersicht(data, now)
  const schritte = selectNaechsteSchritte(data)
  const projekte = selectAktuelleProjekte(data)
  const woche = selectWoche(data, now)
  const fokus = selectFokus(data, now)
  const aktivitaeten = selectLetzteAktivitaeten(data)
  const wb = selectWeiterbildung(data, now)
  const crm = selectCrmUebersicht(data, now)
  const sicherung = selectSicherungHinweis(data, now)
  const aboFristen = selectAboFristen(data, now)

  const abhaken = (a: Aufgabe) => {
    dispatch({ type: 'aendern', sammlung: 'aufgaben', id: a.id, aenderung: { erledigt: true } })
    zeige(`„${a.titel}“ erledigt`)
  }

  const kacheln = [
    { label: 'Heute fällig', wert: tag.heuteFaellig },
    { label: 'Überfällig', wert: tag.ueberfaellig, warnung: tag.ueberfaellig > 0 },
    { label: 'Termine heute', wert: tag.termineHeute },
    { label: 'Offene Schritte', wert: tag.offeneSchritte },
  ]

  return (
    <Seite titel="Arbeitscockpit">
      <div className={styles.band}>
        <div>
          <p className={styles.gruss}>
            {b.gruss}
            {b.name && `, ${b.name}`}
          </p>
          <p className={styles.datum}>
            {b.datum}
            {tag.kurstag !== null && wb && ` · Kurstag ${tag.kurstag} von ${wb.arbeitstage.gesamt}`}
          </p>
        </div>
        <Diamond size={36} className={styles.diamant} />
      </div>

      {sicherung.faellig && (
        <div className={styles.sicherung} role="status">
          <span>
            <strong>Sicherung fällig.</strong>{' '}
            {sicherung.tage === null ? 'Du hast noch keine Sicherung erstellt.' : `Die letzte Sicherung ist ${sicherung.tage} Tage alt.`} Ohne
            Sicherung gehen die Daten verloren, wenn der Browser sie löscht.
          </span>
          <Link to="/einstellungen">Jetzt sichern</Link>
        </div>
      )}

      <section aria-label="Tagesübersicht" className={styles.kacheln}>
        {kacheln.map((k) => (
          <Link key={k.label} to="/aufgaben" className={`${styles.kachel} ${k.warnung ? styles.warnung : ''}`}>
            <span className={`num ${styles.zahl}`}>{k.wert}</span>
            <span className={styles.kachelLabel}>{k.label}</span>
          </Link>
        ))}
      </section>

      <Panel titel="Heute im Fokus" aktionen={<Link to="/aufgaben">Aufgaben</Link>}>
        {fokus.fokus.length === 0 ? (
          <div className={styles.fokusLeer}>
            <p>Noch nichts im Fokus. Markiere bei Aufgaben „☆ Fokus“ – oder nimm einen Vorschlag:</p>
            {fokus.vorschlaege.length === 0 ? (
              <p className={styles.art}>Keine überfälligen oder heute fälligen Aufgaben.</p>
            ) : (
              <ul className={styles.liste}>
                {fokus.vorschlaege.map((a) => (
                  <li key={a.id} className={styles.eintrag}>
                    <span className={styles.titel}>{a.titel}</span>
                    <span className={styles.meta}>
                      <DueLabel faelligAm={a.faelligAm} />
                      <FokusKnopf aufgabe={a} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <ul className={styles.liste} aria-label="Aufgaben im Fokus">
            {fokus.fokus.map((a) => {
              const info = bezugInfo(data, a.bezug)
              return (
                <li key={a.id} className={styles.eintrag}>
                  <label className={styles.abhaken}>
                    <input type="checkbox" checked={false} onChange={() => abhaken(a)} />
                    <span className={styles.titel}>{a.titel}</span>
                  </label>
                  <span className={styles.meta}>
                    {info?.link && (
                      <Link to={info.link} className={styles.bezug}>
                        {info.text}
                      </Link>
                    )}
                    <DueLabel faelligAm={a.faelligAm} />
                    <FokusKnopf aufgabe={a} />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <div className={styles.raster}>
        <Panel titel="Nächste Schritte" aktionen={schritte.gesamt > 0 && <Link to="/aufgaben">Alle anzeigen ({schritte.gesamt})</Link>}>
          {schritte.eintraege.length === 0 ? (
            <EmptyState title="Keine offenen Schritte">Lege in einem Projekt den nächsten konkreten Schritt an.</EmptyState>
          ) : (
            <ul className={styles.liste}>
              {schritte.eintraege.map((s) => {
                const info = bezugInfo(data, s.bezug)
                return (
                  <li key={`${s.art}-${s.id}`} className={styles.eintrag}>
                    {s.art === 'aufgabe' ? (
                      <label className={styles.abhaken}>
                        <input type="checkbox" checked={false} onChange={() => abhaken(data.aufgaben.find((a) => a.id === s.id)!)} />
                        <span className={styles.titel}>{s.titel}</span>
                      </label>
                    ) : (
                      <span className={styles.titel}>
                        <span className={styles.art}>Wiedervorlage · </span>
                        {s.titel}
                      </span>
                    )}
                    <span className={styles.meta}>
                      {info?.link && (
                        <Link to={info.link} className={styles.bezug}>
                          {info.text}
                        </Link>
                      )}
                      <DueLabel faelligAm={s.faelligAm} />
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel titel="Diese Woche" aktionen={<Link to="/kalender?ansicht=woche">Kalender</Link>}>
          {woche.every((tag) => tag.eintraege.length === 0) ? (
            <EmptyState title="Nichts in den nächsten 7 Tagen">Termine, Fristen und Wiedervorlagen erscheinen hier.</EmptyState>
          ) : (
            <ol className={styles.woche}>
              {woche.map((tag) => (
                <li key={tag.datum} className={styles.wochentag}>
                  <span className={`label ${styles.wann}`}>{kurzesDatum(tag.datum, now)}</span>
                  {tag.eintraege.length === 0 ? (
                    <span className={styles.art}>frei</span>
                  ) : (
                    <ul className={styles.tagEintraege}>
                      {tag.eintraege.map((e) => (
                        <li key={e.schluessel}>
                          <span className={styles.art}>{KALENDER_ART[e.art]}</span>{' '}
                          {e.uhrzeit && <span className="num">{e.uhrzeit} </span>}
                          {e.link ? <Link to={e.link}>{e.titel}</Link> : e.titel}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {aboFristen.length > 0 && (
          <Panel titel="Abo-Fristen" aktionen={<Link to="/werkzeug/abos">Modelle & Abos</Link>}>
            <ul className={styles.liste}>
              {aboFristen.map((t) => (
                <li key={`${t.werkzeug.id}:${t.datum}`}>
                  <Link to={werkzeugLink(t.werkzeug)}>{t.werkzeug.titel}</Link>: kündigen bis <strong>{kurzesDatum(t.datum, now)}</strong>, sonst Verlängerung am {formatDatum(t.verlaengerung)}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel titel="Aktuelle Projekte" aktionen={<Link to="/projekte">Alle Projekte ({projekte.gesamt})</Link>}>
          {projekte.zeilen.length === 0 ? (
            <EmptyState title="Keine aktuellen Projekte" />
          ) : (
            <ul className={styles.liste}>
              {projekte.zeilen.map(({ projekt, offen, erledigt, naechsterSchritt }) => (
                <li key={projekt.id} className={styles.projekt}>
                  <div className={styles.projektKopf}>
                    <Link to={`/projekte/${projekt.id}`} className={styles.projektTitel}>
                      {projekt.titel}
                    </Link>
                    <Badge tone={projekt.status ? PROJEKT_STATUS[projekt.status].ton : 'neutral'}>
                      {projekt.status ? PROJEKT_STATUS[projekt.status].label : KEIN_STATUS}
                    </Badge>
                  </div>
                  <span className={styles.art}>
                    {naechsterSchritt ? `Nächster Schritt: ${naechsterSchritt.titel}` : 'Kein offener Schritt'} · {offen} offen · {erledigt} erledigt
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titel="Weiterbildung" aktionen={<Link to="/weiterbildung">Details</Link>}>
          {wb ? (
            <div className={styles.wb}>
              <p className="label">{wb.kurs.titel}</p>
              <p>
                {wb.relation === 'vor' && `Beginnt am ${formatDatum(wb.start)} (${wb.arbeitstage.gesamt} Arbeitstage).`}
                {wb.relation === 'laufend' && (
                  <>
                    <span className="num">{wb.arbeitstage.verbleibend}</span> von <span className="num">{wb.arbeitstage.gesamt}</span> Arbeitstagen
                    verbleibend (inkl. heute)
                  </>
                )}
                {wb.relation === 'nach' && 'Abgeschlossen.'}
              </p>
              <p className={styles.art}>
                {wb.fortschritt
                  ? `${wb.fortschritt.erledigt} von ${wb.fortschritt.gesamt} Kursaufgaben erledigt (${wb.fortschritt.prozent} %)`
                  : 'Noch kein Fortschritt – es sind keine Kursaufgaben eingetragen.'}
              </p>
            </div>
          ) : (
            <EmptyState title="Keine Weiterbildung hinterlegt" />
          )}
        </Panel>

        <Panel titel="Kontakte & Bewerbungen">
          {crm.leer ? (
            <EmptyState title="Noch keine Kontakte, Bewerbungen oder Leads">
              Lege Kontakte mit Wiedervorlage oder deine Bewerbungen an – sie erscheinen dann hier.
            </EmptyState>
          ) : (
            <ul className={styles.liste}>
              <li className={styles.eintrag}>
                <Link to="/kontakte?faellig=1" className={styles.titel}>
                  Fällige Wiedervorlagen
                </Link>
                <span className={`num ${crm.faelligeWiedervorlagen > 0 ? styles.dringend : ''}`}>{crm.faelligeWiedervorlagen}</span>
              </li>
              <li className={styles.eintrag}>
                <Link to="/bewerbungen" className={styles.titel}>
                  Laufende Bewerbungen
                </Link>
                <span className={styles.art}>
                  {crm.laufendeBewerbungenGesamt === 0
                    ? 'Keine'
                    : crm.laufendeBewerbungen.map((s) => `${BEWERBUNG_STATUS[s.status].label}: ${s.anzahl}`).join(' · ')}
                </span>
              </li>
              <li className={styles.eintrag}>
                <Link to="/kontakte/leads" className={styles.titel}>
                  Offene Leads
                </Link>
                <span className={styles.art}>
                  <span className="num">{crm.offeneLeads}</span>
                  {crm.offeneLeads > 0 && ` · ${crm.offeneLeadSumme === null ? 'Keine Beträge hinterlegt' : formatEuro(crm.offeneLeadSumme)}`}
                </span>
              </li>
            </ul>
          )}
        </Panel>

        <Panel titel="Letzte Aktivitäten">
          {aktivitaeten.length === 0 ? (
            <EmptyState title="Noch keine Aktivitäten">Sobald du etwas anlegst oder änderst, erscheint es hier.</EmptyState>
          ) : (
            <ul className={styles.liste}>
              {aktivitaeten.map((a) => (
                <li key={a.id} className={styles.eintrag}>
                  <span className={styles.titel}>{a.zusammenfassung}</span>
                  <span className={styles.art}>{formatZeitpunkt(a.zeitpunkt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Seite>
  )
}
