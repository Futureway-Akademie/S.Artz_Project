/**
 * Supabase-Funktion „workflow“: startet einen Workflow (n8n, Make …) über seinen hinterlegten Webhook.
 * Die Webhook-Adresse liest nur diese Funktion; der Browser kann sie eintragen, aber nie lesen.
 * Gesendet wird nur, was der Nutzer ausdrücklich mitgibt.
 *
 * Bereitstellen: supabase functions deploy workflow
 * Secret: ERLAUBTE_URSPRUENGE=http://localhost:5173
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ursprungsListe, webhookAdressePruefen } from '../_gemeinsam/pruefen.ts'

const URSPRUENGE = ursprungsListe(Deno.env.get('ERLAUBTE_URSPRUENGE'))

function kopf(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin && URSPRUENGE.includes(origin) ? origin : URSPRUENGE[0] ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
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
  const alsNutzer = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: nutzer } = await alsNutzer.auth.getUser()
  if (!nutzer.user) return antwort(401, { fehler: 'Bitte anmelden.' }, origin)
  const { data: darf } = await alsNutzer.rpc('darf_bereich', { bereich: 'automationen' })
  if (darf !== true) return antwort(403, { fehler: 'Automationen sind für dich nicht freigegeben.' }, origin)

  const body = (await req.json().catch(() => null)) as { werkzeugId?: unknown; eingabe?: unknown } | null
  const werkzeugId = typeof body?.werkzeugId === 'string' ? body.werkzeugId : ''
  const eingabe = typeof body?.eingabe === 'string' ? body.eingabe.slice(0, 10_000) : ''
  if (!werkzeugId) return antwort(400, { fehler: 'Unbekannter Workflow.' }, origin)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: hook } = await admin.from('webhooks').select('url').eq('user_id', nutzer.user.id).eq('werkzeug_id', werkzeugId).maybeSingle()
  if (!hook) return antwort(404, { fehler: 'Für diesen Workflow ist kein Webhook hinterlegt.' }, origin)
  const fehler = webhookAdressePruefen(hook.url)
  if (fehler) return antwort(400, { fehler }, origin)

  let status = 0
  let meldung = ''
  try {
    const r = await fetch(hook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ausgeloestVon: 'arbeitscockpit', zeitpunkt: new Date().toISOString(), eingabe }),
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    })
    status = r.status
    meldung = r.ok ? 'Gestartet' : `Fehler ${r.status}`
  } catch {
    meldung = 'Nicht erreichbar'
  }
  await admin.from('webhooks').update({ letzte_ausfuehrung: new Date().toISOString(), letzter_status: status, letzte_meldung: meldung }).eq('user_id', nutzer.user.id).eq('werkzeug_id', werkzeugId)
  return antwort(200, { ok: status >= 200 && status < 300, status, meldung }, origin)
})
