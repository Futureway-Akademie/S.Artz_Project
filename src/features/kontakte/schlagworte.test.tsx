import { act, fireEvent, screen, within } from '@testing-library/react'
import { alleSchlagworte, hatSchlagwort, kontaktDubletten, projektDublette } from '../../domain/selectors/schlagworte.ts'
import type { AppData, Kontakt } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }

const kontakt = (id: string, name: string, email: string, schlagworte: string[]): Kontakt => ({
  id, name, rolle: '', unternehmenId: null, email, telefon: '', linkedinUrl: '', kontext: 'jobsuche', herkunft: '', notiz: '',
  projektIds: [], naechsteAktion: null, rechtsgrundlage: 'vertrag', zweck: 'Netzwerk', schlagworte, ...m,
})

function daten(): AppData {
  return {
    ...beispielSeed(),
    kontakte: [kontakt('k1', 'Kim Muster', 'kim@example.org', ['Recruiter', 'Köln']), kontakt('k2', 'Lou Beispiel', '', ['köln'])],
    unternehmen: [
      { id: 'u1', name: 'Agentur A', branche: '', website: '', notiz: '', schlagworte: ['Agentur'], ...m },
      { id: 'u2', name: 'Shop B', branche: '', website: '', notiz: '', schlagworte: [], ...m },
    ],
  }
}

describe('Schlagworte und Dubletten', () => {
  it('sammelt Schlagworte ohne Dubletten und filtert unabhängig von der Schreibweise', () => {
    const d = daten()
    expect(alleSchlagworte(d.kontakte)).toEqual(['Köln', 'Recruiter'])
    expect(hatSchlagwort(d.kontakte[1]!, 'KÖLN')).toBe(true)
    expect(hatSchlagwort(d.kontakte[1]!, '')).toBe(true)
  })

  it('erkennt mögliche Dubletten bei Kontakten und Projekten', () => {
    const d = daten()
    expect(kontaktDubletten(d, { name: ' kim muster ', email: '' })).toEqual([{ id: 'k1', name: 'Kim Muster', grund: 'name' }])
    expect(kontaktDubletten(d, { name: 'Andere', email: 'KIM@example.org' })).toEqual([{ id: 'k1', name: 'Kim Muster', grund: 'email' }])
    expect(kontaktDubletten(d, { name: 'Kim Muster', email: 'kim@example.org' }, 'k1')).toEqual([])
    expect(projektDublette(d, 'stellensuche')).toBe('Stellensuche')
    expect(projektDublette(d, 'Neu')).toBeNull()
  })

  it('filtert Kontakte und Unternehmen nach Schlagwort', () => {
    renderApp('/kontakte', { daten: daten() })
    fireEvent.change(screen.getByLabelText('Schlagwort'), { target: { value: 'Recruiter' } })
    expect(within(screen.getByRole('list', { name: 'Kontakte' })).getAllByRole('link').map((l) => l.textContent)).toEqual(['Kim Muster'])
    expect(within(screen.getByRole('list', { name: 'Kontakte' })).getByText('#Köln')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Unternehmen' }))
    fireEvent.change(screen.getByLabelText('Schlagwort'), { target: { value: 'Agentur' } })
    expect(within(screen.getByRole('list', { name: 'Unternehmen' })).getAllByRole('link').map((l) => l.textContent)).toEqual(['Agentur A'])
  })

  it('erfasst Schlagworte im Dialog und warnt vor Dubletten', () => {
    const { gespeichert } = renderApp('/kontakte', { daten: daten() })
    fireEvent.click(screen.getByRole('button', { name: 'Kontakt anlegen' }))
    const dialog = screen.getByRole('dialog', { name: 'Kontakt anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'kim muster' } })
    expect(within(dialog).getByText(/Möglicherweise doppelt: „Kim Muster“ \(gleicher Name\)/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Sam Neu' } })
    expect(within(dialog).queryByText(/Möglicherweise doppelt/)).toBeNull()
    fireEvent.change(within(dialog).getByLabelText(/^Schlagworte/), { target: { value: 'Messe, Köln' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().kontakte.find((k) => k.name === 'Sam Neu')!.schlagworte).toEqual(['Messe', 'Köln'])
    expect(screen.getByText('#Messe #Köln')).toBeInTheDocument()
  })

  it('filtert Projekte nach Schlagwort', () => {
    const d = daten()
    renderApp('/projekte', { daten: { ...d, projekte: d.projekte.map((p) => (p.id === 'seed-projekt-website' ? { ...p, schlagworte: ['Portfolio'] } : p)) } })
    fireEvent.change(screen.getByLabelText('Schlagwort'), { target: { value: 'Portfolio' } })
    expect(screen.getByText('1 von 12 Projekten')).toBeInTheDocument()
  })
})
