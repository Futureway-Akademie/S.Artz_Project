import { heute } from '../dates.ts'
import type { AppData, Aufgabe, Bewerbung, Interaktion, Kontakt, Lead, Projekt, Termin, Unternehmen, Werkzeug, Wissen } from '../types.ts'

/** Eintrag, zu dem alles Zugehörige gesucht wird. Die Arten entsprechen dem Bezug von Aufgaben und Terminen. */
export interface Ziel {
  art: 'kontakt' | 'unternehmen' | 'projekt' | 'bewerbung' | 'lead'
  id: string
}

export interface Verknuepft {
  /** Offene Aufgaben, nach Frist sortiert (ohne Frist zuletzt) */
  aufgaben: Aufgabe[]
  erledigteAufgaben: number
  /** Termine ab heute, aufsteigend */
  termine: Termin[]
  vergangeneTermine: number
  /** Verlaufseinträge, neueste zuerst */
  verlauf: Interaktion[]
  kontakte: Kontakt[]
  unternehmen: Unternehmen[]
  projekte: Projekt[]
  bewerbungen: Bewerbung[]
  leads: Lead[]
  /** Wissenseinträge, die mit dem Projekt verknüpft sind */
  wissen: Wissen[]
  /** Werkzeuge (Prompts, Agenten …), die mit dem Projekt verknüpft sind */
  werkzeug: Werkzeug[]
}

const nach = <T,>(liste: T[], schluessel: (e: T) => string) => [...liste].sort((a, b) => schluessel(a).localeCompare(schluessel(b), 'de'))

/**
 * Alles, was zu einem Eintrag gehört – direkt oder über einen Zwischenschritt:
 * z. B. beim Unternehmen auch die Aufgaben seiner Kontakte, Bewerbungen, Leads und beauftragten Projekte.
 */
export function selectVerknuepft(data: AppData, ziel: Ziel, now: Date): Verknuepft {
  const { art, id } = ziel
  let kontakte: Kontakt[] = []
  let unternehmen: Unternehmen[] = []
  let projekte: Projekt[] = []
  let bewerbungen: Bewerbung[] = []
  let leads: Lead[] = []
  let verlaufFilter: (i: Interaktion) => boolean = () => false

  const finde = <T extends { id: string }>(liste: T[], gesucht: string | null | undefined) => liste.filter((e) => e.id === gesucht)

  switch (art) {
    case 'kontakt': {
      const k = data.kontakte.find((x) => x.id === id)
      unternehmen = finde(data.unternehmen, k?.unternehmenId)
      projekte = data.projekte.filter((p) => k?.projektIds.includes(p.id))
      bewerbungen = data.bewerbungen.filter((b) => b.kontaktId === id)
      leads = data.leads.filter((l) => l.kontaktId === id)
      verlaufFilter = (i) => i.kontaktId === id
      break
    }
    case 'unternehmen': {
      kontakte = data.kontakte.filter((k) => k.unternehmenId === id)
      projekte = data.projekte.filter((p) => p.auftraggeberId === id)
      bewerbungen = data.bewerbungen.filter((b) => b.unternehmenId === id)
      leads = data.leads.filter((l) => l.unternehmenId === id)
      const personen = new Set(kontakte.map((k) => k.id))
      verlaufFilter = (i) => personen.has(i.kontaktId)
      break
    }
    case 'projekt': {
      const p = data.projekte.find((x) => x.id === id)
      kontakte = data.kontakte.filter((k) => k.projektIds.includes(id))
      unternehmen = finde(data.unternehmen, p?.auftraggeberId)
      leads = data.leads.filter((l) => l.projektId === id)
      const leadIds = new Set(leads.map((l) => l.id))
      verlaufFilter = (i) => i.projektId === id || (i.leadId !== null && leadIds.has(i.leadId))
      break
    }
    case 'bewerbung': {
      const b = data.bewerbungen.find((x) => x.id === id)
      kontakte = finde(data.kontakte, b?.kontaktId)
      unternehmen = finde(data.unternehmen, b?.unternehmenId)
      verlaufFilter = (i) => i.bewerbungId === id
      break
    }
    case 'lead': {
      const l = data.leads.find((x) => x.id === id)
      kontakte = finde(data.kontakte, l?.kontaktId)
      unternehmen = finde(data.unternehmen, l?.unternehmenId)
      projekte = finde(data.projekte, l?.projektId)
      verlaufFilter = (i) => i.leadId === id
      break
    }
  }

  // Aufgaben und Termine: direkt am Ziel oder an einem der verknüpften Einträge (beim Unternehmen auch an seinen Kontakten)
  const schluessel = new Set<string>([`${art}:${id}`])
  if (art === 'unternehmen') kontakte.forEach((k) => schluessel.add(`kontakt:${k.id}`))
  if (art === 'unternehmen' || art === 'projekt') projekte.forEach((p) => schluessel.add(`projekt:${p.id}`))
  if (art !== 'bewerbung') bewerbungen.forEach((b) => schluessel.add(`bewerbung:${b.id}`))
  if (art !== 'lead') leads.forEach((l) => schluessel.add(`lead:${l.id}`))
  const passt = (e: { bezug: { art: string; id: string | null } }) => schluessel.has(`${e.bezug.art}:${e.bezug.id}`)

  const alleAufgaben = data.aufgaben.filter(passt)
  const h = heute(now)
  const alleTermine = data.termine.filter(passt)

  return {
    aufgaben: [...alleAufgaben.filter((a) => !a.erledigt)].sort(
      (a, b) => (a.faelligAm ?? '9999').localeCompare(b.faelligAm ?? '9999') || a.titel.localeCompare(b.titel, 'de'),
    ),
    erledigteAufgaben: alleAufgaben.filter((a) => a.erledigt).length,
    termine: alleTermine.filter((t) => t.datum >= h).sort((a, b) => (a.datum + (a.uhrzeit ?? '')).localeCompare(b.datum + (b.uhrzeit ?? ''))),
    vergangeneTermine: alleTermine.filter((t) => t.datum < h).length,
    verlauf: data.interaktionen.filter(verlaufFilter).sort((a, b) => b.datum.localeCompare(a.datum) || b.erstelltAm.localeCompare(a.erstelltAm)),
    kontakte: nach(kontakte, (k) => k.name),
    unternehmen,
    projekte: nach(projekte, (p) => p.titel),
    bewerbungen: nach(bewerbungen, (b) => b.stelle),
    leads: nach(leads, (l) => l.titel),
    wissen: art === 'projekt' ? nach(data.wissen.filter((w) => w.projektIds.includes(id)), (w) => w.titel) : [],
    werkzeug: art === 'projekt' ? nach(data.werkzeug.filter((w) => w.projektIds.includes(id)), (w) => w.titel) : [],
  }
}
