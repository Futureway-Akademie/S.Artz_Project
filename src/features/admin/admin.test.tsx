import { act, fireEvent, screen, within } from '@testing-library/react'
import { bereichUmschalten, type Profil, type Rolle } from '../../domain/bereiche.ts'
import { createFakeCloud } from '../../test/fakeCloud.ts'
import { renderApp } from '../../test/renderApp.tsx'

const rollen: Rolle[] = [
  { id: 'r1', name: 'Kunde', bereiche: ['cockpit', 'projekte'] },
  { id: 'r2', name: 'Mitarbeiter', bereiche: ['cockpit', 'kontakte'] },
]
const p = (userId: string, email: string, extra: Partial<Profil> = {}): Profil => ({ userId, email, anzeigename: '', rolleId: null, istAdmin: false, gesperrt: false, bereicheAn: [], bereicheAus: [], ...extra })

function cloud(alsAdmin = true, weitere: Profil[] = []) {
  return createFakeCloud({
    nutzer: alsAdmin ? { id: 'u1', email: 'admin@example.org' } : { id: 'u2', email: 'kim@example.org' },
    profile: [p('u1', 'admin@example.org', { istAdmin: true }), p('u2', 'kim@example.org', { rolleId: 'r1' }), ...weitere],
    rollen,
  })
}

const karte = (name: string) => screen.getByRole('article', { name })

