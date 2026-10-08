import { createContext, useContext } from 'react'
import type { CloudDienst, CloudNutzer } from '../data/cloud/cloud.ts'

export interface CloudValue {
  dienst: CloudDienst
  konfiguriert: boolean
  /** `undefined` = wird noch geprüft */
  nutzer: CloudNutzer | null | undefined
  anmelden: (email: string) => Promise<void>
  abmelden: () => Promise<void>
}

export const CloudContext = createContext<CloudValue | null>(null)

/** `null` ohne Provider (z. B. in Tests) – dann gilt: keine Cloud. */
export function useCloud(): CloudValue | null {
  return useContext(CloudContext)
}
