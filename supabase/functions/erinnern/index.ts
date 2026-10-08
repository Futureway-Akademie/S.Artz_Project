/**
 * Supabase-Funktion „erinnern“: verschickt einmal täglich zur gewählten Stunde eine Push-Erinnerung
 * ohne Inhalt („Schau, was heute ansteht“). Wird stündlich per Cron aufgerufen, nur mit Geheimnis.
 *
 * Bereitstellen: supabase functions deploy erinnern --no-verify-jwt
 * Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_KONTAKT (z. B. mailto:du@example.org), CRON_GEHEIMNIS
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'
import { ERINNERUNG, faelligeAbos, berlinJetzt } from '../_gemeinsam/push.ts'

webpush.setVapidDetails(Deno.env.get('VAPID_KONTAKT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-geheimnis') !== Deno.env.get('CRON_GEHEIMNIS')) return new Response('Nicht erlaubt', { status: 403 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: abos } = await admin.from('push_abos').select('user_id, endpoint, p256dh, auth, stunde, letzter_versand')
  const jetzt = new Date()
  const heute = berlinJetzt(jetzt).datum
  let gesendet = 0

  for (const abo of faelligeAbos(abos ?? [], jetzt)) {
    try {
      await webpush.sendNotification({ endpoint: abo.endpoint, keys: { p256dh: abo.p256dh, auth: abo.auth } }, JSON.stringify(ERINNERUNG), { TTL: 3600 })
      await admin.from('push_abos').update({ letzter_versand: heute }).eq('user_id', abo.user_id).eq('endpoint', abo.endpoint)
      gesendet++
    } catch (e) {
      // Abgelaufene Abos entfernen (410 Gone / 404)
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await admin.from('push_abos').delete().eq('user_id', abo.user_id).eq('endpoint', abo.endpoint)
    }
  }
  return new Response(JSON.stringify({ gesendet }), { headers: { 'Content-Type': 'application/json' } })
})
