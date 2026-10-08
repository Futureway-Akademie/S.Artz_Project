import { toDatum } from '../domain/dates.ts'
import { alsUmschlag, entschluesseln, schluesselAbleiten, STANDARD_ITERATIONEN, verschluesseln } from './krypto.ts'

/**
 * Sicherungsdateien sind immer verschlüsselt (gleiches Verfahren wie im Browser-Speicher),
 * mit einem eigenen Passwort. Eine verlorene oder verschickte Datei ist ohne Passwort nicht lesbar.
 */
export function sicherungDateiname(now: Date, art: 'sicherung' | 'rohdaten' = 'sicherung'): string {
  return `pikartz-cockpit-${art}-${toDatum(now)}.json`
}

export async function sicherungErstellen(klartext: string, passwort: string, iterationen = STANDARD_ITERATIONEN): Promise<string> {
  const schluessel = await schluesselAbleiten(passwort, undefined, iterationen)
  return JSON.stringify(await verschluesseln(schluessel, klartext), null, 2)
}

export function istVerschluesselt(text: string): boolean {
  return alsUmschlag(text) !== null
}

/** Entschlüsselt eine Sicherungsdatei; wirft `FalschesPasswort`. */
export async function sicherungLesen(text: string, passwort: string): Promise<string> {
  const umschlag = alsUmschlag(text)
  if (!umschlag) return text
  return (await entschluesseln(passwort, umschlag)).klartext
}

