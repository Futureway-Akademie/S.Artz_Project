import { beispielSeed } from '../../test/beispielStart.ts'
import type { AppData, KursAufgabe } from '../types.ts'
import { kursCodeMuster, naechsterKursCode, selectWeiterbildung } from './weiterbildung.ts'

const seed = beispielSeed(new Date(2026, 9, 7))
const kursId = 'seed-kurs-beispiel'
const zeit = '2026-10-01T10:00:00.000Z'

const aufgabe = (code: string, status: KursAufgabe['status']): KursAufgabe => ({
  id: code,
  kursId,
  code,
  titel: code,
  status,
  faelligAm: null,
  notiz: '',
  erstelltAm: zeit,
  geaendertAm: zeit,
})

describe('Weiterbildung', () => {
  it('berechnet Arbeitstage Mo–Fr aus dem Gerätedatum (03.08.–18.12.2026)', () => {
    // Mittwoch, 07.10.2026
    const w = selectWeiterbildung(seed, new Date(2026, 9, 7, 9, 0))!
    expect(w.start).toBe('2026-08-03')
    expect(w.ende).toBe('2026-12-18')
    expect(w.genaueDaten).toBe(true)
    expect(w.relation).toBe('laufend')
    // Aug 21 + Sep 22 + Okt 22 + Nov 21 + Dez 14 = 100; vor dem 07.10.: Aug 21 + Sep 22 + 4 = 47
    expect(w.arbeitstage).toEqual({ gesamt: 100, vergangen: 47, verbleibend: 53, heuteKurstag: 48 })
  })

  it('kennt Wochenenden, Zeit vor und nach dem Kurs', () => {
    expect(selectWeiterbildung(seed, new Date(2026, 9, 10))!.arbeitstage.heuteKurstag).toBeNull() // Samstag
    const vorher = selectWeiterbildung(seed, new Date(2026, 6, 15))!
    expect(vorher.relation).toBe('vor')
    expect(vorher.arbeitstage).toMatchObject({ vergangen: 0, verbleibend: 100, heuteKurstag: null })
    const nachher = selectWeiterbildung(seed, new Date(2027, 0, 5))!
    expect(nachher.relation).toBe('nach')
    expect(nachher.arbeitstage).toMatchObject({ vergangen: 100, verbleibend: 0 })
  })

  it('leitet den Zeitraum aus den Monaten ab, wenn keine Daten belegt sind', () => {
    const ohneDaten: AppData = { ...seed, kurse: [{ ...seed.kurse[0]!, startDatum: null, endeDatum: null }] }
    const w = selectWeiterbildung(ohneDaten, new Date(2026, 9, 7))!
    expect([w.start, w.ende, w.genaueDaten]).toEqual(['2026-08-01', '2026-12-31', false])
  })

  it('zeigt Fortschritt nur aus eingetragenen Erledigungen', () => {
    expect(selectWeiterbildung(seed, new Date(2026, 9, 7))!.fortschritt).toBeNull()
    const mitAufgaben: AppData = {
      ...seed,
      kursAufgaben: [aufgabe('KURS_2_01', 'erledigt'), aufgabe('KURS_1_10', 'in_arbeit'), aufgabe('KURS_1_02', 'offen')],
    }
    const w = selectWeiterbildung(mitAufgaben, new Date(2026, 9, 7))!
    expect(w.fortschritt).toEqual({ erledigt: 1, gesamt: 3, prozent: 33 })
    expect(w.aufgaben.map((a) => a.code)).toEqual(['KURS_1_02', 'KURS_1_10', 'KURS_2_01'])
  })

  it('prüft und schlägt Codes im Format KURS_X_YY vor', () => {
    const muster = kursCodeMuster('KURS')
    expect(muster.test('KURS_3_07')).toBe(true)
    expect(muster.test('KURS_3_7')).toBe(false)
    expect(muster.test('Kurs_3_07')).toBe(false)
    const kurs = seed.kurse[0]!
    expect(naechsterKursCode(kurs, [])).toBe('KURS_1_01')
    expect(naechsterKursCode(kurs, [aufgabe('KURS_3_07', 'offen')])).toBe('KURS_3_08')
  })

  it('liefert ohne Kurs null', () => {
    expect(selectWeiterbildung({ ...seed, kurse: [] }, new Date())).toBeNull()
  })
})
