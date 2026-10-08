import { fristStatus, heute, nachFrist, tageZwischen } from '../dates.ts'
import type { AppData, Aufgabe, Bezug, Termin } from '../types.ts'

export type FristFilter = 'alle' | 'ueberfaellig' | 'heute' | 'woche' | 'ohne'
export type ErledigtFilter = 'offen' | 'erledigt' | 'alle'

export interface AufgabenFilter {
  suche: string
  status: ErledigtFilter
  frist: FristFilter
  /** `alle` | `ohne` | `projekt` | `weiterbildung` | `kontakt` | `projekt:<id>` … */
  bezug: string
}

export const STANDARD_AUFGABEN_FILTER: AufgabenFilter = { suche: '', status: 'offen', frist: 'alle', bezug: 'alle' }

function passtBezug(bezug: Bezug, filter: string): boolean {
  if (filter === 'alle') return true
  if (filter === 'ohne') return bezug.art === 'ohne'
  if (!filter.includes(':')) return bezug.art === filter
  return `${bezug.art}:${bezug.id}` === filter
}

function passtFrist(a: Aufgabe, filter: FristFilter, now: Date): boolean {
  if (filter === 'alle') return true
  if (filter === 'ohne') return a.faelligAm === null
  if (!a.faelligAm) return false
  const diff = tageZwischen(heute(now), a.faelligAm)
  if (filter === 'ueberfaellig') return diff < 0
  if (filter === 'heute') return diff === 0
  return diff >= 0 && diff <= 7
}

export function filtereAufgaben(data: AppData, filter: AufgabenFilter, now: Date): Aufgabe[] {
  const suche = filter.suche.trim().toLowerCase()
  return data.aufgaben
    .filter((a) => (filter.status === 'alle' ? true : filter.status === 'erledigt' ? a.erledigt : !a.erledigt))
    .filter((a) => passtBezug(a.bezug, filter.bezug))
    .filter((a) => passtFrist(a, filter.frist, now))
    .filter((a) => !suche || `${a.titel} ${a.notiz}`.toLowerCase().includes(suche))
    .sort((a, b) => nachFrist(a, b) || a.erstelltAm.localeCompare(b.erstelltAm))
}

export interface AufgabenGruppe {
  schluessel: 'ueberfaellig' | 'heute' | 'woche' | 'spaeter' | 'ohne' | 'erledigt'
  titel: string
  aufgaben: Aufgabe[]
}

const GRUPPEN: Array<[AufgabenGruppe['schluessel'], string]> = [
  ['ueberfaellig', 'Überfällig'],
  ['heute', 'Heute fällig'],
  ['woche', 'Nächste 7 Tage'],
  ['spaeter', 'Später'],
  ['ohne', 'Ohne Frist'],
  ['erledigt', 'Erledigt'],
]

/** Gruppiert nach Fristlage relativ zum Gerätedatum; leere Gruppen entfallen. */
export function gruppiereAufgaben(aufgaben: Aufgabe[], now: Date): AufgabenGruppe[] {
  const schluessel = (a: Aufgabe): AufgabenGruppe['schluessel'] => {
    if (a.erledigt) return 'erledigt'
    const s = fristStatus(a.faelligAm, now)
    return s === 'bald' ? 'woche' : s
  }
  return GRUPPEN.map(([k, titel]) => ({ schluessel: k, titel, aufgaben: aufgaben.filter((a) => schluessel(a) === k) })).filter(
    (g) => g.aufgaben.length > 0,
  )
}

export interface TerminListen {
  anstehend: Termin[]
  vergangen: Termin[]
}

const nachZeit = (a: Termin, b: Termin) => a.datum.localeCompare(b.datum) || (a.uhrzeit ?? '').localeCompare(b.uhrzeit ?? '')

/** Termine ab heute (aufsteigend) und vergangene (neueste zuerst). */
export function terminListen(data: AppData, now: Date): TerminListen {
  const h = heute(now)
  return {
    anstehend: data.termine.filter((t) => t.datum >= h).sort(nachZeit),
    vergangen: data.termine.filter((t) => t.datum < h).sort((a, b) => nachZeit(b, a)),
  }
}
