import { fireEvent, screen, within } from '@testing-library/react'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 7, 9, 30)) // Mi., 07.10.2026
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Arbeitscockpit', () => {
  it('begrüßt mit Name, Datum und Kurstag aus dem Gerätedatum', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Arbeitscockpit' })).toBeInTheDocument()
    expect(screen.getByText('Guten Morgen, Alex')).toBeInTheDocument()
    expect(screen.getByText('Mittwoch, 7. Oktober 2026 · Kurstag 48 von 100')).toBeInTheDocument()
  })

  it('zeigt ohne Daten Leerzustände statt erfundener Werte', () => {
    renderApp('/')
    expect(screen.getByText('Keine offenen Schritte')).toBeInTheDocument()
    expect(screen.getByText('Nichts in den nächsten 7 Tagen')).toBeInTheDocument()
    expect(screen.getByText('Noch keine Aktivitäten')).toBeInTheDocument()
    expect(screen.getByText('Noch kein Fortschritt – es sind keine Kursaufgaben eingetragen.')).toBeInTheDocument()
    const uebersicht = screen.getByRole('region', { name: 'Tagesübersicht' })
    expect(within(uebersicht).getAllByText('0')).toHaveLength(4)
  })

  it('zeigt nächste Schritte mit Frist-Hinweis und aktuelle Projekte ohne Prozentwerte', () => {
    renderApp('/', {
      daten: beispielSeed(new Date(), [
        { projekt: { id: 'seed-projekt-ki-skills', titel: '', kategorie: '', status: null, zuletztAktiv: null }, offen: ['Bilder ausgeben'] },
      ]),
    })
    const schritte = screen.getByRole('region', { name: 'Nächste Schritte' })
    expect(within(schritte).getByText('Bilder ausgeben')).toBeInTheDocument()
    expect(within(schritte).getByText('Noch keine Frist hinterlegt')).toBeInTheDocument()
    expect(within(schritte).getByRole('link', { name: 'Alle anzeigen (1)' })).toBeInTheDocument()
    const projekte = screen.getByRole('region', { name: 'Aktuelle Projekte' })
    expect(within(projekte).getAllByRole('listitem')).toHaveLength(6)
    expect(within(projekte).queryByText('Lebenslauf überarbeiten')).not.toBeInTheDocument()
    expect(projekte.textContent).not.toMatch(/\d+\s?%/)
  })

  it('zeigt echte Änderungen als letzte Aktivitäten', () => {
    renderApp('/projekte/seed-projekt-ki-skills')
    fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: 'pausiert' } })
    fireEvent.click(screen.getAllByRole('link', { name: 'Arbeitscockpit', hidden: true })[0]!)
    const aktivitaeten = screen.getByRole('region', { name: 'Letzte Aktivitäten' })
    expect(within(aktivitaeten).getByText('Projekt „KI-Skills“ geändert: Status')).toBeInTheDocument()
  })
})

describe('Erinnerung an die Sicherung', () => {
  it('erinnert ohne Sicherung und verlinkt in die Einstellungen', () => {
    renderApp('/')
    const hinweis = screen.getByText('Sicherung fällig.').closest('[role="status"]') as HTMLElement
    expect(hinweis).toHaveTextContent('Du hast noch keine Sicherung erstellt.')
    fireEvent.click(within(hinweis).getByRole('link', { name: 'Jetzt sichern' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeInTheDocument()
  })

  it('schweigt nach einer frischen Sicherung', () => {
    renderApp('/', { daten: { ...beispielSeed(), einstellungen: { anzeigename: '', letzteSicherungAm: new Date().toISOString() } } })
    expect(screen.queryByText('Sicherung fällig.')).toBeNull()
  })
})
