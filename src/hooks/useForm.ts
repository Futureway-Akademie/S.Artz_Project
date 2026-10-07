import { useCallback, useMemo, useState } from 'react'

export type Fehler<T> = Partial<Record<keyof T, string>>

/**
 * Kontrolliertes Formular mit reiner Validierungsfunktion.
 * Fehler werden erst nach dem ersten Absendeversuch angezeigt.
 */
export function useForm<T extends Record<string, unknown>>(start: T, validieren: (werte: T) => Fehler<T>) {
  const [ausgang, setAusgang] = useState(start)
  const [werte, setWerte] = useState(start)
  const [versucht, setVersucht] = useState(false)

  const setze = useCallback(<K extends keyof T>(feld: K, wert: T[K]) => {
    setWerte((alt) => ({ ...alt, [feld]: wert }))
  }, [])

  const fehler = useMemo<Fehler<T>>(() => (versucht ? validieren(werte) : {}), [versucht, validieren, werte])
  const geaendert = useMemo(() => JSON.stringify(werte) !== JSON.stringify(ausgang), [werte, ausgang])

  /** Prüft beim Absenden; liefert die Werte, wenn sie gültig sind, sonst `null`. */
  const pruefen = useCallback((): T | null => {
    setVersucht(true)
    return Object.keys(validieren(werte)).length === 0 ? werte : null
  }, [validieren, werte])

  const zuruecksetzen = useCallback((neu: T) => {
    setAusgang(neu)
    setWerte(neu)
    setVersucht(false)
  }, [])

  return { werte, setze, fehler, geaendert, pruefen, zuruecksetzen }
}

/** „a, b, c“ → ['a', 'b', 'c'] */
export function listeAusKomma(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Eine Zeile pro Eintrag (erlaubt Kommas im Eintrag). */
export function listeAusZeilen(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}
