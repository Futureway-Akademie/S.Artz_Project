import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from '../app/routes.tsx'
import { CloudProvider } from '../app/CloudProvider.tsx'
import { StoreGate } from '../app/StoreGate.tsx'
import type { CloudDienst } from '../data/cloud/cloud.ts'
import { ToastProvider } from '../components/ui/Toast.tsx'
import { beispielSeed } from './beispielStart.ts'
import { STORAGE_KEY } from '../data/storage.ts'
import { StoreProvider } from '../data/store.tsx'
import type { AppData } from '../domain/types.ts'
import { createFakeStorage } from './fakes.ts'

/** Rendert die ganze App an `pfad`; Daten im Fake-Speicher (Standard: Seed ohne private Details). */
export function renderApp(pfad = '/', opts: { storage?: ReturnType<typeof createFakeStorage>; daten?: AppData; cloud?: CloudDienst } = {}) {
  const storage =
    opts.storage ?? createFakeStorage(opts.daten ? { [STORAGE_KEY]: JSON.stringify(opts.daten) } : {})
  const app = (
    <StoreProvider storage={storage} createInitialData={() => beispielSeed(new Date())}>
      <StoreGate>
        <ToastProvider>
          <MemoryRouter initialEntries={[pfad]}>
            <AppRoutes />
          </MemoryRouter>
        </ToastProvider>
      </StoreGate>
    </StoreProvider>
  )
  const ergebnis = render(opts.cloud ? <CloudProvider dienst={opts.cloud}>{app}</CloudProvider> : app)
  /** Aktuell gespeicherte Daten (nach Ablauf der Speicherverzögerung) */
  const gespeichert = (): AppData => JSON.parse(storage.map.get(STORAGE_KEY)!)
  return { ...ergebnis, storage, gespeichert }
}
