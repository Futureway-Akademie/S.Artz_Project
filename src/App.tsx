import { BrowserRouter } from 'react-router'
import { AppRoutes } from './app/routes.tsx'
import { StoreGate } from './app/StoreGate.tsx'
import { createSeedData } from './data/seed.ts'
import { StoreProvider } from './data/store.tsx'

const ausgangsdaten = () => createSeedData()

export default function App() {
  return (
    <StoreProvider createInitialData={ausgangsdaten}>
      <StoreGate>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </StoreGate>
    </StoreProvider>
  )
}
