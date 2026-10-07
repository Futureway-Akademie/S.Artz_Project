import { createContext, useContext } from 'react'

export interface TresorValue {
  /** Sperrt sofort; die entschlüsselten Daten werden aus dem Arbeitsspeicher entfernt. */
  sperren: () => void
  /** Prüft das alte Passwort und verschlüsselt alles mit dem neuen. */
  passwortAendern: (alt: string, neu: string) => Promise<void>
  sperreMinuten: number
  setSperreMinuten: (minuten: number) => void
}

export const TresorContext = createContext<TresorValue | null>(null)

/** `null`, wenn die App ohne Verschlüsselung läuft (z. B. in Tests oder ohne Browser-Speicher). */
export function useTresor(): TresorValue | null {
  return useContext(TresorContext)
}
