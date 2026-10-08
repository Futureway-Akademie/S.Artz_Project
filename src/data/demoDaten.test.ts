import { beispielSeed } from '../test/beispielStart.ts'
import { reducer } from './reducer.ts'
import { createMeta } from '../test/fakes.ts'
import { demoEntfernen, demoHinzufuegen, hatDemoDaten, istDemo } from './demoDaten.ts'
import { appDataSchema } from './schema.ts'

const now = new Date(2026, 9, 14, 9, 0)

describe('Demo-Daten', () => {
  it('fügt gültige, fiktive Daten relativ zu heute hinzu – nur einmal', () => {
    const vorher = beispielSeed(now)
    const mit = demoHinzufuegen(vorher, now)
    expect(appDataSchema.safeParse(mit).success).toBe(true)
    expect(hatDemoDaten(mit)).toBe(true)
    expect(mit.kontakte.every((k) => istDemo(k.id))).toBe(true)
    expect(mit.termine.find((t) => t.id === 'demo-t-1')!.datum).toBe('2026-10-16')
    expect(mit.projekte).toEqual(vorher.projekte)
    expect(demoHinzufuegen(mit, now)).toBe(mit)
  })

  it('entfernt alle Demo-Einträge samt Verweisen, eigene Daten bleiben', () => {
    let d = demoHinzufuegen(beispielSeed(now), now)
    // eigene Aufgabe mit Bezug auf eine Demo-Bewerbung
    d = reducer(d, { type: 'anlegen', sammlung: 'aufgaben', id: 'eigene', daten: { titel: 'Eigene', notiz: '', erledigt: false, erledigtAm: null, faelligAm: null, bezug: { art: 'bewerbung', id: 'demo-b-nordlicht' }, fokus: false } }, createMeta())
    const ohne = demoEntfernen(d)
    expect(appDataSchema.safeParse(ohne).success).toBe(true)
    expect(JSON.stringify(ohne)).not.toContain('"demo-')
    expect(ohne.aufgaben.map((a) => [a.id, a.bezug.art])).toEqual([['eigene', 'ohne']])
    expect(ohne.projekte).toEqual(beispielSeed(now).projekte)
  })
})
