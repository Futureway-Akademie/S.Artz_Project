/**
 * Content-Security-Policy der gebauten App: Die App darf nichts von fremden Servern laden
 * und keine Daten senden. Alles bleibt im Browser.
 * Nur im Build aktiv – der Dev-Server von Vite braucht Inline-Skripte und eine Websocket-Verbindung.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ')
