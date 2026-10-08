import { createContext, useContext } from 'react'

export interface TresorValue {
  /** Sperrt sofort; die entschlüsselten Daten werden aus dem Arbeitsspeicher entfernt. */
  sperren: () => void
  /** Prüft das alte Passwort und verschlüsselt alles mit dem neuen. */
  passwortAendern: (alt: string, neu: string) => Promise<void>
  sperreMinuten: number
  setSperreMinuten: (minuten: number) => void
  /** E-Mail-Adresse der eingerichteten Wiederherstellung oder `null` */
  wiederherstellung: string | null
  /** Erzeugt einen neuen Wiederherstellungsschlüssel und liefert den Link für die Mail an sich selbst (ältere Links werden ungültig). */
  wiederherstellungEinrichten: (email: string) => Promise<string>
  wiederherstellungEntfernen: () => Promise<void>
  /** Datenschlüssel des geöffneten Tresors – zum Ver- und Entschlüsseln von Dateien */
  datenschluessel: () => CryptoKey
}

export const TresorContext = createContext<TresorValue | null>(null)

/** `null`, wenn die App ohne Verschlüsselung läuft (z. B. in Tests oder ohne Browser-Speicher). */
export function useTresor(): TresorValue | null {
  return useContext(TresorContext)
}
