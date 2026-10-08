/**
 * Supabase-Funktion „einladen“: Nur der Admin lädt neue Nutzer per E-Mail ein.
 * Der service_role-Schlüssel stellt Supabase der Funktion selbst bereit – er steht nie in der App oder im Repository.
 *
 * Bereitstellen: supabase functions deploy einladen
 * Umgebung (Secrets): ERLAUBTE_URSPRUENGE=http://localhost:5173,https://deine-adresse.de
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { einladungPruefen, ursprungsListe } from '../_gemeinsam/pruefen.ts'

const URSPRUENGE = ursprungsListe(Deno.env.get('ERLAUBTE_URSPRUENGE'))

function kopf(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin && URSPRUENGE.includes(origin) ? origin : URSPRUENGE[0] ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const antwort = (status: number, inhalt: unknown, origin: string | null) =>
  new Response(JSON.stringify(inhalt), { status, headers: { ...kopf(origin), 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: kopf(origin) })
  if (req.method !== 'POST') return antwort(405, { fehler: 'Nur POST.' }, origin)

  const url = Deno.env.get('SUPABASE_URL')!
  // Prüfen mit den Rechten der anfragenden Person (RLS gilt): Ist sie aktiver Admin?
  const alsNutzer = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: istAdmin, error: rechteFehler } = await alsNutzer.rpc('ist_admin')
  if (rechteFehler || istAdmin !== true) return antwort(403, { fehler: 'Nur der Admin darf einladen.' }, origin)

  const geprueft = einladungPruefen(await req.json().catch(() => null), URSPRUENGE)
  if (!geprueft.ok) return antwort(400, { fehler: geprueft.fehler }, origin)
  const { email, rolleId, zurueck } = geprueft.einladung

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { error } = await admin.auth.admin.inviteUserByEmail(email, { data: rolleId ? { rolle_id: rolleId } : {}, redirectTo: zurueck })
  if (error) return antwort(400, { fehler: error.message }, origin)
  return antwort(200, { ok: true }, origin)
})
