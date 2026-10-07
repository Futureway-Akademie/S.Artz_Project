import type { AppData } from '../../domain/types.ts'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

function feld(name: RegExp | string) {
  return screen.getByLabelText(name)
}

function tippe(name: RegExp | string, wert: string) {
  fireEvent.change(feld(name), { target: { value: wert } })
}

function speichereDaten(gespeichert: () => AppData) {
  act(() => {
    window.dispatchEvent(new Event('pagehide'))
  })
  return gespeichert()
}

describe('Projekte', () => {
  it('listet die Projekte mit Status, Kategorie und Zählern ohne Prozentwerte', () => {
    renderApp('/projekte')
    expect(screen.getByText('12 Projekte · 10 in Arbeit')).toBeInTheDocument()
    const karten = screen.getAllByRole('listitem')
    expect(karten).toHaveLength(12)
    expect(within(karten[0]!).getByRole('link', { name: 'Lernspiel (Prototyp)' })).toHaveAttribute(
      'href',
      '/projekte/seed-projekt-spiel',
    )
    expect(within(karten[0]!).getByText('In Arbeit')).toBeInTheDocument()
    expect(within(karten[0]!).getByText('Kein offener Schritt')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\d+\s?%/)
  })

  it('filtert nach Suche, Status und Kategorie und bietet Zurücksetzen', () => {
    renderApp('/projekte')
    tippe(/^Suches*$/, 'vereins')
    expect(screen.getByText('1 von 12 Projekten')).toBeInTheDocument()
    tippe(/^Suches*$/, 'gibt es nicht')
    expect(screen.getByText('Keine Projekte passen zu deiner Auswahl')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }))
    fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: 'idee' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: 'alle' } })
    fireEvent.change(screen.getByLabelText(/Kategorie/), { target: { value: 'Karriere' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('legt ein Projekt an, prüft Pflichtfelder und öffnet die Detailseite', () => {
    const { gespeichert } = renderApp('/projekte')
    fireEvent.click(screen.getByRole('button', { name: 'Projekt anlegen' }))
    const dialog = screen.getByRole('dialog', { name: 'Projekt anlegen' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText('Bitte einen Titel eingeben.')).toBeInTheDocument()

    tippe(/^Titel/, 'Testprojekt')
    tippe(/^Tools/, 'n8n, Make.com')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Testprojekt' })).toBeInTheDocument()
    expect(screen.getByText('n8n')).toBeInTheDocument()
    expect(screen.getByText('Projekt angelegt')).toBeInTheDocument()
    const daten = speichereDaten(gespeichert)
    expect(daten.aktivitaeten[0]!.zusammenfassung).toBe('Projekt „Testprojekt“ angelegt')
  })

  it('fragt beim Abbrechen mit ungespeicherten Änderungen nach', () => {
    renderApp('/projekte')
    fireEvent.click(screen.getByRole('button', { name: 'Projekt anlegen' }))
    tippe(/^Titel/, 'Halb fertig')
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(screen.getByText('Änderungen verwerfen?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Weiter bearbeiten' }))
    expect(feld(/^Titel/)).toHaveValue('Halb fertig')
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }))
    expect(screen.queryByRole('dialog', { name: 'Projekt anlegen' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(12)
  })

  it('pflegt nächste Schritte: hinzufügen, erledigen, wieder öffnen, bearbeiten – ohne den Status zu ändern', () => {
    const { gespeichert } = renderApp('/projekte/seed-projekt-ki-skills')
    expect(screen.getByText('Keine offenen Schritte')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))
    expect(screen.getByText('Bitte beschreibe den Schritt.')).toBeInTheDocument()

    tippe(/^Neuer Schritt/, 'Bilder exportieren')
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }))
    const offen = screen.getByRole('list', { name: 'Offene Schritte' })
    expect(within(offen).getByText('Bilder exportieren')).toBeInTheDocument()
    expect(within(offen).getByText('Noch keine Frist hinterlegt')).toBeInTheDocument()

    fireEvent.click(within(offen).getByRole('checkbox', { name: 'Bilder exportieren' }))
    expect(screen.getByText('Erledigt (1)')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Status/)).toHaveValue('in_arbeit')

    const erledigt = screen.getByRole('list', { name: 'Erledigte Schritte' })
    fireEvent.click(within(erledigt).getByRole('checkbox', { name: 'Bilder exportieren' }))
    expect(screen.queryByText('Erledigt (1)')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '„Bilder exportieren“ bearbeiten' }))
    const dialog = screen.getByRole('dialog', { name: 'Schritt bearbeiten' })
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Bilder als PNG exportieren' } })
    fireEvent.change(within(dialog).getByLabelText(/^Frist/), { target: { value: '2030-01-15' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('Bilder als PNG exportieren')).toBeInTheDocument()
    expect(screen.getByText(/Fällig am/)).toBeInTheDocument()

    const daten = speichereDaten(gespeichert)
    expect(daten.projekte.find((p) => p.id === 'seed-projekt-ki-skills')!.status).toBe('in_arbeit')
    expect(daten.aktivitaeten.map((a) => a.zusammenfassung)).toEqual([
      'Aufgabe „Bilder als PNG exportieren“ geändert: Titel, Frist',
      'Aufgabe „Bilder exportieren“ wieder geöffnet',
      'Aufgabe „Bilder exportieren“ erledigt',
      'Aufgabe „Bilder exportieren“ angelegt',
    ])
  })

  it('ändert den Status nur manuell und protokolliert das', () => {
    const { gespeichert } = renderApp('/projekte/seed-projekt-pruef-agent')
    fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: 'pausiert' } })
    expect(screen.getAllByText('Pausiert').length).toBeGreaterThan(0)
    const daten = speichereDaten(gespeichert)
    expect(daten.aktivitaeten[0]!.zusammenfassung).toBe('Projekt „Prüf-Agent (Konzept)“ geändert: Status')
  })

  it('bearbeitet ein Projekt und erzeugt ohne Änderung keine Aktivität', () => {
    const { gespeichert } = renderApp('/projekte/seed-projekt-stellensuche')
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Projekt bearbeiten' })).getByRole('button', { name: 'Speichern' }))
    expect(speichereDaten(gespeichert).aktivitaeten).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))
    tippe(/^Notizen/, 'Neue Notiz')
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Projekt bearbeiten' })).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('Neue Notiz')).toBeInTheDocument()
    expect(speichereDaten(gespeichert).aktivitaeten[0]!.zusammenfassung).toBe('Projekt „Stellensuche“ geändert: Notizen')
  })

  it('löscht ein Projekt erst nach Bestätigung und nennt die Folgen', () => {
    const daten = beispielSeed(new Date(), [
      { projekt: { id: 'seed-projekt-ki-skills', titel: '', kategorie: '', status: null, zuletztAktiv: null }, offen: ['Schritt A'] },
    ])
    renderApp('/projekte/seed-projekt-ki-skills', { daten })
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    const dialog = screen.getByRole('dialog', { name: 'Projekt löschen?' })
    expect(within(dialog).getByText(/1 verknüpfte Einträge gelöscht \(Aufgabe\)/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
    expect(screen.getByRole('heading', { level: 1, name: 'KI-Skills' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Projekt löschen?' })).getByRole('button', { name: 'Projekt löschen' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Projekte' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(11)
  })

  it('zeigt eine Meldung für unbekannte Projekte', () => {
    renderApp('/projekte/gibt-es-nicht')
    expect(screen.getByRole('heading', { level: 1, name: 'Projekt nicht gefunden' })).toBeInTheDocument()
  })
})

describe('Auftraggeber', () => {
  it('verknüpft ein Projekt mit einem Unternehmen und zeigt es auf der Detailseite', () => {
    const zeit = '2026-10-01T10:00:00.000Z'
    renderApp('/projekte/seed-projekt-kundenformular', {
      daten: { ...beispielSeed(), unternehmen: [{ id: 'u1', name: 'Kunde GmbH', branche: '', website: '', notiz: '', schlagworte: [], erstelltAm: zeit, geaendertAm: zeit }] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))
    const dialog = screen.getByRole('dialog', { name: 'Projekt bearbeiten' })
    fireEvent.change(within(dialog).getByLabelText(/^Auftraggeber/), { target: { value: 'u1' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByRole('link', { name: 'Kunde GmbH' })).toHaveAttribute('href', '/kontakte/unternehmen/u1')
  })
})
