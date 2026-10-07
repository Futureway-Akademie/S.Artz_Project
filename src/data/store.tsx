import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppData } from '../domain/types.ts'
import type { Action } from './actions.ts'
import { createEmptyData } from './empty.ts'
import { reducer } from './reducer.ts'
import {
  clearAppData,
  getBrowserStorage,
  loadAppData,
  saveAppData,
  STORAGE_KEY,
  type KeyValueStorage,
} from './storage.ts'
import { StoreContext, type StoreValue, type StoreZustand } from './storeContext.ts'

interface StoreProviderProps {
  children: ReactNode
  /** Standard: localStorage; `null` simuliert einen nicht verfügbaren Speicher. */
  storage?: KeyValueStorage | null
  /** Ausgangsdaten bei leerem Speicher oder Zurücksetzen (Seed). */
  createInitialData?: () => AppData
  now?: () => Date
  newId?: () => string
  saveDelayMs?: number
}

interface Intern {
  zustand: StoreZustand
  data: AppData
  persistenz: 'lokal' | 'fluechtig'
  /** Muss der aktuelle Stand gespeichert werden? */
  ungespeichert: boolean
}

function initial(storage: KeyValueStorage | null, createInitialData: () => AppData): Intern {
  const ergebnis = loadAppData(storage)
  switch (ergebnis.status) {
    case 'ok':
      return { zustand: { phase: 'bereit' }, data: ergebnis.data, persistenz: 'lokal', ungespeichert: false }
    case 'leer':
      return { zustand: { phase: 'bereit' }, data: createInitialData(), persistenz: 'lokal', ungespeichert: true }
    case 'nicht_verfuegbar':
      return { zustand: { phase: 'bereit' }, data: createInitialData(), persistenz: 'fluechtig', ungespeichert: false }
    case 'fehler':
      // Im Fehlerzustand wird nichts gespeichert, damit die Rohdaten erhalten bleiben.
      return {
        zustand: { phase: 'fehler', grund: ergebnis.grund, rohdaten: ergebnis.rohdaten, details: ergebnis.details },
        data: createEmptyData(),
        persistenz: 'lokal',
        ungespeichert: false,
      }
  }
}

const defaultNewId = () => crypto.randomUUID()
const defaultNow = () => new Date()

export function StoreProvider({
  children,
  storage: storageProp,
  createInitialData = createEmptyData,
  now = defaultNow,
  newId = defaultNewId,
  saveDelayMs = 400,
}: StoreProviderProps) {
  const [storage] = useState<KeyValueStorage | null>(() =>
    storageProp === undefined ? getBrowserStorage() : storageProp,
  )
  // Daten werden synchron geladen; ein Ladezustand ist daher nicht nötig.
  const [intern, setIntern] = useState<Intern>(() => initial(storage, createInitialData))
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null)
  const [externGeaendert, setExternGeaendert] = useState(false)

  const dispatch = useCallback(
    (action: Action) => {
      // Meta außerhalb des Updaters erzeugen, damit der Reducer auch bei doppeltem Aufruf (StrictMode) identisch rechnet.
      const meta = { now: now(), newId }
      setIntern((alt) => {
        if (alt.zustand.phase !== 'bereit') return alt
        const data = reducer(alt.data, action, meta)
        return data === alt.data ? alt : { ...alt, data, ungespeichert: true }
      })
    },
    [now, newId],
  )

  // Speichern: entprellt und zusätzlich beim Verlassen der Seite
  const aktuell = useRef(intern)
  useLayoutEffect(() => {
    aktuell.current = intern
  }, [intern])

  const speichern = useCallback(() => {
    const { data, persistenz, ungespeichert, zustand } = aktuell.current
    if (!ungespeichert || persistenz !== 'lokal' || zustand.phase !== 'bereit') return
    const ergebnis = saveAppData(storage, data)
    if (ergebnis.ok) {
      setSpeicherFehler(null)
      setIntern((alt) => (alt.data === data ? { ...alt, ungespeichert: false } : alt))
    } else {
      setSpeicherFehler(ergebnis.fehler)
    }
  }, [storage])

  useEffect(() => {
    if (!intern.ungespeichert) return
    const timer = window.setTimeout(speichern, saveDelayMs)
    return () => window.clearTimeout(timer)
  }, [intern, speichern, saveDelayMs])

  useEffect(() => {
    window.addEventListener('pagehide', speichern)
    return () => window.removeEventListener('pagehide', speichern)
  }, [speichern])

  // Änderungen aus anderen Tabs melden, nicht stillschweigend überschreiben
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setExternGeaendert(true)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const zuruecksetzen = useCallback(() => {
    clearAppData(storage)
    setSpeicherFehler(null)
    setExternGeaendert(false)
    setIntern({
      zustand: { phase: 'bereit' },
      data: createInitialData(),
      persistenz: storage ? 'lokal' : 'fluechtig',
      ungespeichert: Boolean(storage),
    })
  }, [storage, createInitialData])

  const neuLaden = useCallback(() => {
    setExternGeaendert(false)
    setIntern(initial(storage, createInitialData))
  }, [storage, createInitialData])

  const value = useMemo<StoreValue>(
    () => ({
      zustand: intern.zustand,
      data: intern.data,
      dispatch,
      demo: true,
      persistenz: intern.persistenz,
      speicherFehler,
      externGeaendert,
      zuruecksetzen,
      neuLaden,
    }),
    [intern.zustand, intern.data, intern.persistenz, dispatch, speicherFehler, externGeaendert, zuruecksetzen, neuLaden],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
