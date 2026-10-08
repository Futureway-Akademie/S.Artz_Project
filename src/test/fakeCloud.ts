import type { CloudDienst, CloudNutzer, CloudStand } from '../data/cloud/cloud.ts'
import type { Profil, Rolle } from '../domain/bereiche.ts'

/** In-Memory-Ersatz für Supabase: protokolliert, was hochgeladen würde. */
export function createFakeCloud(
  opts: { nutzer?: CloudNutzer | null; stand?: CloudStand | null; profile?: Profil[]; rollen?: Rolle[]; kiAntwort?: (aufgabe: string, eingabe: string) => string } = {},
) {
  let nutzer: CloudNutzer | null = opts.nutzer ?? null
  let stand: CloudStand | null = opts.stand ?? null
  const beobachter = new Set<(n: CloudNutzer | null) => void>()
  const uploads: string[] = []
  const links: Array<{ email: string; zurueck: string }> = []
  let profile: Profil[] = opts.profile ?? []
  let rollen: Rolle[] = opts.rollen ?? []
  const einladungen: Array<{ email: string; rolleId: string | null }> = []
  const kiAnfragen: Array<{ aufgabe: string; eingabe: string }> = []
  const dateien = new Map<string, Uint8Array>()
  const webhooks = new Map<string, { url: string; letzteAusfuehrung: string | null; letzterStatus: number | null; letzteMeldung: string }>()
  const workflowAufrufe: Array<{ werkzeugId: string; eingabe: string; url: string }> = []
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
    ki: async (aufgabe, eingabe) => {
      if (!nutzer) throw new Error('Bitte anmelden.')
      kiAnfragen.push({ aufgabe, eingabe })
      return { text: opts.kiAntwort?.(aufgabe, eingabe) ?? `KI-Antwort zu ${aufgabe}`, tokens: 100, uebrig: 299_900 }
    },
    dateiHochladen: async (pfad, daten) => {
      dateien.set(pfad, daten)
    },
    dateiLaden: async (pfad) => dateien.get(pfad) ?? null,
    dateiLoeschen: async (pfad) => {
      dateien.delete(pfad)
    },
    webhooks: async () => [...webhooks.entries()].map(([werkzeugId, w]) => ({ werkzeugId, letzteAusfuehrung: w.letzteAusfuehrung, letzterStatus: w.letzterStatus, letzteMeldung: w.letzteMeldung })),
    webhookSpeichern: async (werkzeugId, url) => {
      webhooks.set(werkzeugId, { url, letzteAusfuehrung: null, letzterStatus: null, letzteMeldung: '' })
    },
    webhookEntfernen: async (werkzeugId) => {
      webhooks.delete(werkzeugId)
    },
    workflowStarten: async (werkzeugId, eingabe) => {
      const w = webhooks.get(werkzeugId)
      if (!w) throw new Error('Für diesen Workflow ist kein Webhook hinterlegt.')
      workflowAufrufe.push({ werkzeugId, eingabe, url: w.url })
      webhooks.set(werkzeugId, { ...w, letzteAusfuehrung: new Date().toISOString(), letzterStatus: 200, letzteMeldung: 'Gestartet' })
      return { ok: true, status: 200, meldung: 'Gestartet' }
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
    kiAnfragen,
    dateien,
    workflowAufrufe,
    profile: () => profile,
    setzeProfile: (p: Profil[]) => {
      profile = p
    },
  }
}
