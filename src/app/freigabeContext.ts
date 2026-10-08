import { createContext, useContext } from 'react'

export interface FreigabeValue {
  /** Eigener privater Schlüssel (nur im Arbeitsspeicher), sobald angemeldet und entsperrt */
  privat: CryptoKey | null
  /** Admin hat Freigaben geändert: Merker für das automatische Aktualisieren setzen */
  freigabenGeaendert: (vorhanden: boolean) => void
}

export const FreigabeContext = createContext<FreigabeValue>({ privat: null, freigabenGeaendert: () => {} })

export function useFreigaben(): FreigabeValue {
  return useContext(FreigabeContext)
}
