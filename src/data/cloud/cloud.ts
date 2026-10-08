/**
 * Schnittstelle für Login und Synchronisierung – unabhängig von Supabase, damit Tests einen Fake nutzen können.
 * Übertragen wird ausschließlich der verschlüsselte Umschlag (siehe `istVerschluesselterUmschlag`).
 */
import type { KiAufgabe } from '../../../supabase/functions/_gemeinsam/ki.ts'
import type { Profil, Rolle } from '../../domain/bereiche.ts'
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

export interface KiAntwort {
  text: string
  /** Verbrauchte Tokens dieser Anfrage */
  tokens: number
  /** Restbudget im laufenden Monat */
  uebrig: number
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

  // --- Mehrbenutzer (Roadmap v7) ---
  /** Eigenes Profil; null, wenn (noch) keins existiert */
  meinProfil: () => Promise<Profil | null>
  rollen: () => Promise<Rolle[]>
  /** Nur für Admins: alle Profile */
  profile: () => Promise<Profil[]>
  /** Nur für Admins */
  rolleSpeichern: (rolle: { id?: string; name: string; bereiche: string[] }) => Promise<Rolle>
  rolleLoeschen: (id: string) => Promise<void>
  profilAendern: (userId: string, aenderung: Partial<Pick<Profil, 'rolleId' | 'gesperrt' | 'bereicheAn' | 'bereicheAus' | 'istAdmin'>>) => Promise<void>
  /** Einladung per Mail (über eine Supabase-Funktion, die den Admin prüft) */
  einladen: (email: string, rolleId: string | null, zurueck: string) => Promise<void>

  // --- KI-Assistent (Roadmap v7) ---
  /** Sendet genau den freigegebenen Text an die KI-Funktion (Claude über AWS Frankfurt) */
  ki: (aufgabe: KiAufgabe, eingabe: string) => Promise<KiAntwort>

  // --- Dokumente (Roadmap v7): nur verschlüsselte Bytes ---
  dateiHochladen: (pfad: string, daten: Uint8Array) => Promise<void>
  dateiLaden: (pfad: string) => Promise<Uint8Array | null>
  dateiLoeschen: (pfad: string) => Promise<void>
}

/** Schutz vor Versehen: Nur ein verschlüsselter Tresor-Umschlag darf das Gerät verlassen. */
export function istVerschluesselterUmschlag(text: string): boolean {
  return alsTresor(text)?.version === 2
}
