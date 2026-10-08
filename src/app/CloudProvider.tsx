import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CloudDienst, CloudNutzer } from '../data/cloud/cloud.ts'
import { CloudContext, type CloudValue } from './cloudContext.ts'

/** Stellt Login-Zustand und Cloud-Dienst bereit; ohne Konfiguration passiert nichts (keine Verbindung). */
export function CloudProvider({ dienst, children }: { dienst: CloudDienst; children: ReactNode }) {
  const konfiguriert = dienst.konfiguriert()
  const [nutzer, setNutzer] = useState<CloudNutzer | null | undefined>(konfiguriert ? undefined : null)

  useEffect(() => {
    if (!konfiguriert) return
    let aktiv = true
    dienst
      .sitzung()
      .then((n) => aktiv && setNutzer(n))
      .catch(() => aktiv && setNutzer(null))
    const beenden = dienst.beobachten((n) => setNutzer(n))
    return () => {
      aktiv = false
      beenden()
    }
  }, [dienst, konfiguriert])

  const value = useMemo<CloudValue>(
    () => ({
      dienst,
      konfiguriert,
      nutzer,
      // Nach dem Klick auf den Anmeldelink kommt man zurück zur Startseite
      anmelden: (email) => dienst.anmeldelinkSenden(email.trim(), `${window.location.origin}/`),
      abmelden: async () => {
        await dienst.abmelden()
        setNutzer(null)
      },
    }),
    [dienst, konfiguriert, nutzer],
  )

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}
