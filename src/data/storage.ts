import type { AppData } from '../domain/types.ts'
import { migrate } from './migrations.ts'
import { appDataSchema } from './schema.ts'

export const STORAGE_KEY = 'pikartz-arbeitscockpit'

export type LadeFehler = 'json' | 'schema' | 'version_neuer' | 'version_unbekannt'

export type LadeErgebnis =
  | { status: 'leer' }
  | { status: 'ok'; data: AppData }
  | { status: 'fehler'; grund: LadeFehler; rohdaten: string; details?: string }
  | { status: 'nicht_verfuegbar' }

export type SpeicherErgebnis = { ok: true } | { ok: false; fehler: string }

/** Minimal benötigte Teilmenge von `Storage`, damit Tests einen Fake übergeben können. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Liefert localStorage, falls lesbar und beschreibbar, sonst `null` (z. B. privater Modus, gesperrte Cookies). */
export function getBrowserStorage(): KeyValueStorage | null {
  try {
    const storage = window.localStorage
    const probe = `${STORAGE_KEY}:probe`
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

/** Prüft beliebige Rohdaten (gespeichert oder importiert) inklusive Migration. */
export function parseAppData(text: string): Exclude<LadeErgebnis, { status: 'leer' } | { status: 'nicht_verfuegbar' }> {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    return { status: 'fehler', grund: 'json', rohdaten: text, details: String(error) }
  }

  const migrated = migrate(raw)
  if (!migrated.ok) return { status: 'fehler', grund: migrated.grund, rohdaten: text }

  const parsed = appDataSchema.safeParse(migrated.value)
  if (!parsed.success) {
    const details = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || '(Wurzel)'}: ${issue.message}`)
      .join('; ')
    return { status: 'fehler', grund: 'schema', rohdaten: text, details }
  }
  return { status: 'ok', data: parsed.data }
}

export function loadAppData(storage: KeyValueStorage | null): LadeErgebnis {
  if (!storage) return { status: 'nicht_verfuegbar' }
  let text: string | null
  try {
    text = storage.getItem(STORAGE_KEY)
  } catch {
    return { status: 'nicht_verfuegbar' }
  }
  if (text === null) return { status: 'leer' }
  return parseAppData(text)
}

export function saveAppData(storage: KeyValueStorage | null, data: AppData): SpeicherErgebnis {
  if (!storage) return { ok: false, fehler: 'Der Browser-Speicher ist nicht verfügbar.' }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    return { ok: true }
  } catch (error) {
    const voll = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)
    return {
      ok: false,
      fehler: voll ? 'Der Browser-Speicher ist voll.' : 'Die Daten konnten nicht gespeichert werden.',
    }
  }
}

export function clearAppData(storage: KeyValueStorage | null): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Löschen ist best effort; danach wird ohnehin neu gespeichert.
  }
}

export const LADEFEHLER_TEXT: Record<LadeFehler, string> = {
  json: 'Die gespeicherten Daten sind beschädigt und können nicht gelesen werden.',
  schema: 'Die gespeicherten Daten haben ein unerwartetes Format.',
  version_neuer: 'Die gespeicherten Daten stammen aus einer neueren Version der App.',
  version_unbekannt: 'Die Version der gespeicherten Daten ist unbekannt.',
}
