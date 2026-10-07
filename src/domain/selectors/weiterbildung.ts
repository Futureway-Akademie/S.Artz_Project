import { countWorkdays, heute, isWorkday, monatsGrenzen, plusTage } from '../dates.ts'
import type { AppData, Kurs, KursAufgabe } from '../types.ts'

export type KursRelation = 'vor' | 'laufend' | 'nach'

export interface Weiterbildung {
  kurs: Kurs
  /** Erster/letzter Kurstag; aus den Monaten abgeleitet, wenn keine genauen Daten belegt sind */
  start: string
  ende: string
  genaueDaten: boolean
  relation: KursRelation
  arbeitstage: {
    gesamt: number
    /** Arbeitstage vor heute */
    vergangen: number
    /** Arbeitstage ab heute (einschließlich) */
    verbleibend: number
    /** Nummer des heutigen Kurstags, falls heute ein Arbeitstag im Kurszeitraum ist */
    heuteKurstag: number | null
  }
  aufgaben: KursAufgabe[]
  /** `null`, solange keine Kursaufgaben eingetragen sind */
  fortschritt: { erledigt: number; gesamt: number; prozent: number } | null
}

const CODE_REIHENFOLGE = (code: string) => code.replace(/_(\d+)/g, (_, n: string) => `_${n.padStart(4, '0')}`)

/** Kennzahlen der (ersten) Weiterbildung, berechnet aus gespeicherten Daten und Gerätedatum. Feiertage werden nicht berücksichtigt. */
export function selectWeiterbildung(data: AppData, now: Date): Weiterbildung | null {
  const kurs = data.kurse[0]
  if (!kurs) return null
  const start = kurs.startDatum ?? monatsGrenzen(kurs.startMonat).erster
  const ende = kurs.endeDatum ?? monatsGrenzen(kurs.endeMonat).letzter
  const h = heute(now)
  const relation: KursRelation = h < start ? 'vor' : h > ende ? 'nach' : 'laufend'

  const gesamt = countWorkdays(start, ende, kurs.arbeitstage)
  const vergangen = relation === 'vor' ? 0 : relation === 'nach' ? gesamt : countWorkdays(start, plusTage(h, -1), kurs.arbeitstage)
  const heuteKurstag = relation === 'laufend' && isWorkday(h, kurs.arbeitstage) ? vergangen + 1 : null

  const aufgaben = data.kursAufgaben
    .filter((a) => a.kursId === kurs.id)
    .sort((a, b) => CODE_REIHENFOLGE(a.code).localeCompare(CODE_REIHENFOLGE(b.code)))
  const erledigt = aufgaben.filter((a) => a.status === 'erledigt').length

  return {
    kurs,
    start,
    ende,
    genaueDaten: Boolean(kurs.startDatum && kurs.endeDatum),
    relation,
    arbeitstage: { gesamt, vergangen, verbleibend: gesamt - vergangen, heuteKurstag },
    aufgaben,
    fortschritt: aufgaben.length === 0 ? null : { erledigt, gesamt: aufgaben.length, prozent: Math.round((erledigt / aufgaben.length) * 100) },
  }
}

/** Code-Format der Kursaufgaben, z. B. `KIAutomSpez_3_07`. */
export function kursCodeMuster(praefix: string): RegExp {
  return new RegExp(`^${praefix}_\\d+_\\d{2}$`)
}

/** Vorschlag für den nächsten Code im selben Modul, z. B. nach `KIAutomSpez_3_07` → `KIAutomSpez_3_08`. */
export function naechsterKursCode(kurs: Kurs, aufgaben: KursAufgabe[]): string {
  const letzte = aufgaben.at(-1)
  const treffer = letzte && /_(\d+)_(\d{2})$/.exec(letzte.code)
  if (!treffer) return `${kurs.codePraefix}_1_01`
  return `${kurs.codePraefix}_${treffer[1]}_${String(Number(treffer[2]) + 1).padStart(2, '0')}`
}
