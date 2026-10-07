import { isoWochentag, isWorkday, parseDatum, plusTage, toDatum } from '../dates.ts'
import type { AppData } from '../types.ts'
import { bezugInfo } from './bezug.ts'

export type KalenderArt = 'termin' | 'aufgabe' | 'kursaufgabe' | 'wiedervorlage'

export interface KalenderEintrag {
  /** Eindeutig, z. B. `termin:t1` */
  schluessel: string
  art: KalenderArt
  /** Ursprung, z. B. Termin-ID oder Bewerbungs-ID */
  id: string
  datum: string
  uhrzeit: string | null
  titel: string
  /** z. B. „Kontakt: Kim Muster“ */
  zusatz: string | null
  link: string | null
  erledigt: boolean
}

export const KALENDER_ART: Record<KalenderArt, string> = {
  termin: 'Termin',
  aufgabe: 'Frist',
  kursaufgabe: 'Kursaufgabe',
  wiedervorlage: 'Wiedervorlage',
}

/** Alle datierten Einträge zwischen `von` und `bis` (jeweils einschließlich), sortiert nach Datum und Uhrzeit. */
export function kalenderEintraege(data: AppData, von: string, bis: string, opts: { erledigte?: boolean } = {}): KalenderEintrag[] {
  const drin = (d: string | null): d is string => d !== null && d >= von && d <= bis
  const liste: KalenderEintrag[] = []

  for (const t of data.termine) {
    if (!drin(t.datum)) continue
    const info = bezugInfo(data, t.bezug)
    liste.push({ schluessel: `termin:${t.id}`, art: 'termin', id: t.id, datum: t.datum, uhrzeit: t.uhrzeit, titel: t.titel, zusatz: [t.ort, info?.text].filter(Boolean).join(' · ') || null, link: info?.link ?? null, erledigt: false })
  }
  for (const a of data.aufgaben) {
    if (!drin(a.faelligAm) || (a.erledigt && !opts.erledigte)) continue
    const info = bezugInfo(data, a.bezug)
    liste.push({ schluessel: `aufgabe:${a.id}`, art: 'aufgabe', id: a.id, datum: a.faelligAm, uhrzeit: null, titel: a.titel, zusatz: info?.text ?? null, link: info?.link ?? null, erledigt: a.erledigt })
  }
  for (const k of data.kursAufgaben) {
    if (!drin(k.faelligAm) || (k.status === 'erledigt' && !opts.erledigte)) continue
    liste.push({ schluessel: `kursaufgabe:${k.id}`, art: 'kursaufgabe', id: k.id, datum: k.faelligAm, uhrzeit: null, titel: `${k.code} ${k.titel}`, zusatz: null, link: '/weiterbildung', erledigt: k.status === 'erledigt' })
  }
  for (const k of data.kontakte) {
    const f = k.naechsteAktion?.faelligAm ?? null
    if (!drin(f)) continue
    liste.push({ schluessel: `wv-kontakt:${k.id}`, art: 'wiedervorlage', id: k.id, datum: f, uhrzeit: null, titel: k.naechsteAktion!.text, zusatz: k.name, link: `/kontakte/${k.id}`, erledigt: false })
  }
  for (const b of data.bewerbungen) {
    if (!drin(b.wiedervorlageAm)) continue
    liste.push({ schluessel: `wv-bewerbung:${b.id}`, art: 'wiedervorlage', id: b.id, datum: b.wiedervorlageAm, uhrzeit: null, titel: b.naechsterSchritt || `Bewerbung nachfassen`, zusatz: `Bewerbung: ${b.stelle}`, link: `/bewerbungen/${b.id}`, erledigt: false })
  }
  for (const l of data.leads) {
    if (!drin(l.wiedervorlageAm)) continue
    liste.push({ schluessel: `wv-lead:${l.id}`, art: 'wiedervorlage', id: l.id, datum: l.wiedervorlageAm, uhrzeit: null, titel: l.naechsterSchritt || 'Lead nachfassen', zusatz: `Lead: ${l.titel}`, link: `/kontakte/leads/${l.id}`, erledigt: false })
  }

  // Termine mit Uhrzeit nach der Uhrzeit, ganztägige Einträge zuerst
  return liste.sort((a, b) => a.datum.localeCompare(b.datum) || (a.uhrzeit ?? '').localeCompare(b.uhrzeit ?? '') || a.titel.localeCompare(b.titel, 'de'))
}