describe('Admin-Bereich', () => {
  it('schaltet Bereiche um und hält Abweichungen von der Rolle fest', () => {
    const kim = { bereicheAn: [], bereicheAus: [] }
    expect(bereichUmschalten(kim, ['cockpit', 'projekte'], 'projekte', false)).toEqual({ bereicheAn: [], bereicheAus: ['projekte'] })
    expect(bereichUmschalten(kim, ['cockpit', 'projekte'], 'kalender', true)).toEqual({ bereicheAn: ['kalender'], bereicheAus: [] })
    expect(bereichUmschalten({ bereicheAn: [], bereicheAus: ['projekte'] }, ['projekte'], 'projekte', true)).toEqual({ bereicheAn: [], bereicheAus: [] })
  })

  it('lädt Nutzer ein, ändert Rolle und Bereiche und sperrt', async () => {
    const fake = cloud()
    renderApp('/admin', { cloud: fake.dienst })
    const kim = await screen.findByRole('article', { name: 'kim@example.org' }, { timeout: 5000 })
    expect(within(karte('admin@example.org')).getByText(/^Admins sehen alle Bereiche/)).toBeInTheDocument()

    // Bereich zusätzlich zur Rolle freigeben
    expect(within(within(kim).getByRole('group', { name: 'Bereiche' })).getByRole('checkbox', { name: /^Projekte/ })).toBeChecked()
    await act(async () => {
      fireEvent.click(within(kim).getByRole('checkbox', { name: /^Kalender/ }))
    })
    expect(fake.profile().find((x) => x.userId === 'u2')!.bereicheAn).toEqual(['kalender'])
    expect(within(karte('kim@example.org')).getByRole('checkbox', { name: /^Kalender.*abweichend/ })).toBeChecked()

    // Rolle wechseln setzt Abweichungen zurück
    await act(async () => {
      fireEvent.change(within(karte('kim@example.org')).getByLabelText('Rolle'), { target: { value: 'r2' } })
    })
    expect(fake.profile().find((x) => x.userId === 'u2')).toMatchObject({ rolleId: 'r2', bereicheAn: [] })

    // Sperren mit Bestätigung
    fireEvent.click(within(karte('kim@example.org')).getByRole('button', { name: 'Sperren' }))
    await act(async () => {
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Nutzer sperren?' })).getByRole('button', { name: 'Sperren' }))
    })
    expect(fake.profile().find((x) => x.userId === 'u2')!.gesperrt).toBe(true)
    expect(within(karte('kim@example.org')).getByText('Gesperrt')).toBeInTheDocument()

    // Einladen
    const form = screen.getByRole('form', { name: 'Nutzer einladen' })
    fireEvent.change(within(form).getByLabelText(/E-Mail-Adresse/), { target: { value: 'neu@example.org' } })
    fireEvent.change(within(form).getByLabelText('Rolle'), { target: { value: 'r1' } })
    await act(async () => {
      fireEvent.click(within(form).getByRole('button', { name: 'Einladung senden' }))
    })
    expect(fake.einladungen).toEqual([{ email: 'neu@example.org', rolleId: 'r1' }])
  })

  it('pflegt Rollen', async () => {
    const fake = cloud()
    renderApp('/admin', { cloud: fake.dienst })
    const rolle = await screen.findByRole('article', { name: 'Kunde' }, { timeout: 5000 })
    await act(async () => {
      fireEvent.click(within(rolle).getByRole('checkbox', { name: 'Kalender' }))
    })
    expect((await fake.dienst.rollen()).find((r) => r.id === 'r1')!.bereiche).toEqual(['cockpit', 'projekte', 'kalender'])
    fireEvent.change(screen.getByRole('textbox', { name: /^Neue Rolle/ }), { target: { value: 'Praktikant' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Rolle anlegen' }))
    })
    expect(await screen.findByRole('article', { name: 'Praktikant' })).toBeInTheDocument()
  })

  it('legt den Freigabe-Kreis und das Recht zum Teilen fest', async () => {
    const fake = cloud(true, [p('u3', 'lea@example.org', { rolleId: 'r1', anzeigename: 'Lea' }), p('u4', 'max@example.org', { rolleId: 'r1' })])
    renderApp('/admin', { cloud: fake.dienst })
    const kim = await screen.findByRole('article', { name: 'kim@example.org' }, { timeout: 5000 })
    expect(within(karte('admin@example.org')).getByText(/dürfen mit allen teilen/)).toBeInTheDocument()

    // Ohne Recht: Hinweis, Auswahl zeigt den Wert der Rolle
    expect(within(kim).getByLabelText('Teilen und Aufgaben übergeben')).toHaveDisplayValue('Wie die Rolle (nicht erlaubt)')
    expect(within(kim).getByText(/kann diese Person selbst nichts teilen/)).toBeInTheDocument()

    // Recht über die Rolle
    await act(async () => {
      fireEvent.click(within(screen.getByRole('article', { name: 'Kunde' })).getByRole('checkbox', { name: /Darf teilen und Aufgaben übergeben/ }))
    })
    expect((await fake.dienst.rollen()).find((r) => r.id === 'r1')).toMatchObject({ darfTeilen: true, bereiche: ['cockpit', 'projekte'] })
    expect(within(karte('kim@example.org')).getByLabelText('Teilen und Aufgaben übergeben')).toHaveDisplayValue('Wie die Rolle (erlaubt)')

    // Abweichung je Nutzer
    await act(async () => {
      fireEvent.change(within(karte('max@example.org')).getByLabelText('Teilen und Aufgaben übergeben'), { target: { value: 'nein' } })
    })
    expect(fake.profile().find((x) => x.userId === 'u4')!.darfTeilen).toBe(false)

    // Kreis: Kim und Lea; erscheint auf beiden Karten
    const kreisKim = () => within(karte('kim@example.org')).getByRole('group', { name: /Freigabe-Kreis/ })
    await act(async () => {
      fireEvent.click(within(kreisKim()).getByRole('checkbox', { name: 'Lea' }))
    })
    expect(fake.geteilt.kreis).toEqual([{ a: 'u2', b: 'u3' }])
    expect(within(within(karte('lea@example.org')).getByRole('group', { name: /Freigabe-Kreis/ })).getByRole('checkbox', { name: 'kim@example.org' })).toBeChecked()
    expect(within(kreisKim()).getByRole('checkbox', { name: 'max@example.org' })).not.toBeChecked()

    // Aus Sicht der Nutzer (gleicher Server-Zustand): Kim wählt nur Lea, Max (Recht entzogen) niemanden
    const alsNutzer = async (id: string, email: string) => createFakeCloud({ nutzer: { id, email }, profile: fake.profile(), rollen: await fake.dienst.rollen(), geteilt: fake.geteilt }).dienst
    const kimSicht = await alsNutzer('u2', 'kim@example.org')
    expect((await kimSicht.kreisPartner()).map((x) => x.email)).toEqual(['lea@example.org'])
    expect(await kimSicht.freigabeKreis()).toEqual([{ a: 'u2', b: 'u3' }])
    const maxSicht = await alsNutzer('u4', 'max@example.org')
    expect(await maxSicht.kreisPartner()).toEqual([])
    expect(await maxSicht.freigabeKreis()).toEqual([])
    await expect(maxSicht.kreisPaarSetzen('u4', 'u2', true)).rejects.toThrow()

    // Entfernen
    await act(async () => {
      fireEvent.click(within(kreisKim()).getByRole('checkbox', { name: 'Lea' }))
    })
    expect(fake.geteilt.kreis).toEqual([])
  })

  it('ist für Nicht-Admins gesperrt', async () => {
    renderApp('/admin', { cloud: cloud(false).dienst })
    expect(await screen.findByText('Kein Zugriff')).toBeInTheDocument()
  })
})
