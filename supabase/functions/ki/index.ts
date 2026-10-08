/**
 * Supabase-Funktion „ki“: Vermittelt KI-Anfragen an Claude auf AWS Bedrock in Frankfurt (eu-central-1).
 * - Nur angemeldete Nutzer mit dem Bereich „ki“, gesperrte nie; Monatsbudget je Nutzer.
 * - Zugangsdaten zu AWS liegen nur als Secrets bei Supabase, nie im Browser oder Repository.
 * - Inhalte werden weder gespeichert noch protokolliert – gebucht wird nur der Token-Verbrauch.
 *
 * Bereitstellen: supabase functions deploy ki
 * Secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION=eu-central-1,
 *          BEDROCK_MODEL_ID (Claude-Modell bzw. EU-Inferenzprofil aus der Bedrock-Konsole),
 *          ERLAUBTE_URSPRUENGE=http://localhost:5173
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { BedrockRuntimeClient, ConverseCommand } from 'npm:@aws-sdk/client-bedrock-runtime@3'
import { budgetMonat, KI_AUFGABEN, kiAnfragePruefen } from '../_gemeinsam/ki.ts'
import { ursprungsListe } from '../_gemeinsam/pruefen.ts'

const URSPRUENGE = ursprungsListe(Deno.env.get('ERLAUBTE_URSPRUENGE'))
const bedrock = new BedrockRuntimeClient({ region: Deno.env.get('AWS_REGION') ?? 'eu-central-1' })

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
  const { data: darf } = await alsNutzer.rpc('darf_bereich', { bereich: 'ki' })
  if (darf !== true) return antwort(403, { fehler: 'Der KI-Assistent ist für dich nicht freigegeben.' }, origin)

  const geprueft = kiAnfragePruefen(await req.json().catch(() => null))
  if (!geprueft.ok) return antwort(400, { fehler: geprueft.fehler }, origin)
  const { aufgabe, eingabe } = geprueft.anfrage

  // Budget prüfen
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const monat = budgetMonat(new Date())
  const [{ data: profil }, { data: nutzung }] = await Promise.all([
    admin.from('profile').select('ki_limit_tokens').eq('user_id', nutzer.user.id).single(),
    admin.from('ki_nutzung').select('tokens').eq('user_id', nutzer.user.id).eq('monat', monat).maybeSingle(),
  ])
  const limit = Number(profil?.ki_limit_tokens ?? 0)
  const verbraucht = Number(nutzung?.tokens ?? 0)
  if (verbraucht >= limit) return antwort(429, { fehler: 'Dein KI-Budget für diesen Monat ist aufgebraucht.' }, origin)

  try {
    const r = await bedrock.send(
      new ConverseCommand({
        modelId: Deno.env.get('BEDROCK_MODEL_ID')!,
        system: [{ text: KI_AUFGABEN[aufgabe].system }],
        messages: [{ role: 'user', content: [{ text: eingabe }] }],
        inferenceConfig: { maxTokens: KI_AUFGABEN[aufgabe].maxAntwort, temperature: 0.4 },
      }),
    )
    const text = (r.output?.message?.content ?? []).map((c) => c.text ?? '').join('').trim()
    const tokens = (r.usage?.inputTokens ?? 0) + (r.usage?.outputTokens ?? 0)
    await admin.rpc('ki_verbrauch_buchen', { nutzer: nutzer.user.id, verbrauch: tokens })
    return antwort(200, { text, tokens, uebrig: Math.max(0, limit - verbraucht - tokens) }, origin)
  } catch {
    // Keine Inhalte ins Log schreiben
    return antwort(502, { fehler: 'Die KI ist gerade nicht erreichbar. Bitte später erneut versuchen.' }, origin)
  }
})
