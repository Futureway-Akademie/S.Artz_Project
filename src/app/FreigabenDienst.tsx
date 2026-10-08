import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useStore } from '../data/storeContext.ts'
import { eigenesSchluesselpaar, freigabenAktualisieren } from '../data/freigabe/freigabe.ts'
import { useCloud } from './cloudContext.ts'
import { FreigabeContext, type FreigabeValue } from './freigabeContext.ts'
import { useTresor } from './tresorContext.ts'

/** So lange nach der letzten Änderung werden geteilte Bereiche neu verschlüsselt hochgeladen */
const VERZOEGERUNG_MS = 5000

/**
 * Hält geteilte Bereiche aktuell: stellt nach dem Anmelden das eigene Schlüsselpaar bereit und
 * verschlüsselt als Admin geteilte Bereiche nach Änderungen neu (nur, wenn es Freigaben gibt).
 */
export function FreigabenDienst({ children }: { children: ReactNode }) {
  const cloud = useCloud()
  const tresor = useTresor()
  const { data } = useStore()
  const [privat, setPrivat] = useState<CryptoKey | null>(null)
  const [version, setVersion] = useState(0)
  const hatFreigaben = useRef(false)
  const dienst = cloud?.dienst
  const angemeldet = Boolean(cloud?.konfiguriert && cloud.nutzer && !cloud.rechte.gesperrt)
  const istAdmin = Boolean(cloud?.rechte.istAdmin)

  // Eigenes Schlüsselpaar (einmal je Anmeldung)
  useEffect(() => {
    if (!angemeldet || !tresor || !dienst) return
    let aktiv = true
    eigenesSchluesselpaar(dienst, tresor.datenschluessel())
      .then((p) => aktiv && setPrivat(p))
      .catch(() => {})
    if (istAdmin)
      dienst
        .eigeneFreigaben()
        .then((f) => {
          hatFreigaben.current = f.some((x) => x.empfaenger.length > 0)
        })
        .catch(() => {})
    return () => {
      aktiv = false
    }
  }, [angemeldet, tresor, dienst, istAdmin, version])

  // Als Admin: nach Änderungen geteilte Bereiche neu verschlüsseln
  const erster = useRef(true)
  useEffect(() => {
    if (erster.current) {
      erster.current = false
      return
    }
    if (!angemeldet || !istAdmin || !dienst || !hatFreigaben.current) return
    const timer = window.setTimeout(() => void freigabenAktualisieren(dienst, data, new Date()).catch(() => {}), VERZOEGERUNG_MS)
    return () => window.clearTimeout(timer)
  }, [data, angemeldet, istAdmin, dienst])

  const value = useMemo<FreigabeValue>(
    () => ({
      privat: angemeldet ? privat : null,
      freigabenGeaendert: (vorhanden) => {
        hatFreigaben.current = vorhanden
        setVersion((v) => v + 1)
      },
    }),
    [angemeldet, privat],
  )

  return <FreigabeContext.Provider value={value}>{children}</FreigabeContext.Provider>
}
