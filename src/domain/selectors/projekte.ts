import { nachFrist } from '../dates.ts'
import type { AppData, Aufgabe, Projekt, ProjektStatus } from '../types.ts'

export interface ProjektSchritte {
  offen: Aufgabe[]
  erledigt: Aufgabe[]
}

/** Nächste Schritte eines Projekts: offene nach Frist (ohne Frist zuletzt), erledigte zuletzt erledigt zuerst. */
export function projektSchritte(data: AppData, projektId: string): ProjektSchritte {
  const schritte = data.aufgaben.filter((a) => a.bezug.art === 'projekt' && a.bezug.id === projektId)
  return {
    offen: schritte.filter((a) => !a.erledigt).sort((a, b) => nachFrist(a, b) || a.erstelltAm.localeCompare(b.erstelltAm)),
    erledigt: schritte
      .filter((a) => a.erledigt)
      .sort((a, b) => (b.erledigtAm ?? '').localeCompare(a.erledigtAm ?? '')),
  }
}

export type StatusFilter = ProjektStatus | 'ohne' | 'alle'

export interface ProjektFilter {
  suche: string
  status: StatusFilter
  kategorie: string
}

export const LEERER_FILTER: ProjektFilter = { suche: '', status: 'alle', kategorie: '' }

export interface ProjektZeile {
  projekt: Projekt
  offen: number
  erledigt: number
  naechsterSchritt: Aufgabe | null
}

const STATUS_REIHENFOLGE: Record<ProjektStatus | 'ohne', number> = {
  in_arbeit: 0,
  idee: 1,
  ohne: 2,
  pausiert: 3,
  abgeschlossen: 4,
}

function passt(projekt: Projekt, filter: ProjektFilter): boolean {
  if (filter.status !== 'alle' && (projekt.status ?? 'ohne') !== filter.status) return false
  if (filter.kategorie && projekt.kategorie !== filter.kategorie) return false
  const suche = filter.suche.trim().toLowerCase()
  if (!suche) return true
  return [projekt.titel, projekt.beschreibung, projekt.kategorie, projekt.notizen, ...projekt.tools]
    .join(' ')
    .toLowerCase()
    .includes(suche)
}

/** Gefilterte Projektliste: aktive zuerst, innerhalb des Status zuletzt aktive zuerst. */
export function projektListe(data: AppData, filter: ProjektFilter = LEERER_FILTER): ProjektZeile[] {
  return data.projekte
    .filter((p) => passt(p, filter))
    .sort(
      (a, b) =>
        STATUS_REIHENFOLGE[a.status ?? 'ohne'] - STATUS_REIHENFOLGE[b.status ?? 'ohne'] ||
        (b.zuletztAktiv ?? '').localeCompare(a.zuletztAktiv ?? '') ||
        a.titel.localeCompare(b.titel, 'de'),
    )
    .map((projekt) => {
      const { offen, erledigt } = projektSchritte(data, projekt.id)
      return { projekt, offen: offen.length, erledigt: erledigt.length, naechsterSchritt: offen[0] ?? null }
    })
}

export function projektKategorien(data: AppData): string[] {
  return [...new Set(data.projekte.map((p) => p.kategorie).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'))
}

export function projektZaehler(data: AppData): { gesamt: number; nachStatus: Partial<Record<ProjektStatus | 'ohne', number>> } {
  const nachStatus: Partial<Record<ProjektStatus | 'ohne', number>> = {}
  for (const p of data.projekte) {
    const key = p.status ?? 'ohne'
    nachStatus[key] = (nachStatus[key] ?? 0) + 1
  }
  return { gesamt: data.projekte.length, nachStatus }
}
