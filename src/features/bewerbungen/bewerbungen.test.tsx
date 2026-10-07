import { fireEvent, screen, within } from '@testing-library/react'
import { renderApp } from '../../test/renderApp.tsx'

function bewerbungAnlegen(stelle: string, felder: Record<string, string> = {}) {
  fireEvent.click(screen.getAllByRole('button', { name: /Bewerbung anlegen/ })[0]!)
  const dialog = screen.getByRole('dialog', { name: 'Bewerbung anlegen' })
  fireEvent.change(within(dialog).getByLabelText(/^Stelle/), { target: { value: stelle } })
  for (const [label, wert] of Object.entries(felder)) {
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${label}`)), { target: { value: wert } })
  }
  fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
}

describe('Bewerbungen und Zielrollen', () => {
  it('hat drei Zielrollen und keine vorbefüllten Bewerbungen', () => {
    renderApp('/bewerbungen')
    expect(screen.getByText('Noch keine Bewerbungen')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Zielrollen' }))
    const liste = screen.getByRole('list', { name: 'Zielrollen' })
    expect(within(liste).getAllByRole('listitem').map((li) => li.querySelector('span')?.textContent)).toEqual([
      'Prompt Engineer',
      'KI-Anwendungsspezialist',
      'Grafikdesigner mit Social-Media- oder E-Commerce-Fokus',
    ])
    expect(within(liste).getAllByText('Noch keine Bewerbung')).toHaveLength(3)
  })

  it('legt Bewerbungen mit Zielrolle, Quelle, Datum und Link an und filtert nach Status', () => {
    renderApp('/bewerbungen')
    bewerbungAnlegen('Prompt Engineer (m/w/d)', {
      Zielrolle: 'seed-zielrolle-1',
      Status: 'beworben',
      'Beworben am': '2026-10-05',
      Quelle: 'Jobsuche-Assistent',
      'Link zur Ausschreibung': 'https://example.org/stelle',
    })
    bewerbungAnlegen('Grafiker', { Status: 'absage' })

    const liste = screen.getByRole('list', { name: 'Bewerbungen' })
    expect(within(liste).getAllByRole('listitem')).toHaveLength(1) // Standard: nur laufende
    expect(within(liste).getByText(/Prompt Engineer · Quelle: Jobsuche-Assistent · beworben Mo\., 05\.10\.2026/)).toBeInTheDocument()
    expect(within(liste).getByRole('link', { name: 'Ausschreibung „Prompt Engineer (m/w/d)“ öffnen' })).toHaveAttribute('href', 'https://example.org/stelle')
    expect(screen.getByText('Beworben: 1 · Absage: 1')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'alle' } })
    expect(within(screen.getByRole('list', { name: 'Bewerbungen' })).getAllByRole('listitem')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Zielrolle'), { target: { value: 'seed-zielrolle-1' } })
    expect(within(screen.getByRole('list', { name: 'Bewerbungen' })).getAllByRole('listitem')).toHaveLength(1)

    fireEvent.click(screen.getByRole('link', { name: 'Zielrollen' }))
    expect(screen.getByText('1 Bewerbungen, 1 laufend')).toBeInTheDocument()
  })

  it('prüft Pflichtfeld und Link und löscht nach Bestätigung', () => {
    renderApp('/bewerbungen')
    fireEvent.click(screen.getByRole('button', { name: 'Erste Bewerbung anlegen' }))
    const dialog = screen.getByRole('dialog', { name: 'Bewerbung anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Link/), { target: { value: 'example.org' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText('Bitte die Stelle eingeben.')).toBeInTheDocument()
    expect(within(dialog).getByText('Bitte die vollständige Adresse mit https:// eingeben.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^Stelle/), { target: { value: 'Test' } })
    fireEvent.change(within(dialog).getByLabelText(/^Link/), { target: { value: '' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    fireEvent.click(screen.getByRole('button', { name: 'Bewerbung „Test“ bearbeiten' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Bewerbung bearbeiten' })).getByRole('button', { name: 'Löschen' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Bewerbung löschen?' })).getByRole('button', { name: 'Bewerbung löschen' }))
    expect(screen.getByText('Noch keine Bewerbungen')).toBeInTheDocument()
  })

  it('legt Zielrollen an und bearbeitet sie', () => {
    renderApp('/bewerbungen/zielrollen')
    fireEvent.click(screen.getByRole('button', { name: 'Zielrolle anlegen' }))
    const dialog = screen.getByRole('dialog', { name: 'Zielrolle anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Marketplace Manager' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(screen.getByRole('list', { name: 'Zielrollen' })).getAllByRole('listitem')).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: 'Zielrolle „Marketplace Manager“ bearbeiten' }))
    const bearbeiten = screen.getByRole('dialog', { name: 'Zielrolle bearbeiten' })
    fireEvent.change(within(bearbeiten).getByLabelText(/^Notiz/), { target: { value: 'E-Commerce-Fokus' } })
    fireEvent.click(within(bearbeiten).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('E-Commerce-Fokus')).toBeInTheDocument()
  })
})
