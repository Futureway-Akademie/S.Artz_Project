/**
 * Abgleich zwischen dem verschlüsselten Umschlag im Browser und dem bei Supabase.
 * Grundsätze:
 * - Hochgeladen wird nur der verschlüsselte Umschlag (wird vor jedem Upload geprüft).
 * - Optimistische Sperre über eine Revisionsnummer: Nichts wird stillschweigend überschrieben.
 * - Haben beide Seiten geändert, entscheidet Sascha (Konflikt).
 */
import { STORAGE_KEY, type KeyValueStorage } from '../storage.ts'
import { alsTresor, tresorOeffnenMitSchluessel, type TresorUmschlag, type Tresorschluessel } from '../tresorKrypto.ts'
import { istVerschluesselterUmschlag, type CloudDienst, type CloudStand } from './cloud.ts'

export const SYNC_KEY = `${STORAGE_KEY}:sync`
/** Konto, dem der Tresor auf diesem Gerät gehört – verhindert Abgleich mit einem fremden Konto */
export const BESITZER_KEY = `${STORAGE_KEY}:besitzer`

export function besitzer(basis: KeyValueStorage): string | null {
  return basis.getItem(BESITZER_KEY)
}

export function besitzerSetzen(basis: KeyValueStorage, nutzerId: string | null): void {
  if (nutzerId) basis.setItem(BESITZER_KEY, nutzerId)
  else basis.removeItem(BESITZER_KEY)
}

export interface SyncMeta {
  /** Revision des Server-Stands, auf dem der lokale Stand beruht; null = noch nie synchronisiert */
  revision: number | null
  /** Seit dem letzten Abgleich lokal geändert */
  lokalGeaendert: boolean
  letzteSync: string | null
}

const LEER: SyncMeta = { revision: null, lokalGeaendert: true, letzteSync: null }

export function ladeSyncMeta(basis: KeyValueStorage): SyncMeta {
  try {
    const wert = JSON.parse(basis.getItem(SYNC_KEY) ?? 'null') as Partial<SyncMeta> | null
    if (!wert) return LEER
    return {
      revision: typeof wert.revision === 'number' ? wert.revision : null,
      lokalGeaendert: wert.lokalGeaendert !== false,
      letzteSync: typeof wert.letzteSync === 'string' ? wert.letzteSync : null,
    }
  } catch {
    return LEER
  }
}

export function speichereSyncMeta(basis: KeyValueStorage, meta: SyncMeta): void {
  basis.setItem(SYNC_KEY, JSON.stringify(meta))
}

export type SyncErgebnis =
  | { art: 'aktuell' }
  | { art: 'hochgeladen'; revision: number }
  | { art: 'uebernommen'; klartext: string; schluessel: Tresorschluessel }
  /** Beide Seiten geändert */
  | { art: 'konflikt'; server: CloudStand }
  /** Auf dem Server liegt ein anderer Tresor (anderer Datenschlüssel, z. B. auf einem anderen Gerät neu angelegt) */
  | { art: 'fremd'; server: CloudStand }

/** Lädt den lokalen Umschlag hoch, wenn er verschlüsselt ist. */
async function hochladen(dienst: CloudDienst, basis: KeyValueStorage, erwartet: number | null): Promise<SyncErgebnis | null> {
  const lokal = basis.getItem(STORAGE_KEY)
  if (!lokal) return { art: 'aktuell' }
  if (!istVerschluesselterUmschlag(lokal)) throw new Error('Abgebrochen: Nur verschlüsselte Daten dürfen das Gerät verlassen.')
  const antwort = await dienst.speichern(lokal, erwartet)
  if (!antwort.ok) return null
  speichereSyncMeta(basis, { revision: antwort.revision, lokalGeaendert: false, letzteSync: new Date().toISOString() })
  return { art: 'hochgeladen', revision: antwort.revision }
}

/** Server-Stand mit dem vorhandenen Datenschlüssel öffnen; gelingt das nicht, ist es ein fremder Tresor. */
async function uebernehmen(basis: KeyValueStorage, server: CloudStand, schluessel: Tresorschluessel): Promise<SyncErgebnis> {
  const umschlag = alsTresor(server.umschlag)
  if (umschlag?.version !== 2) return { art: 'fremd', server }
  try {
    const geoeffnet = await tresorOeffnenMitSchluessel(schluessel.datenschluessel, umschlag as TresorUmschlag)
    basis.setItem(STORAGE_KEY, server.umschlag)
    speichereSyncMeta(basis, { revision: server.revision, lokalGeaendert: false, letzteSync: new Date().toISOString() })
    return { art: 'uebernommen', ...geoeffnet }
  } catch {
    return { art: 'fremd', server }
  }
}

/** Ein Abgleichschritt; bei einem Wettlauf (Server hat sich währenddessen geändert) wird einmal neu abgeglichen. */
export async function abgleichen(dienst: CloudDienst, basis: KeyValueStorage, schluessel: Tresorschluessel, versuch = 0): Promise<SyncErgebnis> {
  const meta = ladeSyncMeta(basis)
  const server = await dienst.laden()
  if (!server) {
    const r = await hochladen(dienst, basis, null)
    return r ?? (versuch < 1 ? abgleichen(dienst, basis, schluessel, versuch + 1) : { art: 'aktuell' })
  }
  if (meta.revision === server.revision) {
    if (!meta.lokalGeaendert) return { art: 'aktuell' }
    const r = await hochladen(dienst, basis, server.revision)
    return r ?? (versuch < 1 ? abgleichen(dienst, basis, schluessel, versuch + 1) : { art: 'konflikt', server })
  }
  // Server hat einen anderen Stand
  if (!meta.lokalGeaendert) return uebernehmen(basis, server, schluessel)
  // Noch nie synchronisiert und Server enthält denselben Tresor? Dann trotzdem Konflikt – Sascha entscheidet.
  return { art: 'konflikt', server }
}

/** Konflikt lösen: diesen Stand hochladen und den Server überschreiben. */
export async function hierBehalten(dienst: CloudDienst, basis: KeyValueStorage, server: CloudStand): Promise<SyncErgebnis> {
  const r = await hochladen(dienst, basis, server.revision)
  return r ?? { art: 'konflikt', server: (await dienst.laden()) ?? server }
}

/** Konflikt lösen: den Server-Stand übernehmen (lokale Änderungen verwerfen). */
export function serverUebernehmen(basis: KeyValueStorage, server: CloudStand, schluessel: Tresorschluessel): Promise<SyncErgebnis> {
  return uebernehmen(basis, server, schluessel)
}

/** Neues Gerät: verschlüsselten Stand vom Server holen; entsperrt wird danach mit dem Passwort. */
export async function vomServerHolen(dienst: CloudDienst, basis: KeyValueStorage): Promise<boolean> {
  const server = await dienst.laden()
  if (!server || !istVerschluesselterUmschlag(server.umschlag)) return false
  basis.setItem(STORAGE_KEY, server.umschlag)
  speichereSyncMeta(basis, { revision: server.revision, lokalGeaendert: false, letzteSync: new Date().toISOString() })
  return true
}

export function lokalGeaendert(basis: KeyValueStorage): void {
  const meta = ladeSyncMeta(basis)
  if (!meta.lokalGeaendert) speichereSyncMeta(basis, { ...meta, lokalGeaendert: true })
}
