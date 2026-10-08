import type { Aktivitaet, AppData, Eintrag, Sammlung } from '../domain/types.ts'
import { toDatum } from '../domain/dates.ts'
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
      add('entknuepft', 'leads', data.leads.filter((l) => l.projektId === id))
      add('entknuepft', 'wissen', data.wissen.filter((w) => w.projektIds.includes(id)))
      add('entknuepft', 'werkzeug', data.werkzeug.filter((w) => w.projektIds.includes(id)))
      break
    case 'werkzeug':
      add('entknuepft', 'werkzeug', data.werkzeug.filter((w) => w.werkzeugIds.includes(id)))
      break
    case 'kurse':
      add('geloescht', 'kursAufgaben', data.kursAufgaben.filter((k) => k.kursId === id))
      add('entknuepft', 'aufgaben', data.aufgaben.filter(bezogen('weiterbildung')))
      add('entknuepft', 'termine', data.termine.filter(bezogen('weiterbildung')))
      add('entknuepft', 'wissen', data.wissen.filter((w) => w.kursId === id))
      break
    case 'kursAufgaben':
      add('entknuepft', 'wissen', data.wissen.filter((w) => w.kursAufgabeIds.includes(id)))
      break
    case 'kontakte':
      add('geloescht', 'interaktionen', data.interaktionen.filter((i) => i.kontaktId === id))
      add('geloescht', 'aufgaben', data.aufgaben.filter(bezogen('kontakt')))
      add('geloescht', 'mails', data.mails.filter((m) => m.kontaktId === id))
      add('entknuepft', 'termine', data.termine.filter(bezogen('kontakt')))
      add('entknuepft', 'leads', data.leads.filter((l) => l.kontaktId === id))
      add('entknuepft', 'bewerbungen', data.bewerbungen.filter((b) => b.kontaktId === id))
      break
    case 'unternehmen':
      add('entknuepft', 'kontakte', data.kontakte.filter((k) => k.unternehmenId === id))
      add('entknuepft', 'leads', data.leads.filter((l) => l.unternehmenId === id))
      add('entknuepft', 'bewerbungen', data.bewerbungen.filter((b) => b.unternehmenId === id))
      add('entknuepft', 'projekte', data.projekte.filter((p) => p.auftraggeberId === id))
      add('entknuepft', 'mails', data.mails.filter((m) => m.unternehmenId === id))
      add('entknuepft', 'aufgaben', data.aufgaben.filter(bezogen('unternehmen')))
      add('entknuepft', 'termine', data.termine.filter(bezogen('unternehmen')))
      break
    case 'zielrollen':
      add('entknuepft', 'bewerbungen', data.bewerbungen.filter((b) => b.zielrolleId === id))
      break
    case 'leads':
      add('entknuepft', 'interaktionen', data.interaktionen.filter((i) => i.leadId === id))
      add('entknuepft', 'aufgaben', data.aufgaben.filter(bezogen('lead')))
      add('entknuepft', 'termine', data.termine.filter(bezogen('lead')))
      break
    case 'bewerbungen':
      add('entknuepft', 'interaktionen', data.interaktionen.filter((i) => i.bewerbungId === id))
      add('entknuepft', 'mails', data.mails.filter((m) => m.bewerbungId === id))
      add('entknuepft', 'aufgaben', data.aufgaben.filter(bezogen('bewerbung')))
      add('entknuepft', 'termine', data.termine.filter(bezogen('bewerbung')))
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
      next.leads = next.leads.map((l) => (l.projektId === id ? { ...l, projektId: null } : l))
      next.wissen = next.wissen.map((w) => (w.projektIds.includes(id) ? { ...w, projektIds: w.projektIds.filter((p) => p !== id) } : w))
      next.werkzeug = next.werkzeug.map((w) => (w.projektIds.includes(id) ? { ...w, projektIds: w.projektIds.filter((p) => p !== id) } : w))
      break
    case 'werkzeug':
      next.werkzeug = next.werkzeug.map((w) => (w.werkzeugIds.includes(id) ? { ...w, werkzeugIds: w.werkzeugIds.filter((x) => x !== id) } : w))
      break
    case 'kurse':
      next.aufgaben = next.aufgaben.map((a) => ohneBezug(a, 'weiterbildung'))
      next.termine = next.termine.map((t) => ohneBezug(t, 'weiterbildung'))
      next.wissen = next.wissen.map((w) => (w.kursId === id ? { ...w, kursId: null } : w))
      break
    case 'kursAufgaben':
      next.wissen = next.wissen.map((w) => (w.kursAufgabeIds.includes(id) ? { ...w, kursAufgabeIds: w.kursAufgabeIds.filter((k) => k !== id) } : w))
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
      next.projekte = next.projekte.map((p) => (p.auftraggeberId === id ? { ...p, auftraggeberId: null } : p))
      next.mails = next.mails.map((m) => (m.unternehmenId === id ? { ...m, unternehmenId: null } : m))
      next.aufgaben = next.aufgaben.map((a) => ohneBezug(a, 'unternehmen'))
      next.termine = next.termine.map((t) => ohneBezug(t, 'unternehmen'))
      break
    case 'zielrollen':
      next.bewerbungen = next.bewerbungen.map((b) => (b.zielrolleId === id ? { ...b, zielrolleId: null } : b))
      break
    case 'leads':
      next.interaktionen = next.interaktionen.map((i) => (i.leadId === id ? { ...i, leadId: null } : i))
      next.aufgaben = next.aufgaben.map((a) => ohneBezug(a, 'lead'))
      next.termine = next.termine.map((t) => ohneBezug(t, 'lead'))
      break
    case 'bewerbungen':
      next.interaktionen = next.interaktionen.map((i) => (i.bewerbungId === id ? { ...i, bewerbungId: null } : i))
      next.mails = next.mails.map((m) => (m.bewerbungId === id ? { ...m, bewerbungId: null } : m))
      next.aufgaben = next.aufgaben.map((a) => ohneBezug(a, 'bewerbung'))
      next.termine = next.termine.map((t) => ohneBezug(t, 'bewerbung'))
      break
  }
  return next
}

