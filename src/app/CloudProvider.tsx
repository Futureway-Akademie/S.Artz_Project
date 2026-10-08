import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CloudDienst, CloudNutzer } from '../data/cloud/cloud.ts'
import { STORAGE_KEY } from '../data/storage.ts'
import { ALLE_RECHTE, istBereich, rechteAus, type Profil, type Rechte, type Rolle } from '../domain/bereiche.ts'
import { CloudContext, type CloudValue } from './cloudContext.ts'

/** Zuletzt bekannte Rechte dieses Geräts – gelten auch ohne Anmeldung weiter (z. B. offline). */
export const RECHTE_KEY = `${STORAGE_KEY}:rechte`

function rechteMerken(rechte: Rechte) {
  try {
    localStorage.setItem(RECHTE_KEY, JSON.stringify({ alle: rechte.alle, istAdmin: rechte.istAdmin, gesperrt: rechte.gesperrt, bereiche: [...rechte.bereiche] }))
  } catch {
    // Ohne Speicher gelten die Rechte nur bis zum Neuladen
  }
}

function gemerkteRechte(): Rechte {
  try {
    const wert = JSON.parse(localStorage.getItem(RECHTE_KEY) ?? 'null') as { alle?: boolean; istAdmin?: boolean; gesperrt?: boolean; bereiche?: string[] } | null
    if (!wert || wert.alle) return ALLE_RECHTE
    return { alle: false, istAdmin: false, gesperrt: Boolean(wert.gesperrt), bereiche: new Set((wert.bereiche ?? []).filter(istBereich)) }
  } catch {
    return ALLE_RECHTE
  }
}

/** Stellt Login-Zustand, Rechte und Cloud-Dienst bereit; ohne Konfiguration passiert nichts (keine Verbindung). */
export function CloudProvider({ dienst, children }: { dienst: CloudDienst; children: ReactNode }) {
  const konfiguriert = dienst.konfiguriert()
  const [nutzer, setNutzer] = useState<CloudNutzer | null | undefined>(konfiguriert ? undefined : null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [rollen, setRollen] = useState<Rolle[]>([])
  const [gemerkt] = useState(() => (konfiguriert ? gemerkteRechte() : ALLE_RECHTE))

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

  const rechteNeuLaden = useCallback(async () => {
    const [p, r] = await Promise.all([dienst.meinProfil(), dienst.rollen()])
    setProfil(p)
    setRollen(r)
    if (p) rechteMerken(rechteAus(p, r))
  }, [dienst])

  // Nach der Anmeldung eigenes Profil und Rollen laden; Fehler lassen die gemerkten Rechte stehen
  useEffect(() => {
    if (!nutzer) return
    let aktiv = true
    Promise.all([dienst.meinProfil(), dienst.rollen()])
      .then(([p, r]) => {
        if (!aktiv) return
        setProfil(p)
        setRollen(r)
        if (p) rechteMerken(rechteAus(p, r))
      })
      .catch(() => {})
    return () => {
      aktiv = false
    }
  }, [dienst, nutzer])

  const angemeldetesProfil = nutzer ? profil : null
  const rechte = useMemo(() => (angemeldetesProfil ? rechteAus(angemeldetesProfil, rollen) : gemerkt), [angemeldetesProfil, rollen, gemerkt])

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
        setProfil(null)
      },
      profil: angemeldetesProfil,
      rollen,
      rechte,
      rechteNeuLaden,
    }),
    [dienst, konfiguriert, nutzer, angemeldetesProfil, rollen, rechte, rechteNeuLaden],
  )

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>
}
