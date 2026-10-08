/**
 * Verschlüsselung der Daten im Browser (Web Crypto, ohne Fremdbibliothek).
 *
 * - Schlüssel: PBKDF2 (SHA-256) aus dem Passwort und einem zufälligen Salt; der Schlüssel ist nicht exportierbar.
 * - Verfahren: AES-GCM mit 256 Bit und zufälligem IV je Speichervorgang (schützt auch vor Manipulation).
 * - Das Passwort selbst wird nirgends gespeichert. Ohne Passwort gibt es keine Wiederherstellung.
 */

export const KRYPTO_FORMAT = 'pikartz-verschluesselt'
/** Empfehlung OWASP 2023 für PBKDF2-HMAC-SHA256 */
export const STANDARD_ITERATIONEN = 600_000
export const MIN_PASSWORT_LAENGE = 10

export interface Umschlag {
  format: typeof KRYPTO_FORMAT
  version: 1
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterationen: number; salt: string }
  iv: string
  daten: string
}

export interface Schluessel {
  key: CryptoKey
  salt: Uint8Array<ArrayBuffer>
  iterationen: number
}

export function zuBase64(bytes: Uint8Array): string {
  let text = ''
  for (const b of bytes) text += String.fromCharCode(b)
  return btoa(text)
}

export function ausBase64(text: string): Uint8Array<ArrayBuffer> {
  const roh = atob(text)
  const bytes = new Uint8Array(roh.length)
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i)
  return bytes
}

export function zufall(laenge: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(laenge))
}

export async function schluesselAbleiten(
  passwort: string,
  salt: Uint8Array<ArrayBuffer> = zufall(16),
  iterationen = STANDARD_ITERATIONEN,
): Promise<Schluessel> {
  const basis = await crypto.subtle.importKey('raw', new TextEncoder().encode(passwort), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iterationen },
    basis,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  )
  return { key, salt, iterationen }
}

export async function verschluesseln(schluessel: Schluessel, klartext: string): Promise<Umschlag> {
  const iv = zufall(12)
  const daten = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, schluessel.key, new TextEncoder().encode(klartext))
  return {
    format: KRYPTO_FORMAT,
    version: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterationen: schluessel.iterationen, salt: zuBase64(schluessel.salt) },
    iv: zuBase64(iv),
    daten: zuBase64(new Uint8Array(daten)),
  }
}

export class FalschesPasswort extends Error {
  constructor() {
    super('Das Passwort ist falsch oder die Daten sind beschädigt.')
    this.name = 'FalschesPasswort'
  }
}

/** Entschlüsselt mit einem vorhandenen Schlüssel (gleiches Salt). */
export async function entschluesselnMit(schluessel: Schluessel, umschlag: Umschlag): Promise<string> {
  try {
    const klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ausBase64(umschlag.iv) }, schluessel.key, ausBase64(umschlag.daten))
    return new TextDecoder().decode(klar)
  } catch {
    throw new FalschesPasswort()
  }
}

/** Leitet den Schlüssel aus dem Passwort ab und entschlüsselt; liefert den Schlüssel für spätere Speichervorgänge mit. */
export async function entschluesseln(passwort: string, umschlag: Umschlag): Promise<{ klartext: string; schluessel: Schluessel }> {
  const schluessel = await schluesselAbleiten(passwort, ausBase64(umschlag.kdf.salt), umschlag.kdf.iterationen)
  return { klartext: await entschluesselnMit(schluessel, umschlag), schluessel }
}

/** Erkennt einen verschlüsselten Umschlag; alles andere gilt als Klartext. */
export function alsUmschlag(text: string): Umschlag | null {
  try {
    const wert: unknown = JSON.parse(text)
    if (
      typeof wert === 'object' &&
      wert !== null &&
      (wert as Umschlag).format === KRYPTO_FORMAT &&
      (wert as Umschlag).version === 1 &&
      typeof (wert as Umschlag).iv === 'string' &&
      typeof (wert as Umschlag).daten === 'string' &&
      typeof (wert as Umschlag).kdf?.salt === 'string' &&
      Number.isInteger((wert as Umschlag).kdf?.iterationen)
    ) {
      return wert as Umschlag
    }
  } catch {
    // kein JSON → kein Umschlag
  }
  return null
}

export function pruefePasswort(passwort: string, wiederholung: string): string | null {
  if (passwort.length < MIN_PASSWORT_LAENGE) return `Bitte mindestens ${MIN_PASSWORT_LAENGE} Zeichen verwenden.`
  if (passwort !== wiederholung) return 'Die beiden Eingaben stimmen nicht überein.'
  return null
}
