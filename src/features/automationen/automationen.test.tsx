import { act, fireEvent, screen, within } from '@testing-library/react'
import { renderApp } from '../../test/renderApp.tsx'

function imDialog(name: string) {
  return screen.getByRole('dialog', { name })
}

describe('Automationen', () => {
  it('zeigt ohne erfasste Automation einen ehrlichen Leerzustand', () => {
    renderApp('/automationen')
    expect(screen.getByText('Noch keine Automation erfasst')).toBeInTheDocument()
    expect(screen.getByText(/nicht mit n8n, Make.com oder anderen Diensten verbunden/)).toBeInTheDocument()
  })

  it('erfasst eine Automation mit Modell, Datenquellen, Schwelle und Routing – ohne Verbindung zu behaupten', () => {
    const { gespeichert } = renderApp('/automationen')
    fireEvent.click(screen.getAllByRole('button', { name: 'Automation erfassen' })[0]!)
    const dialog = imDialog('Automation erfassen')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText('Bitte ein Projekt wählen.')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText(/^Projekt/), { target: { value: 'seed-projekt-kundenformular' } })
    fireEvent.change(within(dialog).getByLabelText(/^Plattform/), { target: { value: 'make' } })
    fireEvent.change(within(dialog).getByLabelText(/^Modell/), { target: { value: 'Testmodell' } })
    fireEvent.change(within(dialog).getByLabelText(/^Schwelle/), { target: { value: '150' } })
    fireEvent.change(within(dialog).getByLabelText(/^Routing-Regeln/), { target: { value: 'Ohne Ziel' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText('Bitte eine Zahl zwischen 0 und 100 eingeben.')).toBeInTheDocument()
    expect(within(dialog).getByText(/braucht ein Ziel/)).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText(/^Schwelle/), { target: { value: '75,5' } })
    fireEvent.change(within(dialog).getByLabelText(/^Datenquellen/), { target: { value: 'Formular, Tabelle' } })
    fireEvent.change(within(dialog).getByLabelText(/^Routing-Regeln/), { target: { value: 'Heißer Lead → Anruf\nFallback → Nurturing' } })
    fireEvent.change(within(dialog).getByLabelText(/^Routing-Stand/), { target: { value: 'geplant' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    const karte = screen.getByRole('article', { name: 'Automation Kundenformular' })
    expect(within(karte).getByText('Make.com')).toBeInTheDocument()
    expect(within(karte).getByText('Nicht verbunden')).toBeInTheDocument()
    expect(within(karte).getByText('Testmodell')).toBeInTheDocument()
    expect(within(karte).getByText('75,5 %')).toBeInTheDocument()
    expect(within(karte).getByText('Tabelle')).toBeInTheDocument()
    expect(within(karte).getByText('Fallback')).toBeInTheDocument()
    expect(within(karte).getByText('Geplant')).toBeInTheDocument()
    expect(screen.queryByText(/^Verbunden$/)).not.toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    const projekt = gespeichert().projekte.find((p) => p.id === 'seed-projekt-kundenformular')!
    expect(projekt.automation).toMatchObject({ plattform: 'make', schwelleProzent: 75.5, verbindung: 'nicht_verbunden' })
    expect(gespeichert().aktivitaeten[0]!.zusammenfassung).toBe('Projekt „Kundenformular“ geändert: Automation')
  })

  it('gruppiert nach Plattform und nach Projekt, bearbeitet und entfernt eine Automation', () => {
    renderApp('/automationen')
    for (const [id, plattform] of [
      ['seed-projekt-ki-skills', 'sonstige'],
      ['seed-projekt-stellensuche', 'n8n'],
    ] as const) {
      fireEvent.click(screen.getAllByRole('button', { name: 'Automation erfassen' })[0]!)
      const dialog = imDialog('Automation erfassen')
      fireEvent.change(within(dialog).getByLabelText(/^Projekt/), { target: { value: id } })
      fireEvent.change(within(dialog).getByLabelText(/^Plattform/), { target: { value: plattform } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    }
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['n8n (1)', 'Sonstige (1)'])

    fireEvent.click(screen.getByRole('button', { name: 'Nach Projekt' }))
    expect(screen.getByRole('button', { name: 'Nach Projekt' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim())).toEqual([
      'KI-Skills',
      'Stellensuche',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Automation von „Stellensuche“ bearbeiten' }))
    const dialog = imDialog('Automation: Stellensuche')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Automation entfernen' }))
    fireEvent.click(within(imDialog('Automation entfernen?')).getByRole('button', { name: 'Automation entfernen' }))
    expect(screen.queryByRole('article', { name: 'Automation Stellensuche' })).not.toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Automation KI-Skills' })).toBeInTheDocument()
  })
})
