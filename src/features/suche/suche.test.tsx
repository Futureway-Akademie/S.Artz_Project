import { act, fireEvent, screen, within } from '@testing-library/react'
import { suche } from '../../domain/selectors/suche.ts'
import type { AppData } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }

function daten(): AppData {
  return {
    ...beispielSeed(),
    unternehmen: [{ id: 'u1', name: 'Müller Logistik', branche: 'Transport', website: '', notiz: '', schlagworte: ['Köln'], ...m }],
    kontakte: [
      {
        id: 'k1', name: 'Kim Muster', rolle: 'Recruiterin', unternehmenId: 'u1', email: 'kim@example.org', telefon: '', linkedinUrl: '', kontext: 'jobsuche',
        herkunft: 'Messe', notiz: '', projektIds: [], naechsteAktion: null, rechtsgrundlage: null, zweck: '', schlagworte: [], ...m,
      },
    ],
    interaktionen: [{ id: 'i1', kontaktId: 'k1', art: 'email', datum: '2026-10-02', text: 'Gehaltsvorstellung genannt', projektId: null, bewerbungId: null, leadId: null, betreff: 'Rückfrage', richtung: 'eingang', ...m }],
  }
}

describe('Suche', () => {
  it('findet über alle Bereiche, ohne Akzente zu beachten, und sortiert nach Relevanz', () => {
    const d = daten()
    expect(suche(d, 'muller').map((t) => t.art)).toEqual(['Unternehmen', 'Kontakt'])
    expect(suche(d, 'kim')[0]).toMatchObject({ art: 'Kontakt', titel: 'Kim Muster', link: '/kontakte/k1' })
    expect(suche(d, 'gehalt')[0]).toMatchObject({ art: 'Verlauf', titel: 'Rückfrage', link: '/kontakte/k1' })
    expect(suche(d, 'köln')[0]).toMatchObject({ art: 'Unternehmen' })
    expect(suche(d, 'kim gibtsnicht')).toEqual([])
    expect(suche(d, '   ')).toEqual([])
  })

  it('öffnet mit Strg+K, wählt per Pfeiltaste und Enter', () => {
    renderApp('/', { daten: daten() })
    act(() => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    })
    const dialog = screen.getByRole('dialog', { name: 'Suchen' })
    const eingabe = within(dialog).getByRole('combobox')
    fireEvent.change(eingabe, { target: { value: 'mu' } })
    const optionen = within(dialog).getAllByRole('option')
    expect(optionen[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(eingabe, { key: 'ArrowDown' })
    const zweite = within(dialog).getAllByRole('option')[1]!
    expect(zweite).toHaveAttribute('aria-selected', 'true')
    expect(eingabe).toHaveAttribute('aria-activedescendant', zweite.id)
    const titel = zweite.querySelector('span:nth-child(2)')!.textContent!
    fireEvent.keyDown(eingabe, { key: 'Enter' })
    expect(screen.queryByRole('dialog', { name: 'Suchen' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: titel })).toBeInTheDocument()
  })

  it('legt über „Neu anlegen“ auf einer Detailseite eine verknüpfte Aufgabe an', () => {
    const { gespeichert } = renderApp('/kontakte/k1', { daten: daten() })
    fireEvent.click(screen.getAllByRole('button', { name: /Neu anlegen/, hidden: true })[0]!)
    const auswahl = screen.getByRole('dialog', { name: 'Neu anlegen' })
    expect(within(auswahl).getByText(/mit „Kim Muster“ verknüpft/)).toBeInTheDocument()
    fireEvent.click(within(auswahl).getByRole('button', { name: 'Aufgabe' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Zusage nachfragen' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().aufgaben.find((a) => a.titel === 'Zusage nachfragen')!.bezug).toEqual({ art: 'kontakt', id: 'k1' })
  })
})

describe('Suche – Fokus', () => {
  it('setzt den Fokus beim Öffnen ins Suchfeld', () => {
    renderApp('/')
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true })
    })
    expect(within(screen.getByRole('dialog', { name: 'Suchen' })).getByRole('combobox')).toHaveFocus()
  })
})
