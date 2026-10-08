import type { CloudDienst, CloudNutzer, CloudStand } from '../data/cloud/cloud.ts'
import type { FreigabeUmschlag, VerschluesselterText } from '../data/freigabe/freigabeKrypto.ts'
import type { Profil, Rolle } from '../domain/bereiche.ts'

/** In-Memory-Ersatz für Supabase: protokolliert, was hochgeladen würde. */
/** Server-Zustand für Schlüssel und Freigaben – mehrere Fake-Clouds (Nutzer) können ihn teilen */
export function neuerGeteilterZustand() {
  return {
    schluessel: new Map<string, { oeffentlich: JsonWebKey; privat: VerschluesselterText }>(),
    freigaben: new Map<string, { besitzerId: string; bereich: string; version: number; umschlag: FreigabeUmschlag; aktualisiertAm: string }>(),
    freigabeSchluessel: [] as Array<{ besitzerId: string; bereich: string; empfaengerId: string; version: number; verpackt: string }>,
  }
}

export function createFakeCloud(
  opts: {
    nutzer?: CloudNutzer | null
    stand?: CloudStand | null
    profile?: Profil[]
    rollen?: Rolle[]
    kiAntwort?: (aufgabe: string, eingabe: string) => string
    geteilt?: ReturnType<typeof neuerGeteilterZustand>
  } = {},
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
  // Gemeinsamer Zustand mehrerer Fake-Geräte: über opts.geteilt übergeben
  const geteilt = opts.geteilt ?? neuerGeteilterZustand()
  const meineId = () => {
    if (!nutzer) throw new Error('Nicht angemeldet.')
    return nutzer.id
  }
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
    eigeneSchluessel: async () => {
      const s = geteilt.schluessel.get(meineId())
      return s ? { oeffentlich: s.oeffentlich, privatVerschluesselt: s.privat } : null
    },
    schluesselSpeichern: async (oeffentlich, privat) => {
      geteilt.schluessel.set(meineId(), { oeffentlich, privat })
    },
    oeffentlicheSchluessel: async (ids) => Object.fromEntries(ids.filter((id) => geteilt.schluessel.has(id)).map((id) => [id, geteilt.schluessel.get(id)!.oeffentlich])),
    eigeneFreigaben: async () =>
      [...geteilt.freigaben.values()]
        .filter((f) => f.besitzerId === meineId())
        .map((f) => ({ bereich: f.bereich, version: f.version, empfaenger: geteilt.freigabeSchluessel.filter((s) => s.besitzerId === f.besitzerId && s.bereich === f.bereich && s.version === f.version).map((s) => s.empfaengerId) })),
    freigabeSchreiben: async (bereich, version, umschlag, schluessel) => {
      nurAdmin()
      const id = meineId()
      geteilt.freigaben.set(`${id}:${bereich}`, { besitzerId: id, bereich, version, umschlag, aktualisiertAm: new Date().toISOString() })
      geteilt.freigabeSchluessel = [...geteilt.freigabeSchluessel.filter((s) => !(s.besitzerId === id && s.bereich === bereich)), ...schluessel.map((s) => ({ besitzerId: id, bereich, empfaengerId: s.empfaengerId, version, verpackt: s.verpackt }))]
    },
    freigabeEntfernen: async (bereich) => {
      nurAdmin()
      const id = meineId()
      geteilt.freigaben.delete(`${id}:${bereich}`)
      geteilt.freigabeSchluessel = geteilt.freigabeSchluessel.filter((s) => !(s.besitzerId === id && s.bereich === bereich))
    },
    freigabenFuerMich: async () => {
      const id = meineId()
      if (ich()?.gesperrt) return []
      return geteilt.freigabeSchluessel
        .filter((s) => s.empfaengerId === id)
        .flatMap((s) => {
          const f = geteilt.freigaben.get(`${s.besitzerId}:${s.bereich}`)
          return f && f.version === s.version ? [{ besitzerId: f.besitzerId, bereich: f.bereich, version: f.version, umschlag: f.umschlag, verpackt: s.verpackt, aktualisiertAm: f.aktualisiertAm }] : []
        })
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
    geteilt,
    profile: () => profile,
    setzeProfile: (p: Profil[]) => {
      profile = p
    },
  }
}
