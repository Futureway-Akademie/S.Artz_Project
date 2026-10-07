import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ToastProvider } from '../components/ui/Toast.tsx'
import type { CloudDienst } from '../data/cloud/cloud.ts'
import { ladeSyncMeta } from '../data/cloud/sync.ts'
import { STORAGE_KEY } from '../data/storage.ts'
import { StoreProvider } from '../data/store.tsx'
import { beispielSeed } from '../test/beispielStart.ts'
import { createFakeCloud } from '../test/fakeCloud.ts'
import { createFakeStorage } from '../test/fakes.ts'
import { CloudProvider } from './CloudProvider.tsx'
import { AppRoutes } from './routes.tsx'
import { StoreGate } from './StoreGate.tsx'
import { TresorGate } from './TresorGate.tsx'

const ITER = 1000
const PASSWORT = 'ein-langes-passwort'

function geraet(cloud: CloudDienst, basis = createFakeStorage(), pfad = '/einstellungen') {
  render(
    <CloudProvider dienst={cloud}>
      <TresorGate basis={basis} iterationen={ITER}>
        {(storage) => (
          <StoreProvider storage={storage} createInitialData={() => beispielSeed()} saveDelayMs={0}>
            <StoreGate>
              <ToastProvider>
                <MemoryRouter initialEntries={[pfad]}>
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

describe('Synchronisierung zwischen zwei Geräten', () => {
  it('Gerät A lädt verschlüsselt hoch, Gerät B holt die Daten und entsperrt mit demselben Passwort', async () => {
    const cloud = createFakeCloud({ nutzer: { id: 'u1', email: 'ich@example.org' } })

    // Gerät A: Passwort festlegen, Daten ändern
    const a = geraet(cloud.dienst)
    tippe(/^Passwort \*$/, PASSWORT)
    tippe(/^Passwort wiederholen/, PASSWORT)
    fireEvent.click(screen.getByRole('checkbox', { name: /Ohne dieses Passwort/ }))
    fireEvent.click(screen.getByRole('button', { name: /öffnen/ }))
    await screen.findByRole('heading', { level: 1, name: 'Einstellungen' })
    tippe(/^Name für die Begrüßung/, 'Von Gerät A')
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt synchronisieren' }))
    await waitFor(() => expect(cloud.stand()?.umschlag).toBeDefined(), { timeout: 4000 })
    await waitFor(() => expect(ladeSyncMeta(a).lokalGeaendert).toBe(false), { timeout: 4000 })
    expect(cloud.uploads.every((u) => !u.includes('Von Gerät A'))).toBe(true)
    expect(await screen.findByText(/Synchronisiert – verschlüsselt gespeichert/)).toBeInTheDocument()
    cleanup()

    // Gerät B: leer, holt die Daten aus der Cloud
    const b = geraet(cloud.dienst, createFakeStorage(), '/')
    fireEvent.click(await screen.findByRole('button', { name: 'Daten aus der Cloud laden' }))
    expect(await screen.findByRole('heading', { name: 'Gesperrt' })).toBeInTheDocument()
    expect(b.map.get(STORAGE_KEY)).not.toContain('Von Gerät A')
    tippe(/^Passwort/, PASSWORT)
    fireEvent.click(screen.getByRole('button', { name: 'Entsperren' }))
    expect(await screen.findByText(/Von Gerät A/)).toBeInTheDocument()
  }, 20000)

  it('zeigt bei Änderungen auf beiden Seiten eine Auswahl statt still zu überschreiben', async () => {
    const cloud = createFakeCloud({ nutzer: { id: 'u1', email: 'ich@example.org' } })
    const a = geraet(cloud.dienst)
    tippe(/^Passwort \*$/, PASSWORT)
    tippe(/^Passwort wiederholen/, PASSWORT)
    fireEvent.click(screen.getByRole('checkbox', { name: /Ohne dieses Passwort/ }))
    fireEvent.click(screen.getByRole('button', { name: /öffnen/ }))
    await screen.findByRole('heading', { level: 1, name: 'Einstellungen' })
    await waitFor(() => expect(cloud.stand()).not.toBeNull(), { timeout: 4000 })
    const ersterStand = cloud.stand()!

    // Ein anderes Gerät lädt einen neueren Stand hoch …
    cloud.setzeStand({ ...ersterStand, revision: ersterStand.revision + 1 })
    // … während hier ebenfalls geändert wird
    tippe(/^Name für die Begrüßung/, 'Hier geändert')
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(ladeSyncMeta(a).lokalGeaendert).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Jetzt synchronisieren' }))
    expect(await screen.findByText(/Auch auf einem anderen Gerät wurde geändert/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Diesen Stand behalten und hochladen' }))
    await waitFor(() => expect(screen.queryByText(/Auch auf einem anderen Gerät wurde geändert/)).toBeNull())
    expect(cloud.stand()!.revision).toBe(ersterStand.revision + 2)
  }, 20000)
})
