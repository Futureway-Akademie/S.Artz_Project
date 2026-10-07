import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from '../app/routes.tsx'
import { StoreGate } from '../app/StoreGate.tsx'
import { ToastProvider } from '../components/ui/Toast.tsx'
import { createSeedData } from '../data/seed.ts'
import { STORAGE_KEY } from '../data/storage.ts'
import { StoreProvider } from '../data/store.tsx'
import type { AppData } from '../domain/types.ts'
import { createFakeStorage } from './fakes.ts'

/** Rendert die ganze App an `pfad`; Daten im Fake-Speicher (Standard: Seed ohne private Details). */
export function renderApp(pfad = '/', opts: { storage?: ReturnType<typeof createFakeStorage>; daten?: AppData } = {}) {
  const storage =
    opts.storage ?? createFakeStorage(opts.daten ? { [STORAGE_KEY]: JSON.stringify(opts.daten) } : {})
  const ergebnis = render(
    <StoreProvider storage={storage} createInitialData={() => createSeedData(new Date(), [])}>
      <StoreGate>
        <ToastProvider>
          <MemoryRouter initialEntries={[pfad]}>
            <AppRoutes />
          </MemoryRouter>
        </ToastProvider>
      </StoreGate>
    </StoreProvider>,
  )
  /** Aktuell gespeicherte Daten (nach Ablauf der Speicherverzögerung) */
  const gespeichert = (): AppData => JSON.parse(storage.map.get(STORAGE_KEY)!)
  return { ...ergebnis, storage, gespeichert }
}
