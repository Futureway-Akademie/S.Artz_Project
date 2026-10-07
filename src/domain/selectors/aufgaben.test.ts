import { beispielSeed } from '../../test/beispielStart.ts'
import type { AppData, Aufgabe, Termin } from '../types.ts'
import { filtereAufgaben, gruppiereAufgaben, STANDARD_AUFGABEN_FILTER, terminListen } from './aufgaben.ts'
import { bezugAusText, bezugInfo } from './bezug.ts'

const now = new Date(2026, 9, 7, 10, 0) // Mi., 07.10.2026
const zeit = '2026-10-01T10:00:00.000Z'

function aufgabe(id: string, teil: Partial<Aufgabe> = {}): Aufgabe {
  return {
    id,
    titel: id,
    notiz: '',
    erledigt: false,
    erledigtAm: null,
    faelligAm: null,
    bezug: { art: 'ohne', id: null },
    erstelltAm: zeit,
    geaendertAm: zeit,
    ...teil,
  }
}

function termin(id: string, datum: string, uhrzeit: string | null = null): Termin {
  return { id, titel: id, datum, uhrzeit, ort: '', notiz: '', bezug: { art: 'ohne', id: null }, erstelltAm: zeit, geaendertAm: zeit }
}

const data: AppData = {
  ...beispielSeed(now),
  aufgaben: [
    aufgabe('ueber', { faelligAm: '2026-10-05' }),
    aufgabe('heute', { faelligAm: '2026-10-07', notiz: 'Telefonat vorbereiten' }),
    aufgabe('woche', { faelligAm: '2026-10-12', bezug: { art: 'projekt', id: 'seed-projekt-ki-skills' } }),
    aufgabe('spaeter', { faelligAm: '2026-11-30' }),
    aufgabe('ohne', { bezug: { art: 'weiterbildung', id: 'seed-kurs-beispiel' } }),
    aufgabe('fertig', { erledigt: true }),
  ],
  termine: [termin('gestern', '2026-10-06'), termin('morgen-spaet', '2026-10-08', '15:00'), termin('morgen-frueh', '2026-10-08', '09:00')],
}

describe('Aufgaben-Selektoren', () => {
  it('zeigt standardmäßig offene Aufgaben nach Frist, ohne Frist zuletzt', () => {
    expect(filtereAufgaben(data, STANDARD_AUFGABEN_FILTER, now).map((a) => a.id)).toEqual(['ueber', 'heute', 'woche', 'spaeter', 'ohne'])
  })

  it('filtert nach Fristlage, Bezug, Status und Suche', () => {
    const f = (teil: Partial<typeof STANDARD_AUFGABEN_FILTER>) => filtereAufgaben(data, { ...STANDARD_AUFGABEN_FILTER, ...teil }, now).map((a) => a.id)
    expect(f({ frist: 'ueberfaellig' })).toEqual(['ueber'])
    expect(f({ frist: 'heute' })).toEqual(['heute'])
    expect(f({ frist: 'woche' })).toEqual(['heute', 'woche'])
    expect(f({ frist: 'ohne' })).toEqual(['ohne'])
    expect(f({ bezug: 'projekt' })).toEqual(['woche'])
    expect(f({ bezug: 'projekt:seed-projekt-ki-skills' })).toEqual(['woche'])
    expect(f({ bezug: 'weiterbildung' })).toEqual(['ohne'])
    expect(f({ bezug: 'ohne' })).toEqual(['ueber', 'heute', 'spaeter'])
    expect(f({ status: 'erledigt' })).toEqual(['fertig'])
    expect(f({ status: 'alle' })).toHaveLength(6)
    expect(f({ suche: 'telefonat' })).toEqual(['heute'])
  })

  it('gruppiert nach Fristlage', () => {
    const gruppen = gruppiereAufgaben(filtereAufgaben(data, { ...STANDARD_AUFGABEN_FILTER, status: 'alle' }, now), now)
    expect(gruppen.map((g) => [g.titel, g.aufgaben.map((a) => a.id)])).toEqual([
      ['Überfällig', ['ueber']],
      ['Heute fällig', ['heute']],
      ['Nächste 7 Tage', ['woche']],
      ['Später', ['spaeter']],
      ['Ohne Frist', ['ohne']],
      ['Erledigt', ['fertig']],
    ])
  })

  it('trennt anstehende und vergangene Termine', () => {
    const { anstehend, vergangen } = terminListen(data, now)
    expect(anstehend.map((t) => t.id)).toEqual(['morgen-frueh', 'morgen-spaet'])
    expect(vergangen.map((t) => t.id)).toEqual(['gestern'])
  })

  it('beschreibt Bezüge lesbar', () => {
    expect(bezugInfo(data, bezugAusText('projekt:seed-projekt-ki-skills'))).toEqual({
      text: 'KI-Skills',
      link: '/projekte/seed-projekt-ki-skills',
    })
    expect(bezugInfo(data, bezugAusText('projekt:weg'))).toEqual({ text: 'Gelöschtes Projekt', link: null })
    expect(bezugInfo(data, bezugAusText('ohne'))).toBeNull()
  })
})
