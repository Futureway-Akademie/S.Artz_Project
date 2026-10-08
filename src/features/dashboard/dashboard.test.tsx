import { fireEvent, screen, within } from '@testing-library/react'
import type { AppData } from '../../domain/types.ts'
import { createEmptyData } from '../../data/empty.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-05T09:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }
const now = new Date(2026, 9, 7, 10, 0)

function daten(): AppData {
  return {
    ...beispielSeed(now),
    bewerbungen: (['beworben', 'im_gespraech', 'absage'] as const).map((status, i) => ({
      id: `b${i}`, stelle: `S${i}`, unternehmenId: null, zielrolleId: null, kontaktId: null, status, quelle: '', beworbenAm: null, link: '', naechsterSchritt: '', notiz: '', wiedervorlageAm: null, ...m,
    })),
    aufgaben: [{ id: 'a1', titel: 'A', notiz: '', erledigt: true, fokus: false, erledigtAm: zeit, faelligAm: null, bezug: { art: 'ohne', id: null }, ...m }],
  }
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('zeigt Kennzahlen und Grafiken aus den eigenen Daten und verlinkt in die Bereiche', () => {
    renderApp('/dashboard', { daten: daten() })
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    const kennzahlen = screen.getByRole('region', { name: 'Kennzahlen' })
    expect(within(kennzahlen).getByText('Projekte in Arbeit').closest('a')).toHaveAttribute('href', '/projekte')
    const status = screen.getByRole('figure', { name: 'Projekte nach Status' })
    expect(within(status).getByText('In Arbeit').closest('li')).toHaveTextContent('10')
    const trichter = screen.getByRole('figure', { name: 'Bewerbungen: Trichter' })
    expect(within(trichter).getByText('Von 3 Bewerbungen haben 1 ein Gespräch erreicht.')).toBeInTheDocument()
    const aufgaben = screen.getByRole('figure', { name: /Aufgaben je Woche/ })
    fireEvent.click(within(aufgaben).getByRole('button', { name: 'Tabelle' }))
    expect(within(aufgaben).getByRole('rowheader', { name: '05.10.' }).closest('tr')).toHaveTextContent('05.10.11')
  })

  it('erfindet ohne Daten nichts und zeigt Hinweise', () => {
    renderApp('/dashboard', { daten: createEmptyData() })
    expect(screen.getAllByText(/Noch keine Projekte/).length).toBeGreaterThan(0)
    const trichter = screen.getByRole('figure', { name: 'Bewerbungen: Trichter' })
    expect(within(trichter).getAllByText('Noch keine Bewerbungen.')).toHaveLength(2) // Zusammenfassung und Hinweis statt Grafik
    expect(within(trichter).queryByRole('list')).toBeNull()
    expect(screen.getByRole('region', { name: 'Kennzahlen' })).toHaveTextContent(/–Weiterbildungkein Kurs/)
  })
})
