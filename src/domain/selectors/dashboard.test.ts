import { beispielSeed } from '../../test/beispielStart.ts'
import type { AppData, Aufgabe } from '../types.ts'
import {
  aktivitaetJeTag,
  aufgabenJeWoche,
  bewerbungsTrichter,
  dashboardKennzahlen,
  kontaktpflegeUebersicht,
  leadsNachStatus,
  projekteNachKategorie,
  projekteNachStatus,
  wissenNachTyp,
} from './dashboard.ts'

const now = new Date(2026, 9, 7, 10, 0) // Mi., 07.10.2026
const m = (tag: string) => ({ erstelltAm: `${tag}T09:00:00.000Z`, geaendertAm: `${tag}T09:00:00.000Z` })

const aufgabe = (id: string, erstellt: string, erledigtAm: string | null, faelligAm: string | null = null): Aufgabe => ({
  id,
  titel: id,
  notiz: '',
  erledigt: erledigtAm !== null,
  fokus: false,
  erledigtAm: erledigtAm ? `${erledigtAm}T12:00:00.000Z` : null,
  faelligAm,
  bezug: { art: 'ohne', id: null },
  ...m(erstellt),
})

function daten(): AppData {
  const seed = beispielSeed(now)
  return {
    ...seed,
    aufgaben: [aufgabe('a', '2026-10-05', null, '2026-10-01'), aufgabe('b', '2026-09-29', '2026-10-06'), aufgabe('c', '2026-07-01', '2026-07-02')],
    bewerbungen: (['geplant', 'beworben', 'im_gespraech', 'angebot', 'absage'] as const).map((status, i) => ({
      id: `b${i}`, stelle: `S${i}`, unternehmenId: null, zielrolleId: null, kontaktId: null, status, quelle: '', beworbenAm: null, link: '', naechsterSchritt: '', notiz: '', wiedervorlageAm: null, ...m('2026-09-01'),
    })),
    leads: [
      { id: 'l1', titel: 'A', kontaktId: null, unternehmenId: null, status: 'angebot', betragEur: 1000, naechsterSchritt: '', notiz: '', projektId: null, wiedervorlageAm: null, ...m('2026-09-01') },
      { id: 'l2', titel: 'B', kontaktId: null, unternehmenId: null, status: 'angebot', betragEur: 500, naechsterSchritt: '', notiz: '', projektId: null, wiedervorlageAm: null, ...m('2026-09-01') },
      { id: 'l3', titel: 'C', kontaktId: null, unternehmenId: null, status: 'neu', betragEur: null, naechsterSchritt: '', notiz: '', projektId: null, wiedervorlageAm: null, ...m('2026-09-01') },
    ],
    aktivitaeten: [
      { id: 'x1', zeitpunkt: '2026-10-06T10:00:00.000Z', art: 'angelegt', bezug: { sammlung: null, id: null, titel: '' }, zusammenfassung: 'x' },
      { id: 'x2', zeitpunkt: '2026-10-06T11:00:00.000Z', art: 'angelegt', bezug: { sammlung: null, id: null, titel: '' }, zusammenfassung: 'x' },
      { id: 'x3', zeitpunkt: '2025-01-01T11:00:00.000Z', art: 'angelegt', bezug: { sammlung: null, id: null, titel: '' }, zusammenfassung: 'x' },
    ],
  }
}

describe('Dashboard-Auswertungen', () => {
  it('zählt Projekte nach Status und Kategorie', () => {
    expect(projekteNachStatus(daten())).toEqual([
      { schluessel: 'idee', label: 'Idee', wert: 1 },
      { schluessel: 'in_arbeit', label: 'In Arbeit', wert: 10 },
      { schluessel: 'abgeschlossen', label: 'Abgeschlossen', wert: 1 },
    ])
    expect(projekteNachKategorie(daten())[0]).toEqual({ schluessel: 'Karriere', label: 'Karriere', wert: 4 })
  })

  it('zählt neue und erledigte Aufgaben je Woche', () => {
    const reihe = aufgabenJeWoche(daten(), now, 3)
    expect(reihe.map((p) => p.start)).toEqual(['2026-09-21', '2026-09-28', '2026-10-05'])
    expect(reihe.map((p) => p.werte)).toEqual([
      { neu: 0, erledigt: 0 },
      { neu: 1, erledigt: 0 },
      { neu: 1, erledigt: 1 },
    ])
    expect(reihe[2]!.label).toBe('05.10.')
  })

  it('bildet den Bewerbungstrichter und die Lead-Summen', () => {
    expect(bewerbungsTrichter(daten()).map((p) => p.wert)).toEqual([5, 4, 2, 1])
    expect(leadsNachStatus(daten())).toEqual([
      { schluessel: 'neu', label: 'Neu', wert: 1, summe: null },
      { schluessel: 'angebot', label: 'Angebot', wert: 2, summe: 1500 },
    ])
  })

  it('zählt Aktivität je Tag nur im Zeitraum und liefert volle Wochen', () => {
    const tage = aktivitaetJeTag(daten(), now, 2)
    expect(tage).toHaveLength(14)
    expect(tage[0]!.datum).toBe('2026-09-28')
    expect(tage.find((t) => t.datum === '2026-10-06')!.anzahl).toBe(2)
    expect(tage.reduce((s, t) => s + t.anzahl, 0)).toBe(2)
  })

  it('berechnet Kennzahlen und liefert leere Auswertungen ohne Daten', () => {
    const k = dashboardKennzahlen(daten(), now)
    expect(k).toMatchObject({ offeneAufgaben: 1, ueberfaellig: 1, laufendeBewerbungen: 4, offeneLeadSumme: 1500, wissen: 0 })
    expect(k.kurs).toMatchObject({ gesamt: 100, vergangen: 47 })
    expect(wissenNachTyp(daten())).toEqual([])
    expect(kontaktpflegeUebersicht(daten(), now)).toEqual([])
  })
})
