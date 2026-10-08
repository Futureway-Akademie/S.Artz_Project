import type { Aufgabe, AppData, Projekt, Termin, Werkzeug, Wissen } from '../../domain/types.ts'

/**
 * Bereiche, die der Admin mit anderen teilen kann. Kontakte, Bewerbungen und Postfach sind bewusst nicht dabei:
 * Sie enthalten personenbezogene Daten Dritter.
 */
export const TEILBARE_BEREICHE = [
  { key: 'projekte', label: 'Projekte (mit ihren Aufgaben und Terminen)' },
  { key: 'aufgaben', label: 'Aufgaben und Termine' },
  { key: 'wissen', label: 'Wissen' },
  { key: 'werkzeug', label: 'KI-Werkzeugkasten' },
] as const

export type TeilbarerBereich = (typeof TEILBARE_BEREICHE)[number]['key']

export const istTeilbar = (b: string): b is TeilbarerBereich => TEILBARE_BEREICHE.some((x) => x.key === b)

export interface Ausschnitt {
  bereich: TeilbarerBereich
  /** Stand des Ausschnitts (ISO) */
  stand: string
  projekte: Projekt[]
  aufgaben: Aufgabe[]
  termine: Termin[]
  wissen: Wissen[]
  werkzeug: Werkzeug[]
}

/** Verweise auf Personen, Firmen, Leads und Bewerbungen werden entfernt – geteilt wird nur der Bereich selbst. */
const ohnePersonenbezug = <T extends { bezug: Aufgabe['bezug'] }>(e: T): T =>
  e.bezug.art === 'kontakt' || e.bezug.art === 'unternehmen' || e.bezug.art === 'lead' || e.bezug.art === 'bewerbung' ? { ...e, bezug: { art: 'ohne', id: null } } : e

/** Was von einem Bereich geteilt wird */
export function ausschnitt(data: AppData, bereich: TeilbarerBereich, now: Date): Ausschnitt {
  const leer: Ausschnitt = { bereich, stand: now.toISOString(), projekte: [], aufgaben: [], termine: [], wissen: [], werkzeug: [] }
  switch (bereich) {
    case 'projekte': {
      const ids = new Set(data.projekte.map((p) => p.id))
      const zumProjekt = (e: { bezug: Aufgabe['bezug'] }) => e.bezug.art === 'projekt' && e.bezug.id !== null && ids.has(e.bezug.id)
      return {
        ...leer,
        projekte: data.projekte.map((p) => ({ ...p, auftraggeberId: null })),
        aufgaben: data.aufgaben.filter(zumProjekt),
        termine: data.termine.filter(zumProjekt),
      }
    }
    case 'aufgaben':
      return { ...leer, aufgaben: data.aufgaben.map(ohnePersonenbezug), termine: data.termine.map(ohnePersonenbezug) }
    case 'wissen':
      return { ...leer, wissen: data.wissen }
    case 'werkzeug':
      // Der Ablageort von Zugangsdaten bleibt privat
      return { ...leer, werkzeug: data.werkzeug.map((w) => (w.integration ? { ...w, integration: { ...w.integration, schluesselOrt: '' } } : w)) }
  }
}
