import { SCHEMA_VERSION } from './schema.ts'

export type MigrationResult =
  | { ok: true; value: unknown }
  | { ok: false; grund: 'version_neuer' | 'version_unbekannt'; version: unknown }

/**
 * Hebt gespeicherte Daten schrittweise auf SCHEMA_VERSION an.
 * Schlüssel = Ausgangsversion; jede Migration liefert die nächste Version.
 */
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // v2: Projekte mit Kategorie und „zuletzt aktiv“, Kurse mit Details
  1: (data) => ({
    ...data,
    schemaVersion: 2,
    projekte: liste(data.projekte).map((p) => ({ kategorie: '', zuletztAktiv: null, ...p })),
    kurse: liste(data.kurse).map((k) => ({ beschreibung: '', unterrichtszeit: '', umfang: '', module: [], ...k })),
  }),
  // v3: Zeitpunkt der letzten Sicherung
  2: (data) => ({
    ...data,
    schemaVersion: 3,
    einstellungen: { letzteSicherungAm: null, ...objekt(data.einstellungen) },
  }),
}

function objekt(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function liste(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

export function migrate(raw: unknown): MigrationResult {
  if (typeof raw !== 'object' || raw === null) return { ok: false, grund: 'version_unbekannt', version: undefined }
  let data = raw as Record<string, unknown>
  const gespeichert = data.schemaVersion

  if (typeof gespeichert !== 'number' || !Number.isInteger(gespeichert) || gespeichert < 1) {
    return { ok: false, grund: 'version_unbekannt', version: gespeichert }
  }
  let version: number = gespeichert
  if (version > SCHEMA_VERSION) return { ok: false, grund: 'version_neuer', version }

  while (version < SCHEMA_VERSION) {
    const step = migrations[version]
    if (!step) return { ok: false, grund: 'version_unbekannt', version }
    data = step(data)
    version = data.schemaVersion as number
  }
  return { ok: true, value: data }
}
