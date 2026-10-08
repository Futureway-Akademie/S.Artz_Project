import { beispielSeed } from '../../test/beispielStart.ts'
import type { AppData } from '../types.ts'
import { anschreibenEingabe, antwortEingabe, idsAusAntwort, naechsterSchrittAusAntwort, tagesplanEingabe, wiedervorlageAusAntwort, zusammenfassungEingabe } from './kiEingaben.ts'

const zeit = '2026-10-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }
const now = new Date(2026, 9, 7, 9, 0)

function daten(): AppData {
  const seed = beispielSeed(now)
  return {
    ...seed,
    einstellungen: { ...seed.einstellungen, anzeigename: 'Alex' },
    unternehmen: [{ id: 'u1', name: 'Acme GmbH', branche: 'Software', website: '', notiz: '', schlagworte: [], ...m }],
    kontakte: [
      { id: 'k1', name: 'Kim Muster', rolle: 'HR', unternehmenId: 'u1', email: 'kim@acme.de', telefon: '', linkedinUrl: '', kontext: 'jobsuche', herkunft: '', notiz: '', projektIds: [], naechsteAktion: { text: 'Nachfassen', faelligAm: '2026-10-06' }, rechtsgrundlage: null, zweck: '', schlagworte: [], ...m },
    ],
    bewerbungen: [{ id: 'b1', stelle: 'KI-Trainer', unternehmenId: 'u1', zielrolleId: null, kontaktId: 'k1', status: 'beworben', quelle: '', beworbenAm: null, link: 'https://acme.de/job', naechsterSchritt: '', notiz: 'n8n, Prompting', wiedervorlageAm: null, ...m }],
    interaktionen: [
      { id: 'i1', kontaktId: 'k1', art: 'email', datum: '2026-10-05', text: 'Wir laden Sie ein.', projektId: null, bewerbungId: 'b1', leadId: null, betreff: 'Einladung', richtung: 'eingang', ...m },
      { id: 'i2', kontaktId: 'k1', art: 'telefonat', datum: '2026-10-01', text: 'Erstes Telefonat', projektId: null, bewerbungId: null, leadId: null, betreff: '', richtung: null, ...m },
    ],
    aufgaben: [
      { id: 'a1', titel: 'Portfolio aktualisieren', notiz: '', erledigt: false, erledigtAm: null, faelligAm: '2026-10-05', bezug: { art: 'ohne', id: null }, fokus: false, ...m },
      { id: 'a2', titel: 'Später', notiz: '', erledigt: false, erledigtAm: null, faelligAm: '2026-12-01', bezug: { art: 'ohne', id: null }, fokus: false, ...m },
    ],
  }
}

describe('Texte für KI-Aufgaben', () => {
  it('Anschreiben: Stelle, Firma, Ansprechpartner, Notizen und Platzhalter statt erfundener Stärken', () => {
    const t = anschreibenEingabe(daten(), daten().bewerbungen[0]!)
    expect(t).toContain('Stelle: KI-Trainer')
    expect(t).toContain('Unternehmen: Acme GmbH (Software)')
    expect(t).toContain('Ansprechpartner: Kim Muster, HR')
    expect(t).toContain('Notizen zur Stelle und Anforderungen:\nn8n, Prompting')
    expect(t).toContain('[bitte ergänzen]')
    expect(t).toContain('Absender: Alex')
    expect(t).not.toContain('kim@acme.de')
  })

  it('Antwort und Zusammenfassung enthalten nur den nötigen Verlauf', () => {
    expect(antwortEingabe(daten(), daten().interaktionen[0]!)).toContain('Bewerbung: KI-Trainer – Status: Beworben')
    const z = zusammenfassungEingabe(daten(), { kontaktId: 'k1' }, now)
    expect(z.indexOf('Einladung')).toBeLessThan(z.indexOf('Erstes Telefonat'))
  })

  it('Tagesplanung: nur bald Fälliges und Wiedervorlagen, mit IDs', () => {
    const t = tagesplanEingabe(daten(), now)
    expect(t).toContain('[a1] Portfolio aktualisieren (Frist 2026-10-05, überfällig)')
    expect(t).not.toContain('Später')
    expect(t).toContain('[k1] Wiedervorlage Kontakt Kim Muster: Nachfassen')
  })

  it('liest IDs, nächsten Schritt und Wiedervorlage aus Antworten', () => {
    expect(idsAusAntwort('1. [a1] zuerst\n2. [k1] dann [a1]')).toEqual(['a1', 'k1'])
    expect(wiedervorlageAusAntwort('Nächster Schritt: Termin bestätigen\nWiedervorlage: 2026-10-12')).toBe('2026-10-12')
    expect(wiedervorlageAusAntwort('Wiedervorlage: keine')).toBeNull()
    expect(naechsterSchrittAusAntwort('- a\nNächster Schritt: Termin bestätigen\n')).toBe('Termin bestätigen')
  })
})
