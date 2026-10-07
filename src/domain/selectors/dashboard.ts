/**
 * Auswertungen für das Dashboard – alles berechnet aus den gespeicherten Daten, nichts geschätzt.
 */
import { heute, isoWochentag, plusTage } from '../dates.ts'
import { BEWERBUNG_STATUS, KONTEXT, LEAD_STATUS, PROJEKT_STATUS, KURSAUFGABE_STATUS } from '../labels.ts'
import type { AppData } from '../types.ts'
import { kontaktpflege } from './beziehung.ts'
import { selectWeiterbildung } from './weiterbildung.ts'
import { WISSEN_TYP } from './wissen.ts'

/** Ein Wert in einem Diagramm */
export interface Datenpunkt {
  schluessel: string
  label: string
  wert: number
}

/** Zeitreihe mit mehreren Werten je Zeitpunkt (z. B. neu und erledigt je Woche) */
export interface Reihenpunkt {
  label: string
  /** Montag der Woche (ISO-Datum) */
  start: string
  werte: Record<string, number>
}

const ohneLeere = (punkte: Datenpunkt[]) => punkte.filter((p) => p.wert > 0)

export function projekteNachStatus(data: AppData): Datenpunkt[] {
  const punkte: Datenpunkt[] = (Object.keys(PROJEKT_STATUS) as Array<keyof typeof PROJEKT_STATUS>).map((s) => ({
    schluessel: s,
    label: PROJEKT_STATUS[s].label,
    wert: data.projekte.filter((p) => p.status === s).length,
  }))
  punkte.push({ schluessel: 'ohne', label: 'Ohne Status', wert: data.projekte.filter((p) => p.status === null).length })
  return ohneLeere(punkte)
}

