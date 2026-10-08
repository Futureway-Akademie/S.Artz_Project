import { createContext, useContext } from 'react'
import type { CloudDienst, CloudNutzer } from '../data/cloud/cloud.ts'
import { ALLE_RECHTE, type Profil, type Rechte, type Rolle } from '../domain/bereiche.ts'

export interface CloudValue {
  dienst: CloudDienst
  konfiguriert: boolean
  /** `undefined` = wird noch geprüft */
  nutzer: CloudNutzer | null | undefined
  anmelden: (email: string) => Promise<void>
  abmelden: () => Promise<void>
  /** Eigenes Profil (Mehrbenutzer); null ohne Anmeldung */
  profil: Profil | null
  rollen: Rolle[]
  /** Was der angemeldete Nutzer sehen darf */
  rechte: Rechte
  /** Profil und Rollen neu laden, z. B. nach Änderungen im Admin-Bereich */
  rechteNeuLaden: () => Promise<void>
}

export const CloudContext = createContext<CloudValue | null>(null)

/** `null` ohne Provider (z. B. in Tests) – dann gilt: keine Cloud. */
export function useCloud(): CloudValue | null {
  return useContext(CloudContext)
}

/** Rechte des aktuellen Nutzers; ohne Cloud oder Anmeldung ist alles erlaubt (eigenes, lokales Cockpit). */
export function useRechte(): Rechte {
  return useContext(CloudContext)?.rechte ?? ALLE_RECHTE
}
