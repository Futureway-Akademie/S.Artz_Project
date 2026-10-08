import type { ReactNode } from 'react'
import { NurMit } from '../../components/NurMit.tsx'
import { Link } from 'react-router'
import { Balken, Diagramm, Fortschritt, Heatmap, Kennzahl, Ring, Wochenverlauf } from '../../components/diagramme/Diagramme.tsx'
import { Seite } from '../../components/layout/Seite.tsx'
import { useStore } from '../../data/storeContext.ts'
import {
  aktivitaetJeTag,
  aufgabenJeWoche,
  bewerbungenNachStatusPunkte,
  bewerbungsTrichter,
  dashboardKennzahlen,
  kontaktpflegeUebersicht,
  kontakteNachKontext,
  kursaufgabenNachStatus,
  leadsNachStatus,
  projekteNachKategorie,
  projekteNachStatus,
  werkzeugNachTyp,
  wissenNachTyp,
  type Datenpunkt,
} from '../../domain/selectors/dashboard.ts'
import { aboUebersicht } from '../../domain/selectors/abos.ts'
import { formatEuro } from '../../domain/selectors/leads.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from './DashboardSeite.module.css'

const WOCHEN = 8
const HEATMAP_WOCHEN = 12

/** Hinweis statt leerer Grafik – es werden nie Werte erfunden. */
function Leer({ children }: { children: ReactNode }) {
  return <p className={styles.leer}>{children}</p>
}

const summe = (p: Datenpunkt[]) => p.reduce((s, x) => s + x.wert, 0)
const tabelle = (p: Datenpunkt[]) => p.map((x) => [x.label, x.wert])

