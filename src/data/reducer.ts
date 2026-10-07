import type { Aktivitaet, AppData, Eintrag, Sammlung } from '../domain/types.ts'
import type { Action, ActionMeta } from './actions.ts'
import { aktivitaetText, geaenderteFelder, titelVon } from './activity.ts'

/** Obergrenze, damit das Protokoll den Speicher nicht füllt. */
export const MAX_AKTIVITAETEN = 500

type Liste<S extends Sammlung> = Array<Eintrag<S>>

function liste<S extends Sammlung>(data: AppData, sammlung: S): Liste<S> {
  return data[sammlung] as Liste<S>
}

function mitAktivitaet(data: AppData, meta: ActionMeta, aktivitaet: Omit<Aktivitaet, 'id' | 'zeitpunkt'>): AppData {
  const eintrag: Aktivitaet = { id: meta.newId(), zeitpunkt: meta.now.toISOString(), ...aktivitaet }
  return { ...data, aktivitaeten: [eintrag, ...data.aktivitaeten].slice(0, MAX_AKTIVITAETEN) }
}

export interface Loeschfolge {
  /** Einträge, die mitgelöscht werden */
  geloescht: Array<{ sammlung: Sammlung; id: string; titel: string }>
  /** Einträge, deren Verknüpfung entfernt wird */
  entknuepft: Array<{ sammlung: Sammlung; id: string; titel: string }>
}

/** Was passiert beim Löschen? Grundlage für den Bestätigungsdialog und den Reducer. */
export function loeschfolgen(data: AppData, sammlung: Sammlung, id: string): Loeschfolge {
  const folge: Loeschfolge = { geloescht: [], entknuepft: [] }
  const add = <S extends Sammlung>(ziel: 'geloescht' | 'entknuepft', s: S, eintraege: Liste<S>) => {
    for (const e of eintraege) folge[ziel].push({ sammlung: s, id: e.id, titel: titelVon(s, e) })
  }
  const bezogen = (art: string) => (e: { bezug: { art: string; id: string | null } }) =>
    e.bezug.art === art && e.bezug.id === id

  switch (sammlung) {
    case 'projekte':
      add('geloescht', 'aufgaben', data.aufgaben.filter(bezogen('projekt')))
      add('geloescht', 'termine', data.termine.filter(bezogen('projekt')))
      add('entknuepft', 'kontakte', data.kontakte.filter((k) => k.projektIds.includes(id)))
      add('entknuepft', 'interaktionen', data.interaktionen.filter((i) => i.projektId === id))
      break
    case 'kurse':
      add('geloescht', 'kursAufgaben', data.kursAufgaben.filter((k) => k.kursId === id))
      add('entknuepft', 'aufgaben', data.aufgaben.filter(bezogen('weiterbildung')))
      add('entknuepft', 'termine', data.termine.filter(bezogen('weiterbildung')))
      break
    case 'kontakte':
      add('geloescht', 'interaktionen', data.interaktionen.filter((i) => i.kontaktId === id))
      add('geloescht', 'aufgaben', data.aufgaben.filter(bezogen('kontakt')))
      add('entknuepft', 'termine', data.termine.filter(bezogen('kontakt')))
      add('entknuepft', 'leads', data.leads.filter((l) => l.kontaktId === id))
      add('entknuepft', 'bewerbungen', data.bewerbungen.filter((b) => b.kontaktId === id))
      break
    case 'unternehmen':
      add('entknuepft', 'kontakte', data.kontakte.filter((k) => k.unternehmenId === id))
      add('entknuepft', 'leads', data.leads.filter((l) => l.unternehmenId === id))
      add('entknuepft', 'bewerbungen', data.bewerbungen.filter((b) => b.unternehmenId === id))
      break
    case 'zielrollen':
      add('entknuepft', 'bewerbungen', data.bewerbungen.filter((b) => b.zielrolleId === id))
      break
  }
  return folge
}

function loeschenMitFolgen(data: AppData, sammlung: Sammlung, id: string): AppData {
  const folge = loeschfolgen(data, sammlung, id)
  const weg = new Set([`${sammlung}:${id}`, ...folge.geloescht.map((e) => `${e.sammlung}:${e.id}`)])
  const next: AppData = { ...data }
  for (const s of new Set<Sammlung>([sammlung, ...folge.geloescht.map((e) => e.sammlung)])) {
    const gefiltert = (data[s] as Array<{ id: string }>).filter((e) => !weg.has(`${s}:${e.id}`))
    ;(next as Record<Sammlung, unknown>)[s] = gefiltert
  }

  const ohneBezug = <T extends { bezug: { art: string; id: string | null } }>(e: T, art: string): T =>
    e.bezug.art === art && e.bezug.id === id ? { ...e, bezug: { art: 'ohne', id: null } } : e

  switch (sammlung) {
    case 'projekte':
      next.kontakte = next.kontakte.map((k) =>
        k.projektIds.includes(id) ? { ...k, projektIds: k.projektIds.filter((p) => p !== id) } : k,
      )
      next.interaktionen = next.interaktionen.map((i) => (i.projektId === id ? { ...i, projektId: null } : i))
      break
    case 'kurse':
      next.aufgaben = next.aufgaben.map((a) => ohneBezug(a, 'weiterbildung'))
      next.termine = next.termine.map((t) => ohneBezug(t, 'weiterbildung'))
      break
    case 'kontakte':
      next.termine = next.termine.map((t) => ohneBezug(t, 'kontakt'))
      next.leads = next.leads.map((l) => (l.kontaktId === id ? { ...l, kontaktId: null } : l))
      next.bewerbungen = next.bewerbungen.map((b) => (b.kontaktId === id ? { ...b, kontaktId: null } : b))
      break
    case 'unternehmen':
      next.kontakte = next.kontakte.map((k) => (k.unternehmenId === id ? { ...k, unternehmenId: null } : k))
      next.leads = next.leads.map((l) => (l.unternehmenId === id ? { ...l, unternehmenId: null } : l))
      next.bewerbungen = next.bewerbungen.map((b) => (b.unternehmenId === id ? { ...b, unternehmenId: null } : b))
      break
    case 'zielrollen':
      next.bewerbungen = next.bewerbungen.map((b) => (b.zielrolleId === id ? { ...b, zielrolleId: null } : b))
      break
  }
  return next
}

