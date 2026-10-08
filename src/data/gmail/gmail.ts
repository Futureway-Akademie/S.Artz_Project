import { aktuellerToken, GMAIL_SCOPE, googleKonfiguriert, KALENDER_SCHREIBEN_SCOPE, KALENDER_SCOPE, tokenVergessen } from './googleAuth.ts'

/**
 * Einziges Modul mit Netzwerkzugriff auf Google: liest Gmail nur (gmail.readonly) und nur Kopfzeilen
 * (Absender, Empfänger, Betreff, Datum) plus den kurzen Textauszug – keine Anhänge, kein Volltext.
 * Ohne Konfiguration oder Anmeldung wird nichts gesendet.
 */

const API = 'https://gmail.googleapis.com/gmail/v1/users/me'
const REVOKE = 'https://oauth2.googleapis.com/revoke'
const KALENDER = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

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

/** Termin aus Google-Kalender – nur Titel, Zeit und Ort, nichts wird gespeichert */
export interface GoogleTermin {
  id: string
  titel: string
  /** JJJJ-MM-TT */
  datum: string
  /** HH:MM oder null bei ganztägigen Terminen */
  uhrzeit: string | null
  ort: string
}

export interface MailDienst {
  konfiguriert: boolean
  /** Kalender-Termine im Zeitraum (nur lesend, nur mit Kalender-Berechtigung) */
  termine(von: string, bis: string): Promise<GoogleTermin[]>
  /** Einen Termin anlegen (nur mit ausdrücklich erteilter Schreibberechtigung) */
  terminEintragen(termin: { titel: string; datum: string; uhrzeit: string | null; ort: string }): Promise<void>
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

async function holeJson<T>(pfad: string, basis = API, scope = GMAIL_SCOPE): Promise<T> {
  const t = aktuellerToken(Date.now(), scope)
  if (!t) throw new NichtAngemeldet()
  const antwort = await fetch(`${basis}${pfad}`, { ...OPTIONEN, headers: { Authorization: `Bearer ${t}` } })
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

interface KalenderEreignis {
  id: string
  summary?: string
  location?: string
  start?: { date?: string; dateTime?: string }
}

/** Google-Antwort ins eigene Format (exportiert für Tests); Uhrzeit in Ortszeit des Geräts */
export function alsGoogleTermin(e: KalenderEreignis): GoogleTermin | null {
  const start = e.start?.dateTime ? new Date(e.start.dateTime) : null
  const datum = e.start?.date ?? (start ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` : null)
  if (!datum) return null
  return {
    id: e.id,
    titel: e.summary?.trim() || '(ohne Titel)',
    datum,
    uhrzeit: start ? `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}` : null,
    ort: e.location?.trim() ?? '',
  }
}

/** Termin als Google-Ereignis: mit Uhrzeit eine Stunde (Zeitzone Berlin), sonst ganztägig. Exportiert für Tests. */
export function googleEreignis(t: { titel: string; datum: string; uhrzeit: string | null; ort: string }) {
  const zone = 'Europe/Berlin'
  if (!t.uhrzeit) {
    const ende = new Date(`${t.datum}T12:00:00Z`)
    ende.setUTCDate(ende.getUTCDate() + 1)
    return { summary: t.titel, location: t.ort || undefined, start: { date: t.datum }, end: { date: ende.toISOString().slice(0, 10) } }
  }
  const [h = 0, m = 0] = t.uhrzeit.split(':').map(Number)
  const bis = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(h + 1 > 23 ? 59 : m).padStart(2, '0')}`
  return { summary: t.titel, location: t.ort || undefined, start: { dateTime: `${t.datum}T${t.uhrzeit}:00`, timeZone: zone }, end: { dateTime: `${t.datum}T${bis}:00`, timeZone: zone } }
}

export const gmailDienst: MailDienst = {
  konfiguriert: googleKonfiguriert(),
  async termine(von, bis) {
    const p = new URLSearchParams({
      timeMin: new Date(`${von}T00:00:00`).toISOString(),
      timeMax: new Date(`${bis}T23:59:59`).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      fields: 'items(id,summary,location,start)',
    })
    const antwort = await holeJson<{ items?: KalenderEreignis[] }>(`?${p.toString()}`, KALENDER, KALENDER_SCOPE)
    return (antwort.items ?? []).map(alsGoogleTermin).filter((t): t is GoogleTermin => t !== null)
  },
  async terminEintragen(termin) {
    const t = aktuellerToken(Date.now(), KALENDER_SCHREIBEN_SCOPE)
    if (!t) throw new NichtAngemeldet()
    const antwort = await fetch(KALENDER, {
      ...OPTIONEN,
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(googleEreignis(termin)),
    })
    if (antwort.status === 401) {
      tokenVergessen()
      throw new NichtAngemeldet()
    }
    if (!antwort.ok) throw new Error(`Google-Kalender antwortet mit Fehler ${antwort.status}.`)
  },
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
