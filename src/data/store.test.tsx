import { act, fireEvent, render, screen } from '@testing-library/react'
import { createFakeStorage } from '../test/fakes.ts'
import { createEmptyData } from './empty.ts'
import { STORAGE_KEY } from './storage.ts'
import { StoreProvider } from './store.tsx'
import { useStore } from './storeContext.ts'

function Anzeige() {
  const { zustand, data, dispatch, persistenz, speicherFehler, externGeaendert, zuruecksetzen } = useStore()
  return (
    <div>
      <p>Phase: {zustand.phase}</p>
      <p>Persistenz: {persistenz}</p>
      <p>Rollen: {data.zielrollen.length}</p>
      <p>Aktivitäten: {data.aktivitaeten.length}</p>
      {speicherFehler && <p>Fehler: {speicherFehler}</p>}
      {externGeaendert && <p>Extern geändert</p>}
      <button type="button" onClick={() => dispatch({ type: 'anlegen', sammlung: 'zielrollen', daten: { titel: 'Prompt Engineer', notiz: '' } })}>
        Anlegen
      </button>
      <button type="button" onClick={zuruecksetzen}>
        Zurücksetzen
      </button>
    </div>
  )
}

const seed = () => ({ ...createEmptyData(), einstellungen: { anzeigename: 'Sascha' } })

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('StoreProvider', () => {
  it('schreibt bei leerem Speicher die Ausgangsdaten', () => {
    const storage = createFakeStorage()
    render(
      <StoreProvider storage={storage} createInitialData={seed}>
        <Anzeige />
      </StoreProvider>,
    )
    expect(screen.getByText('Phase: bereit')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(400))
    expect(JSON.parse(storage.map.get(STORAGE_KEY)!).einstellungen.anzeigename).toBe('Sascha')
  })

  it('speichert Änderungen entprellt', () => {
    const storage = createFakeStorage({ [STORAGE_KEY]: JSON.stringify(createEmptyData()) })
    render(
      <StoreProvider storage={storage}>
        <Anzeige />
      </StoreProvider>,
    )
    fireEvent.click(screen.getByText('Anlegen'))
    expect(screen.getByText('Rollen: 1')).toBeInTheDocument()
    expect(JSON.parse(storage.map.get(STORAGE_KEY)!).zielrollen).toHaveLength(0)
    act(() => vi.advanceTimersByTime(400))
    expect(JSON.parse(storage.map.get(STORAGE_KEY)!).zielrollen).toHaveLength(1)
  })

  it('speichert sofort beim Verlassen der Seite', () => {
    const storage = createFakeStorage({ [STORAGE_KEY]: JSON.stringify(createEmptyData()) })
    render(
      <StoreProvider storage={storage}>
        <Anzeige />
      </StoreProvider>,
    )
    fireEvent.click(screen.getByText('Anlegen'))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(JSON.parse(storage.map.get(STORAGE_KEY)!).zielrollen).toHaveLength(1)
  })

  it('geht bei defekten Daten in den Fehlerzustand und überschreibt sie nicht', () => {
    const storage = createFakeStorage({ [STORAGE_KEY]: '{kaputt' })
    render(
      <StoreProvider storage={storage}>
        <Anzeige />
      </StoreProvider>,
    )
    expect(screen.getByText('Phase: fehler')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Anlegen'))
    act(() => vi.advanceTimersByTime(1000))
    expect(storage.map.get(STORAGE_KEY)).toBe('{kaputt')

    fireEvent.click(screen.getByText('Zurücksetzen'))
    expect(screen.getByText('Phase: bereit')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(400))
    expect(JSON.parse(storage.map.get(STORAGE_KEY)!)).toEqual(createEmptyData())
  })

  it('läuft ohne Speicher flüchtig weiter', () => {
    render(
      <StoreProvider storage={null}>
        <Anzeige />
      </StoreProvider>,
    )
    expect(screen.getByText('Persistenz: fluechtig')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Anlegen'))
    expect(screen.getByText('Rollen: 1')).toBeInTheDocument()
  })

  it('meldet Speicherfehler', () => {
    const storage = createFakeStorage({}, { setItemFehler: new DOMException('voll', 'QuotaExceededError') })
    render(
      <StoreProvider storage={storage}>
        <Anzeige />
      </StoreProvider>,
    )
    act(() => vi.advanceTimersByTime(400))
    expect(screen.getByText('Fehler: Der Browser-Speicher ist voll.')).toBeInTheDocument()
  })

  it('meldet Änderungen aus einem anderen Tab', () => {
    render(
      <StoreProvider storage={createFakeStorage()}>
        <Anzeige />
      </StoreProvider>,
    )
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
    })
    expect(screen.getByText('Extern geändert')).toBeInTheDocument()
  })
})
