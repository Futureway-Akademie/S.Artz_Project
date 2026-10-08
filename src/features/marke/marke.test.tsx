import { act, fireEvent, screen, within } from '@testing-library/react'
import { renderApp } from '../../test/renderApp.tsx'

function speichern(gespeichert: () => { aktivitaeten: Array<{ zusammenfassung: string }> }) {
  act(() => {
    window.dispatchEvent(new Event('pagehide'))
  })
  return gespeichert()
}

describe('PIKARTZ.AI-Bereich', () => {
  it('zeigt die Wortmarke mit separatem „.AI“, Logos und Markenfarben', () => {
    renderApp('/pikartz-ai')
    expect(screen.getByRole('heading', { level: 1, name: 'PIKARTZ.AI' })).toBeInTheDocument()
    expect(screen.getAllByText('.AI').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('img', { name: 'PIKARTZ Bildmarke' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'PIKARTZ Wortmarke' })).toBeInTheDocument()
    for (const hex of ['#2F5CFF', '#0A0A0B', '#4E525C']) expect(screen.getByText(hex)).toBeInTheDocument()
  })

  it('zeigt alle hinterlegten Designregeln in Reihenfolge', () => {
    renderApp('/pikartz-ai')
    const regeln = screen.getAllByRole('button', { name: /bearbeiten“?$/ }).filter((b) => b.getAttribute('aria-label')?.startsWith('„'))
    expect(regeln.map((b) => b.getAttribute('aria-label'))).toEqual([
      '„Wortmarke“ bearbeiten',
      '„Farben“ bearbeiten',
      '„Schrift“ bearbeiten',
      '„Flächen“ bearbeiten',
      '„Abstände und Typografie“ bearbeiten',
      '„Diamantmotiv“ bearbeiten',
      '„Logo-Dateien“ bearbeiten',
      '„Demo-Deck Modul 1, Tag 1“ bearbeiten',
    ])
  })

  it('bearbeitet, ergänzt, verschiebt und löscht Designregeln', () => {
    const { gespeichert } = renderApp('/pikartz-ai')
    fireEvent.click(screen.getByRole('button', { name: '„Flächen“ bearbeiten' }))
    let dialog = screen.getByRole('dialog', { name: 'Designregel bearbeiten' })
    fireEvent.change(within(dialog).getByLabelText(/^Regel/), { target: { value: 'Helle Flächen, dunkle Bereiche' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('Helle Flächen, dunkle Bereiche')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Regel hinzufügen' }))
    dialog = screen.getByRole('dialog', { name: 'Designregel anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Bildsprache' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByRole('button', { name: '„Bildsprache“ nach unten' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '„Bildsprache“ nach oben' }))
    expect(screen.getByRole('button', { name: '„Bildsprache“ nach unten' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: '„Bildsprache“ bearbeiten' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Designregel bearbeiten' })).getByRole('button', { name: 'Löschen' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Designregel löschen?' })).getByRole('button', { name: 'Regel löschen' }))
    expect(screen.queryByText('Bildsprache')).not.toBeInTheDocument()

    const daten = speichern(gespeichert)
    expect(daten.aktivitaeten.at(-1)!.zusammenfassung).toBe('Designregel „Flächen“ geändert: Beschreibung')
    expect(daten.aktivitaeten[0]!.zusammenfassung).toBe('Designregel „Bildsprache“ gelöscht')
  })

  it('beschreibt das Präsentations-System und das Demo-Deck ohne erfundenen Inhalt', () => {
    renderApp('/pikartz-ai')
    expect(screen.getByText(/PIKARTZ.AI-HTML-Template/)).toBeInTheDocument()
    expect(screen.getByText('Demo-Deck Modul 1, Tag 1')).toBeInTheDocument()
    expect(screen.getByText('Modul 1 · Tag 1')).toBeInTheDocument()
    expect(screen.getByText('Inhalt noch nicht hinterlegt.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '„Demo-Deck Modul 1, Tag 1“ bearbeiten' }))
    const dialog = screen.getByRole('dialog', { name: 'Präsentation bearbeiten' })
    fireEvent.change(within(dialog).getByLabelText(/^Modul/), { target: { value: 'eins' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText('Bitte eine ganze Zahl eingeben.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^Modul/), { target: { value: '' } })
    fireEvent.change(within(dialog).getByLabelText(/^Inhalt/), { target: { value: 'Einführung' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('Tag 1')).toBeInTheDocument()
    expect(screen.getByText('Einführung')).toBeInTheDocument()
  })
})
