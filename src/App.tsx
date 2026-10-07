import { BrowserRouter } from 'react-router'
import { AppRoutes } from './app/routes.tsx'
import { StoreGate } from './app/StoreGate.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import { createSeedData } from './data/seed.ts'
import { StoreProvider } from './data/store.tsx'

const ausgangsdaten = () => createSeedData()

export default function App() {
  return (
    <StoreProvider createInitialData={ausgangsdaten}>
      <StoreGate>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </StoreGate>
    </StoreProvider>
  )
}
