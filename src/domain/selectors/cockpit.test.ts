import { createEmptyData } from '../../data/empty.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import type { Aktivitaet, AppData, Aufgabe, Kontakt, KursAufgabe, Termin } from '../types.ts'
import {
  kurzesDatum,
  selectAktuelleProjekte,
  selectAnstehend,
  selectBegruessung,
  selectLetzteAktivitaeten,
  selectNaechsteSchritte,
  selectTagesuebersicht,
} from './cockpit.ts'

const now = new Date(2026, 9, 7, 9, 0) // Mi., 07.10.2026, 9 Uhr
const zeit = '2026-10-01T10:00:00.000Z'
const meta = { erstelltAm: zeit, geaendertAm: zeit }

const aufgabe = (id: string, faelligAm: string | null, teil: Partial<Aufgabe> = {}): Aufgabe => ({
  id,
  titel: id,
  notiz: '',
  erledigt: false,
  erledigtAm: null,
  faelligAm,
  bezug: { art: 'projekt', id: 'seed-projekt-ki-skills' },
  ...meta,
  ...teil,
})

const kontakt = (id: string, text: string, faelligAm: string | null): Kontakt => ({
  id,
  name: id,
  rolle: '',
  unternehmenId: null,
  email: '',
  telefon: '',
  linkedinUrl: '',
  kontext: 'jobsuche',
  herkunft: '',
  notiz: '',
  projektIds: [],
  naechsteAktion: { text, faelligAm },
  ...meta,
})

const termin = (id: string, datum: string): Termin => ({ id, titel: id, datum, uhrzeit: null, ort: '', notiz: '', bezug: { art: 'ohne', id: null }, ...meta })

const kursAufgabe = (id: string, faelligAm: string, status: KursAufgabe['status'] = 'offen'): KursAufgabe => ({
  id,
  kursId: 'seed-kurs-beispiel',
  code: 'KURS_1_01',
  titel: id,
  status,
  faelligAm,
  notiz: '',
  ...meta,
})

const data: AppData = {
  ...beispielSeed(now),
  aufgaben: [
    aufgabe('ohne-frist', null),
    aufgabe('ueberfaellig', '2026-10-05'),
    aufgabe('heute', '2026-10-07'),
    aufgabe('naechste-woche', '2026-10-13'),
    aufgabe('spaeter', '2026-10-30'),
    aufgabe('ohne-projekt', '2026-10-08', { bezug: { art: 'ohne', id: null } }),
    aufgabe('erledigt', '2026-10-07', { erledigt: true }),
  ],
  kontakte: [kontakt('k1', 'Nachfassen', '2026-10-06')],
  termine: [termin('termin-heute', '2026-10-07'), termin('termin-gestern', '2026-10-06'), termin('termin-in-3', '2026-10-10')],
  kursAufgaben: [kursAufgabe('kurs-morgen', '2026-10-08'), kursAufgabe('kurs-erledigt', '2026-10-08', 'erledigt')],
}

describe('Cockpit-Selektoren', () => {
  it('begrüßt nach Tageszeit mit Namen und langem Datum', () => {
    expect(selectBegruessung(data, now)).toEqual({ gruss: 'Guten Morgen', name: 'Alex', datum: 'Mittwoch, 7. Oktober 2026' })
    expect(selectBegruessung(data, new Date(2026, 9, 7, 14)).gruss).toBe('Guten Tag')
    expect(selectBegruessung(data, new Date(2026, 9, 7, 20)).gruss).toBe('Guten Abend')
  })

  it('zählt die Tagesübersicht aus gespeicherten Daten', () => {
    expect(selectTagesuebersicht(data, now)).toEqual({
      heuteFaellig: 1,
      ueberfaellig: 2, // Aufgabe vom 05.10. und Wiedervorlage vom 06.10.
      termineHeute: 1,
      offeneSchritte: 7, // 6 offene Aufgaben + 1 Wiedervorlage
      kurstag: 48,
    })
  })

  it('ordnet nächste Schritte: überfällig → mit Frist → ohne Frist, inkl. Wiedervorlagen', () => {
    const { eintraege, gesamt } = selectNaechsteSchritte(data)
    expect(eintraege.map((e) => e.titel)).toEqual(['ueberfaellig', 'Nachfassen', 'heute', 'naechste-woche', 'spaeter', 'ohne-frist'])
    expect(gesamt).toBe(6)
    expect(selectNaechsteSchritte(data, 2).eintraege).toHaveLength(2)
  })

  it('zeigt aktuelle Projekte ohne abgeschlossene', () => {
    const { zeilen, gesamt } = selectAktuelleProjekte(data, 3)
    expect(zeilen).toHaveLength(3)
    expect(gesamt).toBe(11)
    expect(zeilen.every((z) => z.projekt.status !== 'abgeschlossen')).toBe(true)
  })

  it('listet Anstehendes der nächsten 7 Tage nach Datum', () => {
    expect(selectAnstehend(data, now).map((e) => `${e.art}:${e.id}`)).toEqual([
      'aufgabe:heute',
      'termin:termin-heute',
      'aufgabe:ohne-projekt',
      'kursaufgabe:kurs-morgen',
      'termin:termin-in-3',
      'aufgabe:naechste-woche',
    ])
  })

  it('zeigt die letzten Aktivitäten, neueste zuerst, und ist ohne Daten leer', () => {
    const akt = (id: string, zeitpunkt: string): Aktivitaet => ({
      id,
      zeitpunkt,
      art: 'geaendert',
      bezug: { sammlung: null, id: null, titel: '' },
      zusammenfassung: id,
    })
    const mit = { ...data, aktivitaeten: [akt('alt', '2026-10-01T08:00:00.000Z'), akt('neu', '2026-10-07T08:00:00.000Z')] }
    expect(selectLetzteAktivitaeten(mit).map((a) => a.id)).toEqual(['neu', 'alt'])
    expect(selectLetzteAktivitaeten(createEmptyData())).toEqual([])
  })

  it('beschreibt Daten kurz relativ zu heute', () => {
    expect(kurzesDatum('2026-10-07', now)).toBe('Heute')
    expect(kurzesDatum('2026-10-08', now)).toBe('Morgen')
    expect(kurzesDatum('2026-10-12', now)).toBe('Mo., 12.10.2026')
  })
})
