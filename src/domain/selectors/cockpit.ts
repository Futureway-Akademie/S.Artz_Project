import { formatDatum, heute, nachFrist, plusTage, tageZwischen } from '../dates.ts'
import type { Aktivitaet, AppData, Bezug } from '../types.ts'
import { projektListe, type ProjektZeile } from './projekte.ts'
import { selectWeiterbildung } from './weiterbildung.ts'

export interface Begruessung {
  gruss: string
  name: string
  datum: string
}

/** Gruß nach Tageszeit des Geräts, Name aus den Einstellungen, Datum lang auf Deutsch. */
export function selectBegruessung(data: AppData, now: Date): Begruessung {
  const stunde = now.getHours()
  const gruss = stunde < 11 ? 'Guten Morgen' : stunde < 18 ? 'Guten Tag' : 'Guten Abend'
  return { gruss, name: data.einstellungen.anzeigename.trim(), datum: formatDatum(heute(now), 'lang') }
}

export interface Tagesuebersicht {
  heuteFaellig: number
  ueberfaellig: number
  termineHeute: number
  offeneSchritte: number
  /** Nummer des heutigen Kurstags oder `null` */
  kurstag: number | null
}

export function selectTagesuebersicht(data: AppData, now: Date): Tagesuebersicht {
  const h = heute(now)
  const offen = data.aufgaben.filter((a) => !a.erledigt)
  const wiedervorlagen = data.kontakte.map((k) => k.naechsteAktion).filter((n) => n !== null)
  const fristen = [...offen.map((a) => a.faelligAm), ...wiedervorlagen.map((n) => n.faelligAm)].filter((f): f is string => f !== null)
  return {
    heuteFaellig: fristen.filter((f) => f === h).length,
    ueberfaellig: fristen.filter((f) => f < h).length,
    termineHeute: data.termine.filter((t) => t.datum === h).length,
    offeneSchritte: offen.length + wiedervorlagen.length,
    kurstag: selectWeiterbildung(data, now)?.arbeitstage.heuteKurstag ?? null,
  }
}

export interface NaechsterSchritt {
  art: 'aufgabe' | 'wiedervorlage'
  id: string
  titel: string
  faelligAm: string | null
  bezug: Bezug
}

/**
 * Offene Projektaufgaben und Kontakt-Wiedervorlagen.
 * Reihenfolge: überfällig → mit Frist (aufsteigend) → ohne Frist.
 */
export function selectNaechsteSchritte(data: AppData, limit = 8): { eintraege: NaechsterSchritt[]; gesamt: number } {
  const aufgaben: NaechsterSchritt[] = data.aufgaben
    .filter((a) => !a.erledigt && a.bezug.art === 'projekt')
    .map((a) => ({ art: 'aufgabe', id: a.id, titel: a.titel, faelligAm: a.faelligAm, bezug: a.bezug }))
  const wiedervorlagen: NaechsterSchritt[] = data.kontakte
    .filter((k) => k.naechsteAktion !== null)
    .map((k) => ({
      art: 'wiedervorlage',
      id: k.id,
      titel: k.naechsteAktion!.text,
      faelligAm: k.naechsteAktion!.faelligAm,
      bezug: { art: 'kontakt', id: k.id },
    }))
  const alle = [...aufgaben, ...wiedervorlagen].sort(nachFrist)
  return { eintraege: alle.slice(0, limit), gesamt: alle.length }
}

/** Projekte, die weder abgeschlossen noch pausiert sind; zuletzt aktive zuerst. Kein Prozentwert. */
export function selectAktuelleProjekte(data: AppData, limit = 6): { zeilen: ProjektZeile[]; gesamt: number } {
  const aktuell = projektListe(data).filter((z) => z.projekt.status !== 'abgeschlossen' && z.projekt.status !== 'pausiert')
  return { zeilen: aktuell.slice(0, limit), gesamt: aktuell.length }
}

export interface AnstehenderEintrag {
  art: 'aufgabe' | 'termin' | 'kursaufgabe'
  id: string
  titel: string
  datum: string
  uhrzeit: string | null
  link: string
}

/** Aufgaben, Termine und Kursaufgaben von heute bis heute + `tage`, nach Datum. */
export function selectAnstehend(data: AppData, now: Date, tage = 7): AnstehenderEintrag[] {
  const h = heute(now)
  const bis = plusTage(h, tage)
  const imZeitraum = (d: string | null): d is string => d !== null && d >= h && d <= bis
  const eintraege: AnstehenderEintrag[] = [
    ...data.aufgaben
      .filter((a) => !a.erledigt && imZeitraum(a.faelligAm))
      .map((a) => ({ art: 'aufgabe' as const, id: a.id, titel: a.titel, datum: a.faelligAm!, uhrzeit: null, link: '/aufgaben' })),
    ...data.termine
      .filter((t) => imZeitraum(t.datum))
      .map((t) => ({ art: 'termin' as const, id: t.id, titel: t.titel, datum: t.datum, uhrzeit: t.uhrzeit, link: '/aufgaben?ansicht=termine' })),
    ...data.kursAufgaben
      .filter((k) => k.status !== 'erledigt' && imZeitraum(k.faelligAm))
      .map((k) => ({ art: 'kursaufgabe' as const, id: k.id, titel: `${k.code} ${k.titel}`, datum: k.faelligAm!, uhrzeit: null, link: '/weiterbildung' })),
  ]
  return eintraege.sort((a, b) => a.datum.localeCompare(b.datum) || (a.uhrzeit ?? '').localeCompare(b.uhrzeit ?? ''))
}

/** Neueste Aktivitäten zuerst; das Protokoll enthält nur echte Änderungen. */
export function selectLetzteAktivitaeten(data: AppData, limit = 8): Aktivitaet[] {
  return [...data.aktivitaeten].sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt)).slice(0, limit)
}

/** „heute“, „morgen“ oder Datum – für kompakte Listen. */
export function kurzesDatum(datum: string, now: Date): string {
  const diff = tageZwischen(heute(now), datum)
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Morgen'
  return formatDatum(datum)
}
