import { createContext, useContext } from 'react'
import type { AppData } from '../domain/types.ts'
import type { Action } from './actions.ts'
import type { LadeFehler } from './storage.ts'

export type StoreZustand =
  | { phase: 'bereit' }
  | { phase: 'fehler'; grund: LadeFehler; rohdaten: string; details?: string }

export interface StoreValue {
  zustand: StoreZustand
  data: AppData
  dispatch: (action: Action) => void
  /** Die App ist ein Demo: Daten liegen nur in diesem Browser. */
  demo: true
  /** `fluechtig`: localStorage nicht verfügbar, Daten gehen beim Schließen verloren. */
  persistenz: 'lokal' | 'fluechtig'
  /** Letzter Speicherfehler, z. B. „Speicher voll“. */
  speicherFehler: string | null
  /** In einem anderen Tab wurden die Daten geändert. */
  externGeaendert: boolean
  /** Verwirft gespeicherte Daten und startet mit den Ausgangsdaten neu. */
  zuruecksetzen: () => void
  /** Lädt die Daten erneut aus dem Speicher (z. B. nach Änderung in anderem Tab). */
  neuLaden: () => void
}

export const StoreContext = createContext<StoreValue | null>(null)

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore muss innerhalb von <StoreProvider> verwendet werden')
  return value
}
