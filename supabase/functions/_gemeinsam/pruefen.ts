/**
 * Reine Prüfungen für die Supabase-Funktionen (ohne Deno-APIs, daher auch in den App-Tests prüfbar).
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface Einladung {
  email: string
  rolleId: string | null
  zurueck: string
}

/** Rücksprung nur zu erlaubten Adressen der App (Schutz vor Umleitung auf fremde Seiten) */
export function erlaubterRuecksprung(zurueck: string, erlaubteUrspruenge: readonly string[]): boolean {
  try {
    const url = new URL(zurueck)
    return erlaubteUrspruenge.includes(url.origin)
  } catch {
    return false
  }
}

/** Prüft den Inhalt einer Einladung; liefert die bereinigte Einladung oder eine Fehlermeldung. */
export function einladungPruefen(roh: unknown, erlaubteUrspruenge: readonly string[]): { ok: true; einladung: Einladung } | { ok: false; fehler: string } {
  if (typeof roh !== 'object' || roh === null) return { ok: false, fehler: 'Ungültige Anfrage.' }
  const { email, rolleId, zurueck } = roh as Record<string, unknown>
  if (typeof email !== 'string' || !EMAIL.test(email.trim()) || email.length > 254) return { ok: false, fehler: 'Bitte eine gültige E-Mail-Adresse angeben.' }
  if (rolleId !== null && rolleId !== undefined && (typeof rolleId !== 'string' || !UUID.test(rolleId))) return { ok: false, fehler: 'Ungültige Rolle.' }
  if (typeof zurueck !== 'string' || !erlaubterRuecksprung(zurueck, erlaubteUrspruenge)) return { ok: false, fehler: 'Rücksprung-Adresse ist nicht erlaubt.' }
  return { ok: true, einladung: { email: email.trim().toLowerCase(), rolleId: (rolleId as string | null | undefined) ?? null, zurueck } }
}

/** Erlaubte Ursprünge aus der Umgebungsvariable ERLAUBTE_URSPRUENGE (kommagetrennt) */
export function ursprungsListe(wert: string | undefined): string[] {
  return (wert ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

/**
 * Webhook-Adresse prüfen: nur https, keine Zugangsdaten in der Adresse und keine internen Ziele
 * (Schutz davor, dass die Server-Funktion interne Dienste anspricht).
 */
export function webhookAdressePruefen(adresse: string): string | null {
  let url: URL
  try {
    url = new URL(adresse.trim())
  } catch {
    return 'Bitte eine vollständige Adresse angeben (https://…).'
  }
  if (url.protocol !== 'https:') return 'Nur https-Adressen sind erlaubt.'
  if (url.username || url.password) return 'Die Adresse darf keine Zugangsdaten enthalten.'
  if (adresse.length > 2000) return 'Die Adresse ist zu lang.'
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const intern =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '::1' ||
    /^(fc|fd|fe80)/.test(host) ||
    !host.includes('.')
  return intern ? 'Interne Adressen sind nicht erlaubt.' : null
}
