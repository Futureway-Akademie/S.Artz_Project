import type { AppData, Bezug } from '../types.ts'

export interface BezugInfo {
  text: string
  /** Ziel-Link in der App, falls vorhanden */
  link: string | null
}

/** Lesbarer Bezug einer Aufgabe oder eines Termins, z. B. „Projekt: Website-Relaunch“. */
export function bezugInfo(data: AppData, bezug: Bezug): BezugInfo | null {
  switch (bezug.art) {
    case 'ohne':
      return null
    case 'projekt': {
      const p = data.projekte.find((x) => x.id === bezug.id)
      return p ? { text: p.titel, link: `/projekte/${p.id}` } : { text: 'Gelöschtes Projekt', link: null }
    }
    case 'weiterbildung': {
      const k = data.kurse.find((x) => x.id === bezug.id)
      return { text: k ? `Weiterbildung: ${k.titel}` : 'Weiterbildung', link: '/weiterbildung' }
    }
    case 'kontakt': {
      const k = data.kontakte.find((x) => x.id === bezug.id)
      return k ? { text: k.name, link: `/kontakte/${k.id}` } : { text: 'Gelöschter Kontakt', link: null }
    }
    case 'unternehmen': {
      const u = data.unternehmen.find((x) => x.id === bezug.id)
      return u ? { text: u.name, link: `/kontakte/unternehmen/${u.id}` } : { text: 'Gelöschtes Unternehmen', link: null }
    }
    case 'lead': {
      const l = data.leads.find((x) => x.id === bezug.id)
      return l ? { text: `Lead: ${l.titel}`, link: '/kontakte/leads' } : { text: 'Gelöschter Lead', link: null }
    }
    case 'bewerbung': {
      const b = data.bewerbungen.find((x) => x.id === bezug.id)
      return b ? { text: `Bewerbung: ${b.stelle}`, link: '/bewerbungen' } : { text: 'Gelöschte Bewerbung', link: null }
    }
  }
}

const sortiert = <T,>(liste: T[], name: (e: T) => string) => [...liste].sort((a, b) => name(a).localeCompare(name(b), 'de'))

/** Optionen für ein Bezug-Auswahlfeld; Wert `art:id`. */
export function bezugOptionen(
  data: AppData,
  arten: Array<Bezug['art']> = ['projekt', 'weiterbildung', 'kontakt', 'unternehmen', 'bewerbung', 'lead'],
) {
  return [
    ...(arten.includes('projekt') ? sortiert(data.projekte, (p) => p.titel).map((p) => ({ value: `projekt:${p.id}`, label: `Projekt: ${p.titel}` })) : []),
    ...(arten.includes('weiterbildung') ? data.kurse.map((k) => ({ value: `weiterbildung:${k.id}`, label: `Weiterbildung: ${k.titel}` })) : []),
    ...(arten.includes('kontakt') ? sortiert(data.kontakte, (k) => k.name).map((k) => ({ value: `kontakt:${k.id}`, label: `Kontakt: ${k.name}` })) : []),
    ...(arten.includes('unternehmen') ? sortiert(data.unternehmen, (u) => u.name).map((u) => ({ value: `unternehmen:${u.id}`, label: `Unternehmen: ${u.name}` })) : []),
    ...(arten.includes('bewerbung') ? sortiert(data.bewerbungen, (b) => b.stelle).map((b) => ({ value: `bewerbung:${b.id}`, label: `Bewerbung: ${b.stelle}` })) : []),
    ...(arten.includes('lead') ? sortiert(data.leads, (l) => l.titel).map((l) => ({ value: `lead:${l.id}`, label: `Lead: ${l.titel}` })) : []),
  ]
}

export const bezugAlsText = (bezug: Bezug) => (bezug.art === 'ohne' ? 'ohne' : `${bezug.art}:${bezug.id}`)

export function bezugAusText(text: string): Bezug {
  if (!text || text === 'ohne') return { art: 'ohne', id: null }
  const [art, ...rest] = text.split(':')
  return { art: art as Bezug['art'], id: rest.join(':') }
}
