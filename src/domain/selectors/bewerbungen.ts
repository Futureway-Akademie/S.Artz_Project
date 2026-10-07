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
