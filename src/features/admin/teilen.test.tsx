import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { CloudProvider } from '../../app/CloudProvider.tsx'
import { AppRoutes } from '../../app/routes.tsx'
import { TresorContext, type TresorValue } from '../../app/tresorContext.ts'
import { ToastProvider } from '../../components/ui/Toast.tsx'
import { STORAGE_KEY } from '../../data/storage.ts'
import { StoreProvider } from '../../data/store.tsx'
import type { Profil } from '../../domain/bereiche.ts'
import type { AppData } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { createFakeCloud, neuerGeteilterZustand } from '../../test/fakeCloud.ts'
import { createFakeStorage } from '../../test/fakes.ts'

const zeit = '2026-10-01T10:00:00.000Z'
const profil = (userId: string, istAdmin = false): Profil => ({ userId, email: `${userId}@example.org`, anzeigename: '', rolleId: null, istAdmin, gesperrt: false, bereicheAn: [], bereicheAus: [] })

function geraet(id: string, pfad: string, geteilt: ReturnType<typeof neuerGeteilterZustand>, schluessel: CryptoKey, daten?: AppData) {
  const cloud = createFakeCloud({ nutzer: { id, email: `${id}@example.org` }, profile: [profil('admin', true), profil('kim')], geteilt })
  const tresor = { datenschluessel: () => schluessel } as unknown as TresorValue
  const storage = createFakeStorage(daten ? { [STORAGE_KEY]: JSON.stringify(daten) } : {})
  render(
    <CloudProvider dienst={cloud.dienst}>
      <TresorContext.Provider value={tresor}>
        <StoreProvider storage={storage} createInitialData={() => beispielSeed()}>
          <ToastProvider>
            <MemoryRouter initialEntries={[pfad]}>
              <AppRoutes />
            </MemoryRouter>
          </ToastProvider>
        </StoreProvider>
      </TresorContext.Provider>
    </CloudProvider>,
  )
}

const neuerSchluessel = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])

describe('Bereiche teilen (Admin → Nutzer)', () => {
  afterEach(() => localStorage.clear())

  it('teilt Wissen verschlüsselt, Kim liest es, nach dem Entzug nicht mehr', async () => {
    const geteilt = neuerGeteilterZustand()
    const kimTresor = await neuerSchluessel()
    const adminTresor = await neuerSchluessel()
    const daten = { ...beispielSeed(), wissen: [{ id: 'w1', typ: 'erkenntnis' as const, titel: 'Prompts brauchen ein Format', inhalt: 'JSON hilft.', thema: '', quelle: '', schlagworte: [], datum: null, projektIds: [], kursId: null, kursAufgabeIds: [], erstelltAm: zeit, geaendertAm: zeit }] }

    // Kim meldet sich an: ihr Schlüsselpaar entsteht
    geraet('kim', '/geteilt', geteilt, kimTresor)
    expect(await screen.findByText('Noch nichts geteilt')).toBeInTheDocument()
    await waitFor(() => expect(geteilt.schluessel.has('kim')).toBe(true))
    cleanup()

    // Admin teilt „Wissen“ mit Kim
    geraet('admin', '/admin', geteilt, adminTresor, daten)
    const kim = await screen.findByRole('article', { name: 'kim@example.org' }, { timeout: 5000 })
    const teilen = within(kim).getByRole('group', { name: /Von deinen Daten teilen/ })
    await act(async () => {
      fireEvent.click(within(teilen).getByRole('checkbox', { name: 'Wissen' }))
    })
    expect(await screen.findByText('Bereich verschlüsselt geteilt')).toBeInTheDocument()
    expect(within(teilen).getByRole('checkbox', { name: 'Wissen' })).toBeChecked()
    expect(JSON.stringify([...geteilt.freigaben.values()])).not.toContain('Prompts brauchen')
    cleanup()

    // Kim liest
    geraet('kim', '/geteilt', geteilt, kimTresor)
    expect(await screen.findByText('Prompts brauchen ein Format', {}, { timeout: 5000 })).toBeInTheDocument()
    cleanup()

    // Admin entzieht
    geraet('admin', '/admin', geteilt, adminTresor, daten)
    const kim2 = await screen.findByRole('article', { name: 'kim@example.org' }, { timeout: 5000 })
    await waitFor(() => expect(within(within(kim2).getByRole('group', { name: /Von deinen Daten teilen/ })).getByRole('checkbox', { name: 'Wissen' })).toBeChecked())
    await act(async () => {
      fireEvent.click(within(within(kim2).getByRole('group', { name: /Von deinen Daten teilen/ })).getByRole('checkbox', { name: 'Wissen' }))
    })
    expect(await screen.findByText(/Freigabe beendet/)).toBeInTheDocument()
    cleanup()

    geraet('kim', '/geteilt', geteilt, kimTresor)
    expect(await screen.findByText('Noch nichts geteilt', {}, { timeout: 5000 })).toBeInTheDocument()
  })
})
