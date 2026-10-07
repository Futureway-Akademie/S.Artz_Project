import { aktuellerToken, googleKonfiguriert, tokenVergessen } from './googleAuth.ts'

/**
 * Einziges Modul mit Netzwerkzugriff auf Google: liest Gmail nur (gmail.readonly) und nur Kopfzeilen
 * (Absender, Empfänger, Betreff, Datum) plus den kurzen Textauszug – keine Anhänge, kein Volltext.
 * Ohne Konfiguration oder Anmeldung wird nichts gesendet.
 */

const API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const REVOKE = 'https://oauth2.googleapis.com/revoke'

export interface RohMail {
  id: string
  threadId: string
  /** ISO-Zeitpunkt */
  zeitpunkt: string
  von: string
  an: string[]
  betreff: string
  /** Kurzer Auszug, wie Gmail ihn liefert */
  auszug: string
  /** Gmail-Labels, z. B. SENT, INBOX */
  labels: string[]
}

export interface MailDienst {
  konfiguriert: boolean
  /** Angemeldete Adresse (prüft zugleich den Token) */
  profil(): Promise<string>
  /** IDs passender Mails, neueste zuerst */
  suchen(abfrage: string, max: number): Promise<string[]>
  holen(id: string): Promise<RohMail>
  /** Widerruft den Zugriff bei Google und vergisst den Token */
  trennen(): Promise<void>
}

export class NichtAngemeldet extends Error {
  constructor() {
    super('Nicht bei Google angemeldet oder Anmeldung abgelaufen.')
  }
}

const OPTIONEN: RequestInit = { credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' }

async function holeJson<T>(pfad: string): Promise<T> {
  const t = aktuellerToken()
  if (!t) throw new NichtAngemeldet()
  const antwort = await fetch(`${API}${pfad}`, { ...OPTIONEN, headers: { Authorization: `Bearer ${t}` } })
  if (antwort.status === 401) {
    tokenVergessen()
    throw new NichtAngemeldet()
  }
  if (!antwort.ok) throw new Error(`Gmail antwortet mit Fehler ${antwort.status}.`)
  return (await antwort.json()) as T
}

interface GmailNachricht {
  id: string
  threadId: string
  internalDate?: string
  snippet?: string
  labelIds?: string[]
  payload?: { headers?: Array<{ name: string; value: string }> }
}

/** Gmail-Antwort in das eigene Format (exportiert für Tests) */
export function alsRohMail(n: GmailNachricht): RohMail {
  const kopf = (name: string) => n.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
  const liste = (wert: string) => wert.split(',').map((s) => s.trim()).filter(Boolean)
  return {
    id: n.id,
    threadId: n.threadId,
    zeitpunkt: new Date(Number(n.internalDate ?? 0)).toISOString(),
    von: kopf('From'),
    an: [...liste(kopf('To')), ...liste(kopf('Cc'))],
    betreff: kopf('Subject'),
    auszug: entitaeten(n.snippet ?? ''),
    labels: n.labelIds ?? [],
  }
}

/** Gmail liefert Auszüge HTML-kodiert (&amp; …) – als reiner Text übernehmen, nie als HTML */
function entitaeten(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

export const gmailDienst: MailDienst = {
  konfiguriert: googleKonfiguriert(),
  async profil() {
    return (await holeJson<{ emailAddress: string }>('/profile')).emailAddress
  },
  async suchen(abfrage, max) {
    const p = new URLSearchParams({ q: abfrage, maxResults: String(max) })
    const antwort = await holeJson<{ messages?: Array<{ id: string }> }>(`/messages?${p.toString()}`)
    return (antwort.messages ?? []).map((m) => m.id)
  },
  async holen(id) {
    const p = new URLSearchParams({ format: 'metadata' })
    for (const h of ['From', 'To', 'Cc', 'Subject', 'Date']) p.append('metadataHeaders', h)
    return alsRohMail(await holeJson<GmailNachricht>(`/messages/${encodeURIComponent(id)}?${p.toString()}`))
  },
  async trennen() {
    const t = aktuellerToken()
    tokenVergessen()
    if (!t) return
    try {
      await fetch(REVOKE, { ...OPTIONEN, method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: t }) })
    } catch {
      // Ohne Netz verfällt der Token nach spätestens einer Stunde von selbst
    }
  },
}
