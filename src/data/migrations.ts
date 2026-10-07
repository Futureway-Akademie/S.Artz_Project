import { SCHEMA_VERSION } from './schema.ts'
import { standardVorlagen } from './vorlagen.ts'

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
  // v4: Rechtsgrundlage und Zweck je Kontakt (DSGVO)
  3: (data) => ({
    ...data,
    schemaVersion: 4,
    kontakte: liste(data.kontakte).map((k) => ({ rechtsgrundlage: null, zweck: '', ...k })),
  }),
  // v5: Verknüpfungen (Auftraggeber, Verlauf zu Bewerbung/Lead), Wiedervorlagen, E-Mail-Felder, Fokus, Schlagworte
  4: (data) => ({
    ...data,
    schemaVersion: 5,
    projekte: liste(data.projekte).map((p) => ({ auftraggeberId: null, schlagworte: [], ...p })),
    aufgaben: liste(data.aufgaben).map((a) => ({ fokus: false, ...a })),
    unternehmen: liste(data.unternehmen).map((u) => ({ schlagworte: [], ...u })),
    kontakte: liste(data.kontakte).map((k) => ({ schlagworte: [], ...k })),
    interaktionen: liste(data.interaktionen).map((i) => ({ bewerbungId: null, leadId: null, betreff: '', richtung: null, ...i })),
    leads: liste(data.leads).map((l) => ({ projektId: null, wiedervorlageAm: null, ...l })),
    bewerbungen: liste(data.bewerbungen).map((b) => ({ wiedervorlageAm: null, ...b })),
  }),
  // v6: E-Mail-Vorlagen (neutrale Startvorlagen)
  5: (data) => ({
    ...data,
    schemaVersion: 6,
    vorlagen: Array.isArray(data.vorlagen) ? data.vorlagen : standardVorlagen(new Date().toISOString()),
  }),
  // v7: Zweites Gehirn (Wissen zu KI und Weiterbildung)
  6: (data) => ({ ...data, schemaVersion: 7, wissen: liste(data.wissen) }),
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
