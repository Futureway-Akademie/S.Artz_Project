/**
 * Anmeldung bei Google nur mit Leseberechtigung für Gmail – ohne Google-Skript, per Weiterleitung
 * (OAuth 2.0 für clientseitige Web-Apps). Der Zugangs-Token liegt ausschließlich im Arbeitsspeicher:
 * Er wird nie gespeichert, verfällt nach etwa einer Stunde und ist nach dem Neuladen weg.
 * Ohne `VITE_GOOGLE_CLIENT_ID` ist die Funktion abgeschaltet.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
/** Schutz gegen untergeschobene Rücksprünge (CSRF); nur für die Dauer der Anmeldung im Tab */
export const STATE_KEY = 'pikartz.google.state'

export interface GoogleToken {
  wert: string
  /** Millisekunden seit 1970 */
  gueltigBis: number
}

export type Rueckkehr = { art: 'verbunden'; token: GoogleToken } | { art: 'fehler'; grund: string }

let token: GoogleToken | null = null
let meldung: Rueckkehr | null = null
const hoerer = new Set<() => void>()
const melden = () => hoerer.forEach((h) => h())

export const googleKonfiguriert = (clientId = CLIENT_ID) => Boolean(clientId)

/** Rücksprungadresse: Startseite der App; muss in der Google Cloud Console exakt so eingetragen sein. */
export const rueckkehrAdresse = (origin: string) => `${origin}/`

export function anmeldeUrl(clientId: string, redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: GMAIL_SCOPE,
    state,
    include_granted_scopes: 'false',
    prompt: 'consent',
  })
  return `${AUTH_URL}?${p.toString()}`
}

function zufall(): string {
  const b = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

/** Leitet zu Google weiter. Danach ist der Tresor gesperrt und muss nach der Rückkehr entsperrt werden. */
export function anmeldungStarten(ort: Pick<Location, 'origin' | 'assign'> = window.location, speicher: Pick<Storage, 'setItem'> = sessionStorage, clientId = CLIENT_ID) {
  if (!clientId) throw new Error('Google ist nicht eingerichtet.')
  const state = zufall()
  speicher.setItem(STATE_KEY, state)
  ort.assign(anmeldeUrl(clientId, rueckkehrAdresse(ort.origin), state))
}

/** Wertet das Fragment nach dem Rücksprung aus; `null`, wenn es kein Google-Rücksprung ist. */
export function rueckkehrAuswerten(hash: string, erwarteterState: string | null, jetzt: number): Rueckkehr | null {
  const p = new URLSearchParams(hash.replace(/^#/, ''))
  if (!p.has('access_token') && !p.has('error')) return null
  if (!p.get('state') || p.get('state') !== erwarteterState) return { art: 'fehler', grund: 'Die Anmeldung gehört nicht zu dieser Sitzung und wurde verworfen.' }
  const fehler = p.get('error')
  if (fehler) return { art: 'fehler', grund: fehler === 'access_denied' ? 'Du hast den Zugriff bei Google abgelehnt.' : `Google meldet: ${fehler}` }
  const scope = p.get('scope') ?? ''
  if (!scope.split(' ').includes(GMAIL_SCOPE)) return { art: 'fehler', grund: 'Google hat die Leseberechtigung für Gmail nicht erteilt.' }
  const sekunden = Number(p.get('expires_in') ?? '0')
  return { art: 'verbunden', token: { wert: p.get('access_token')!, gueltigBis: jetzt + Math.max(0, sekunden - 60) * 1000 } }
}

/**
 * Beim Start einmal aufrufen (vor dem ersten Rendern): übernimmt einen Token aus der Adresse
 * und entfernt ihn sofort daraus, damit er weder im Verlauf noch in Lesezeichen landet.
 */
export function rueckkehrVerarbeiten(ort: Location = window.location, verlauf: History = window.history, speicher: Storage = sessionStorage, jetzt = Date.now()) {
  const ergebnis = rueckkehrAuswerten(ort.hash, speicher.getItem(STATE_KEY), jetzt)
  if (!ergebnis) return
  speicher.removeItem(STATE_KEY)
  verlauf.replaceState(null, '', ort.pathname + ort.search)
  if (ergebnis.art === 'verbunden') token = ergebnis.token
  meldung = ergebnis
  melden()
}

/** Gültiger Token oder `null` */
export function aktuellerToken(jetzt = Date.now()): string | null {
  return token && token.gueltigBis > jetzt ? token.wert : null
}

export function tokenGueltigBis(): number | null {
  return token?.gueltigBis ?? null
}

/** Ergebnis des letzten Rücksprungs (für einen Hinweis in der Oberfläche) */
export function letzteMeldung(): Rueckkehr | null {
  return meldung
}

export function meldungGelesen() {
  meldung = null
  melden()
}

/** Vergisst den Token (z. B. beim Trennen oder Sperren) */
export function tokenVergessen() {
  token = null
  melden()
}

/** Nur für Tests */
export function tokenSetzen(t: GoogleToken | null) {
  token = t
  melden()
}

export function abonnieren(hoerer_: () => void): () => void {
  hoerer.add(hoerer_)
  return () => hoerer.delete(hoerer_)
}

/** Zustand für useSyncExternalStore: ändert sich bei jedem Melden */
let version = 0
hoerer.add(() => version++)
export const googleVersion = () => version
