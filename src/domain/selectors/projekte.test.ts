import { beispielSeed, type ProjektQuelle } from '../../test/beispielStart.ts'
import type { Aufgabe } from '../types.ts'
import { projektKategorien, projektListe, projektSchritte, projektZaehler } from './projekte.ts'

// Fiktive Details statt der privaten lokalen Datei
const details: ProjektQuelle[] = [
  {
    projekt: { id: 'seed-projekt-lerntagebuch', titel: '', kategorie: '', status: null, zuletztAktiv: null, tools: ['Godot'] },
    offen: ['Erster offener Schritt', 'Zweiter offener Schritt'],
    erledigt: ['Schon erledigt'],
  },
  {
    projekt: { id: 'seed-projekt-ki-skills', titel: '', kategorie: '', status: null, zuletztAktiv: null },
    offen: ['Ohne Frist A', 'Ohne Frist B'],
  },
]
const seed = beispielSeed(new Date('2026-10-07T10:00:00.000Z'), details)

describe('Projekt-Selektoren', () => {
  it('zählt offene und erledigte Schritte ohne Prozentwert', () => {
    const tagebuch = projektListe(seed).find((z) => z.projekt.id === 'seed-projekt-lerntagebuch')!
    expect(tagebuch.offen).toBe(2)
    expect(tagebuch.erledigt).toBe(1)
    expect(tagebuch.naechsterSchritt?.titel).toBe('Erster offener Schritt')
    expect(Object.keys(tagebuch)).not.toContain('prozent')
  })

  it('sortiert aktive Projekte zuerst, abgeschlossene zuletzt, sonst nach „zuletzt aktiv“', () => {
    const titel = projektListe(seed).map((z) => z.projekt.titel)
    expect(titel[0]).toBe('Lernspiel (Prototyp)')
    expect(titel.at(-1)).toBe('Lebenslauf überarbeiten')
    expect(titel.at(-2)).toBe('Prüf-Agent (Konzept)')
  })

  it('filtert nach Suche, Status und Kategorie', () => {
    expect(projektListe(seed, { suche: 'godot', status: 'alle', kategorie: '' }).map((z) => z.projekt.titel)).toEqual([
      'Lerntagebuch',
    ])
    expect(projektListe(seed, { suche: '', status: 'idee', kategorie: '' })).toHaveLength(1)
    expect(projektListe(seed, { suche: '', status: 'alle', kategorie: 'Karriere' })).toHaveLength(4)
    expect(projektListe(seed, { suche: 'gibt es nicht', status: 'alle', kategorie: '' })).toEqual([])
  })

  it('sortiert offene Schritte nach Frist, ohne Frist zuletzt', () => {
    const basis = seed.aufgaben.find((a) => a.bezug.id === 'seed-projekt-ki-skills')!
    const mitFrist: Aufgabe = { ...basis, id: 'neu', titel: 'Mit Frist', faelligAm: '2026-10-09' }
    const { offen } = projektSchritte({ ...seed, aufgaben: [...seed.aufgaben, mitFrist] }, 'seed-projekt-ki-skills')
    expect(offen.map((a) => a.titel)).toEqual([
      'Mit Frist',
      'Ohne Frist A',
      'Ohne Frist B',
    ])
  })

  it('liefert Kategorien und Statuszähler', () => {
    expect(projektKategorien(seed)).toContain('Kundenprojekt / Verein')
    expect(projektZaehler(seed)).toEqual({ gesamt: 12, nachStatus: { in_arbeit: 10, abgeschlossen: 1, idee: 1 } })
  })
})
