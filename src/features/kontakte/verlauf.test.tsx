import { act, fireEvent, screen, within } from '@testing-library/react'
import { createSeedData } from '../../data/seed.ts'
import type { AppData, Kontakt } from '../../domain/types.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-01T10:00:00.000Z'
const kim: Kontakt = {
  id: 'kim',
  name: 'Kim Muster',
  rolle: 'Recruiterin',
  unternehmenId: null,
  email: '',
  telefon: '',
  linkedinUrl: '',
  kontext: 'jobsuche',
  herkunft: '',
  notiz: '',
  projektIds: [],
  naechsteAktion: null,
  erstelltAm: zeit,
  geaendertAm: zeit,
}
const daten = (): AppData => ({ ...createSeedData(new Date(), []), kontakte: [kim] })

function sichern(gespeichert: () => AppData) {
  act(() => {
    window.dispatchEvent(new Event('pagehide'))
  })
  return gespeichert()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 9, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Kommunikationsverlauf und nächste Aktion', () => {
  it('setzt eine Wiedervorlage, zeigt sie im Cockpit und markiert sie als erledigt', () => {
    const { gespeichert } = renderApp('/kontakte/kim', { daten: daten() })
    const aktion = screen.getByRole('form', { name: 'Nächste Aktion festlegen' })
    fireEvent.click(within(aktion).getByRole('button', { name: 'Speichern' }))
    expect(within(aktion).getByText('Bitte beschreibe die nächste Aktion.')).toBeInTheDocument()
    fireEvent.change(within(aktion).getByLabelText(/^Was ist als Nächstes/), { target: { value: 'Nachfassen wegen Gespräch' } })
    fireEvent.click(within(aktion).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('Nachfassen wegen Gespräch')).toBeInTheDocument()
    expect(screen.getByText('Noch keine Frist hinterlegt')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ändern' }))
    fireEvent.change(screen.getByLabelText(/^Wiedervorlage am/), { target: { value: '2026-10-07' } })
    fireEvent.click(within(screen.getByRole('form', { name: 'Nächste Aktion festlegen' })).getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('Heute fällig')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('link', { name: 'Arbeitscockpit', hidden: true })[0]!)
    const schritte = screen.getByRole('region', { name: 'Nächste Schritte' })
    expect(within(schritte).getByText('Nachfassen wegen Gespräch')).toBeInTheDocument()
    expect(within(schritte).getByRole('link', { name: 'Kim Muster' })).toBeInTheDocument()

    fireEvent.click(within(schritte).getByRole('link', { name: 'Kim Muster' }))
    fireEvent.click(screen.getByRole('button', { name: 'Erledigt' }))
    expect(screen.getByRole('form', { name: 'Nächste Aktion festlegen' })).toBeInTheDocument()
    expect(sichern(gespeichert).kontakte[0]!.naechsteAktion).toBeNull()
  })

  it('erfasst Verlaufseinträge mit Art, Datum und Projektbezug und löscht sie nach Bestätigung', () => {
    const { gespeichert } = renderApp('/kontakte/kim', { daten: daten() })
    expect(screen.getByText('Noch kein Verlauf')).toBeInTheDocument()
    const form = screen.getByRole('form', { name: 'Verlaufseintrag hinzufügen' })
    expect(within(form).getByLabelText(/^Datum/)).toHaveValue('2026-10-07')
    fireEvent.change(within(form).getByLabelText(/^Art/), { target: { value: 'telefonat' } })
    fireEvent.change(within(form).getByLabelText(/^Inhalt/), { target: { value: 'Erstgespräch, Unterlagen schicken.' } })
    fireEvent.change(within(form).getByLabelText(/^Projekt/), { target: { value: 'seed-projekt-jobsuche' } })
    fireEvent.click(within(form).getByRole('button', { name: 'Eintrag hinzufügen' }))

    const verlauf = screen.getByRole('list', { name: 'Verlauf' })
    expect(within(verlauf).getByText('Telefonat · Mi., 07.10.2026')).toBeInTheDocument()
    expect(within(verlauf).getByText('Erstgespräch, Unterlagen schicken.')).toBeInTheDocument()
    expect(within(verlauf).getByRole('link', { name: 'Jobsuche Festanstellung' })).toBeInTheDocument()

    fireEvent.click(within(verlauf).getByRole('button', { name: 'Verlaufseintrag vom Mi., 07.10.2026 löschen' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Verlaufseintrag löschen?' })).getByRole('button', { name: 'Eintrag löschen' }))
    expect(screen.getByText('Noch kein Verlauf')).toBeInTheDocument()
    expect(sichern(gespeichert).aktivitaeten[0]!.zusammenfassung).toMatch(/^Verlaufseintrag „Erstgespräch/)
  })

  it('ordnet Projekte zu und zeigt den Kontakt im Projekt', () => {
    renderApp('/kontakte/kim', { daten: daten() })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Fidelio-Homepage' }))
    expect(screen.getByRole('region', { name: 'Projekte (1)' })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('link', { name: 'Projekte', hidden: true })[0]!)
    fireEvent.click(screen.getByRole('link', { name: 'Fidelio-Homepage' }))
    const kontakte = screen.getByRole('region', { name: 'Kontakte' })
    expect(within(kontakte).getByRole('link', { name: 'Kim Muster' })).toBeInTheDocument()
  })

  it('filtert Kontakte mit fälliger Aktion', () => {
    const mit = daten()
    mit.kontakte = [
      { ...kim, naechsteAktion: { text: 'Anrufen', faelligAm: '2026-10-06' } },
      { ...kim, id: 'spaeter', name: 'Später', naechsteAktion: { text: 'Mail', faelligAm: '2026-10-20' } },
      { ...kim, id: 'ohne', name: 'Ohne Aktion' },
    ]
    renderApp('/kontakte', { daten: mit })
    const liste = () => within(screen.getByRole('list', { name: 'Kontakte' })).getAllByRole('link').map((l) => l.textContent)
    expect(liste()).toEqual(['Kim Muster', 'Später', 'Ohne Aktion'])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mit fälliger Aktion' }))
    expect(liste()).toEqual(['Kim Muster'])
  })
})
