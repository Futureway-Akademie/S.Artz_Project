import { createContext, useContext } from 'react'

export type SyncStatus = 'aus' | 'laeuft' | 'ok' | 'fehler' | 'konflikt' | 'fremd' | 'anderesKonto'

export interface SyncValue {
  status: SyncStatus
  letzteSync: string | null
  fehler: string | null
  jetztAbgleichen: () => void
}

export const SyncContext = createContext<SyncValue | null>(null)

/** `null` ohne Tresor (z. B. in Tests ohne Verschlüsselung) */
export function useSync(): SyncValue | null {
  return useContext(SyncContext)
}