/** Montag der Woche eines Datums */
export function wochenanfang(datum: string): string {
  return plusTage(datum, 1 - isoWochentag(datum))
}

/** 6 × 7 Tage für die Monatsansicht (beginnt am Montag vor dem Monatsersten) */
export function monatsRaster(monat: string): string[] {
  const start = wochenanfang(`${monat}-01`)
  return Array.from({ length: 42 }, (_, i) => plusTage(start, i))
}

export function wochenTage(datum: string): string[] {
  const start = wochenanfang(datum)
  return Array.from({ length: 7 }, (_, i) => plusTage(start, i))
}

/** Ist das Datum ein Unterrichtstag der Weiterbildung? */
export function istKurstag(data: AppData, datum: string): boolean {
  return data.kurse.some((k) => k.startDatum !== null && k.endeDatum !== null && datum >= k.startDatum && datum <= k.endeDatum && isWorkday(datum, k.arbeitstage))
}

export function monatVerschieben(monat: string, delta: number): string {
  const d = parseDatum(`${monat}-01`)
  d.setMonth(d.getMonth() + delta)
  return toDatum(d).slice(0, 7)
}

// --- iCalendar-Export (RFC 5545) ---

function icsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Zeilen über 75 Oktette falten (vereinfachend nach Zeichen, mit Reserve für Umlaute) */
function falten(zeile: string): string {
  const teile: string[] = []
  let rest = zeile
  while (rest.length > 60) {
    teile.push(rest.slice(0, 60))
    rest = ` ${rest.slice(60)}`
  }
  teile.push(rest)
  return teile.join('\r\n')
}

const kompakt = (datum: string) => datum.replace(/-/g, '')

/**
 * Kalenderdatei für den Import in einen eigenen Kalender. Termine mit Uhrzeit als einstündige Ereignisse
 * in Ortszeit, alles andere ganztägig. Die Datei ist unverschlüsselt.
 */
export function alsIcs(eintraege: KalenderEintrag[], now: Date): string {
  const stempel = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`
  const zeilen = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PIKARTZ.AI//Arbeitscockpit//DE', 'CALSCALE:GREGORIAN']
  for (const e of eintraege) {
    const titel = e.art === 'termin' ? e.titel : `${KALENDER_ART[e.art]}: ${e.titel}`
    zeilen.push('BEGIN:VEVENT', `UID:${e.schluessel.replace(/[^a-zA-Z0-9-]/g, '-')}@arbeitscockpit.local`, `DTSTAMP:${stempel}`)
    if (e.uhrzeit) {
      const [h = 0, m = 0] = e.uhrzeit.split(':').map(Number)
      const ende = `${String(Math.min(h + 1, 23)).padStart(2, '0')}${String(h + 1 > 23 ? 59 : m).padStart(2, '0')}00`
      zeilen.push(`DTSTART:${kompakt(e.datum)}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`, `DTEND:${kompakt(e.datum)}T${ende}`)
    } else {
      zeilen.push(`DTSTART;VALUE=DATE:${kompakt(e.datum)}`, `DTEND;VALUE=DATE:${kompakt(plusTage(e.datum, 1))}`)
    }
    zeilen.push(falten(`SUMMARY:${icsText(titel)}`))
    if (e.zusatz) zeilen.push(falten(`DESCRIPTION:${icsText(e.zusatz)}`))
    zeilen.push('END:VEVENT')
  }
  zeilen.push('END:VCALENDAR')
  return zeilen.join('\r\n') + '\r\n'
}
