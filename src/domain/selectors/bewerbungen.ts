import { heute, plusTage } from '../dates.ts'
import { BEWERBUNG_STATUS } from '../labels.ts'
import type { AppData, Bewerbung, Zielrolle } from '../types.ts'

export type BewerbungFilter = 'laufend' | 'alle' | Bewerbung['status']

const REIHENFOLGE = Object.keys(BEWERBUNG_STATUS) as Array<Bewerbung['status']>

export interface BewerbungsFilter {
  status: BewerbungFilter
  zielrolleId: string
  suche: string
}

export const STANDARD_BEWERBUNGS_FILTER: BewerbungsFilter = { status: 'laufend', zielrolleId: '', suche: '' }

export function bewerbungListe(data: AppData, filter: BewerbungsFilter): Bewerbung[] {
  const s = filter.suche.trim().toLowerCase()
  const firma = (id: string | null) => data.unternehmen.find((u) => u.id === id)?.name ?? ''
  return data.bewerbungen
    .filter((b) => filter.status === 'alle' || (filter.status === 'laufend' ? BEWERBUNG_STATUS[b.status].laufend : b.status === filter.status))
    .filter((b) => !filter.zielrolleId || b.zielrolleId === filter.zielrolleId)
    .filter((b) => !s || `${b.stelle} ${firma(b.unternehmenId)} ${b.quelle} ${b.notiz}`.toLowerCase().includes(s))
    .sort((a, b) => REIHENFOLGE.indexOf(a.status) - REIHENFOLGE.indexOf(b.status) || (b.beworbenAm ?? '').localeCompare(a.beworbenAm ?? ''))
}

/** Anzahl je Status in Pipeline-Reihenfolge; Status ohne Bewerbung entfallen. */
export function bewerbungenNachStatus(bewerbungen: Bewerbung[]): Array<{ status: Bewerbung['status']; anzahl: number }> {
  return REIHENFOLGE.map((status) => ({ status, anzahl: bewerbungen.filter((b) => b.status === status).length })).filter((s) => s.anzahl > 0)
}

export function zielrollenZeilen(data: AppData): Array<{ zielrolle: Zielrolle; bewerbungen: number; laufend: number }> {
  return data.zielrollen.map((zielrolle) => {
    const zugeordnet = data.bewerbungen.filter((b) => b.zielrolleId === zielrolle.id)
    return { zielrolle, bewerbungen: zugeordnet.length, laufend: zugeordnet.filter((b) => BEWERBUNG_STATUS[b.status].laufend).length }
  })
}

/** Nach so vielen Tagen ohne Antwort gilt eine Bewerbung als „ohne Rückmeldung“. */
export const OHNE_ANTWORT_NACH_TAGEN = 14

export interface BewerbungKennzahlen {
  gesamt: number
  laufend: number
  /** Im Gespräch oder mit Angebot */
  gespraeche: number
  angebote: number
  absagen: number
  /** Anteil der versendeten Bewerbungen mit Rückmeldung (Gespräch, Angebot oder Absage); `null` ohne versendete */
  antwortquote: number | null
  /** Beworben, seit mindestens 14 Tagen ohne Statuswechsel */
  ohneAntwort: number
  /** Wiedervorlage heute oder überfällig */
  faelligeWiedervorlagen: number
}

export function bewerbungKennzahlen(data: AppData, now: Date): BewerbungKennzahlen {
  const b = data.bewerbungen
  const h = heute(now)
  const versendet = b.filter((x) => x.status !== 'geplant')
  const antworten = b.filter((x) => x.status === 'im_gespraech' || x.status === 'angebot' || x.status === 'absage')
  const grenze = plusTage(h, -OHNE_ANTWORT_NACH_TAGEN)
  return {
    gesamt: b.length,
    laufend: b.filter((x) => BEWERBUNG_STATUS[x.status].laufend).length,
    gespraeche: b.filter((x) => x.status === 'im_gespraech' || x.status === 'angebot').length,
    angebote: b.filter((x) => x.status === 'angebot').length,
    absagen: b.filter((x) => x.status === 'absage').length,
    antwortquote: versendet.length === 0 ? null : Math.round((antworten.length / versendet.length) * 100),
    ohneAntwort: b.filter((x) => x.status === 'beworben' && (x.beworbenAm ?? x.geaendertAm.slice(0, 10)) <= grenze).length,
    faelligeWiedervorlagen: b.filter((x) => BEWERBUNG_STATUS[x.status].laufend && x.wiedervorlageAm !== null && x.wiedervorlageAm <= h).length,
  }
}

/** Spalten der Pipeline in fester Reihenfolge, je Spalte nach Wiedervorlage (fällige zuerst) und Stelle sortiert. */
export function bewerbungPipeline(data: AppData): Array<{ status: Bewerbung['status']; bewerbungen: Bewerbung[] }> {
  return REIHENFOLGE.map((status) => ({
    status,
    bewerbungen: data.bewerbungen
      .filter((b) => b.status === status)
      .sort((a, b) => (a.wiedervorlageAm ?? '9999').localeCompare(b.wiedervorlageAm ?? '9999') || a.stelle.localeCompare(b.stelle, 'de')),
  }))
}
