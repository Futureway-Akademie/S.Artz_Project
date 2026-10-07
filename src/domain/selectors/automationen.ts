import { PLATTFORM } from '../labels.ts'
import type { AppData, AutomationProfil, Projekt } from '../types.ts'

export interface AutomationEintrag {
  projekt: Projekt
  automation: AutomationProfil
}

export interface AutomationGruppe {
  schluessel: string
  titel: string
  eintraege: AutomationEintrag[]
}

function eintraege(data: AppData): AutomationEintrag[] {
  return data.projekte
    .filter((p): p is Projekt & { automation: AutomationProfil } => p.automation !== null)
    .map((projekt) => ({ projekt, automation: projekt.automation }))
    .sort((a, b) => a.projekt.titel.localeCompare(b.projekt.titel, 'de'))
}

/** Gruppiert nach Plattform in fester Reihenfolge (n8n, Make.com, Sonstige); leere Gruppen entfallen. */
export function automationenNachPlattform(data: AppData): AutomationGruppe[] {
  const alle = eintraege(data)
  return (Object.keys(PLATTFORM) as Array<AutomationProfil['plattform']>)
    .map((plattform) => ({
      schluessel: plattform,
      titel: PLATTFORM[plattform],
      eintraege: alle.filter((e) => e.automation.plattform === plattform),
    }))
    .filter((g) => g.eintraege.length > 0)
}

/** Eine Gruppe je Projekt mit Automation, alphabetisch. */
export function automationenNachProjekt(data: AppData): AutomationGruppe[] {
  return eintraege(data).map((e) => ({ schluessel: e.projekt.id, titel: e.projekt.titel, eintraege: [e] }))
}

/** Projekte, denen noch keine Automation zugeordnet ist (für „Automation erfassen“). */
export function projekteOhneAutomation(data: AppData): Projekt[] {
  return data.projekte.filter((p) => p.automation === null).sort((a, b) => a.titel.localeCompare(b.titel, 'de'))
}

/** „Bedingung → Ziel“ je Zeile; „Fallback → Ziel“ (oder „sonst“) markiert die Fallback-Regel. */
export function routingAusText(text: string): AutomationProfil['routing'] {
  return text
    .split('\n')
    .map((zeile) => zeile.trim())
    .filter(Boolean)
    .map((zeile) => {
      const [bedingung = '', ...rest] = zeile.split(/\s*(?:→|->)\s*/)
      const ziel = rest.join(' → ')
      return { bedingung, ziel, fallback: /^(fallback|sonst)$/i.test(bedingung) }
    })
}

export function routingAlsText(routing: AutomationProfil['routing']): string {
  return routing.map((r) => `${r.bedingung} → ${r.ziel}`).join('\n')
}
