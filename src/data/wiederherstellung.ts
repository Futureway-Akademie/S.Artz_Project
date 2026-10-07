/**
 * Wiederherstellungslink: Der Schlüssel steht im Fragment (`#…`) des Links.
 * Browser senden das Fragment nie an einen Server – auch nicht beim Öffnen des Links.
 * Die Mail mit dem Link schickt sich Sascha über das eigene Mailprogramm selbst; die App versendet nichts.
 */
export const WIEDERHERSTELLUNG_PFAD = '/wiederherstellen'

export function wiederherstellungsLink(origin: string, geheimnis: string): string {
  return `${origin}${WIEDERHERSTELLUNG_PFAD}#schluessel=${encodeURIComponent(geheimnis)}`
}

export function geheimnisAusLink(hash: string): string | null {
  const wert = new URLSearchParams(hash.replace(/^#/, '')).get('schluessel')
  return wert && /^[A-Za-z0-9+/=]{40,}$/.test(wert) ? wert : null
}

/** Mail an sich selbst mit dem Link (mailto). */
export function wiederherstellungsMail(email: string, link: string): string {
  const betreff = 'Wiederherstellung PIKARTZ.AI Arbeitscockpit'
  const text = [
    'Diese Mail ist dein Wiederherstellungslink für das PIKARTZ.AI Arbeitscockpit.',
    '',
    'Falls du dein Passwort vergisst: Öffne diesen Link auf dem Rechner, auf dem das Cockpit läuft, und vergib ein neues Passwort:',
    link,
    '',
    'Wichtig: Wer diesen Link und Zugang zu deinem Rechner hat, kann deine Daten öffnen. Lösche die Mail nicht, leite sie nicht weiter und schütze dein Postfach mit Zwei-Faktor-Anmeldung.',
    'Richtest du die Wiederherstellung neu ein, wird dieser Link ungültig.',
  ].join('\r\n')
  return `mailto:${encodeURIComponent(email.trim()).replace(/%40/g, '@')}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`
}
