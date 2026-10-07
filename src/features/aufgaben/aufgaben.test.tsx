import type { AppData } from '../../domain/types.ts'
import { act, fireEvent, screen, within } from '@testing-library/react'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

const mitSchritten = () =>
  beispielSeed(new Date(), [
    { projekt: { id: 'seed-projekt-ki-skills', titel: '', kategorie: '', status: null, zuletztAktiv: null }, offen: ['Bilder ausgeben'] },
  ])

function sichern(gespeichert: () => AppData) {
  act(() => {
    window.dispatchEvent(new Event('pagehide'))
  })
  return gespeichert()
}

describe('Aufgaben & Termine', () => {
  it('zeigt Aufgaben aus Projekten mit Bezug und „Noch keine Frist hinterlegt“', () => {
    renderApp('/aufgaben', { daten: mitSchritten() })
    const gruppe = screen.getByRole('region', { name: /Ohne Frist/ })
    expect(within(gruppe).getByText('Bilder ausgeben')).toBeInTheDocument()
    expect(within(gruppe).getByText('Noch keine Frist hinterlegt')).toBeInTheDocument()
    expect(within(gruppe).getByRole('link', { name: 'KI-Skills' })).toHaveAttribute('href', '/projekte/seed-projekt-ki-skills')
  })

  it('legt eine Aufgabe mit Frist und Weiterbildungsbezug an, erledigt sie und filtert', () => {
    const { gespeichert } = renderApp('/aufgaben', { daten: mitSchritten() })
    fireEvent.click(screen.getByRole('button', { name: 'Aufgabe anlegen' }))
    const dialog = screen.getByRole('dialog', { name: 'Aufgabe anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Abgabe Modul 2' } })
    fireEvent.change(within(dialog).getByLabelText(/^Frist/), { target: { value: '2030-03-02' } })
    fireEvent.change(within(dialog).getByLabelText(/^Bezug/), { target: { value: 'weiterbildung:seed-kurs-beispiel' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    expect(within(screen.getByRole('region', { name: /Später/ })).getByText('Abgabe Modul 2')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Weiterbildung: Beispielkurs Automatisierung' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Bezug'), { target: { value: 'weiterbildung' } })
    expect(screen.getByText('1 Aufgabe')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Filter zurücksetzen' }))
    expect(screen.getByText('2 Aufgaben')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Abgabe Modul 2' }))
    expect(screen.getByText('1 Aufgabe')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'erledigt' } })
    expect(within(screen.getByRole('region', { name: /Erledigt/ })).getByText('Abgabe Modul 2')).toBeInTheDocument()

    const daten = sichern(gespeichert)
    expect(daten.aktivitaeten.map((a) => a.zusammenfassung)).toEqual([
      'Aufgabe „Abgabe Modul 2“ erledigt',
      'Aufgabe „Abgabe Modul 2“ angelegt',
    ])
  })

  it('verwaltet Termine: Pflichtdatum, anlegen, bearbeiten, löschen', () => {
    renderApp('/aufgaben?ansicht=termine')
    expect(screen.getByRole('tab', { name: /Termine/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Keine anstehenden Termine')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Termin anlegen' }))
    let dialog = screen.getByRole('dialog', { name: 'Termin anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Coaching' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(dialog).getByText('Bitte ein Datum wählen.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^Datum/), { target: { value: '2030-05-04' } })
    fireEvent.change(within(dialog).getByLabelText(/^Uhrzeit/), { target: { value: '10:30' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('Sa., 04.05.2030, 10:30 Uhr')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Termin „Coaching“ bearbeiten' }))
    dialog = screen.getByRole('dialog', { name: 'Termin bearbeiten' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Termin löschen?' })).getByRole('button', { name: 'Termin löschen' }))
    expect(screen.getByText('Keine anstehenden Termine')).toBeInTheDocument()
  })

  it('wechselt die Tabs per Pfeiltaste', () => {
    renderApp('/aufgaben')
    const aufgabenTab = screen.getByRole('tab', { name: /Aufgaben/ })
    fireEvent.keyDown(aufgabenTab, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /Termine/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Termine/ })).toHaveFocus()
  })
})