export function projekteNachKategorie(data: AppData, max = 8): Datenpunkt[] {
  const zaehler = new Map<string, number>()
  for (const p of data.projekte) {
    const k = p.kategorie.trim() || 'Ohne Kategorie'
    zaehler.set(k, (zaehler.get(k) ?? 0) + 1)
  }
  return [...zaehler.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
    .slice(0, max)
    .map(([label, wert]) => ({ schluessel: label, label, wert }))
}

/** Montag der Woche eines Datums */
function wochenstart(datum: string): string {
  return plusTage(datum, 1 - isoWochentag(datum))
}

function wochenLabel(start: string): string {
  const [, m, t] = start.split('-')
  return `${t}.${m}.`
}

/** Aufgaben je Woche: neu angelegt und erledigt, die letzten `wochen` Wochen bis heute */
export function aufgabenJeWoche(data: AppData, now: Date, wochen = 8): Reihenpunkt[] {
  const aktuelleWoche = wochenstart(heute(now))
  const starts = Array.from({ length: wochen }, (_, i) => plusTage(aktuelleWoche, -7 * (wochen - 1 - i)))
  const index = new Map(starts.map((s, i) => [s, i]))
  const reihe: Reihenpunkt[] = starts.map((start) => ({ label: wochenLabel(start), start, werte: { neu: 0, erledigt: 0 } }))
  for (const a of data.aufgaben) {
    const neu = index.get(wochenstart(a.erstelltAm.slice(0, 10)))
    if (neu !== undefined) reihe[neu]!.werte.neu!++
    if (a.erledigtAm) {
      const fertig = index.get(wochenstart(a.erledigtAm.slice(0, 10)))
      if (fertig !== undefined) reihe[fertig]!.werte.erledigt!++
    }
  }
  return reihe
}

/** Bewerbungs-Trichter: wie viele Bewerbungen mindestens diese Stufe erreicht haben */
export function bewerbungsTrichter(data: AppData): Datenpunkt[] {
  const stufe: Record<string, number> = { geplant: 0, beworben: 1, im_gespraech: 2, angebot: 3, absage: 1, zurueckgezogen: 1 }
  const b = data.bewerbungen
  const gespraechOderMehr = (x: (typeof b)[number]) => (stufe[x.status] ?? 0) >= 2
  return [
    { schluessel: 'alle', label: 'Erfasst', wert: b.length },
    { schluessel: 'beworben', label: 'Beworben', wert: b.filter((x) => x.status !== 'geplant').length },
    { schluessel: 'gespraech', label: 'Gespräch', wert: b.filter(gespraechOderMehr).length },
    { schluessel: 'angebot', label: 'Angebot', wert: b.filter((x) => x.status === 'angebot').length },
  ]
}

export function bewerbungenNachStatusPunkte(data: AppData): Datenpunkt[] {
  return ohneLeere(
    (Object.keys(BEWERBUNG_STATUS) as Array<keyof typeof BEWERBUNG_STATUS>).map((s) => ({
      schluessel: s,
      label: BEWERBUNG_STATUS[s].label,
      wert: data.bewerbungen.filter((x) => x.status === s).length,
    })),
  )
}

/** Leads je Status mit Anzahl und Summe der hinterlegten Beträge */
export function leadsNachStatus(data: AppData): Array<Datenpunkt & { summe: number | null }> {
  return (Object.keys(LEAD_STATUS) as Array<keyof typeof LEAD_STATUS>)
    .map((s) => {
      const leads = data.leads.filter((l) => l.status === s)
      const betraege = leads.map((l) => l.betragEur).filter((x): x is number => x !== null)
      return { schluessel: s, label: LEAD_STATUS[s].label, wert: leads.length, summe: betraege.length ? betraege.reduce((a, c) => a + c, 0) : null }
    })
    .filter((p) => p.wert > 0)
}

export function kontakteNachKontext(data: AppData): Datenpunkt[] {
  return ohneLeere(
    (Object.keys(KONTEXT) as Array<keyof typeof KONTEXT>).map((k) => ({ schluessel: k, label: KONTEXT[k], wert: data.kontakte.filter((x) => x.kontext === k).length })),
  )
}

export function kontaktpflegeUebersicht(data: AppData, now: Date): Datenpunkt[] {
  let aktiv = 0
  let funkstille = 0
  let ohneVerlauf = 0
  for (const k of data.kontakte) {
    const p = kontaktpflege(data, k, now)
    if (!p.letzter) ohneVerlauf++
    else if (p.funkstille) funkstille++
    else aktiv++
  }
  return ohneLeere([
    { schluessel: 'aktiv', label: 'Kontakt in den letzten 60 Tagen', wert: aktiv },
    { schluessel: 'funkstille', label: 'Funkstille', wert: funkstille },
    { schluessel: 'ohne', label: 'Noch kein Verlauf', wert: ohneVerlauf },
  ])
}

export function wissenNachTyp(data: AppData): Datenpunkt[] {
  return ohneLeere(
    (Object.keys(WISSEN_TYP) as Array<keyof typeof WISSEN_TYP>).map((t) => ({ schluessel: t, label: WISSEN_TYP[t].mehrzahl, wert: data.wissen.filter((w) => w.typ === t).length })),
  )
}

export function kursaufgabenNachStatus(data: AppData): Datenpunkt[] {
  return ohneLeere(
    (Object.keys(KURSAUFGABE_STATUS) as Array<keyof typeof KURSAUFGABE_STATUS>).map((s) => ({
      schluessel: s,
      label: KURSAUFGABE_STATUS[s].label,
      wert: data.kursAufgaben.filter((k) => k.status === s).length,
    })),
  )
}

/** Aktivitäten je Tag der letzten `wochen` Wochen (Montag bis Sonntag), für die Heatmap */
export function aktivitaetJeTag(data: AppData, now: Date, wochen = 12): Array<{ datum: string; anzahl: number }> {
  const ende = plusTage(wochenstart(heute(now)), 6)
  const start = plusTage(wochenstart(heute(now)), -7 * (wochen - 1))
  const zaehler = new Map<string, number>()
  for (const a of data.aktivitaeten) {
    const tag = a.zeitpunkt.slice(0, 10)
    if (tag >= start && tag <= ende) zaehler.set(tag, (zaehler.get(tag) ?? 0) + 1)
  }
  return Array.from({ length: wochen * 7 }, (_, i) => {
    const datum = plusTage(start, i)
    return { datum, anzahl: zaehler.get(datum) ?? 0 }
  })
}

export interface DashboardKennzahlen {
  offeneAufgaben: number
  ueberfaellig: number
  termineWoche: number
  projekteAktiv: number
  kontakte: number
  laufendeBewerbungen: number
  offeneLeadSumme: number | null
  wissen: number
  kurs: { vergangen: number; gesamt: number; prozent: number } | null
}

export function dashboardKennzahlen(data: AppData, now: Date): DashboardKennzahlen {
  const h = heute(now)
  const offen = data.aufgaben.filter((a) => !a.erledigt)
  const offeneLeads = data.leads.filter((l) => LEAD_STATUS[l.status].offen)
  const betraege = offeneLeads.map((l) => l.betragEur).filter((x): x is number => x !== null)
  const wb = selectWeiterbildung(data, now)
  return {
    offeneAufgaben: offen.length,
    ueberfaellig: offen.filter((a) => a.faelligAm !== null && a.faelligAm < h).length,
    termineWoche: data.termine.filter((t) => t.datum >= h && t.datum <= plusTage(h, 6)).length,
    projekteAktiv: data.projekte.filter((p) => p.status === 'in_arbeit').length,
    kontakte: data.kontakte.length,
    laufendeBewerbungen: data.bewerbungen.filter((b) => BEWERBUNG_STATUS[b.status].laufend).length,
    offeneLeadSumme: betraege.length ? betraege.reduce((a, c) => a + c, 0) : null,
    wissen: data.wissen.length,
    kurs: wb
      ? {
          vergangen: wb.arbeitstage.vergangen,
          gesamt: wb.arbeitstage.gesamt,
          prozent: wb.arbeitstage.gesamt ? Math.round((wb.arbeitstage.vergangen / wb.arbeitstage.gesamt) * 100) : 0,
        }
      : null,
  }
}
