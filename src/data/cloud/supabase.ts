/**
 * Einzige Stelle mit Netzwerkzugriff: Supabase für Login und Ende-zu-Ende-verschlüsselte Synchronisierung.
 * Ohne VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY (in .env.local, nicht im Repository) ist alles abgeschaltet.
 * Zu Supabase gehen nur: E-Mail-Adresse (Login) und der verschlüsselte Umschlag – nie Klartext.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profil, Rolle } from '../../domain/bereiche.ts'
import type { CloudDienst, CloudStand, KiAntwort } from './cloud.ts'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const TABELLE = 'tresor'
const PROFIL_FELDER = 'user_id, email, anzeigename, rolle_id, ist_admin, gesperrt, bereiche_an, bereiche_aus'

interface ProfilZeile {
  user_id: string
  email: string
  anzeigename: string
  rolle_id: string | null
  ist_admin: boolean
  gesperrt: boolean
  bereiche_an: string[]
  bereiche_aus: string[]
}

const alsProfil = (z: ProfilZeile): Profil => ({
  userId: z.user_id,
  email: z.email,
  anzeigename: z.anzeigename,
  rolleId: z.rolle_id,
  istAdmin: z.ist_admin,
  gesperrt: z.gesperrt,
  bereicheAn: z.bereiche_an ?? [],
  bereicheAus: z.bereiche_aus ?? [],
})

const pruefe = <T,>(antwort: { data: T; error: { message: string } | null }): T => {
  if (antwort.error) throw new Error(antwort.error.message)
  return antwort.data
}

let client: Promise<SupabaseClient> | null = null

/** Die Bibliothek wird erst geladen, wenn Supabase eingerichtet ist und gebraucht wird (kleineres Paket). */
function holeClient(): Promise<SupabaseClient> {
  if (!URL_ || !KEY) return Promise.reject(new Error('Supabase ist nicht eingerichtet.'))
  const url = URL_
  const key = KEY
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, {
    auth: {
      persistSession: true,
      storageKey: 'pikartz-arbeitscockpit:anmeldung',
      detectSessionInUrl: true,
      flowType: 'implicit',
      autoRefreshToken: true,
    },
    }),
  )
  return client
}

