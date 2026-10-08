import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { einladungPruefen, erlaubterRuecksprung, ursprungsListe } from '../../supabase/functions/_gemeinsam/pruefen.ts'
import { ToastProvider } from '../components/ui/Toast.tsx'
import type { CloudDienst } from '../data/cloud/cloud.ts'
import { BESITZER_KEY, besitzer } from '../data/cloud/sync.ts'
import { StoreProvider } from '../data/store.tsx'
import type { Profil } from '../domain/bereiche.ts'
import { beispielSeed } from '../test/beispielStart.ts'
import { createFakeCloud } from '../test/fakeCloud.ts'
import { createFakeStorage } from '../test/fakes.ts'
import { CloudProvider } from './CloudProvider.tsx'
import { AppRoutes } from './routes.tsx'
import { StoreGate } from './StoreGate.tsx'
import { TresorGate } from './TresorGate.tsx'

const ITER = 1000
const PASSWORT = 'ein-langes-passwort'
const ROLLE = '11111111-2222-4333-8444-555555555555'
const kim: Profil = { userId: 'u2', email: 'kim@example.org', anzeigename: '', rolleId: 'r1', istAdmin: false, gesperrt: false, bereicheAn: [], bereicheAus: [] }

function geraet(cloud: CloudDienst, basis = createFakeStorage()) {
  render(
    <CloudProvider dienst={cloud}>
      <TresorGate basis={basis} iterationen={ITER}>
        {(storage) => (
          <StoreProvider storage={storage} createInitialData={() => beispielSeed()} saveDelayMs={0}>
            <StoreGate>
              <ToastProvider>
                <MemoryRouter initialEntries={['/einstellungen']}>
                  <AppRoutes />
                </MemoryRouter>
              </ToastProvider>
            </StoreGate>
          </StoreProvider>
        )}
      </TresorGate>
    </CloudProvider>,
  )
  return basis
}

const tippe = (label: RegExp, wert: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: wert } })

describe('Einladung (Prüfung in der Supabase-Funktion)', () => {
  const erlaubt = ursprungsListe('http://localhost:5173, https://cockpit.example.de/')

  it('akzeptiert nur gültige Adresse, Rolle und erlaubten Rücksprung', () => {
    expect(erlaubt).toEqual(['http://localhost:5173', 'https://cockpit.example.de'])
    expect(einladungPruefen({ email: ' Kim@Example.org ', rolleId: ROLLE, zurueck: 'http://localhost:5173/' }, erlaubt)).toEqual({
      ok: true,
      einladung: { email: 'kim@example.org', rolleId: ROLLE, zurueck: 'http://localhost:5173/' },
    })
    expect(einladungPruefen({ email: 'kein-mail', rolleId: null, zurueck: 'http://localhost:5173/' }, erlaubt)).toMatchObject({ ok: false })
    expect(einladungPruefen({ email: 'a@b.de', rolleId: "x'; drop table", zurueck: 'http://localhost:5173/' }, erlaubt)).toMatchObject({ ok: false, fehler: 'Ungültige Rolle.' })
    expect(einladungPruefen({ email: 'a@b.de', rolleId: null, zurueck: 'https://boese.example.com/' }, erlaubt)).toMatchObject({ ok: false })
    expect(erlaubterRuecksprung('javascript:alert(1)', erlaubt)).toBe(false)
    expect(einladungPruefen(null, erlaubt)).toMatchObject({ ok: false })
  })
})

describe('Erstanmeldung eingeladener Nutzer', () => {
  it('begrüßt, legt einen eigenen Tresor an und merkt sich das Konto des Geräts', async () => {
    const cloud = createFakeCloud({ nutzer: { id: 'u2', email: 'kim@example.org' }, profile: [kim], rollen: [{ id: 'r1', name: 'Kunde', bereiche: ['cockpit'] }] })
    const basis = geraet(cloud.dienst)
    expect(await screen.findByRole('heading', { name: 'Willkommen, kim@example.org' })).toBeInTheDocument()
    expect(screen.getByText(/auch nicht der Admin/)).toBeInTheDocument()
    tippe(/^Passwort \*$/, PASSWORT)
    tippe(/^Passwort wiederholen/, PASSWORT)
    fireEvent.click(screen.getByRole('checkbox', { name: /Ohne dieses Passwort/ }))
    fireEvent.click(screen.getByRole('button', { name: /öffnen/ }))
    await screen.findByRole('heading', { level: 1, name: 'Einstellungen' })
    await waitFor(() => expect(cloud.stand()).not.toBeNull(), { timeout: 4000 })
    expect(besitzer(basis)).toBe('u2')
  })

  it('gleicht nicht mit einem fremden Konto ab, wenn sich auf demselben Gerät jemand anderes anmeldet', async () => {
    const cloud = createFakeCloud({ nutzer: { id: 'u2', email: 'kim@example.org' }, profile: [kim] })
    const basis = createFakeStorage({ [BESITZER_KEY]: 'u1' })
    geraet(cloud.dienst, basis)
    tippe(/^Passwort \*$/, PASSWORT)
    tippe(/^Passwort wiederholen/, PASSWORT)
    fireEvent.click(screen.getByRole('checkbox', { name: /Ohne dieses Passwort/ }))
    fireEvent.click(screen.getByRole('button', { name: /öffnen/ }))
    expect((await screen.findAllByRole('alert')).some((a) => /gehören zu einem anderen Konto/.test(a.textContent ?? ''))).toBe(true)
    await new Promise((r) => setTimeout(r, 50))
    expect(cloud.uploads).toEqual([])
    expect(besitzer(basis)).toBe('u1')
  })
})
