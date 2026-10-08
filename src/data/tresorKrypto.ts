/**
 * Tresor-Format Version 2: Die Daten sind mit einem zufälligen Datenschlüssel verschlüsselt.
 * Dieser Datenschlüssel liegt zweimal verpackt im Umschlag:
 * - mit dem Schlüssel aus dem Passwort (PBKDF2), immer
 * - mit einem zufälligen Wiederherstellungsschlüssel, optional (liegt bei Supabase, nur für Sascha lesbar)
 * So lässt sich das Passwort ändern oder wiederherstellen, ohne die Daten neu zu verschlüsseln.
 * Version 1 (Daten direkt mit dem Passwortschlüssel) wird beim ersten Entsperren umgestellt.
 */
import {
  alsUmschlag,
  ausBase64,
  entschluesseln,
  FalschesPasswort,
  KRYPTO_FORMAT,
  schluesselAbleiten,
  STANDARD_ITERATIONEN,
  zuBase64,
  zufall,
  type Umschlag,
} from './krypto.ts'

export interface Gepackt {
  iv: string
  daten: string
}

/** Alles außer den eigentlichen Daten: Wie der Datenschlüssel geöffnet wird. */
export interface TresorKopf {
  format: typeof KRYPTO_FORMAT
  version: 2
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterationen: number; salt: string }
  passwortSchluessel: Gepackt
  /** Wiederherstellung per E-Mail, falls eingerichtet; die Adresse wird nur zur Anzeige gespeichert */
  wiederherstellung: { schluessel: Gepackt; email: string } | null
}

export interface TresorUmschlag extends TresorKopf {
  iv: string
  daten: string
}

export interface Tresorschluessel {
  datenschluessel: CryptoKey
  kopf: TresorKopf
}

const AES = { name: 'AES-GCM', length: 256 } as const

async function neuerDatenschluessel(): Promise<CryptoKey> {
  // exportierbar nur, damit er verpackt werden kann; er verlässt den Arbeitsspeicher nie unverpackt
  return crypto.subtle.generateKey(AES, true, ['encrypt', 'decrypt'])
}

async function einpacken(datenschluessel: CryptoKey, mit: CryptoKey): Promise<Gepackt> {
  const iv = zufall(12)
  const daten = await crypto.subtle.wrapKey('raw', datenschluessel, mit, { name: 'AES-GCM', iv })
  return { iv: zuBase64(iv), daten: zuBase64(new Uint8Array(daten)) }
}

async function auspacken(gepackt: Gepackt, mit: CryptoKey): Promise<CryptoKey> {
  try {
    return await crypto.subtle.unwrapKey('raw', ausBase64(gepackt.daten), mit, { name: 'AES-GCM', iv: ausBase64(gepackt.iv) }, AES, true, ['encrypt', 'decrypt'])
  } catch {
    throw new FalschesPasswort()
  }
}

async function passwortKopf(datenschluessel: CryptoKey, passwort: string, iterationen: number, wiederherstellung: TresorKopf['wiederherstellung']): Promise<TresorKopf> {
  const kek = await schluesselAbleiten(passwort, undefined, iterationen)
  return {
    format: KRYPTO_FORMAT,
    version: 2,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterationen, salt: zuBase64(kek.salt) },
    passwortSchluessel: await einpacken(datenschluessel, kek.key),
    wiederherstellung,
  }
}

/** Neuer Tresor mit neuem Datenschlüssel */
export async function tresorAnlegen(passwort: string, iterationen = STANDARD_ITERATIONEN): Promise<Tresorschluessel> {
  const datenschluessel = await neuerDatenschluessel()
  return { datenschluessel, kopf: await passwortKopf(datenschluessel, passwort, iterationen, null) }
}

export async function tresorVerschluesseln(schluessel: Tresorschluessel, klartext: string): Promise<TresorUmschlag> {
  const iv = zufall(12)
  const daten = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, schluessel.datenschluessel, new TextEncoder().encode(klartext))
  return { ...schluessel.kopf, iv: zuBase64(iv), daten: zuBase64(new Uint8Array(daten)) }
}

async function datenEntschluesseln(datenschluessel: CryptoKey, umschlag: TresorUmschlag): Promise<string> {
  try {
    const klar = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ausBase64(umschlag.iv) }, datenschluessel, ausBase64(umschlag.daten))
    return new TextDecoder().decode(klar)
  } catch {
    throw new FalschesPasswort()
  }
}