/** Art der Aktivität bei einer Änderung: Erledigen/Wiedereröffnen wird eigens benannt. */
function aenderungsArt(sammlung: Sammlung, felder: string[], nachher: Record<string, unknown>): Aktivitaet['art'] {
  if (sammlung === 'aufgaben' && felder.every((f) => f === 'erledigt' || f === 'erledigtAm') && felder.includes('erledigt')) {
    return nachher.erledigt ? 'erledigt' : 'wieder_geoeffnet'
  }
  if (sammlung === 'kursAufgaben' && felder.length === 1 && felder[0] === 'status') {
    return nachher.status === 'erledigt' ? 'erledigt' : 'geaendert'
  }
  return 'geaendert'
}

export function reducer(data: AppData, action: Action, meta: ActionMeta): AppData {
  switch (action.type) {
    case 'anlegen': {
      const zeit = meta.now.toISOString()
      const eintrag = { ...action.daten, id: meta.newId(), erstelltAm: zeit, geaendertAm: zeit } as Eintrag<typeof action.sammlung>
      const next = { ...data, [action.sammlung]: [...liste(data, action.sammlung), eintrag] }
      const titel = titelVon(action.sammlung, eintrag)
      return mitAktivitaet(next, meta, {
        art: 'angelegt',
        bezug: { sammlung: action.sammlung, id: eintrag.id, titel },
        zusammenfassung: aktivitaetText('angelegt', action.sammlung, titel),
      })
    }

    case 'aendern': {
      const alt = liste(data, action.sammlung).find((e) => e.id === action.id)
      if (!alt) return data
      let neu = { ...alt, ...action.aenderung } as Record<string, unknown>
      // erledigtAm folgt dem Erledigt-Status automatisch
      if (action.sammlung === 'aufgaben' && 'erledigt' in action.aenderung && !('erledigtAm' in action.aenderung)) {
        neu = { ...neu, erledigtAm: neu.erledigt ? (alt as Eintrag<'aufgaben'>).erledigtAm ?? meta.now.toISOString() : null }
      }
      const felder = geaenderteFelder(alt as Record<string, unknown>, neu)
      if (felder.length === 0) return data // Speichern ohne Änderung erzeugt keine Aktivität

      const fertig = { ...neu, geaendertAm: meta.now.toISOString() } as Eintrag<typeof action.sammlung>
      const next = {
        ...data,
        [action.sammlung]: liste(data, action.sammlung).map((e) => (e.id === action.id ? fertig : e)),
      }
      const art = aenderungsArt(action.sammlung, felder, neu)
      const titel = titelVon(action.sammlung, fertig)
      const sichtbareFelder = felder.filter((f) => f !== 'erledigtAm')
      return mitAktivitaet(next, meta, {
        art,
        bezug: { sammlung: action.sammlung, id: action.id, titel },
        zusammenfassung: aktivitaetText(art, action.sammlung, titel, sichtbareFelder),
      })
    }

    case 'loeschen': {
      const alt = liste(data, action.sammlung).find((e) => e.id === action.id)
      if (!alt) return data
      const titel = titelVon(action.sammlung, alt)
      const folge = loeschfolgen(data, action.sammlung, action.id)
      const zusatz = folge.geloescht.length > 0 ? ` (mit ${folge.geloescht.length} verknüpften Einträgen)` : ''
      return mitAktivitaet(loeschenMitFolgen(data, action.sammlung, action.id), meta, {
        art: 'geloescht',
        bezug: { sammlung: action.sammlung, id: null, titel },
        zusammenfassung: aktivitaetText('geloescht', action.sammlung, titel) + zusatz,
      })
    }

    case 'einstellungen': {
      const neu = { ...data.einstellungen, ...action.aenderung }
      if (geaenderteFelder(data.einstellungen, neu).length === 0) return data
      return mitAktivitaet({ ...data, einstellungen: neu }, meta, {
        art: 'einstellungen',
        bezug: { sammlung: null, id: null, titel: 'Einstellungen' },
        zusammenfassung: 'Einstellungen geändert',
      })
    }

    case 'ersetzen':
      return action.daten
  }
}
