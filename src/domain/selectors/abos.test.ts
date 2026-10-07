import { leeresWerkzeug } from './werkzeug.ts'
import { aboTermine, aboUebersicht, kuendigenBis, monatsKosten, naechsteVerlaengerung, plusMonate, verlaengerungen } from './abos.ts'
import { kalenderEintraege } from './kalender.ts'
import { selectAboFristen } from './cockpit.ts'
import { createEmptyData } from '../../data/empty.ts'
import type { AppData, Werkzeug } from '../types.ts'

const zeit = '2026-10-01T10:00:00.000Z'
const abo = (id: string, a: Partial<NonNullable<Werkzeug['abo']>>, extra: Partial<Werkzeug> = {}): Werkzeug => {
  const basis = leeresWerkzeug('abo')
  return { ...basis, id, titel: id, erstelltAm: zeit, geaendertAm: zeit, abo: { ...basis.abo!, ...a }, ...extra }
}

function daten(): AppData {
  return {
    ...createEmptyData(),
    werkzeug: [
      abo('Claude Pro', { kostenEur: 21.42, intervall: 'monatlich', naechsteVerlaengerung: '2026-09-15', kuendigungsfristTage: 3 }),
      abo('Lovable', { kostenEur: 240, intervall: 'jaehrlich', naechsteVerlaengerung: '2027-01-31', kuendigungsfristTage: 30 }),
      abo('Ohne Betrag', { kostenEur: null }),
      abo('Gekündigt', { kostenEur: 99 }, { status: 'archiviert' }),
      abo('Kostenlos', { intervall: 'kostenlos' }),
    ],
  }
}

describe('Modelle und Abos', () => {
  it('rechnet Kosten pro Monat und summiert nur laufende Abos mit Betrag', () => {
    expect(monatsKosten({ kostenEur: 240, intervall: 'jaehrlich', naechsteVerlaengerung: null, kuendigungsfristTage: null })).toBe(20)
    const u = aboUebersicht(daten())
    expect(u).toMatchObject({ summe: 41.42, anzahl: 4, ohneBetrag: 1 })
    expect(u.jeAbo.map((a) => a.titel)).toEqual(['Claude Pro', 'Lovable', 'Kostenlos'])
  })

  it('schreibt Verlängerungen fort und begrenzt auf das Monatsende', () => {
    expect(plusMonate('2026-01-31', 1)).toBe('2026-02-28')
    expect(plusMonate('2026-11-30', 3)).toBe('2027-02-28')
    const claude = daten().werkzeug[0]!.abo!
    expect(verlaengerungen(claude, '2026-10-01', '2026-12-31')).toEqual(['2026-10-15', '2026-11-15', '2026-12-15'])
    expect(naechsteVerlaengerung(claude, '2026-10-07')).toBe('2026-10-15')
    expect(kuendigenBis('2026-10-15', claude)).toBe('2026-10-12')
  })

  it('liefert Kündigungsfristen für Kalender und Cockpit', () => {
    const d = daten()
    expect(aboTermine(d, '2026-10-01', '2026-10-31').map((t) => `${t.art}:${t.werkzeug.titel}:${t.datum}`)).toEqual([
      'kuendigung:Claude Pro:2026-10-12',
      'verlaengerung:Claude Pro:2026-10-15',
    ])
    // Jährlich: letzter Kündigungstag 30 Tage vor der Verlängerung am 31.01.
    expect(aboTermine(d, '2027-01-01', '2027-01-05').map((t) => `${t.art}:${t.werkzeug.titel}:${t.datum}`)).toEqual(['kuendigung:Lovable:2027-01-01'])
    const kalender = kalenderEintraege(d, '2026-10-12', '2026-10-12')
    expect(kalender).toEqual([expect.objectContaining({ art: 'abo', titel: 'Letzter Kündigungstag: Claude Pro', zusatz: expect.stringMatching(/^21,42\s€ pro Monat$/), link: '/werkzeug/abos/Claude Pro' })])
    expect(selectAboFristen(d, new Date(2026, 9, 7, 9)).map((t) => t.datum)).toEqual(['2026-10-12'])
  })
})
