import { BEWERBUNG_STATUS, LEAD_STATUS } from '../labels.ts'
import { formatDatum, heute, nachFrist, plusTage, tageZwischen } from '../dates.ts'
import type { Aktivitaet, AppData, Aufgabe, Bezug } from '../types.ts'
import { kalenderEintraege, type KalenderEintrag } from './kalender.ts'
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
  const bewerbungen: NaechsterSchritt[] = data.bewerbungen
    .filter((b) => b.wiedervorlageAm !== null && BEWERBUNG_STATUS[b.status].laufend)
    .map((b) => ({ art: 'wiedervorlage', id: b.id, titel: b.naechsterSchritt || 'Bewerbung nachfassen', faelligAm: b.wiedervorlageAm, bezug: { art: 'bewerbung', id: b.id } }))
  const leads: NaechsterSchritt[] = data.leads
    .filter((l) => l.wiedervorlageAm !== null && LEAD_STATUS[l.status].offen)
    .map((l) => ({ art: 'wiedervorlage', id: l.id, titel: l.naechsterSchritt || 'Lead nachfassen', faelligAm: l.wiedervorlageAm, bezug: { art: 'lead', id: l.id } }))
  const alle = [...aufgaben, ...wiedervorlagen, ...bewerbungen, ...leads].sort(nachFrist)
  return { eintraege: alle.slice(0, limit), gesamt: alle.length }
}

/** Projekte, die weder abgeschlossen noch pausiert sind; zuletzt aktive zuerst. Kein Prozentwert. */
export function selectAktuelleProjekte(data: AppData, limit = 6): { zeilen: ProjektZeile[]; gesamt: number } {
  const aktuell = projektListe(data).filter((z) => z.projekt.status !== 'abgeschlossen' && z.projekt.status !== 'pausiert')
  return { zeilen: aktuell.slice(0, limit), gesamt: aktuell.length }
}

/** Die nächsten 7 Tage ab heute mit Terminen, Fristen, Wiedervorlagen und Kursaufgaben (wie im Kalender). */
export function selectWoche(data: AppData, now: Date): Array<{ datum: string; eintraege: KalenderEintrag[] }> {
  const h = heute(now)
  const eintraege = kalenderEintraege(data, h, plusTage(h, 6))
  return Array.from({ length: 7 }, (_, i) => {
    const datum = plusTage(h, i)
    return { datum, eintraege: eintraege.filter((e) => e.datum === datum) }
  })
}

/** Aufgaben im Fokus (offen, nach Frist) und Vorschläge: überfällige oder heute fällige, die noch nicht im Fokus sind. */
export function selectFokus(data: AppData, now: Date, vorschlaege = 3): { fokus: Aufgabe[]; vorschlaege: Aufgabe[] } {
  const h = heute(now)
  const offen = data.aufgaben.filter((a) => !a.erledigt)
  return {
    fokus: offen.filter((a) => a.fokus).sort(nachFrist),
    vorschlaege: offen
      .filter((a) => !a.fokus && a.faelligAm !== null && a.faelligAm <= h)
      .sort(nachFrist)
      .slice(0, vorschlaege),
  }
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

/** Ab so vielen Tagen ohne Sicherung erinnert das Cockpit daran. */
export const SICHERUNG_FAELLIG_NACH_TAGEN = 7

/** Erinnerung an die verschlüsselte Sicherung; `tage` ist `null`, wenn noch nie gesichert wurde. */
export function selectSicherungHinweis(data: AppData, now: Date): { faellig: boolean; tage: number | null } {
  const iso = data.einstellungen.letzteSicherungAm
  if (!iso) return { faellig: true, tage: null }
  const tage = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000))
  return { faellig: tage >= SICHERUNG_FAELLIG_NACH_TAGEN, tage }
}
