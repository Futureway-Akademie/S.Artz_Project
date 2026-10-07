import { createFakeStorage } from '../test/fakes.ts'
import { createEmptyData } from './empty.ts'
import { migrate } from './migrations.ts'
import { loadAppData, parseAppData, saveAppData, STORAGE_KEY } from './storage.ts'

describe('loadAppData', () => {
  it('meldet einen leeren Speicher', () => {
    expect(loadAppData(createFakeStorage())).toEqual({ status: 'leer' })
  })

  it('meldet einen nicht verfügbaren Speicher', () => {
    expect(loadAppData(null)).toEqual({ status: 'nicht_verfuegbar' })
  })

  it('lädt gültige Daten', () => {
    const data = createEmptyData()
    data.einstellungen.anzeigename = 'Sascha'
    const ergebnis = loadAppData(createFakeStorage({ [STORAGE_KEY]: JSON.stringify(data) }))
    expect(ergebnis).toEqual({ status: 'ok', data })
  })

  it('erkennt defektes JSON und behält die Rohdaten', () => {
    const ergebnis = loadAppData(createFakeStorage({ [STORAGE_KEY]: '{kaputt' }))
    expect(ergebnis).toMatchObject({ status: 'fehler', grund: 'json', rohdaten: '{kaputt' })
  })

  it('erkennt ein ungültiges Schema mit lesbaren Details', () => {
    const data = { ...createEmptyData(), projekte: [{ id: 'p1', titel: '' }] }
    const ergebnis = loadAppData(createFakeStorage({ [STORAGE_KEY]: JSON.stringify(data) }))
    expect(ergebnis.status).toBe('fehler')
    if (ergebnis.status === 'fehler') {
      expect(ergebnis.grund).toBe('schema')
      expect(ergebnis.details).toContain('projekte.0')
    }
  })

  it('erkennt Daten einer neueren Version', () => {
    const data = { ...createEmptyData(), schemaVersion: 99 }
    expect(loadAppData(createFakeStorage({ [STORAGE_KEY]: JSON.stringify(data) }))).toMatchObject({
      status: 'fehler',
      grund: 'version_neuer',
    })
  })

  it('erkennt fehlende Versionsangaben', () => {
    expect(parseAppData('{"projekte":[]}')).toMatchObject({ status: 'fehler', grund: 'version_unbekannt' })
    expect(parseAppData('null')).toMatchObject({ status: 'fehler', grund: 'version_unbekannt' })
  })

  it('erkennt einen Lesefehler des Speichers als nicht verfügbar', () => {
    const storage = { getItem: () => { throw new Error('gesperrt') }, setItem: () => {}, removeItem: () => {} }
    expect(loadAppData(storage)).toEqual({ status: 'nicht_verfuegbar' })
  })
})

describe('migrate', () => {
  it('lässt die aktuelle Version unverändert', () => {
    const data = createEmptyData()
    expect(migrate(data)).toEqual({ ok: true, value: data })
  })
})

describe('saveAppData', () => {
  it('speichert als JSON unter dem festen Schlüssel', () => {
    const storage = createFakeStorage()
    expect(saveAppData(storage, createEmptyData())).toEqual({ ok: true })
    expect(JSON.parse(storage.map.get(STORAGE_KEY)!)).toEqual(createEmptyData())
  })

  it('meldet einen vollen Speicher verständlich', () => {
    const storage = createFakeStorage({}, { setItemFehler: new DOMException('voll', 'QuotaExceededError') })
    expect(saveAppData(storage, createEmptyData())).toEqual({ ok: false, fehler: 'Der Browser-Speicher ist voll.' })
  })

  it('meldet fehlenden Speicher', () => {
    expect(saveAppData(null, createEmptyData())).toMatchObject({ ok: false })
  })
})
