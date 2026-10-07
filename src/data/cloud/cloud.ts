/**
 * Schnittstelle für Login und Synchronisierung – unabhängig von Supabase, damit Tests einen Fake nutzen können.
 * Übertragen wird ausschließlich der verschlüsselte Umschlag (siehe `istVerschluesselterUmschlag`).
 */
import { alsTresor } from '../tresorKrypto.ts'

export interface CloudNutzer {
  id: string
  email: string
}

export interface CloudStand {
  /** Verschlüsselter Umschlag als JSON-Text */
  umschlag: string
  revision: number
  aktualisiertAm: string
}

export type SpeicherAntwort = { ok: true; revision: number } | { ok: false; konflikt: true }

export interface CloudDienst {
  konfiguriert: () => boolean
  sitzung: () => Promise<CloudNutzer | null>
  /** Meldet An- und Abmeldungen; liefert eine Abmeldefunktion */
  beobachten: (callback: (nutzer: CloudNutzer | null) => void) => () => void
  anmeldelinkSenden: (email: string, zurueck: string) => Promise<void>
  abmelden: () => Promise<void>
  laden: () => Promise<CloudStand | null>
  /** `erwarteteRevision` null = erster Upload; bei abweichender Revision Konflikt statt Überschreiben */
  speichern: (umschlag: string, erwarteteRevision: number | null) => Promise<SpeicherAntwort>
  loeschen: () => Promise<void>
}

/** Schutz vor Versehen: Nur ein verschlüsselter Tresor-Umschlag darf das Gerät verlassen. */
export function istVerschluesselterUmschlag(text: string): boolean {
  return alsTresor(text)?.version === 2
}
