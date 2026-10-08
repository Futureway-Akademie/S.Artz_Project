import { BEISPIEL_START } from '../test/beispielStart.ts'
import { appDataSchema } from './schema.ts'
import { createSeedData, LEERE_STARTDATEN, type StartDaten } from './seed.ts'

const zeit = new Date('2026-10-07T10:00:00.000Z')

// So sehen die Startdaten im öffentlichen Repository aus (ohne lokale Datei)
const oeffentlich = createSeedData(zeit, LEERE_STARTDATEN)

// Fiktive Startdaten mit Details, um das Einbinden der lokalen Datei zu prüfen
const mitDetails: StartDaten = {
  ...BEISPIEL_START,
  projekte: [
    {
      projekt: { id: 'seed-projekt-test', titel: 'Testprojekt', kategorie: 'Test', status: 'in_arbeit', zuletztAktiv: '2026-10-01', beschreibung: 'Testbeschreibung', tools: ['Testtool'] },
      offen: ['Offener Testschritt A', 'Offener Testschritt B'],
      erledigt: ['Erledigter Testschritt'],
    },
  ],
}

describe('Seed-Daten', () => {
  it('entsprechen dem Datenschema – öffentlich und mit lokalen Startdaten', () => {
    for (const daten of [oeffentlich, createSeedData(zeit, BEISPIEL_START), createSeedData(zeit, mitDetails)]) {
      const ergebnis = appDataSchema.safeParse(daten)
      expect(ergebnis.success, ergebnis.success ? '' : JSON.stringify(ergebnis.error.issues)).toBe(true)
    }
  })

  it('enthalten ohne lokale Datei keine persönlichen Daten', () => {
    expect(oeffentlich.projekte).toEqual([])
    expect(oeffentlich.aufgaben).toEqual([])
    expect(oeffentlich.kurse).toEqual([])
    expect(oeffentlich.zielrollen).toEqual([])
    expect(oeffentlich.einstellungen.anzeigename).toBe('')
  })

  it('übernehmen Projekte, Kurs, Zielrollen und Anzeigenamen aus den lokalen Startdaten', () => {
    const seed = createSeedData(zeit, BEISPIEL_START)
    expect(seed.projekte.map((p) => p.titel)).toEqual(BEISPIEL_START.projekte.map((q) => q.projekt.titel))
    expect(seed.kurse.map((k) => k.titel)).toEqual(['Beispielkurs Automatisierung'])
    expect(seed.zielrollen.map((z) => z.titel)).toEqual(BEISPIEL_START.zielrollen)
    expect(seed.einstellungen.anzeigename).toBe('Alex')
    expect(seed.bewerbungen).toHaveLength(0)
  })

  it('bindet Details ein: offene Punkte als Schritte ohne Frist, [x]-Punkte als erledigt', () => {
    const seed = createSeedData(zeit, mitDetails)
    expect(seed.projekte[0]).toMatchObject({ titel: 'Testprojekt', beschreibung: 'Testbeschreibung', tools: ['Testtool'], automation: null })
    expect(seed.aufgaben.map((a) => [a.titel, a.erledigt, a.faelligAm, a.erledigtAm, a.bezug.id])).toEqual([
      ['Offener Testschritt A', false, null, null, 'seed-projekt-test'],
      ['Offener Testschritt B', false, null, null, 'seed-projekt-test'],
      ['Erledigter Testschritt', true, null, null, 'seed-projekt-test'],
    ])
  })

  it('erfindet keine Fristen, Aktivitäten, Kontakte, Bewerbungen, Termine oder Fortschritte', () => {
    const seed = createSeedData(zeit, mitDetails)
    expect(seed.termine).toEqual([])
    expect(seed.kursAufgaben).toEqual([])
    expect(seed.aktivitaeten).toEqual([])
    expect(seed.kontakte).toEqual([])
    expect(seed.unternehmen).toEqual([])
    expect(seed.interaktionen).toEqual([])
    expect(seed.leads).toEqual([])
    const json = JSON.stringify(seed)
    expect(json).not.toMatch(/"faelligAm":"/)
    expect(json).not.toMatch(/fortschritt/i)
  })

  it('enthält die Designregeln der Marke und das Demo-Deck', () => {
    expect(oeffentlich.designregeln).toHaveLength(7)
    expect(oeffentlich.designregeln[0]).toMatchObject({ titel: 'Wortmarke', reihenfolge: 1 })
    expect(oeffentlich.decks.map((d) => [d.titel, d.modul, d.tag])).toEqual([['Demo-Deck Modul 1, Tag 1', 1, 1]])
  })

  it('verwendet stabile, eindeutige IDs', () => {
    const seed = createSeedData(zeit, mitDetails)
    const ids = [...seed.projekte, ...seed.aufgaben, ...seed.kurse, ...seed.designregeln, ...seed.decks, ...seed.zielrollen].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(createSeedData(new Date(), mitDetails).aufgaben.map((a) => a.id)).toEqual(seed.aufgaben.map((a) => a.id))
  })
})
