/**
 * Content-Security-Policy der gebauten App: Die App darf nichts von fremden Servern laden.
 * Einzige erlaubte Verbindung ist – falls eingerichtet – die eigene Supabase-Adresse für Login und
 * die Ende-zu-Ende-verschlüsselte Synchronisierung. Ohne Supabase-Konfiguration gibt es keine Verbindung.
 * Nur im Build aktiv – der Dev-Server von Vite braucht Inline-Skripte und eine Websocket-Verbindung.
 */
export function contentSecurityPolicy(supabaseUrl?: string): string {
  let verbindung = "'none'"
  if (supabaseUrl) {
    const url = new URL(supabaseUrl)
    if (url.protocol !== 'https:' || url.hostname.includes('*')) throw new Error('Die Supabase-Adresse muss eine https-Adresse sein.')
    verbindung = url.origin
  }
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
    "worker-src 'none'",
    "manifest-src 'self'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ')
}

/** Richtlinie ohne Supabase */
export const CONTENT_SECURITY_POLICY = contentSecurityPolicy()
