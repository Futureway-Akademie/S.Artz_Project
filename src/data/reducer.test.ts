import type { AppData, Neu } from '../domain/types.ts'
import { createMeta } from '../test/fakes.ts'
import { createEmptyData } from './empty.ts'
import { loeschfolgen, MAX_AKTIVITAETEN, reducer } from './reducer.ts'
import { appDataSchema } from './schema.ts'

const projekt: Neu<'projekte'> = {
  titel: 'Make.com Kontaktformular-Workflow',
  kategorie: '',
  beschreibung: '',
  status: 'in_arbeit',
  zuletztAktiv: null,
  tools: ['Make.com'],
  bestandteile: [],
  notizen: 'Kern-Pipeline fertig',
  automation: null,
}

const aufgabe = (projektId: string): Neu<'aufgaben'> => ({
  titel: 'Routing testen',
  notiz: '',
  erledigt: false,
  erledigtAm: null,
  faelligAm: null,
  bezug: { art: 'projekt', id: projektId },
})

function mitProjekt() {
  const meta = createMeta()
  const data = reducer(createEmptyData(), { type: 'anlegen', sammlung: 'projekte', daten: projekt }, meta)
  return { meta, data, projektId: data.projekte[0]!.id }
}

describe('reducer: anlegen', () => {
  it('setzt ID und Zeitstempel und protokolliert eine Aktivität', () => {
    const { data } = mitProjekt()
    expect(data.projekte[0]).toMatchObject({
      ...projekt,
      id: 'id-1',
      erstelltAm: '2026-10-07T10:00:00.000Z',
      geaendertAm: '2026-10-07T10:00:00.000Z',
    })
    expect(data.aktivitaeten).toEqual([
      {
        id: 'id-2',
        zeitpunkt: '2026-10-07T10:00:00.000Z',
        art: 'angelegt',
        bezug: { sammlung: 'projekte', id: 'id-1', titel: projekt.titel },
        zusammenfassung: 'Projekt „Make.com Kontaktformular-Workflow“ angelegt',
      },
    ])
    expect(appDataSchema.safeParse(data).success).toBe(true)
  })
})

describe('reducer: ändern', () => {
  it('erzeugt keine Aktivität, wenn sich nichts ändert', () => {
    const { meta, data, projektId } = mitProjekt()
    const next = reducer(data, { type: 'aendern', sammlung: 'projekte', id: projektId, aenderung: { notizen: projekt.notizen } }, meta)
    expect(next).toBe(data)
  })

  it('protokolliert nur tatsächlich geänderte Felder', () => {
    const { meta, data, projektId } = mitProjekt()
    meta.setNow('2026-10-08T09:00:00.000Z')
    const next = reducer(
      data,
      { type: 'aendern', sammlung: 'projekte', id: projektId, aenderung: { status: 'pausiert', notizen: projekt.notizen } },
      meta,
    )
    expect(next.projekte[0]!.status).toBe('pausiert')
    expect(next.projekte[0]!.geaendertAm).toBe('2026-10-08T09:00:00.000Z')
    expect(next.aktivitaeten[0]!.zusammenfassung).toBe('Projekt „Make.com Kontaktformular-Workflow“ geändert: Status')
  })

  it('setzt einen Projektstatus nie selbstständig', () => {
    const { meta, data, projektId } = mitProjekt()
    let next = reducer(data, { type: 'anlegen', sammlung: 'aufgaben', daten: aufgabe(projektId) }, meta)
    next = reducer(next, { type: 'aendern', sammlung: 'aufgaben', id: next.aufgaben[0]!.id, aenderung: { erledigt: true } }, meta)
    expect(next.projekte[0]!.status).toBe('in_arbeit')
  })

  it('benennt Erledigen und Wiedereröffnen und pflegt erledigtAm', () => {
    const { meta, data, projektId } = mitProjekt()
    let next = reducer(data, { type: 'anlegen', sammlung: 'aufgaben', daten: aufgabe(projektId) }, meta)
    const id = next.aufgaben[0]!.id
    meta.setNow('2026-10-09T12:00:00.000Z')
    next = reducer(next, { type: 'aendern', sammlung: 'aufgaben', id, aenderung: { erledigt: true } }, meta)
    expect(next.aufgaben[0]!.erledigtAm).toBe('2026-10-09T12:00:00.000Z')
    expect(next.aktivitaeten[0]).toMatchObject({ art: 'erledigt', zusammenfassung: 'Aufgabe „Routing testen“ erledigt' })

    next = reducer(next, { type: 'aendern', sammlung: 'aufgaben', id, aenderung: { erledigt: false } }, meta)
    expect(next.aufgaben[0]!.erledigtAm).toBeNull()
    expect(next.aktivitaeten[0]!.art).toBe('wieder_geoeffnet')
  })

  it('ignoriert unbekannte IDs', () => {
    const { meta, data } = mitProjekt()
    expect(reducer(data, { type: 'aendern', sammlung: 'projekte', id: 'gibt-es-nicht', aenderung: { titel: 'X' } }, meta)).toBe(data)
    expect(reducer(data, { type: 'loeschen', sammlung: 'projekte', id: 'gibt-es-nicht' }, meta)).toBe(data)
  })
})

