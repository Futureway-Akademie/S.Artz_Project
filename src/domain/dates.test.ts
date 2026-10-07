import {
  countWorkdays,
  fristStatus,
  formatDatum,
  isWorkday,
  monatsGrenzen,
  nachFrist,
  nextWorkday,
  parseDatum,
  relativeDueLabel,
  tageZwischen,
  toDatum,
} from './dates.ts'

// Mittwoch, 7. Oktober 2026, 10:00 Uhr Ortszeit
const now = new Date(2026, 9, 7, 10, 0)

describe('Datum parsen und formatieren', () => {
  it('liest YYYY-MM-DD lokal und schreibt es zurück', () => {
    expect(toDatum(parseDatum('2026-10-07'))).toBe('2026-10-07')
    expect(parseDatum('2026-10-07').getHours()).toBe(0)
  })

  it('formatiert auf Deutsch', () => {
    expect(formatDatum('2026-10-07')).toBe('Mi., 07.10.2026')
    expect(formatDatum('2026-10-07', 'lang')).toBe('Mittwoch, 7. Oktober 2026')
  })

  it('zählt Tage über die Zeitumstellung korrekt', () => {
    expect(tageZwischen('2026-10-24', '2026-10-26')).toBe(2)
    expect(tageZwischen('2026-03-28', '2026-03-30')).toBe(2)
  })
})

describe('Arbeitstage Mo–Fr', () => {
  it('erkennt Wochenenden', () => {
    expect(isWorkday('2026-10-09')).toBe(true) // Freitag
    expect(isWorkday('2026-10-10')).toBe(false) // Samstag
    expect(isWorkday('2026-10-11')).toBe(false) // Sonntag
  })

  it('zählt Arbeitstage einschließlich der Grenzen', () => {
    expect(countWorkdays('2026-10-05', '2026-10-11')).toBe(5)
    expect(countWorkdays('2026-08-01', '2026-08-31')).toBe(21)
    expect(countWorkdays('2026-10-11', '2026-10-05')).toBe(0)
  })

  it('findet den nächsten Arbeitstag', () => {
    expect(nextWorkday('2026-10-09')).toBe('2026-10-12')
  })

  it('kennt Monatsgrenzen', () => {
    expect(monatsGrenzen('2026-12')).toEqual({ erster: '2026-12-01', letzter: '2026-12-31' })
    expect(monatsGrenzen('2026-02')).toEqual({ erster: '2026-02-01', letzter: '2026-02-28' })
  })
})

describe('Fristen', () => {
  it('beschreibt Fristen relativ zum Gerätedatum', () => {
    expect(relativeDueLabel(null, now)).toBe('Noch keine Frist hinterlegt')
    expect(relativeDueLabel('2026-10-04', now)).toBe('Überfällig seit 3 Tagen')
    expect(relativeDueLabel('2026-10-06', now)).toBe('Überfällig seit gestern')
    expect(relativeDueLabel('2026-10-07', now)).toBe('Heute fällig')
    expect(relativeDueLabel('2026-10-08', now)).toBe('Morgen fällig')
    expect(relativeDueLabel('2026-10-10', now)).toBe('Fällig in 3 Tagen')
    expect(relativeDueLabel('2026-11-02', now)).toBe('Fällig am Mo., 02.11.2026')
  })

  it('ordnet Fristen einem Status zu', () => {
    expect(fristStatus(null, now)).toBe('ohne')
    expect(fristStatus('2026-10-01', now)).toBe('ueberfaellig')
    expect(fristStatus('2026-10-07', now)).toBe('heute')
    expect(fristStatus('2026-10-12', now)).toBe('bald')
    expect(fristStatus('2026-12-01', now)).toBe('spaeter')
  })

  it('sortiert nach Frist, ohne Frist zuletzt', () => {
    const liste = [{ faelligAm: null }, { faelligAm: '2026-10-09' }, { faelligAm: '2026-10-01' }]
    expect(liste.sort(nachFrist).map((e) => e.faelligAm)).toEqual(['2026-10-01', '2026-10-09', null])
  })
})
