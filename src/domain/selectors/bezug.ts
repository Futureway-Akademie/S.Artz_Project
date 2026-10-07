import type { AppData, Bezug } from '../types.ts'

export interface BezugInfo {
  text: string
  /** Ziel-Link in der App, falls vorhanden */
  link: string | null
}

/** Lesbarer Bezug einer Aufgabe oder eines Termins, z. B. „Projekt: Diamond World“. */
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
  }
}

/** Optionen für ein Bezug-Auswahlfeld; Wert `art:id`. */
export function bezugOptionen(data: AppData, arten: Array<Bezug['art']> = ['projekt', 'weiterbildung', 'kontakt']) {
  return [
    ...(arten.includes('projekt') ? data.projekte.map((p) => ({ value: `projekt:${p.id}`, label: `Projekt: ${p.titel}` })) : []),
    ...(arten.includes('weiterbildung') ? data.kurse.map((k) => ({ value: `weiterbildung:${k.id}`, label: `Weiterbildung: ${k.titel}` })) : []),
    ...(arten.includes('kontakt') ? data.kontakte.map((k) => ({ value: `kontakt:${k.id}`, label: `Kontakt: ${k.name}` })) : []),
  ]
}

export const bezugAlsText = (bezug: Bezug) => (bezug.art === 'ohne' ? 'ohne' : `${bezug.art}:${bezug.id}`)

export function bezugAusText(text: string): Bezug {
  if (!text || text === 'ohne') return { art: 'ohne', id: null }
  const [art, ...rest] = text.split(':')
  return { art: art as Bezug['art'], id: rest.join(':') }
}
