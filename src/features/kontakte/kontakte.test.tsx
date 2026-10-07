import { act, fireEvent, screen, within } from '@testing-library/react'
import { createSeedData } from '../../data/seed.ts'
import { renderApp } from '../../test/renderApp.tsx'

function sichern(gespeichert: () => ReturnType<typeof createSeedData>) {
  act(() => {
    window.dispatchEvent(new Event('pagehide'))
  })
  return gespeichert()
}

function unternehmenAnlegen(name: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Unternehmen anlegen' }))
  const dialog = screen.getByRole('dialog', { name: 'Unternehmen anlegen' })
  fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: name } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
}

describe('Kontakte und Unternehmen', () => {
  it('startet ohne vorbefüllte Kontakte und Unternehmen', () => {
    renderApp('/kontakte')
    expect(screen.getByText('Noch keine Kontakte')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Unternehmen' }))
    expect(screen.getByText('Noch keine Unternehmen')).toBeInTheDocument()
  })

  it('legt ein Unternehmen und einen zugeordneten Kontakt mit Kontext, Herkunft und LinkedIn an', () => {
    const { gespeichert } = renderApp('/kontakte/unternehmen')
    unternehmenAnlegen('Beispiel GmbH')
    fireEvent.click(screen.getByRole('link', { name: 'Beispiel GmbH' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Beispiel GmbH' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Kontakt hinzufügen' }))
    const dialog = screen.getByRole('dialog', { name: 'Kontakt anlegen' })
    expect(within(dialog).getByLabelText(/^Unternehmen/)).toHaveDisplayValue('Beispiel GmbH')
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Kim Muster' } })
    fireEvent.change(within(dialog).getByLabelText(/^Rolle/), { target: { value: 'Recruiterin' } })
    fireEvent.change(within(dialog).getByLabelText(/^Herkunft/), { target: { value: 'Messe' } })
    fireEvent.change(within(dialog).getByLabelText(/^LinkedIn/), { target: { value: 'linkedin.com/in/kim' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText('Bitte die vollständige Adresse mit https:// eingeben.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^LinkedIn/), { target: { value: 'https://www.linkedin.com/in/kim' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    const kontakte = screen.getByRole('region', { name: 'Kontakte (1)' })
    expect(within(kontakte).getByRole('link', { name: 'Kim Muster' })).toBeInTheDocument()

    fireEvent.click(within(kontakte).getByRole('link', { name: 'Kim Muster' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Kim Muster' })).toBeInTheDocument()
    expect(screen.getByText('Jobsuche')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Profil öffnen' })).toHaveAttribute('href', 'https://www.linkedin.com/in/kim')
    expect(screen.getByText('Messe')).toBeInTheDocument()

    const daten = sichern(gespeichert)
    expect(daten.kontakte[0]).toMatchObject({ name: 'Kim Muster', kontext: 'jobsuche', herkunft: 'Messe', unternehmenId: daten.unternehmen[0]!.id })
  })

  it('sucht und filtert Kontakte nach Kontext', () => {
    renderApp('/kontakte')
    for (const [name, kontext] of [
      ['Anna Dozentin', 'weiterbildung'],
      ['Ben Recruiter', 'jobsuche'],
    ] as const) {
      fireEvent.click(screen.getAllByRole('button', { name: /Kontakt anlegen/ })[0]!)
      const dialog = screen.getByRole('dialog', { name: 'Kontakt anlegen' })
      fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: name } })
      fireEvent.change(within(dialog).getByLabelText(/^Kontext/), { target: { value: kontext } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      fireEvent.click(screen.getAllByRole('link', { name: 'Kontakte' }).at(-1)!)
    }
    expect(screen.getByText('2 von 2 Kontakten')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Kontext'), { target: { value: 'weiterbildung' } })
    expect(within(screen.getByRole('list', { name: 'Kontakte' })).getByText('Anna Dozentin')).toBeInTheDocument()
    expect(screen.getByText('1 von 2 Kontakten')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Kontext'), { target: { value: 'alle' } })
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'ben' } })
    expect(screen.getByText('1 von 2 Kontakten')).toBeInTheDocument()
  })

  it('löscht Unternehmen nach Bestätigung und behält die Kontakte', () => {
    const { gespeichert } = renderApp('/kontakte/unternehmen')
    unternehmenAnlegen('Weg GmbH')
    fireEvent.click(screen.getByRole('link', { name: 'Weg GmbH' }))
    fireEvent.click(screen.getByRole('button', { name: 'Kontakt hinzufügen' }))
    const dialog = screen.getByRole('dialog', { name: 'Kontakt anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Bleibt' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    const frage = screen.getByRole('dialog', { name: 'Unternehmen löschen?' })
    expect(within(frage).getByText(/verlieren aber die Zuordnung/)).toBeInTheDocument()
    fireEvent.click(within(frage).getByRole('button', { name: 'Unternehmen löschen' }))
    expect(screen.getByText('Noch keine Unternehmen')).toBeInTheDocument()
    const daten = sichern(gespeichert)
    expect(daten.kontakte[0]).toMatchObject({ name: 'Bleibt', unternehmenId: null })
  })

  it('löscht einen Kontakt erst nach Bestätigung', () => {
    renderApp('/kontakte')
    fireEvent.click(screen.getAllByRole('button', { name: /Kontakt anlegen/ })[0]!)
    const dialog = screen.getByRole('dialog', { name: 'Kontakt anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Testkontakt' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Kontakt löschen?' })).getByRole('button', { name: 'Abbrechen' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Testkontakt' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Kontakt löschen?' })).getByRole('button', { name: 'Kontakt löschen' }))
    expect(screen.getByText('Noch keine Kontakte')).toBeInTheDocument()
  })
})
