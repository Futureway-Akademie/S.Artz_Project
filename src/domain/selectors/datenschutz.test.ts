import { createEmptyData } from '../../data/empty.ts'
import { reducer } from '../../data/reducer.ts'
import { createMeta } from '../../test/fakes.ts'
import type { AppData, Kontakt } from '../types.ts'
import { datenauskunft, kontakteMitPruefbedarf, kontakteZurPruefung, letzteAktivitaet } from './datenschutz.ts'

const meta = { erstelltAm: '2025-01-10T10:00:00.000Z', geaendertAm: '2025-01-10T10:00:00.000Z' }
const now = new Date('2026-10-07T10:00:00.000Z')

const kontakt = (id: string, extra: Partial<Kontakt> = {}): Kontakt => ({
  id,
  name: `Person ${id}`,
  rolle: '',
  unternehmenId: null,
  email: `${id}@example.org`,
  telefon: '',
  linkedinUrl: '',
  kontext: 'jobsuche',
  herkunft: 'Messe',
  notiz: '',
  projektIds: [],
  naechsteAktion: null,
  rechtsgrundlage: 'berechtigtes_interesse',
  zweck: 'Bewerbung',
  ...meta,
  ...extra,
})

function daten(): AppData {
  return {
    ...createEmptyData(),
    kontakte: [kontakt('alt'), kontakt('aktiv'), kontakt('ohne', { rechtsgrundlage: null, geaendertAm: '2026-10-01T10:00:00.000Z' })],
    interaktionen: [{ id: 'i1', kontaktId: 'aktiv', art: 'telefonat', datum: '2026-09-01', text: 'Rückruf vereinbart', projektId: null, ...meta }],
    leads: [{ id: 'l1', titel: 'Workshop', kontaktId: 'aktiv', unternehmenId: null, status: 'angebot', betragEur: null, naechsterSchritt: '', notiz: '', ...meta }],
  }
}

describe('Datenschutz-Selektoren', () => {
  it('ermittelt die letzte Aktivität aus Änderung und Verlauf', () => {
    const d = daten()
    expect(letzteAktivitaet(d, d.kontakte[0]!).slice(0, 10)).toBe('2025-01-10')
    expect(letzteAktivitaet(d, d.kontakte[1]!)).toBe('2026-09-01')
  })

  it('meldet Kontakte ohne Aktivität seit 12 Monaten und solche ohne Rechtsgrundlage', () => {
    const d = daten()
    expect(kontakteZurPruefung(d, now).map((k) => k.id)).toEqual(['alt'])
    expect(kontakteMitPruefbedarf(d, now).map((k) => k.id)).toEqual(['alt', 'ohne'])
  })

  it('erstellt eine vollständige Auskunft nach Art. 15', () => {
    const text = datenauskunft(daten(), 'aktiv', now)!
    expect(text).toContain('Art. 15 DSGVO')
    expect(text).toContain('Name: Person aktiv')
    expect(text).toContain('E-Mail: aktiv@example.org')
    expect(text).toContain('Zweck: Bewerbung')
    expect(text).toContain('Berechtigtes Interesse (Art. 6 Abs. 1 f)')
    expect(text).toContain('Telefonat: Rückruf vereinbart')
    expect(text).toContain('- Workshop (Angebot)')
    expect(text).toContain('widersprechen (Art. 21)')
    expect(datenauskunft(daten(), 'gibt-es-nicht', now)).toBeNull()
  })
})

describe('Löschen nach Art. 17', () => {
  it('entfernt Name und E-Mail der Person auch aus dem Aktivitätsprotokoll', () => {
    const m = createMeta()
    let d = reducer(createEmptyData(), { type: 'anlegen', sammlung: 'kontakte', id: 'k1', daten: { ...kontakt('k1'), name: 'Kim Muster', email: 'kim@example.org' } }, m)
    d = reducer(d, { type: 'aendern', sammlung: 'kontakte', id: 'k1', aenderung: { rolle: 'Recruiterin' } }, m)
    d = reducer(d, { type: 'anlegen', sammlung: 'interaktionen', daten: { kontaktId: 'k1', art: 'email', datum: '2026-10-01', text: 'Mail an kim@example.org', projektId: null } }, m)
    expect(JSON.stringify(d.aktivitaeten)).toContain('Kim Muster')

    d = reducer(d, { type: 'loeschen', sammlung: 'kontakte', id: 'k1' }, m)
    const protokoll = JSON.stringify(d.aktivitaeten)
    expect(protokoll).not.toContain('Kim Muster')
    expect(protokoll).not.toContain('kim@example.org')
    expect(d.kontakte).toEqual([])
    expect(d.interaktionen).toEqual([])
    expect(d.aktivitaeten[0]).toMatchObject({ art: 'geloescht', bezug: { sammlung: 'kontakte', id: null, titel: 'Gelöschter Kontakt' } })
    expect(d.aktivitaeten.every((a) => a.bezug.sammlung !== 'kontakte' || a.bezug.id === null)).toBe(true)
  })
})
