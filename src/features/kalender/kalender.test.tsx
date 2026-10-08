import { act, fireEvent, screen, within } from '@testing-library/react'
import { alsIcs, istKurstag, kalenderEintraege, monatsRaster, wochenTage } from '../../domain/selectors/kalender.ts'
import type { AppData } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }
const now = new Date(2026, 9, 7, 9, 0) // Mi., 07.10.2026

function daten(): AppData {
  const seed = beispielSeed(now)
  return {
    ...seed,
    termine: [
      { id: 't1', titel: 'Coaching, Teil 1', datum: '2026-10-07', uhrzeit: '14:30', ort: 'Online', notiz: '', bezug: { art: 'ohne', id: null }, ...m },
      { id: 't2', titel: 'Messe', datum: '2026-10-20', uhrzeit: null, ort: 'Köln', notiz: '', bezug: { art: 'ohne', id: null }, ...m },
    ],
    aufgaben: [
      { id: 'a1', titel: 'Angebot senden', notiz: '', erledigt: false, fokus: false, erledigtAm: null, faelligAm: '2026-10-07', bezug: { art: 'ohne', id: null }, ...m },
      { id: 'a2', titel: 'Erledigt', notiz: '', erledigt: true, fokus: false, erledigtAm: zeit, faelligAm: '2026-10-07', bezug: { art: 'ohne', id: null }, ...m },
    ],
    bewerbungen: [
      { id: 'b1', stelle: 'Analyst', unternehmenId: null, zielrolleId: null, kontaktId: null, status: 'beworben', quelle: '', beworbenAm: null, link: '', naechsterSchritt: 'Nachfassen', notiz: '', wiedervorlageAm: '2026-10-09', ...m },
    ],
    leads: [{ id: 'l1', titel: 'Workshop', kontaktId: null, unternehmenId: null, status: 'neu', betragEur: null, naechsterSchritt: '', notiz: '', projektId: null, wiedervorlageAm: '2026-10-08', ...m }],
  }
}

describe('Kalender-Selektoren', () => {
  it('sammelt Termine, Fristen und Wiedervorlagen ohne Erledigtes, sortiert nach Tag und Uhrzeit', () => {
    const e = kalenderEintraege(daten(), '2026-10-05', '2026-10-11')
    expect(e.map((x) => [x.datum, x.art, x.titel])).toEqual([
      ['2026-10-07', 'aufgabe', 'Angebot senden'],
      ['2026-10-07', 'termin', 'Coaching, Teil 1'],
      ['2026-10-08', 'wiedervorlage', 'Lead nachfassen'],
      ['2026-10-09', 'wiedervorlage', 'Nachfassen'],
    ])
  })

  it('baut Monats- und Wochenraster ab Montag', () => {
    const raster = monatsRaster('2026-10')
    expect(raster).toHaveLength(42)
    expect(raster[0]).toBe('2026-09-28')
    expect(wochenTage('2026-10-07')).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'])
    expect(istKurstag(daten(), '2026-10-07')).toBe(true)
    expect(istKurstag(daten(), '2026-10-10')).toBe(false)
  })

  it('erzeugt eine gültige iCalendar-Datei', () => {
    const ics = alsIcs(kalenderEintraege(daten(), '2026-10-01', '2026-10-31'), new Date('2026-10-07T08:00:00Z'))
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261007T143000\r\nDTEND:20261007T153000')
    expect(ics).toContain('SUMMARY:Coaching\\, Teil 1')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261020\r\nDTEND;VALUE=DATE:20261021')
    expect(ics).toContain('SUMMARY:Frist: Angebot senden')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(5)
    expect(ics.split('\r\n').every((z) => z.length <= 75)).toBe(true)
  })
})

describe('Kalenderseite', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt den Monat, den gewählten Tag und blättert', () => {
    renderApp('/kalender', { daten: daten() })
    expect(screen.getByRole('heading', { level: 2, name: 'Oktober 2026' })).toBeInTheDocument()
    const heute = screen.getByRole('button', { name: /Mittwoch, 7. Oktober 2026, heute, 2 Einträge/ })
    expect(heute).toHaveAttribute('aria-pressed', 'true')
    const tag = screen.getByRole('region', { name: /Mittwoch, 7. Oktober 2026/ })
    expect(within(tag).getByRole('button', { name: '14:30 Coaching, Teil 1' })).toBeInTheDocument()
    expect(within(tag).getByText(/Kurstag/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Freitag, 9. Oktober 2026/ }))
    expect(within(screen.getByRole('region', { name: /Freitag, 9. Oktober 2026/ })).getByRole('link', { name: 'Nachfassen' })).toHaveAttribute('href', '/bewerbungen/b1')

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }))
    expect(screen.getByRole('heading', { level: 2, name: 'November 2026' })).toBeInTheDocument()
  })

  it('zeigt Woche und Liste und filtert nach Art', () => {
    renderApp('/kalender?ansicht=woche&datum=2026-10-07', { daten: daten() })
    expect(screen.getAllByRole('region', { name: /Oktober 2026/ })).toHaveLength(7)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wiedervorlagen' }))
    expect(screen.queryByText('Nachfassen')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Liste' }))
    expect(screen.getByRole('button', { name: 'Messe' })).toBeInTheDocument()
  })

  it('legt an einem Tag einen Termin an', () => {
    const { gespeichert } = renderApp('/kalender?datum=2026-10-12', { daten: daten() })
    fireEvent.click(screen.getByRole('button', { name: 'Termin am Montag, 12. Oktober 2026 anlegen' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/^Datum/)).toHaveValue('2026-10-12')
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Telefonat' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().termine.find((t) => t.titel === 'Telefonat')!.datum).toBe('2026-10-12')
  })

  it('exportiert erst nach Hinweis auf fehlende Verschlüsselung', async () => {
    renderApp('/kalender', { daten: daten() })
    const klick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Als .ics exportieren' }))
    const dialog = screen.getByRole('dialog', { name: 'Kalender exportieren?' })
    expect(within(dialog).getByText('nicht verschlüsselt')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Datei herunterladen' }))
    expect((klick.mock.contexts[0] as HTMLAnchorElement).download).toBe('pikartz-kalender-2026-10-07.ics')
    const text = await (vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob).text()
    expect(text).toContain('SUMMARY:Messe')
    klick.mockRestore()
  })
})
