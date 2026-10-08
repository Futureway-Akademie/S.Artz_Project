import { beispielSeed } from '../../test/beispielStart.ts'
import type { AppData, AutomationProfil } from '../types.ts'
import {
  automationenNachPlattform,
  automationenNachProjekt,
  projekteOhneAutomation,
  routingAlsText,
  routingAusText,
} from './automationen.ts'

const profil = (plattform: AutomationProfil['plattform']): AutomationProfil => ({
  plattform,
  modell: null,
  promptVersion: null,
  schwelleProzent: null,
  statuswerte: [],
  datenquellen: [],
  pipeline: [],
  routing: [],
  routingStatus: null,
  logikHinweise: [],
  verbindung: 'nicht_verbunden',
})

function mitAutomationen(): AppData {
  const seed = beispielSeed(new Date('2026-10-07T10:00:00.000Z'))
  const zuordnung: Record<string, AutomationProfil> = {
    'seed-projekt-ki-skills': profil('sonstige'),
    'seed-projekt-kundenformular': profil('make'),
    'seed-projekt-pruef-agent': profil('n8n'),
    'seed-projekt-stellensuche': profil('n8n'),
  }
  return { ...seed, projekte: seed.projekte.map((p) => ({ ...p, automation: zuordnung[p.id] ?? null })) }
}

describe('Automationen-Selektoren', () => {
  it('liefert ohne erfasste Automationen keine Gruppen', () => {
    const seed = beispielSeed(new Date())
    expect(automationenNachPlattform(seed)).toEqual([])
    expect(automationenNachProjekt(seed)).toEqual([])
    expect(projekteOhneAutomation(seed)).toHaveLength(12)
  })

  it('gruppiert nach Plattform in fester Reihenfolge', () => {
    const gruppen = automationenNachPlattform(mitAutomationen())
    expect(gruppen.map((g) => [g.titel, g.eintraege.map((e) => e.projekt.titel)])).toEqual([
      ['n8n', ['Prüf-Agent (Konzept)', 'Stellensuche']],
      ['Make.com', ['Kundenformular']],
      ['Sonstige', ['KI-Skills']],
    ])
  })

  it('gruppiert nach Projekt und kennt Projekte ohne Automation', () => {
    const data = mitAutomationen()
    expect(automationenNachProjekt(data).map((g) => g.titel)).toEqual([
      'KI-Skills',
      'Kundenformular',
      'Prüf-Agent (Konzept)',
      'Stellensuche',
    ])
    expect(projekteOhneAutomation(data)).toHaveLength(8)
  })

  it('liest Routing-Regeln mit Fallback aus Text', () => {
    const routing = routingAusText('Anfrage → Vertrieb\nSupport -> Helpdesk\n\nFallback → Postfach')
    expect(routing).toEqual([
      { bedingung: 'Anfrage', ziel: 'Vertrieb', fallback: false },
      { bedingung: 'Support', ziel: 'Helpdesk', fallback: false },
      { bedingung: 'Fallback', ziel: 'Postfach', fallback: true },
    ])
    expect(routingAlsText(routing)).toBe('Anfrage → Vertrieb\nSupport → Helpdesk\nFallback → Postfach')
  })
})
