import { createEmptyData } from '../../data/empty.ts'
import type { Lead } from '../types.ts'
import { formatEuro, leadListe, parseEuro, selectLeadSumme } from './leads.ts'

const zeit = '2026-10-01T10:00:00.000Z'
const lead = (id: string, status: Lead['status'], betragEur: number | null): Lead => ({
  id,
  titel: id,
  kontaktId: null,
  unternehmenId: null,
  status,
  betragEur,
  naechsterSchritt: '',
  notiz: '',
  erstelltAm: zeit,
  geaendertAm: zeit,
})

describe('Leads', () => {
  const data = { ...createEmptyData(), leads: [lead('zusage', 'zusage', 900), lead('neu', 'neu', null), lead('angebot', 'angebot', 1500.5)] }

  it('filtert offene Leads und sortiert nach Status', () => {
    expect(leadListe(data, 'alle').map((l) => l.id)).toEqual(['neu', 'angebot', 'zusage'])
    expect(leadListe(data, 'offen').map((l) => l.id)).toEqual(['neu', 'angebot'])
    expect(leadListe(data, 'zusage').map((l) => l.id)).toEqual(['zusage'])
  })

  it('summiert nur Leads mit Betrag und meldet ohne Beträge null statt 0', () => {
    expect(selectLeadSumme(leadListe(data, 'offen'))).toBe(1500.5)
    expect(selectLeadSumme([lead('x', 'neu', null)])).toBeNull()
    expect(selectLeadSumme([])).toBeNull()
  })

  it('formatiert und liest Beträge auf Deutsch', () => {
    expect(formatEuro(null)).toBe('Kein Betrag')
    expect(formatEuro(1500.5).replace(/\s/g, ' ')).toBe('1.500,50 €')
    expect(parseEuro('')).toBeNull()
    expect(parseEuro('1.500,50 €')).toBe(1500.5)
    expect(parseEuro('1500.5')).toBe(1500.5)
    expect(parseEuro('0')).toBe(0)
    expect(parseEuro('abc')).toBeNaN()
  })
})