describe('reducer: löschen', () => {
  function crmDaten() {
    const { meta, data: start, projektId } = mitProjekt()
    let data: AppData = reducer(start, { type: 'anlegen', sammlung: 'aufgaben', daten: aufgabe(projektId) }, meta)
    data = reducer(data, { type: 'anlegen', sammlung: 'unternehmen', daten: { name: 'Beispiel GmbH', branche: '', website: '', notiz: '' } }, meta)
    const unternehmenId = data.unternehmen[0]!.id
    data = reducer(
      data,
      {
        type: 'anlegen',
        sammlung: 'kontakte',
        daten: {
          name: 'Kim Muster',
          rolle: '',
          unternehmenId,
          email: '',
          telefon: '',
          linkedinUrl: '',
          kontext: 'jobsuche',
          herkunft: '',
          notiz: '',
          projektIds: [projektId],
          naechsteAktion: null,
          rechtsgrundlage: null,
          zweck: '',
        },
      },
      meta,
    )
    const kontaktId = data.kontakte[0]!.id
    data = reducer(
      data,
      { type: 'anlegen', sammlung: 'interaktionen', daten: { kontaktId, art: 'telefonat', datum: '2026-10-07', text: 'Erstgespräch', projektId } },
      meta,
    )
    return { meta, data, projektId, unternehmenId, kontaktId }
  }

  it('nennt die Folgen vor dem Löschen eines Projekts', () => {
    const { data, projektId } = crmDaten()
    const folge = loeschfolgen(data, 'projekte', projektId)
    expect(folge.geloescht.map((e) => e.titel)).toEqual(['Routing testen'])
    expect(folge.entknuepft.map((e) => e.sammlung)).toEqual(['kontakte', 'interaktionen'])
  })

  it('löscht abhängige Aufgaben und entfernt Projektverknüpfungen', () => {
    const { meta, data, projektId } = crmDaten()
    const next = reducer(data, { type: 'loeschen', sammlung: 'projekte', id: projektId }, meta)
    expect(next.projekte).toHaveLength(0)
    expect(next.aufgaben).toHaveLength(0)
    expect(next.kontakte[0]!.projektIds).toEqual([])
    expect(next.interaktionen[0]!.projektId).toBeNull()
    expect(next.aktivitaeten[0]!.zusammenfassung).toBe(
      'Projekt „Make.com Kontaktformular-Workflow“ gelöscht (mit 1 verknüpften Einträgen)',
    )
    expect(appDataSchema.safeParse(next).success).toBe(true)
  })

  it('löscht beim Kontakt den Verlauf und löst das Unternehmen nur', () => {
    const { meta, data, kontaktId, unternehmenId } = crmDaten()
    const ohneKontakt = reducer(data, { type: 'loeschen', sammlung: 'kontakte', id: kontaktId }, meta)
    expect(ohneKontakt.interaktionen).toHaveLength(0)
    expect(ohneKontakt.unternehmen).toHaveLength(1)

    const ohneUnternehmen = reducer(data, { type: 'loeschen', sammlung: 'unternehmen', id: unternehmenId }, meta)
    expect(ohneUnternehmen.kontakte[0]!.unternehmenId).toBeNull()
  })
})

describe('reducer: Einstellungen und Ersetzen', () => {
  it('protokolliert Einstellungen nur bei Änderung', () => {
    const meta = createMeta()
    const data = createEmptyData()
    expect(reducer(data, { type: 'einstellungen', aenderung: { anzeigename: '' } }, meta)).toBe(data)
    const next = reducer(data, { type: 'einstellungen', aenderung: { anzeigename: 'Alex' } }, meta)
    expect(next.einstellungen.anzeigename).toBe('Alex')
    expect(next.aktivitaeten).toHaveLength(1)
  })

  it('ersetzt alle Daten ohne Aktivität', () => {
    const meta = createMeta()
    const neu = { ...createEmptyData(), einstellungen: { anzeigename: 'Import', letzteSicherungAm: null } }
    expect(reducer(createEmptyData(), { type: 'ersetzen', daten: neu }, meta)).toBe(neu)
  })

  it('begrenzt das Aktivitätsprotokoll', () => {
    const meta = createMeta()
    let data = createEmptyData()
    for (let i = 0; i < MAX_AKTIVITAETEN + 5; i++) {
      data = reducer(data, { type: 'anlegen', sammlung: 'zielrollen', daten: { titel: `Rolle ${i}`, notiz: '' } }, meta)
    }
    expect(data.aktivitaeten).toHaveLength(MAX_AKTIVITAETEN)
    expect(data.aktivitaeten[0]!.bezug.titel).toBe(`Rolle ${MAX_AKTIVITAETEN + 4}`)
  })
})
