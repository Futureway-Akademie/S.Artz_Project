import type { AppData, Aufgabe, Kurs, Projekt } from '../domain/types.ts'
import { createEmptyData } from './empty.ts'

/**
 * Ausgangsdaten beim ersten Start und nach „Zurücksetzen“.
 *
 * Das Repository ist öffentlich. Deshalb stehen hier nur neutrale Inhalte (Designregeln und
 * Demo-Deck der Marke). Persönliche Startdaten – Projekte, Weiterbildung, Zielrollen und
 * Anzeigename – liegen lokal in `seed.privat.ts` (von Git ignoriert) und werden eingebunden,
 * wenn die Datei existiert. Ohne sie startet die App leer.
 * Es gibt bewusst keine Fristen, Termine, Kontakte, Unternehmen, Bewerbungen, Leads oder Aktivitäten.
 */

type ProjektDaten = Omit<Projekt, 'erstelltAm' | 'geaendertAm'>
type ProjektKern = Pick<ProjektDaten, 'id' | 'titel' | 'kategorie' | 'status' | 'zuletztAktiv'>

export interface ProjektQuelle {
  projekt: Partial<ProjektDaten> & ProjektKern
  /** Offene Punkte („[ ]“) */
  offen?: string[]
  /** Erledigte Punkte („[x]“); ein Erledigungsdatum ist nicht belegt */
  erledigt?: string[]
}

export interface StartDaten {
  anzeigename: string
  projekte: ProjektQuelle[]
  kurse: Array<Omit<Kurs, 'erstelltAm' | 'geaendertAm'>>
  /** Titel der Zielrollen */
  zielrollen: string[]
}

export const LEERE_STARTDATEN: StartDaten = { anzeigename: '', projekte: [], kurse: [], zielrollen: [] }

/** Lokale Startdaten, falls `seed.privat.ts` existiert (sonst leer, z. B. im öffentlichen Repository). */
const privateModule = import.meta.glob<{ STARTDATEN: StartDaten }>('./seed.privat.ts', { eager: true })
export const LOKALE_STARTDATEN: StartDaten = Object.values(privateModule)[0]?.STARTDATEN ?? LEERE_STARTDATEN

const DESIGNREGELN: Array<{ titel: string; beschreibung: string }> = [
  { titel: 'Wortmarke', beschreibung: 'Wortmarke „PIKARTZ.AI“; „.AI“ in Blau #2F5CFF' },
  { titel: 'Farben', beschreibung: 'Blau #2F5CFF, Dunkel #0A0A0B, Grau #4E525C' },
  {
    titel: 'Schrift',
    beschreibung: 'Liberation Sans – Bold für Überschriften, Zahlen und Labels, Regular für Fließtext',
  },
  { titel: 'Flächen', beschreibung: 'Helle, ruhige Arbeitsflächen, klare dunkle Bereiche, gezielte blaue Akzente' },
  { titel: 'Abstände und Typografie', beschreibung: 'Großzügige Abstände, starke Typografie' },
  { titel: 'Diamantmotiv', beschreibung: 'Diamantmotiv nur sparsam einsetzen' },
  {
    titel: 'Logo-Dateien',
    beschreibung: 'Logo-Dateien unverändert verwenden; fehlt ein Asset, erscheint ein dezenter Platzhalter',
  },
]

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/** @param start Persönliche Startdaten; Standard: lokale Datei `seed.privat.ts`. */
export function createSeedData(now: Date = new Date(), start: StartDaten = LOKALE_STARTDATEN): AppData {
  const zeit = now.toISOString()
  const meta = { erstelltAm: zeit, geaendertAm: zeit }
  const quellen = start.projekte

  const projekte: Projekt[] = quellen.map(({ projekt }) => ({
    beschreibung: '',
    tools: [],
    bestandteile: [],
    notizen: '',
    automation: null,
    ...projekt,
    ...meta,
  }))

  const aufgaben: Aufgabe[] = quellen.flatMap(({ projekt, offen = [], erledigt = [] }) => {
    const basis = projekt.id.replace('seed-projekt-', 'seed-aufgabe-')
    const aufgabe = (titel: string, index: number, istErledigt: boolean): Aufgabe => ({
      id: `${basis}-${index + 1}-${slug(titel)}`,
      titel,
      notiz: '',
      erledigt: istErledigt,
      erledigtAm: null,
      faelligAm: null,
      bezug: { art: 'projekt', id: projekt.id },
      ...meta,
    })
    return [
      ...offen.map((titel, i) => aufgabe(titel, i, false)),
      ...erledigt.map((titel, i) => aufgabe(titel, offen.length + i, true)),
    ]
  })

  return {
    ...createEmptyData(),
    projekte,
    aufgaben,
    kurse: start.kurse.map((kurs) => ({ ...kurs, ...meta })),
    designregeln: DESIGNREGELN.map((regel, index) => ({
      id: `seed-designregel-${index + 1}`,
      reihenfolge: index + 1,
      ...regel,
      ...meta,
    })),
    decks: [
      {
        id: 'seed-deck-modul-1-tag-1',
        titel: 'Demo-Deck Modul 1, Tag 1',
        modul: 1,
        tag: 1,
        beschreibung: '',
        ...meta,
      },
    ],
    zielrollen: start.zielrollen.map((titel, index) => ({
      id: `seed-zielrolle-${index + 1}`,
      titel,
      notiz: '',
      ...meta,
    })),
    einstellungen: { anzeigename: start.anzeigename },
  }
}
