/**
 * Kryptografie für geteilte Bereiche:
 * - Jeder Nutzer hat ein Schlüsselpaar (RSA-OAEP 3072). Der öffentliche Schlüssel liegt lesbar bei Supabase,
 *   der private nur mit dem Datenschlüssel des eigenen Tresors verschlüsselt.
 * - Ein geteilter Bereich wird mit einem eigenen Bereichsschlüssel (AES-GCM 256) verschlüsselt; dieser wird für
 *   jeden Empfänger mit dessen öffentlichem Schlüssel verpackt. Bei jeder Aktualisierung entsteht ein neuer
 *   Bereichsschlüssel – wer entfernt wurde, kann neue Stände nicht mehr lesen.
 */
import { ausBase64, zuBase64, zufall } from '../krypto.ts'

export const FREIGABE_FORMAT = 'pikartz-freigabe'

const RSA = { name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' } as const
const AES = { name: 'AES-GCM', length: 256 } as const

export interface VerschluesselterText {
  iv: string
  daten: string
}

export interface FreigabeUmschlag extends VerschluesselterText {
  format: typeof FREIGABE_FORMAT
  version: 1
}

export interface Schluesselpaar {
  oeffentlich: JsonWebKey
  privat: CryptoKey
}

async function aesVerschluesseln(schluessel: CryptoKey, klartext: string): Promise<VerschluesselterText> {
  const iv = zufall(12)
  const daten = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, schluessel, new TextEncoder().encode(klartext))
  return { iv: zuBase64(iv), daten: zuBase64(new Uint8Array(daten)) }
}

async function aesEntschluesseln(schluessel: CryptoKey, text: VerschluesselterText): Promise<string> {
  const klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ausBase64(text.iv) }, schluessel, ausBase64(text.daten))
  return new TextDecoder().decode(klar)
}

export async function schluesselpaarErzeugen(): Promise<Schluesselpaar> {
  const paar = await crypto.subtle.generateKey(RSA, true, ['wrapKey', 'unwrapKey'])
  return { oeffentlich: await crypto.subtle.exportKey('jwk', paar.publicKey), privat: paar.privateKey }
}

/** Privaten Schlüssel mit dem Datenschlüssel des Tresors verschlüsseln (zum Speichern bei Supabase) */
export async function privatVerschluesseln(datenschluessel: CryptoKey, privat: CryptoKey): Promise<VerschluesselterText> {
  return aesVerschluesseln(datenschluessel, JSON.stringify(await crypto.subtle.exportKey('jwk', privat)))
}

export async function privatEntschluesseln(datenschluessel: CryptoKey, text: VerschluesselterText): Promise<CryptoKey> {
  const jwk = JSON.parse(await aesEntschluesseln(datenschluessel, text)) as JsonWebKey
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['unwrapKey'])
}

export async function bereichsschluesselErzeugen(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES, true, ['encrypt', 'decrypt'])
}

/** Bereichsschlüssel für einen Empfänger verpacken (nur dessen privater Schlüssel kann ihn öffnen) */
export async function fuerEmpfaengerVerpacken(bereichsschluessel: CryptoKey, oeffentlich: JsonWebKey): Promise<string> {
  const empfaenger = await crypto.subtle.importKey('jwk', oeffentlich, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['wrapKey'])
  return zuBase64(new Uint8Array(await crypto.subtle.wrapKey('raw', bereichsschluessel, empfaenger, { name: 'RSA-OAEP' })))
}

export async function alsEmpfaengerEntpacken(verpackt: string, privat: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey('raw', ausBase64(verpackt), privat, { name: 'RSA-OAEP' }, AES, false, ['decrypt'])
}

export async function inhaltVerschluesseln(bereichsschluessel: CryptoKey, inhalt: unknown): Promise<FreigabeUmschlag> {
  return { format: FREIGABE_FORMAT, version: 1, ...(await aesVerschluesseln(bereichsschluessel, JSON.stringify(inhalt))) }
}

export async function inhaltEntschluesseln<T>(bereichsschluessel: CryptoKey, umschlag: FreigabeUmschlag): Promise<T> {
  return JSON.parse(await aesEntschluesseln(bereichsschluessel, umschlag)) as T
}

export function istFreigabeUmschlag(wert: unknown): wert is FreigabeUmschlag {
  const u = wert as Partial<FreigabeUmschlag> | null
  return Boolean(u && u.format === FREIGABE_FORMAT && u.version === 1 && typeof u.iv === 'string' && typeof u.daten === 'string')
}
