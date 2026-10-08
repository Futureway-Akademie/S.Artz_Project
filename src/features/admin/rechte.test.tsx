import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { Profil } from '../../domain/bereiche.ts'
import { createFakeCloud } from '../../test/fakeCloud.ts'
import { renderApp } from '../../test/renderApp.tsx'

const kunde: Profil = { userId: 'u2', email: 'kim@example.org', anzeigename: '', rolleId: 'r1', istAdmin: false, gesperrt: false, bereicheAn: [], bereicheAus: [] }
const cloud = (profil: Partial<Profil> = {}) =>
  createFakeCloud({
    nutzer: { id: 'u2', email: 'kim@example.org' },
    profile: [{ ...kunde, ...profil }],
    rollen: [{ id: 'r1', name: 'Kunde', bereiche: ['cockpit', 'projekte', 'aufgaben'] }],
  }).dienst

const nav = () => screen.getAllByRole('navigation', { name: 'Hauptnavigation', hidden: true })[0]!

describe('Rechte in der Oberfläche', () => {
  afterEach(() => localStorage.clear())

  it('zeigt nur freigegebene Bereiche in Navigation, Cockpit, Suche und Schnellerfassung', async () => {
    renderApp('/', { cloud: cloud() })
    await waitFor(() => expect(within(nav()).queryByRole('link', { name: 'Kontakte & Leads', hidden: true })).toBeNull())
    const links = within(nav()).getAllByRole('link', { hidden: true }).map((l) => l.textContent)
    expect(links).toEqual(['Arbeitscockpit', 'Aufgaben & Termine', 'Projekte', 'Einstellungen'])
    expect(screen.getByRole('region', { name: 'Aktuelle Projekte' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Weiterbildung' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'Kontakte & Bewerbungen' })).toBeNull()

    fireEvent.click(screen.getAllByRole('button', { name: /Neu anlegen/ })[0]!)
    const auswahl = within(screen.getByRole('dialog', { name: 'Neu anlegen' })).getByRole('list', { name: 'Was möchtest du anlegen?' })
    expect(within(auswahl).getAllByRole('button').map((b) => b.textContent)).toEqual(['Aufgabe', 'Termin', 'Projekt'])
  })

  it('sperrt direkte Aufrufe nicht freigegebener Bereiche', async () => {
    renderApp('/kontakte', { cloud: cloud() })
    expect(await screen.findByRole('heading', { level: 1, name: 'Kein Zugriff' })).toBeInTheDocument()
  })

  it('führt ohne Cockpit-Recht zum ersten freigegebenen Bereich', async () => {
    renderApp('/', { cloud: cloud({ bereicheAus: ['cockpit'] }) })
    expect(await screen.findByRole('heading', { level: 1, name: 'Aufgaben & Termine' })).toBeInTheDocument()
  })

  it('zeigt gesperrten Nutzern nur einen Hinweis', async () => {
    renderApp('/projekte', { cloud: cloud({ gesperrt: true }) })
    expect(await screen.findByRole('heading', { level: 1, name: 'Zugang gesperrt' })).toBeInTheDocument()
  })
})
