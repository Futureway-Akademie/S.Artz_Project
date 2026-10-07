import quelle from '../../docs/sources/arbeitskontext.md?raw'
import { appDataSchema } from './schema.ts'
import { createSeedData, type ProjektQuelle } from './seed.ts'

// Ohne lokale Details: so, wie die Daten im öffentlichen Repository aussehen
const seed = createSeedData(new Date('2026-10-07T10:00:00.000Z'), [])

// Testdetails (fiktiv), um das Einbinden der lokalen Datei zu prüfen
const testDetails: ProjektQuelle[] = [
  {
    projekt: { id: 'seed-projekt-ci-skills', titel: 'ignoriert', kategorie: 'ignoriert', status: 'idee', zuletztAktiv: null, beschreibung: 'Testbeschreibung', tools: ['Testtool'] },
    offen: ['Offener Testschritt A', 'Offener Testschritt B'],
    erledigt: ['Erledigter Testschritt'],
  },
]
const normalisiert = (text: string) => text.replace(/[„“"`]/g, '')

describe('Seed-Daten', () => {
  it('entsprechen dem Datenschema', () => {
    const ergebnis = appDataSchema.safeParse(seed)
    expect(ergebnis.success, ergebnis.success ? '' : JSON.stringify(ergebnis.error.issues)).toBe(true)
  })

  it('enthalten genau die 12 Projekte der Projekt-Übersicht', () => {
    expect(seed.projekte.map((p) => p.titel)).toEqual([
      'Diamond World (Videospiel)',
      'PikArtz Portfolio-Website',
      'Kleinanzeigen / Keller-Sammlung',
      'Amazon Gallery Generator (Bud Voyage Easy-Grow-Kit)',
      'KI-Weiterbildung: Tagebuch → Schulungsplattform',
      'Lebenslauf Optimierung',
      'Karriere Booster (LinkedIn)',
      'Jobsuche Festanstellung',
      'CI-Skills (ci-entwurf / ci-board)',
      'Datenschutz-Agent (DSGVO)',
      'Handwerker-Leadmagnet (navis5)',
      'Fidelio-Homepage',
    ])
  })

  it('stimmt bei Titel, Kategorie, Status und „zuletzt aktiv“ mit der Quelldatei überein', () => {
    const statusLabel = { in_arbeit: 'In Arbeit', abgeschlossen: 'Abgeschlossen', idee: 'Idee', pausiert: 'Pausiert' }
    const zeilen = quelle.split('\n').filter((z) => /^\| \d+ \|/.test(z))
    expect(zeilen).toHaveLength(12)
    seed.projekte.forEach((p, i) => {
      const spalten = zeilen[i]!.split('|').map((s) => s.trim())
      expect(spalten[2]).toBe(p.titel)
      expect(spalten[3]).toBe(p.kategorie)
      expect(spalten[5]).toBe(statusLabel[p.status!])
      expect(spalten[6]).toBe(p.zuletztAktiv)
    })
  })

  it('enthält im Repository keine Projektdetails', () => {
    expect(seed.aufgaben).toEqual([])
    for (const p of seed.projekte) {
      expect(p).toMatchObject({ beschreibung: '', tools: [], bestandteile: [], notizen: '' })
    }
  })

  it('bindet lokale Details ein: offene Punkte als Schritte ohne Frist, [x]-Punkte als erledigt', () => {
    const mitDetails = createSeedData(new Date('2026-10-07T10:00:00.000Z'), testDetails)
    const ci = mitDetails.projekte.find((p) => p.id === 'seed-projekt-ci-skills')!
    // Kern bleibt aus dem Repository, Details kommen aus der lokalen Datei
    expect(ci).toMatchObject({ titel: 'CI-Skills (ci-entwurf / ci-board)', status: 'in_arbeit', beschreibung: 'Testbeschreibung', tools: ['Testtool'] })
    expect(mitDetails.aufgaben.map((a) => [a.titel, a.erledigt, a.faelligAm, a.erledigtAm, a.bezug.id])).toEqual([
      ['Offener Testschritt A', false, null, null, 'seed-projekt-ci-skills'],
      ['Offener Testschritt B', false, null, null, 'seed-projekt-ci-skills'],
      ['Erledigter Testschritt', true, null, null, 'seed-projekt-ci-skills'],
    ])
    expect(appDataSchema.safeParse(mitDetails).success).toBe(true)
  })

  it('erfindet keine Fristen, Aktivitäten, Kontakte, Bewerbungen, Termine oder Fortschritte', () => {
    expect(seed.termine).toEqual([])
    expect(seed.kursAufgaben).toEqual([])
    expect(seed.aktivitaeten).toEqual([])
    expect(seed.kontakte).toEqual([])
    expect(seed.unternehmen).toEqual([])
    expect(seed.interaktionen).toEqual([])
    expect(seed.leads).toEqual([])
    expect(seed.bewerbungen).toEqual([])
    const json = JSON.stringify(seed)
    expect(json).not.toMatch(/"faelligAm":"/)
    expect(json).not.toMatch(/fortschritt/i)
    expect(seed.projekte.every((p) => p.automation === null)).toBe(true)
  })

  it('hinterlegt die drei bisherigen Zielrollen als Zielrollen, nicht als Bewerbungen', () => {
    expect(seed.zielrollen.map((z) => z.titel)).toEqual([
      'Prompt Engineer',
      'KI-Anwendungsspezialist',
      'Grafikdesigner mit Social-Media- oder E-Commerce-Fokus',
    ])
    for (const z of seed.zielrollen) expect(quelle).toContain(z.titel)
    expect(seed.bewerbungen).toHaveLength(0)
  })

  it('legt die Weiterbildung mit den belegten Details an', () => {
    expect(seed.kurse).toHaveLength(1)
    const kurs = seed.kurse[0]!
    expect(kurs).toMatchObject({
      titel: 'KI Automations Spezialist',
      anbieter: 'FutureWay KI Akademie GmbH',
      startDatum: '2026-08-03',
      endeDatum: '2026-12-18',
      startMonat: '2026-08',
      endeMonat: '2026-12',
      unterrichtszeit: 'Mo–Fr 09:00–16:05',
      umfang: '800 UE',
      arbeitstage: [1, 2, 3, 4, 5],
      codePraefix: 'KIAutomSpez',
    })
    expect(kurs.module).toHaveLength(6)
    expect(quelle).toContain('03.08.2026 – 18.12.2026')
    expect(quelle).toContain(kurs.anbieter)
  })

  it('enthält die belegten Designregeln, das Demo-Deck und den Anzeigenamen', () => {
    for (const r of seed.designregeln) {
      const kern = normalisiert(r.beschreibung.split(/[;–]/)[0]!).trim()
      expect(normalisiert(quelle)).toContain(kern)
    }
    expect(seed.designregeln).toHaveLength(7)
    expect(seed.decks.map((d) => [d.titel, d.modul, d.tag])).toEqual([['Demo-Deck Modul 1, Tag 1', 1, 1]])
    expect(seed.einstellungen.anzeigename).toBe('Sascha')
  })

  it('verwendet stabile, eindeutige IDs', () => {
    const mitDetails = createSeedData(new Date('2026-10-07T10:00:00.000Z'), testDetails)
    const ids = [...mitDetails.projekte, ...mitDetails.aufgaben, ...mitDetails.kurse, ...mitDetails.designregeln, ...mitDetails.decks, ...mitDetails.zielrollen].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(createSeedData(new Date(), testDetails).aufgaben.map((a) => a.id)).toEqual(mitDetails.aufgaben.map((a) => a.id))
  })
})
