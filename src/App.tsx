import { BrowserRouter } from 'react-router'
import { AppRoutes } from './app/routes.tsx'
import { StoreGate } from './app/StoreGate.tsx'
import { TresorGate } from './app/TresorGate.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import { createSeedData } from './data/seed.ts'
import { getBrowserStorage } from './data/storage.ts'
import { StoreProvider } from './data/store.tsx'

const ausgangsdaten = () => createSeedData()
const browserSpeicher = getBrowserStorage()

export default function App() {
  return (
    <TresorGate basis={browserSpeicher}>
      {(storage) => (
        <StoreProvider storage={storage} createInitialData={ausgangsdaten}>
          <StoreGate>
            <ToastProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </ToastProvider>
          </StoreGate>
        </StoreProvider>
      )}
    </TresorGate>
  )
}