/** Erkennt Tresor-Umschläge beider Versionen. */
export function alsTresor(text: string): Umschlag | TresorUmschlag | null {
  const v1 = alsUmschlag(text)
  if (v1) return v1
  try {
    const wert = JSON.parse(text) as Partial<TresorUmschlag>
    if (
      wert?.format === KRYPTO_FORMAT &&
      wert.version === 2 &&
      typeof wert.iv === 'string' &&
      typeof wert.daten === 'string' &&
      typeof wert.passwortSchluessel?.daten === 'string' &&
      typeof wert.kdf?.salt === 'string'
    ) {
      return wert as TresorUmschlag
    }
  } catch {
    // kein JSON
  }
  return null
}

function kopfVon(u: TresorUmschlag): TresorKopf {
  return { format: u.format, version: 2, kdf: u.kdf, passwortSchluessel: u.passwortSchluessel, wiederherstellung: u.wiederherstellung ?? null }
}

/**
 * Mit dem Passwort öffnen. Ein Umschlag der Version 1 wird dabei auf Version 2 umgestellt
 * (neuer Datenschlüssel); der zurückgegebene Schlüssel schreibt ab dann Version 2.
 */
export async function tresorOeffnen(passwort: string, umschlag: Umschlag | TresorUmschlag): Promise<{ klartext: string; schluessel: Tresorschluessel }> {
  if (umschlag.version === 1) {
    const { klartext } = await entschluesseln(passwort, umschlag)
    const datenschluessel = await neuerDatenschluessel()
    return { klartext, schluessel: { datenschluessel, kopf: await passwortKopf(datenschluessel, passwort, umschlag.kdf.iterationen, null) } }
  }
  const kek = await schluesselAbleiten(passwort, ausBase64(umschlag.kdf.salt), umschlag.kdf.iterationen)
  const datenschluessel = await auspacken(umschlag.passwortSchluessel, kek.key)
  const kopf = kopfVon(umschlag)
  return { klartext: await datenEntschluesseln(datenschluessel, umschlag), schluessel: { datenschluessel, kopf } }
}

/** Neues Passwort für denselben Datenschlüssel; eine eingerichtete Wiederherstellung bleibt gültig. */
export async function passwortSetzen(schluessel: Tresorschluessel, passwort: string, iterationen = schluessel.kopf.kdf.iterationen): Promise<Tresorschluessel> {
  return { datenschluessel: schluessel.datenschluessel, kopf: await passwortKopf(schluessel.datenschluessel, passwort, iterationen, schluessel.kopf.wiederherstellung) }
}

async function wiederherstellungsKey(geheimnis: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', ausBase64(geheimnis), AES, false, ['wrapKey', 'unwrapKey'])
}

/** Erzeugt einen neuen Wiederherstellungsschlüssel (32 zufällige Bytes, Base64) und verpackt den Datenschlüssel damit. */
export async function wiederherstellungEinrichten(schluessel: Tresorschluessel, email: string): Promise<{ schluessel: Tresorschluessel; geheimnis: string }> {
  const geheimnis = zuBase64(zufall(32))
  const gepackt = await einpacken(schluessel.datenschluessel, await wiederherstellungsKey(geheimnis))
  return { geheimnis, schluessel: { ...schluessel, kopf: { ...schluessel.kopf, wiederherstellung: { schluessel: gepackt, email } } } }
}

export function wiederherstellungEntfernen(schluessel: Tresorschluessel): Tresorschluessel {
  return { ...schluessel, kopf: { ...schluessel.kopf, wiederherstellung: null } }
}

/** Öffnet den Tresor mit dem Wiederherstellungsschlüssel (nach Bestätigung per E-Mail). */
export async function mitWiederherstellungOeffnen(geheimnis: string, umschlag: TresorUmschlag): Promise<{ klartext: string; schluessel: Tresorschluessel }> {
  if (!umschlag.wiederherstellung) throw new Error('Für diese Daten ist keine Wiederherstellung eingerichtet.')
  const datenschluessel = await auspacken(umschlag.wiederherstellung.schluessel, await wiederherstellungsKey(geheimnis))
  const kopf = kopfVon(umschlag)
  return { klartext: await datenEntschluesseln(datenschluessel, umschlag), schluessel: { datenschluessel, kopf } }
}

/** Öffnet mit einem schon bekannten Datenschlüssel (z. B. Stand aus einem anderen Tab). */
export async function tresorOeffnenMitSchluessel(datenschluessel: CryptoKey, umschlag: TresorUmschlag): Promise<{ klartext: string; schluessel: Tresorschluessel }> {
  return { klartext: await datenEntschluesseln(datenschluessel, umschlag), schluessel: { datenschluessel, kopf: kopfVon(umschlag) } }
}