/** Grafische Übersicht über alle Bereiche, berechnet aus den eigenen Daten. */
export function DashboardSeite() {
  const { data } = useStore()
  const now = useNow()
  const k = dashboardKennzahlen(data, now)

  const pStatus = projekteNachStatus(data)
  const pKategorie = projekteNachKategorie(data)
  const woche = aufgabenJeWoche(data, now, WOCHEN)
  const trichter = bewerbungsTrichter(data)
  const bStatus = bewerbungenNachStatusPunkte(data)
  const leads = leadsNachStatus(data)
  const kontext = kontakteNachKontext(data)
  const pflege = kontaktpflegeUebersicht(data, now)
  const wissen = wissenNachTyp(data)
  const kurs = kursaufgabenNachStatus(data)
  const werkzeug = werkzeugNachTyp(data)
  const abos = aboUebersicht(data)
  const aktivitaet = aktivitaetJeTag(data, now, HEATMAP_WOCHEN)
  const aktivitaetSumme = aktivitaet.reduce((s, t) => s + t.anzahl, 0)
  const aktiveTage = aktivitaet.filter((t) => t.anzahl > 0).length
  const neuSumme = woche.reduce((s, p) => s + (p.werte.neu ?? 0), 0)
  const erledigtSumme = woche.reduce((s, p) => s + (p.werte.erledigt ?? 0), 0)

  return (
    <Seite titel="Dashboard" einleitung="Alles auf einen Blick – berechnet aus deinen Daten, nichts geschätzt. Jede Grafik lässt sich als Tabelle anzeigen.">
      <section aria-label="Kennzahlen" className={styles.kennzahlen}>
        <NurMit bereich="aufgaben">
        <Link to="/aufgaben" className={styles.kachelLink}>
          <Kennzahl label="Offene Aufgaben" wert={String(k.offeneAufgaben)} hinweis={k.ueberfaellig ? `${k.ueberfaellig} überfällig` : 'nichts überfällig'} warnung={k.ueberfaellig > 0} />
        </Link>
        </NurMit>
        <NurMit bereich="kalender">
        <Link to="/kalender?ansicht=woche" className={styles.kachelLink}>
          <Kennzahl label="Termine (7 Tage)" wert={String(k.termineWoche)} />
        </Link>
        </NurMit>
        <NurMit bereich="projekte">
        <Link to="/projekte" className={styles.kachelLink}>
          <Kennzahl label="Projekte in Arbeit" wert={String(k.projekteAktiv)} hinweis={`von ${data.projekte.length}`} />
        </Link>
        </NurMit>
        <NurMit bereich="bewerbungen">
        <Link to="/bewerbungen?ansicht=pipeline" className={styles.kachelLink}>
          <Kennzahl label="Laufende Bewerbungen" wert={String(k.laufendeBewerbungen)} />
        </Link>
        </NurMit>
        <NurMit bereich="kontakte">
        <Link to="/kontakte" className={styles.kachelLink}>
          <Kennzahl label="Kontakte" wert={String(k.kontakte)} />
        </Link>
        </NurMit>
        <NurMit bereich="kontakte">
        <Link to="/kontakte/leads" className={styles.kachelLink}>
          <Kennzahl label="Offene Leads" wert={k.offeneLeadSumme === null ? '–' : formatEuro(k.offeneLeadSumme)} hinweis="Summe der Beträge" />
        </Link>
        </NurMit>
        <NurMit bereich="wissen">
        <Link to="/wissen" className={styles.kachelLink}>
          <Kennzahl label="Wissenseinträge" wert={String(k.wissen)} />
        </Link>
        </NurMit>
        <NurMit bereich="werkzeug">
        <Link to="/werkzeug/abos" className={styles.kachelLink}>
          <Kennzahl label="KI-Abos pro Monat" wert={abos.anzahl ? formatEuro(abos.summe) : '–'} hinweis={abos.anzahl ? `${abos.anzahl} laufend${abos.ohneBetrag ? `, ${abos.ohneBetrag} ohne Betrag` : ''}` : 'keine Abos erfasst'} />
        </Link>
        </NurMit>
        <NurMit bereich="weiterbildung">
        <Link to="/weiterbildung" className={styles.kachelLink}>
          <Kennzahl label="Weiterbildung" wert={k.kurs ? `${k.kurs.prozent} %` : '–'} hinweis={k.kurs ? `${k.kurs.vergangen} von ${k.kurs.gesamt} Kurstagen` : 'kein Kurs'} />
        </Link>
        </NurMit>
      </section>

      <h2 className={styles.abschnitt}>Auswertungen</h2>
      <div className={styles.raster}>
        <NurMit bereich="aufgaben">
        <Diagramm
          titel={`Aufgaben je Woche (${WOCHEN} Wochen)`}
          zusammenfassung={`${neuSumme} neu angelegt, ${erledigtSumme} erledigt.`}
          kopfzeilen={['Woche ab', 'Neu', 'Erledigt']}
          zeilen={woche.map((p) => [p.label, p.werte.neu ?? 0, p.werte.erledigt ?? 0])}
          aktion={<Link to="/aufgaben">Aufgaben</Link>}
        >
          <Wochenverlauf
            reihe={woche}
            serien={[
              { schluessel: 'neu', label: 'Neu' },
              { schluessel: 'erledigt', label: 'Erledigt' },
            ]}
          />
        </Diagramm>
        </NurMit>

        <Diagramm
          titel={`Aktivität (${HEATMAP_WOCHEN} Wochen)`}
          zusammenfassung={`${aktivitaetSumme} Änderungen an ${aktiveTage} Tagen.`}
          kopfzeilen={['Tag', 'Änderungen']}
          zeilen={aktivitaet.filter((t) => t.anzahl > 0).map((t) => [t.datum, t.anzahl])}
        >
          {aktivitaetSumme === 0 ? <Leer>Noch keine Aktivität im Zeitraum.</Leer> : <Heatmap tage={aktivitaet} />}
        </Diagramm>

        <NurMit bereich="projekte">
        <Diagramm titel="Projekte nach Status" zusammenfassung={`${data.projekte.length} Projekte.`} kopfzeilen={['Status', 'Projekte']} zeilen={tabelle(pStatus)} aktion={<Link to="/projekte">Projekte</Link>}>
          {pStatus.length === 0 ? <Leer>Noch keine Projekte.</Leer> : <Ring punkte={pStatus} einheit="Projekte" />}
        </Diagramm>
        </NurMit>

        <NurMit bereich="projekte">
        <Diagramm titel="Projekte nach Kategorie" zusammenfassung={`${pKategorie.length} Kategorien.`} kopfzeilen={['Kategorie', 'Projekte']} zeilen={tabelle(pKategorie)}>
          {pKategorie.length === 0 ? <Leer>Noch keine Projekte.</Leer> : <Balken punkte={pKategorie} farbe="var(--color-blue)" />}
        </Diagramm>
        </NurMit>

        <NurMit bereich="bewerbungen">
        <Diagramm
          titel="Bewerbungen: Trichter"
          zusammenfassung={trichter[0]!.wert ? `Von ${trichter[0]!.wert} Bewerbungen haben ${trichter[2]!.wert} ein Gespräch erreicht.` : 'Noch keine Bewerbungen.'}
          kopfzeilen={['Stufe', 'Bewerbungen']}
          zeilen={tabelle(trichter)}
          aktion={<Link to="/bewerbungen?ansicht=pipeline">Pipeline</Link>}
        >
          {trichter[0]!.wert === 0 ? <Leer>Noch keine Bewerbungen.</Leer> : <Balken punkte={trichter} farbe="var(--color-blue)" />}
        </Diagramm>
        </NurMit>

        <NurMit bereich="bewerbungen">
        <Diagramm titel="Bewerbungen nach Status" zusammenfassung={`${data.bewerbungen.length} Bewerbungen.`} kopfzeilen={['Status', 'Bewerbungen']} zeilen={tabelle(bStatus)}>
          {bStatus.length === 0 ? <Leer>Noch keine Bewerbungen.</Leer> : <Ring punkte={bStatus} einheit="Bewerbungen" />}
        </Diagramm>
        </NurMit>

        <NurMit bereich="kontakte">
        <Diagramm
          titel="Leads nach Status"
          zusammenfassung={`${data.leads.length} Leads.`}
          kopfzeilen={['Status', 'Leads', 'Summe']}
          zeilen={leads.map((l) => [l.label, l.wert, l.summe === null ? '–' : formatEuro(l.summe)])}
          aktion={<Link to="/kontakte/leads">Leads</Link>}
        >
          {leads.length === 0 ? (
            <Leer>Noch keine Leads.</Leer>
          ) : (
            <Balken punkte={leads.map((l) => ({ ...l, label: l.summe === null ? l.label : `${l.label} (${formatEuro(l.summe)})` }))} />
          )}
        </Diagramm>
        </NurMit>

        <NurMit bereich="kontakte">
        <Diagramm titel="Kontakte nach Kontext" zusammenfassung={`${summe(kontext)} Kontakte.`} kopfzeilen={['Kontext', 'Kontakte']} zeilen={tabelle(kontext)} aktion={<Link to="/kontakte">Kontakte</Link>}>
          {kontext.length === 0 ? <Leer>Noch keine Kontakte.</Leer> : <Ring punkte={kontext} einheit="Kontakte" />}
        </Diagramm>
        </NurMit>

        <NurMit bereich="kontakte">
        <Diagramm titel="Kontaktpflege" zusammenfassung="Letzter Verlaufseintrag je Kontakt." kopfzeilen={['Stand', 'Kontakte']} zeilen={tabelle(pflege)} aktion={<Link to="/kontakte">Kontakte</Link>}>
          {pflege.length === 0 ? <Leer>Noch keine Kontakte.</Leer> : <Balken punkte={pflege} />}
        </Diagramm>
        </NurMit>

        <NurMit bereich="weiterbildung">
        <Diagramm
          titel="Weiterbildung"
          zusammenfassung={k.kurs ? `${k.kurs.vergangen} von ${k.kurs.gesamt} Kurstagen vergangen.` : 'Kein Kurs hinterlegt.'}
          kopfzeilen={['Kursaufgaben', 'Anzahl']}
          zeilen={tabelle(kurs)}
          aktion={<Link to="/weiterbildung">Weiterbildung</Link>}
        >
          {k.kurs ? (
            <div className={styles.stapel}>
              <Fortschritt wert={k.kurs.vergangen} gesamt={k.kurs.gesamt} label="Kurstage vergangen" />
              {kurs.length > 0 ? <Balken punkte={kurs} /> : <Leer>Noch keine Kursaufgaben eingetragen.</Leer>}
            </div>
          ) : (
            <Leer>Kein Kurs hinterlegt.</Leer>
          )}
        </Diagramm>
        </NurMit>

        <NurMit bereich="wissen">
        <Diagramm titel="Wissen nach Art" zusammenfassung={`${data.wissen.length} Einträge.`} kopfzeilen={['Art', 'Einträge']} zeilen={tabelle(wissen)} aktion={<Link to="/wissen">Wissen</Link>}>
          {wissen.length === 0 ? <Leer>Noch kein Wissen festgehalten.</Leer> : <Balken punkte={wissen} />}
        </Diagramm>
        </NurMit>

        <NurMit bereich="werkzeug">
        <Diagramm titel="Werkzeugkasten" zusammenfassung={`${summe(werkzeug)} Werkzeuge in Gebrauch oder geplant.`} kopfzeilen={['Bereich', 'Einträge']} zeilen={tabelle(werkzeug)} aktion={<Link to="/werkzeug">Werkzeugkasten</Link>}>
          {werkzeug.length === 0 ? <Leer>Noch keine Werkzeuge erfasst.</Leer> : <Balken punkte={werkzeug} />}
        </Diagramm>
        </NurMit>

        <NurMit bereich="werkzeug">
        <Diagramm
          titel="KI-Abos: Kosten pro Monat"
          zusammenfassung={abos.anzahl ? `${formatEuro(abos.summe)} pro Monat aus ${abos.anzahl} laufenden Abos.` : 'Keine laufenden Abos.'}
          kopfzeilen={['Abo', 'Pro Monat']}
          zeilen={abos.jeAbo.map((a) => [a.titel, formatEuro(a.monat)])}
          aktion={<Link to="/werkzeug/abos">Abos</Link>}
        >
          {abos.jeAbo.length === 0 ? (
            <Leer>Noch keine Abos mit Betrag erfasst.</Leer>
          ) : (
            <Balken punkte={abos.jeAbo.map((a) => ({ schluessel: a.id, label: a.titel, wert: a.monat }))} format={formatEuro} farbe="var(--color-blue)" />
          )}
        </Diagramm>
        </NurMit>
      </div>
    </Seite>
  )
}
