/**
 * Content-Security-Policy der gebauten App: Die App darf nichts von fremden Servern laden.
 * Einzige erlaubte Verbindung ist – falls eingerichtet – die eigene Supabase-Adresse für Login und
 * die Ende-zu-Ende-verschlüsselte Synchronisierung. Ohne Supabase-Konfiguration gibt es keine Verbindung.
 * Ist Gmail eingerichtet (VITE_GOOGLE_CLIENT_ID), kommen genau die Gmail-API, die Kalender-API (www.googleapis.com) und der Token-Widerruf hinzu.
 * Nur im Build aktiv – der Dev-Server von Vite braucht Inline-Skripte und eine Websocket-Verbindung.
 */
export const GMAIL_ZIELE = ['https://gmail.googleapis.com', 'https://oauth2.googleapis.com', 'https://www.googleapis.com']

export function contentSecurityPolicy(supabaseUrl?: string, opts: { gmail?: boolean } = {}): string {
  const ziele: string[] = []
  if (supabaseUrl) {
    const url = new URL(supabaseUrl)
    if (url.protocol !== 'https:' || url.hostname.includes('*')) throw new Error('Die Supabase-Adresse muss eine https-Adresse sein.')
    ziele.push(url.origin)
  }
  // Gmail nur lesend: API und Widerruf des Zugangs; die Anmeldung selbst ist eine Weiterleitung
  if (opts.gmail) ziele.push(...GMAIL_ZIELE)
  const verbindung = ziele.length ? ziele.join(' ') : "'none'"
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${verbindung}`,
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    // Nur der eigene Service Worker (Offline-Start)
    "worker-src 'self'",
    "manifest-src 'self'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ')
}

/** Richtlinie ohne Supabase */
export const CONTENT_SECURITY_POLICY = contentSecurityPolicy()