export const GELOESCHTE_PERSON = 'Gelöschter Kontakt'

/** Entfernt Name und E-Mail einer gelöschten Person aus allen Protokolleinträgen. */
function anonymisieren(data: AppData, kontaktId: string, merkmale: string[]): AppData {
  const suchbar = merkmale.map((m) => m.trim()).filter((m) => m.length >= 2)
  const ersetzen = (text: string) => suchbar.reduce((t, m) => t.split(m).join(GELOESCHTE_PERSON), text)
  return {
    ...data,
    aktivitaeten: data.aktivitaeten.map((a) => {
      const eigene = a.bezug.sammlung === 'kontakte' && a.bezug.id === kontaktId
      const titel = ersetzen(a.bezug.titel)
      const zusammenfassung = ersetzen(a.zusammenfassung)
      if (!eigene && titel === a.bezug.titel && zusammenfassung === a.zusammenfassung) return a
      return { ...a, bezug: { ...a.bezug, id: eigene ? null : a.bezug.id, titel: eigene ? GELOESCHTE_PERSON : titel }, zusammenfassung }
    }),
  }
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

function kernReducer(data: AppData, action: Action, meta: ActionMeta): AppData {
  switch (action.type) {
    case 'anlegen': {
      const zeit = meta.now.toISOString()
      const eintrag = { ...action.daten, id: action.id ?? meta.newId(), erstelltAm: zeit, geaendertAm: zeit } as Eintrag<typeof action.sammlung>
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
      if (action.sammlung === 'kontakte') {
        // DSGVO Art. 17: Die Person verschwindet vollständig, auch aus dem Aktivitätsprotokoll.
        const person = alt as Eintrag<'kontakte'>
        const ohnePerson = anonymisieren(loeschenMitFolgen(data, action.sammlung, action.id), action.id, [person.name, person.email])
        return mitAktivitaet(ohnePerson, meta, {
          art: 'geloescht',
          bezug: { sammlung: 'kontakte', id: null, titel: GELOESCHTE_PERSON },
          zusammenfassung: `Kontakt gelöscht, personenbezogene Daten entfernt${zusatz}`,
        })
      }
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
        zusammenfassung: geaenderteFelder(data.einstellungen, neu).every((f) => f === 'letzteSicherungAm') ? 'Sicherung erstellt' : 'Einstellungen geändert',
      })
    }

    case 'mailsAbgerufen': {
      const bekannt = new Set(data.mails.map((m) => m.gmailId))
      const zeit = meta.now.toISOString()
      // auch Doppelte innerhalb eines Abrufs überspringen
      const neu = action.mails.filter((m) => !bekannt.has(m.gmailId) && Boolean(bekannt.add(m.gmailId))).map((m) => ({ ...m, id: meta.newId(), erstelltAm: zeit, geaendertAm: zeit }))
      const next = { ...data, mails: [...data.mails, ...neu], einstellungen: { ...data.einstellungen, letzterMailAbrufAm: action.abrufAm } }
      if (neu.length === 0) return next
      return mitAktivitaet(next, meta, {
        art: 'angelegt',
        bezug: { sammlung: 'mails', id: null, titel: 'Postfach' },
        zusammenfassung: `${neu.length} ${neu.length === 1 ? 'Mail' : 'Mails'} aus Gmail abgerufen`,
      })
    }

    case 'mailUebernehmen': {
      const mail = data.mails.find((m) => m.id === action.mailId)
      if (!mail || mail.status !== 'neu') return data
      let next = data
      const kontaktId = action.kontaktId
      if (action.neuerKontakt) {
        next = kernReducer(next, { type: 'anlegen', sammlung: 'kontakte', daten: action.neuerKontakt, id: kontaktId }, meta)
      }
      const interaktionId = meta.newId()
      const datum = toDatum(new Date(mail.zeitpunkt))
      next = kernReducer(
        next,
        {
          type: 'anlegen',
          sammlung: 'interaktionen',
          id: interaktionId,
          daten: { kontaktId, art: 'email', datum, text: mail.auszug.trim() || '(ohne Text)', projektId: null, bewerbungId: action.bewerbungId, leadId: null, betreff: mail.betreff, richtung: mail.richtung },
        },
        meta,
      )
      // Inhalt steht jetzt im Verlauf; die Mail behält nur, was den erneuten Abruf verhindert
      return {
        ...next,
        mails: next.mails.map((m) =>
          m.id === mail.id ? { ...m, status: 'uebernommen' as const, kontaktId, bewerbungId: action.bewerbungId, interaktionId, von: '', an: [], betreff: '', auszug: '', geaendertAm: meta.now.toISOString() } : m,
        ),
      }
    }

    case 'ersetzen':
      return action.daten
  }
}

