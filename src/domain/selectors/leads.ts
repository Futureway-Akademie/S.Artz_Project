import { LEAD_STATUS } from '../labels.ts'
import type { AppData, Lead } from '../types.ts'

export type LeadFilter = 'alle' | 'offen' | Lead['status']

const REIHENFOLGE = Object.keys(LEAD_STATUS) as Array<Lead['status']>

export function leadListe(data: AppData, filter: LeadFilter): Lead[] {
  return data.leads
    .filter((l) => filter === 'alle' || (filter === 'offen' ? LEAD_STATUS[l.status].offen : l.status === filter))
    .sort((a, b) => REIHENFOLGE.indexOf(a.status) - REIHENFOLGE.indexOf(b.status) || b.geaendertAm.localeCompare(a.geaendertAm))
}

/** Summe nur über Leads mit Betrag; ohne Beträge `null` (nie 0 €). */
export function selectLeadSumme(leads: Lead[]): number | null {
  const mitBetrag = leads.filter((l) => l.betragEur !== null)
  return mitBetrag.length === 0 ? null : mitBetrag.reduce((s, l) => s + l.betragEur!, 0)
}

export function formatEuro(betrag: number | null): string {
  return betrag === null ? 'Kein Betrag' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(betrag)
}

/** „1.500,50“, „1500.5“, „1500“ → Zahl; leer → null; ungültig → NaN */
export function parseEuro(text: string): number | null {
  const t = text.trim().replace(/\s|€/g, '')
  if (!t) return null
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  return /^\d+(\.\d{1,2})?$/.test(normal) ? Number(normal) : Number.NaN
}
