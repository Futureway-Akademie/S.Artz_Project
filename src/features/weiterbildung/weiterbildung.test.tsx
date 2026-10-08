import { fireEvent, screen, within } from '@testing-library/react'
import { renderApp } from '../../test/renderApp.tsx'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 9, 30)) // Mittwoch, 07.10.2026
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Weiterbildung', () => {
  it('zeigt Kurs, Zeitraum und Arbeitstage nach Gerätedatum', () => {
    renderApp('/weiterbildung')
    expect(screen.getByText('Läuft')).toBeInTheDocument()
    expect(screen.getByText('Beispiel-Akademie')).toBeInTheDocument()
    expect(screen.getByText('Mo., 03.08.2026 – Fr., 18.12.2026')).toBeInTheDocument()
    expect(screen.getByText('Kurstag 48')).toBeInTheDocument()
    expect(screen.getByText('von 100 Arbeitstagen')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText('53')).toBeInTheDocument()
  })

  it('zeigt ohne Kursaufgaben keinen Fortschritt, sondern einen Leerzustand', () => {
    renderApp('/weiterbildung')
    expect(screen.getByText('Noch kein Fortschritt')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('legt Kursaufgaben mit geprüftem Code an und berechnet den Fortschritt aus Erledigungen', () => {
    renderApp('/weiterbildung')
    fireEvent.click(screen.getByRole('button', { name: 'Kursaufgabe anlegen' }))
    let dialog = screen.getByRole('dialog', { name: 'Kursaufgabe anlegen' })
    expect(within(dialog).getByLabelText(/^Code/)).toHaveValue('KURS_1_01')
    fireEvent.change(within(dialog).getByLabelText(/^Code/), { target: { value: 'KURS_1_1' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText(/Bitte im Format KURS_X_YY eingeben/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^Code/), { target: { value: 'KURS_1_01' } })
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Prompt-Grundlagen' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    fireEvent.click(screen.getByRole('button', { name: 'Kursaufgabe anlegen' }))
    dialog = screen.getByRole('dialog', { name: 'Kursaufgabe anlegen' })
    expect(within(dialog).getByLabelText(/^Code/)).toHaveValue('KURS_1_02')
    fireEvent.change(within(dialog).getByLabelText(/^Code/), { target: { value: 'KURS_1_01' } })
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Doppelt' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText('Diesen Code gibt es schon.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^Code/), { target: { value: 'KURS_1_02' } })
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'RAG-Übung' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '0 von 2 erledigt')

    fireEvent.click(screen.getByRole('button', { name: 'KURS_1_01 bearbeiten' }))
    dialog = screen.getByRole('dialog', { name: 'Kursaufgabe bearbeiten' })
    fireEvent.change(within(dialog).getByLabelText(/^Status/), { target: { value: 'erledigt' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '1 von 2 erledigt')
    expect(screen.getByText('50 %')).toBeInTheDocument()
  })

  it('bearbeitet die Kursdaten', () => {
    renderApp('/weiterbildung')
    fireEvent.click(screen.getByRole('button', { name: 'Kurs bearbeiten' }))
    const dialog = screen.getByRole('dialog', { name: 'Kurs bearbeiten' })
    fireEvent.change(within(dialog).getByLabelText(/^Ende/), { target: { value: '2026-08-01' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText('Das Ende liegt vor dem Start.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^Ende/), { target: { value: '2026-12-11' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('Mo., 03.08.2026 – Fr., 11.12.2026')).toBeInTheDocument()
    expect(screen.getByText('von 95 Arbeitstagen')).toBeInTheDocument()
  })
})
