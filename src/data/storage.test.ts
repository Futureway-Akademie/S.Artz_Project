import { SCHEMA_VERSION } from './schema.ts'
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
    data.einstellungen.anzeigename = 'Alex'
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

  it('hebt Version 1 schrittweise auf die aktuelle Version an (Projekt-Kategorie, Kursdetails, letzte Sicherung)', () => {
    const zeit = '2026-10-07T10:00:00.000Z'
    const v1 = {
      ...createEmptyData(),
      schemaVersion: 1,
      einstellungen: { anzeigename: 'Alt' },
      projekte: [
        {
          id: 'p1',
          titel: 'Altes Projekt',
          beschreibung: '',
          status: null,
          tools: [],
          bestandteile: [],
          notizen: '',
          automation: null,
          erstelltAm: zeit,
          geaendertAm: zeit,
        },
      ],
      kurse: [
        {
          id: 'k1',
          titel: 'Kurs',
          anbieter: '',
          startMonat: '2026-08',
          endeMonat: '2026-12',
          startDatum: null,
          endeDatum: null,
          arbeitstage: [1, 2, 3, 4, 5],
          codePraefix: 'KURS',
          erstelltAm: zeit,
          geaendertAm: zeit,
        },
      ],
    }
    const ergebnis = parseAppData(JSON.stringify(v1))
    expect(ergebnis.status).toBe('ok')
    if (ergebnis.status === 'ok') {
      expect(ergebnis.data.schemaVersion).toBe(SCHEMA_VERSION)
      expect(ergebnis.data.einstellungen).toEqual({ anzeigename: 'Alt', letzteSicherungAm: null })
      expect(ergebnis.data.projekte[0]).toMatchObject({ titel: 'Altes Projekt', kategorie: '', zuletztAktiv: null })
      expect(ergebnis.data.kurse[0]).toMatchObject({ beschreibung: '', unterrichtszeit: '', umfang: '', module: [] })
    }
  })
})

describe('Migration 3 → 4', () => {
  it('ergänzt bei Kontakten Rechtsgrundlage und Zweck, ohne Daten zu verlieren', () => {
    const zeit = '2026-10-07T10:00:00.000Z'
    const ohneDsgvo = {
      id: 'k1', name: 'Kim', rolle: '', unternehmenId: null, email: 'kim@example.org', telefon: '', linkedinUrl: '', kontext: 'jobsuche',
      herkunft: '', notiz: 'bleibt', projektIds: [], naechsteAktion: null, erstelltAm: zeit, geaendertAm: zeit,
    }
    const v3 = { ...createEmptyData(), schemaVersion: 3, kontakte: [ohneDsgvo] }
    const ergebnis = parseAppData(JSON.stringify(v3))
    expect(ergebnis.status).toBe('ok')
    if (ergebnis.status === 'ok') expect(ergebnis.data.kontakte[0]).toMatchObject({ notiz: 'bleibt', rechtsgrundlage: null, zweck: '' })
  })
})

describe('Migration 4 → 5', () => {
  it('ergänzt Verknüpfungen, Wiedervorlagen, E-Mail-Felder, Fokus und Schlagworte', () => {
    const zeit = '2026-10-07T10:00:00.000Z'
    const m = { erstelltAm: zeit, geaendertAm: zeit }
    const v4 = {
      ...createEmptyData(),
      schemaVersion: 4,
      aufgaben: [{ id: 'a1', titel: 'A', notiz: '', erledigt: false, erledigtAm: null, faelligAm: null, bezug: { art: 'ohne', id: null }, ...m }],
      interaktionen: [{ id: 'i1', kontaktId: 'k1', art: 'notiz', datum: '2026-10-01', text: 'bleibt', projektId: null, ...m }],
      leads: [{ id: 'l1', titel: 'L', kontaktId: null, unternehmenId: null, status: 'neu', betragEur: 5, naechsterSchritt: '', notiz: '', ...m }],
    }
    const ergebnis = parseAppData(JSON.stringify(v4))
    expect(ergebnis.status).toBe('ok')
    if (ergebnis.status !== 'ok') return
    expect(ergebnis.data.aufgaben[0]!.fokus).toBe(false)
    expect(ergebnis.data.interaktionen[0]).toMatchObject({ text: 'bleibt', bewerbungId: null, leadId: null, betreff: '', richtung: null })
    expect(ergebnis.data.leads[0]).toMatchObject({ betragEur: 5, projektId: null, wiedervorlageAm: null })
  })
})

describe('Migration 5 → 6', () => {
  it('legt die Startvorlagen an, ohne vorhandene Daten zu ändern', () => {
    const v5 = { ...createEmptyData(), schemaVersion: 5, einstellungen: { anzeigename: 'X', letzteSicherungAm: null } } as Record<string, unknown>
    delete v5.vorlagen
    const ergebnis = parseAppData(JSON.stringify(v5))
    expect(ergebnis.status).toBe('ok')
    if (ergebnis.status !== 'ok') return
    expect(ergebnis.data.vorlagen).toHaveLength(3)
    expect(ergebnis.data.einstellungen.anzeigename).toBe('X')
  })
})

describe('Migration 6 → 7', () => {
  it('legt das zweite Gehirn leer an', () => {
    const v6 = { ...createEmptyData(), schemaVersion: 6 } as Record<string, unknown>
    delete v6.wissen
    const ergebnis = parseAppData(JSON.stringify(v6))
    expect(ergebnis.status === 'ok' && ergebnis.data.wissen).toEqual([])
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
