/**
 * Einzige Stelle mit Netzwerkzugriff: Supabase für Login und Ende-zu-Ende-verschlüsselte Synchronisierung.
 * Ohne VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY (in .env.local, nicht im Repository) ist alles abgeschaltet.
 * Zu Supabase gehen nur: E-Mail-Adresse (Login) und der verschlüsselte Umschlag – nie Klartext.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CloudDienst, CloudStand } from './cloud.ts'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const TABELLE = 'tresor'

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
}
