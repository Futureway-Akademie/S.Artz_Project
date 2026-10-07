import { fireEvent, screen, within } from '@testing-library/react'
import { renderApp } from '../../test/renderApp.tsx'

function leadAnlegen(titel: string, betrag: string, status = 'neu') {
  fireEvent.click(screen.getAllByRole('button', { name: /Lead anlegen/ })[0]!)
  const dialog = screen.getByRole('dialog', { name: 'Lead anlegen' })
  fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: titel } })
  fireEvent.change(within(dialog).getByLabelText(/^Betrag/), { target: { value: betrag } })
  fireEvent.change(within(dialog).getByLabelText(/^Status/), { target: { value: status } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
}

describe('Leads', () => {
  it('startet leer', () => {
    renderApp('/kontakte/leads')
    expect(screen.getByText('Noch keine Leads')).toBeInTheDocument()
  })

  it('lässt den Betrag leer und zeigt „Kein Betrag“ statt 0 €', () => {
    renderApp('/kontakte/leads')
    leadAnlegen('Schulung KI-Grundlagen', '')
    const liste = screen.getByRole('list', { name: 'Leads' })
    expect(within(liste).getByText('Kein Betrag')).toBeInTheDocument()
    expect(screen.getByText(/Keine Beträge hinterlegt/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/0,00\s€/)
  })

  it('prüft Beträge, summiert nur hinterlegte und filtert nach Status', () => {
    renderApp('/kontakte/leads')
    fireEvent.click(screen.getByRole('button', { name: 'Ersten Lead anlegen' }))
    const dialog = screen.getByRole('dialog', { name: 'Lead anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Ungültig' } })
    fireEvent.change(within(dialog).getByLabelText(/^Betrag/), { target: { value: 'viel' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText(/Bitte einen Betrag wie 1.500,00/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }))

    leadAnlegen('Automation Handwerk', '1.500,50', 'angebot')
    leadAnlegen('Workshop', '')
    leadAnlegen('Altes Projekt', '900', 'zusage')
    expect(screen.getByText(/2 Leads · Summe der hinterlegten Beträge: 1\.500,50\s€/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'alle' } })
    expect(within(screen.getByRole('list', { name: 'Leads' })).getAllByRole('listitem')).toHaveLength(3)
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'zusage' } })
    expect(within(screen.getByRole('list', { name: 'Leads' })).getByText('Altes Projekt')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Lead „Altes Projekt“ bearbeiten' }))
    const bearbeiten = screen.getByRole('dialog', { name: 'Lead bearbeiten' })
    expect(within(bearbeiten).getByLabelText(/^Betrag/)).toHaveValue('900,00')
    fireEvent.change(within(bearbeiten).getByLabelText(/^Betrag/), { target: { value: '' } })
    fireEvent.click(within(bearbeiten).getByRole('button', { name: 'Speichern' }))
    expect(within(screen.getByRole('list', { name: 'Leads' })).getByText('Kein Betrag')).toBeInTheDocument()
  })
})