/** Supabase-Umsetzung der Cloud-Schnittstelle */
export const supabaseDienst: CloudDienst = {
  konfiguriert: () => Boolean(URL_ && KEY),

  async sitzung() {
    const { data } = await (await holeClient()).auth.getSession()
    const nutzer = data.session?.user
    return nutzer ? { id: nutzer.id, email: nutzer.email ?? '' } : null
  },

  beobachten(callback) {
    let beenden = () => {}
    let aktiv = true
    void holeClient().then((c) => {
      if (!aktiv) return
      const { data } = c.auth.onAuthStateChange((_ereignis, session) => {
        callback(session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null)
      })
      beenden = () => data.subscription.unsubscribe()
    })
    return () => {
      aktiv = false
      beenden()
    }
  },

  async anmeldelinkSenden(email, zurueck) {
    const { error } = await (await holeClient()).auth.signInWithOtp({ email, options: { emailRedirectTo: zurueck, shouldCreateUser: true } })
    if (error) throw new Error(error.message)
  },

  async abmelden() {
    await (await holeClient()).auth.signOut()
  },

  async laden(): Promise<CloudStand | null> {
    const { data, error } = await (await holeClient()).from(TABELLE).select('umschlag, revision, aktualisiert_am').maybeSingle()
    if (error) throw new Error(error.message)
    return data ? { umschlag: JSON.stringify(data.umschlag), revision: Number(data.revision), aktualisiertAm: String(data.aktualisiert_am) } : null
  },

  async speichern(umschlag, erwarteteRevision) {
    const c = await holeClient()
    const { data: sitzung } = await c.auth.getSession()
    const userId = sitzung.session?.user.id
    if (!userId) throw new Error('Nicht angemeldet.')
    const inhalt = JSON.parse(umschlag) as unknown
    if (erwarteteRevision === null) {
      const { data, error } = await c.from(TABELLE).insert({ user_id: userId, umschlag: inhalt, revision: 1 }).select('revision').single()
      if (error) return error.code === '23505' ? { ok: false, konflikt: true } : Promise.reject(new Error(error.message))
      return { ok: true, revision: Number(data.revision) }
    }
    // Optimistische Sperre: nur schreiben, wenn der Stand auf dem Server noch der erwartete ist
    const { data, error } = await c
      .from(TABELLE)
      .update({ umschlag: inhalt, revision: erwarteteRevision + 1, aktualisiert_am: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('revision', erwarteteRevision)
      .select('revision')
    if (error) throw new Error(error.message)
    return data.length === 0 ? { ok: false, konflikt: true } : { ok: true, revision: Number(data[0]!.revision) }
  },

  async loeschen() {
    const { error } = await (await holeClient()).from(TABELLE).delete().neq('revision', -1)
    if (error) throw new Error(error.message)
  },

  async meinProfil() {
    const c = await holeClient()
    const { data: sitzung } = await c.auth.getSession()
    const id = sitzung.session?.user.id
    if (!id) return null
    const zeile = pruefe(await c.from('profile').select(PROFIL_FELDER).eq('user_id', id).maybeSingle<ProfilZeile>())
    return zeile ? alsProfil(zeile) : null
  },

  async rollen(): Promise<Rolle[]> {
    const zeilen = pruefe(await (await holeClient()).from('rollen').select('id, name, bereiche').order('name'))
    return (zeilen ?? []) as Rolle[]
  },

  async profile() {
    const zeilen = pruefe(await (await holeClient()).from('profile').select(PROFIL_FELDER).order('email').returns<ProfilZeile[]>())
    return (zeilen ?? []).map(alsProfil)
  },

  async rolleSpeichern(rolle) {
    const c = await holeClient()
    const zeile = rolle.id
      ? pruefe(await c.from('rollen').update({ name: rolle.name, bereiche: rolle.bereiche }).eq('id', rolle.id).select('id, name, bereiche').single())
      : pruefe(await c.from('rollen').insert({ name: rolle.name, bereiche: rolle.bereiche }).select('id, name, bereiche').single())
    return zeile as Rolle
  },

  async rolleLoeschen(id) {
    pruefe(await (await holeClient()).from('rollen').delete().eq('id', id))
  },

  async profilAendern(userId, a) {
    const felder: Record<string, unknown> = {}
    if (a.rolleId !== undefined) felder.rolle_id = a.rolleId
    if (a.gesperrt !== undefined) felder.gesperrt = a.gesperrt
    if (a.istAdmin !== undefined) felder.ist_admin = a.istAdmin
    if (a.bereicheAn !== undefined) felder.bereiche_an = a.bereicheAn
    if (a.bereicheAus !== undefined) felder.bereiche_aus = a.bereicheAus
    // Die Datenbank lässt Änderungen nur durch den Admin zu (RLS); ohne Treffer gab es keine Berechtigung
    const zeilen = pruefe(await (await holeClient()).from('profile').update(felder).eq('user_id', userId).select('user_id'))
    if (!zeilen || zeilen.length === 0) throw new Error('Keine Berechtigung für diese Änderung.')
  },

  async einladen(email, rolleId, zurueck) {
    const { error } = await (await holeClient()).functions.invoke('einladen', { body: { email, rolleId, zurueck } })
    if (error) throw new Error(await fehlerText(error))
  },

  async ki(aufgabe, eingabe) {
    const { data, error } = await (await holeClient()).functions.invoke('ki', { body: { aufgabe, eingabe } })
    if (error) throw new Error(await fehlerText(error))
    return data as KiAntwort
  },
}

/** Fehlermeldung der Funktion („fehler“ im Antworttext) statt des allgemeinen HTTP-Fehlers */
async function fehlerText(error: { message: string; context?: unknown }): Promise<string> {
  try {
    const kontext = error.context as Response | undefined
    const inhalt = (await kontext?.json()) as { fehler?: string } | undefined
    return inhalt?.fehler ?? error.message
  } catch {
    return error.message
  }
}
