import type { CloudDienst, CloudNutzer, CloudStand } from '../data/cloud/cloud.ts'

/** In-Memory-Ersatz für Supabase: protokolliert, was hochgeladen würde. */
export function createFakeCloud(opts: { nutzer?: CloudNutzer | null; stand?: CloudStand | null } = {}) {
  let nutzer: CloudNutzer | null = opts.nutzer ?? null
  let stand: CloudStand | null = opts.stand ?? null
  const beobachter = new Set<(n: CloudNutzer | null) => void>()
  const uploads: string[] = []
  const links: Array<{ email: string; zurueck: string }> = []

  const dienst: CloudDienst = {
    konfiguriert: () => true,
    sitzung: async () => nutzer,
    beobachten: (cb) => {
      beobachter.add(cb)
      return () => beobachter.delete(cb)
    },
    anmeldelinkSenden: async (email, zurueck) => {
      links.push({ email, zurueck })
    },
    abmelden: async () => {
      nutzer = null
      beobachter.forEach((cb) => cb(null))
    },
    laden: async () => stand,
    speichern: async (umschlag, erwartet) => {
      const aktuell = stand?.revision ?? null
      if (aktuell !== erwartet) return { ok: false, konflikt: true }
      uploads.push(umschlag)
      stand = { umschlag, revision: (aktuell ?? 0) + 1, aktualisiertAm: new Date().toISOString() }
      return { ok: true, revision: stand.revision }
    },
    loeschen: async () => {
      stand = null
    },
  }

  return {
    dienst,
    uploads,
    links,
    /** Simuliert den Klick auf den Anmeldelink */
    anmelden: (n: CloudNutzer) => {
      nutzer = n
      beobachter.forEach((cb) => cb(n))
    },
    setzeStand: (s: CloudStand | null) => {
      stand = s
    },
    stand: () => stand,
  }
}
