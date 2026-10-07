import { act, fireEvent, screen } from '@testing-library/react'
import { STORAGE_KEY } from '../../data/storage.ts'
import { createFakeStorage } from '../../test/fakes.ts'
import { renderApp } from '../../test/renderApp.tsx'

describe('Statushinweise der App-Shell', () => {
  it('meldet Speicherfehler deutlich und verweist auf den Export', () => {
    vi.useFakeTimers()
    const storage = createFakeStorage({}, { setItemFehler: new DOMException('voll', 'QuotaExceededError') })
    renderApp('/', { storage })
    act(() => vi.advanceTimersByTime(500))
    const hinweis = screen.getByRole('alert')
    expect(hinweis).toHaveTextContent('Speichern fehlgeschlagen. Der Browser-Speicher ist voll.')
    expect(hinweis).toHaveTextContent('Exportiere deine Daten in den Einstellungen')
    vi.useRealTimers()
  })

  it('bietet nach Änderungen in einem anderen Tab das Neuladen an', () => {
    renderApp('/')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
    })
    expect(screen.getByText('Die Daten wurden in einem anderen Tab geändert.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Neu laden' }))
    expect(screen.queryByText('Die Daten wurden in einem anderen Tab geändert.')).not.toBeInTheDocument()
  })

  it('weist auf flüchtigen Betrieb hin, wenn kein Speicher verfügbar ist', async () => {
    const { render } = await import('@testing-library/react')
    const { MemoryRouter } = await import('react-router')
    const { StoreProvider } = await import('../../data/store.tsx')
    const { AppRoutes } = await import('../../app/routes.tsx')
    render(
      <StoreProvider storage={null}>
        <MemoryRouter>
          <AppRoutes />
        </MemoryRouter>
      </StoreProvider>,
    )
    expect(screen.getByRole('note', { name: 'Speicherhinweis' })).toHaveTextContent('Änderungen gehen beim Schließen der Seite verloren')
  })
})
