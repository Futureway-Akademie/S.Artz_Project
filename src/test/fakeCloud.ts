import type { CloudDienst, CloudNutzer, CloudStand } from '../data/cloud/cloud.ts'
import type { Profil, Rolle } from '../domain/bereiche.ts'

/** In-Memory-Ersatz für Supabase: protokolliert, was hochgeladen würde. */
export function createFakeCloud(opts: { nutzer?: CloudNutzer | null; stand?: CloudStand | null; profile?: Profil[]; rollen?: Rolle[] } = {}) {
  let nutzer: CloudNutzer | null = opts.nutzer ?? null
  let stand: CloudStand | null = opts.stand ?? null
  const beobachter = new Set<(n: CloudNutzer | null) => void>()
  const uploads: string[] = []
  const links: Array<{ email: string; zurueck: string }> = []
  let profile: Profil[] = opts.profile ?? []
  let rollen: Rolle[] = opts.rollen ?? []
  const einladungen: Array<{ email: string; rolleId: string | null }> = []
  const ich = () => profile.find((p) => p.userId === nutzer?.id) ?? null
  const nurAdmin = () => {
    if (!ich()?.istAdmin) throw new Error('Keine Berechtigung für diese Änderung.')
  }

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
    meinProfil: async () => ich(),
    rollen: async () => rollen,
    profile: async () => {
      nurAdmin()
      return profile
    },
    rolleSpeichern: async (r) => {
      nurAdmin()
      const rolle = { id: r.id ?? `rolle-${rollen.length + 1}`, name: r.name, bereiche: r.bereiche }
      rollen = r.id ? rollen.map((x) => (x.id === r.id ? rolle : x)) : [...rollen, rolle]
      return rolle
    },
    rolleLoeschen: async (id) => {
      nurAdmin()
      rollen = rollen.filter((r) => r.id !== id)
      profile = profile.map((p) => (p.rolleId === id ? { ...p, rolleId: null } : p))
    },
    profilAendern: async (userId, a) => {
      nurAdmin()
      profile = profile.map((p) => (p.userId === userId ? { ...p, ...a } : p))
    },
    einladen: async (email, rolleId) => {
      nurAdmin()
      einladungen.push({ email, rolleId })
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
    einladungen,
    profile: () => profile,
    setzeProfile: (p: Profil[]) => {
      profile = p
    },
  }
}
