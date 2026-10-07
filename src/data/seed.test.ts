import quelle from '../../docs/sources/arbeitskontext.md?raw'
import { appDataSchema } from './schema.ts'
import { createSeedData } from './seed.ts'

const seed = createSeedData(new Date('2026-10-07T10:00:00.000Z'))

describe('Seed-Daten', () => {
  it('entsprechen dem Datenschema', () => {
    const ergebnis = appDataSchema.safeParse(seed)
    expect(ergebnis.success, ergebnis.success ? '' : JSON.stringify(ergebnis.error.issues)).toBe(true)
  })

  it('enthalten genau die fünf genannten Projekte', () => {
    expect(seed.projekte.map((p) => p.titel)).toEqual([
      'n8n Kontaktformular-Klassifikator',
      'n8n Jobsuche-Assistent',
      'Make.com Kontaktformular-Workflow',
      'Digitales Weiterbildungs-Tagebuch',
      'PIKARTZ.AI Präsentations-System',
    ])
  })

  it('nehmen jedes Projekt, jede Zielrolle und jede Designregel aus der Quelle', () => {
    for (const p of seed.projekte) expect(quelle).toContain(p.titel)
    for (const z of seed.zielrollen) expect(quelle).toContain(z.titel)
    // Kernaussage jeder Regel steht in der Quelle (Anführungszeichen und Markdown-Code ignoriert)
    const normalisiert = (text: string) => text.replace(/[„“"`]/g, '')
    for (const r of seed.designregeln) {
      const kern = normalisiert(r.beschreibung.split(/[;–]/)[0]!).trim()
      expect(normalisiert(quelle)).toContain(kern)
    }
  })

  it('setzt nur den belegten Projektstatus', () => {
    const status = Object.fromEntries(seed.projekte.map((p) => [p.titel, p.status]))
    expect(status).toEqual({
      'n8n Kontaktformular-Klassifikator': null,
      'n8n Jobsuche-Assistent': null,
      'Make.com Kontaktformular-Workflow': 'in_arbeit',
      'Digitales Weiterbildungs-Tagebuch': null,
      'PIKARTZ.AI Präsentations-System': null,
    })
    expect(seed.projekte.find((p) => p.status === 'in_arbeit')!.notizen).toBe('Kern-Pipeline fertig')
  })

  it('markiert das Klassifikator-Routing als geplant und nichts als verbunden', () => {
    const klassifikator = seed.projekte[0]!.automation!
    expect(klassifikator.routingStatus).toBe('geplant')
    for (const p of seed.projekte) {
      if (p.automation) {
        expect(p.automation.verbindung).toBe('nicht_verbunden')
        expect(p.automation.schwelleProzent).toBeNull()
        expect(p.automation.modell).toBeNull()
      }
    }
  })

  it('erfindet keine Fristen, Aktivitäten, Kontakte, Bewerbungen, Termine oder Fortschritte', () => {
    expect(seed.aufgaben).toEqual([])
    expect(seed.termine).toEqual([])
    expect(seed.kursAufgaben).toEqual([])
    expect(seed.aktivitaeten).toEqual([])
    expect(seed.kontakte).toEqual([])
    expect(seed.unternehmen).toEqual([])
    expect(seed.interaktionen).toEqual([])
    expect(seed.leads).toEqual([])
    expect(seed.bewerbungen).toEqual([])
    // Kein Feld mit Fälligkeit oder Fortschritt ist gesetzt
    const json = JSON.stringify(seed)
    expect(json).not.toMatch(/"faelligAm":"/)
    expect(json).not.toMatch(/fortschritt/i)
  })

  it('hinterlegt Zielrollen als Zielrollen, nicht als Bewerbungen', () => {
    expect(seed.zielrollen.map((z) => z.titel)).toEqual([
      'Prompt Engineer',
      'KI-Anwendungsspezialist',
      'Grafikdesigner mit Social-Media- oder E-Commerce-Fokus',
    ])
    expect(seed.bewerbungen).toHaveLength(0)
  })

  it('legt die Weiterbildung ohne erfundene Daten an', () => {
    expect(seed.kurse).toHaveLength(1)
    expect(seed.kurse[0]).toMatchObject({
      titel: 'KI Automations Spezialist',
      startMonat: '2026-08',
      endeMonat: '2026-12',
      startDatum: null,
      endeDatum: null,
      anbieter: '',
      arbeitstage: [1, 2, 3, 4, 5],
      codePraefix: 'KIAutomSpez',
    })
  })

  it('enthält die belegten Designregeln, das Demo-Deck und den Anzeigenamen', () => {
    expect(seed.designregeln).toHaveLength(7)
    expect(seed.decks.map((d) => [d.titel, d.modul, d.tag])).toEqual([['Demo-Deck Modul 1, Tag 1', 1, 1]])
    expect(seed.einstellungen.anzeigename).toBe('Sascha')
  })

  it('verwendet stabile, eindeutige IDs', () => {
    const ids = [...seed.projekte, ...seed.kurse, ...seed.designregeln, ...seed.decks, ...seed.zielrollen].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(createSeedData(new Date()).projekte.map((p) => p.id)).toEqual(seed.projekte.map((p) => p.id))
  })
})