/** Sammlungen, deren Einträge ein Projekt als „zuletzt aktiv“ markieren */
function projektVon(sammlung: Sammlung, eintrag: Record<string, unknown> | undefined): string | null {
  if (!eintrag) return null
  if (sammlung === 'aufgaben' || sammlung === 'termine') {
    const bezug = eintrag.bezug as Eintrag<'aufgaben'>['bezug']
    return bezug.art === 'projekt' ? bezug.id : null
  }
  if (sammlung === 'interaktionen' || sammlung === 'leads') return (eintrag.projektId as string | null) ?? null
  return null
}

/**
 * Wer an einem Projekt arbeitet (Aufgabe, Termin, Verlauf oder Lead anlegen bzw. ändern),
 * setzt dessen „zuletzt aktiv“ auf heute – nie zurück, ohne eigene Aktivität im Protokoll.
 */
function zuletztAktivNachziehen(vorher: AppData, nachher: AppData, action: Action, meta: ActionMeta): AppData {
  if (nachher === vorher || (action.type !== 'anlegen' && action.type !== 'aendern')) return nachher
  const eintraege = nachher[action.sammlung] as Array<{ id: string }>
  const id = action.type === 'aendern' ? action.id : eintraege[eintraege.length - 1]?.id
  const projektId = projektVon(action.sammlung, eintraege.find((e) => e.id === id) as Record<string, unknown> | undefined)
  if (!projektId) return nachher
  const tag = toDatum(meta.now)
  return {
    ...nachher,
    projekte: nachher.projekte.map((p) => (p.id === projektId && (p.zuletztAktiv ?? '') < tag ? { ...p, zuletztAktiv: tag } : p)),
  }
}

export function reducer(data: AppData, action: Action, meta: ActionMeta): AppData {
  return zuletztAktivNachziehen(data, kernReducer(data, action, meta), action, meta)
}
