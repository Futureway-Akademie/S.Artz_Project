import type { AppData, AutomationProfil, Projekt } from '../domain/types.ts'
import { createEmptyData } from './empty.ts'

/**
 * Ausgangsdaten beim ersten Start und nach „Zurücksetzen“.
 *
 * Enthält ausschließlich Inhalte aus docs/sources/arbeitskontext.md. Alles, was dort
 * als [offen] markiert ist, bleibt leer. Es gibt bewusst keine Fristen, Termine,
 * Kontakte, Bewerbungen, Aktivitäten oder Fortschrittswerte.
 */

const leeresProfil = (plattform: AutomationProfil['plattform']): AutomationProfil => ({
  plattform,
  modell: null,
  promptVersion: null,
  schwelleProzent: null,
  statuswerte: [],
  datenquellen: [],
  pipeline: [],
  routing: [],
  routingStatus: null,
  logikHinweise: [],
  verbindung: 'nicht_verbunden',
})

type ProjektDaten = Omit<Projekt, 'erstelltAm' | 'geaendertAm'>

const projekt = (daten: Partial<ProjektDaten> & Pick<ProjektDaten, 'id' | 'titel'>): ProjektDaten => ({
  beschreibung: '',
  status: null,
  tools: [],
  bestandteile: [],
  notizen: '',
  automation: null,
  ...daten,
})

const PROJEKTE: ProjektDaten[] = [
  projekt({
    id: 'seed-projekt-kontaktformular-klassifikator',
    titel: 'n8n Kontaktformular-Klassifikator',
    tools: ['n8n'],
    automation: {
      ...leeresProfil('n8n'),
      routingStatus: 'geplant',
      logikHinweise: ['Routing geplant, noch nicht umgesetzt: Der Switch-Node ist noch offen.'],
    },
  }),
  projekt({
    id: 'seed-projekt-jobsuche-assistent',
    titel: 'n8n Jobsuche-Assistent',
    tools: ['n8n'],
    automation: leeresProfil('n8n'),
  }),
  projekt({
    id: 'seed-projekt-make-kontaktformular',
    titel: 'Make.com Kontaktformular-Workflow',
    status: 'in_arbeit',
    tools: ['Make.com'],
    notizen: 'Kern-Pipeline fertig',
    automation: leeresProfil('make'),
  }),
  projekt({
    id: 'seed-projekt-weiterbildungs-tagebuch',
    titel: 'Digitales Weiterbildungs-Tagebuch',
  }),
  projekt({
    id: 'seed-projekt-praesentations-system',
    titel: 'PIKARTZ.AI Präsentations-System',
    bestandteile: ['Designregeln', 'Demo-Deck Modul 1, Tag 1'],
  }),
]

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

const ZIELROLLEN = [
  'Prompt Engineer',
  'KI-Anwendungsspezialist',
  'Grafikdesigner mit Social-Media- oder E-Commerce-Fokus',
]

export function createSeedData(now: Date = new Date()): AppData {
  const zeit = now.toISOString()
  const meta = { erstelltAm: zeit, geaendertAm: zeit }

  return {
    ...createEmptyData(),
    projekte: PROJEKTE.map((p) => ({ ...p, ...meta })),
    kurse: [
      {
        id: 'seed-kurs-ki-automations-spezialist',
        titel: 'KI Automations Spezialist',
        anbieter: '',
        startMonat: '2026-08',
        endeMonat: '2026-12',
        startDatum: null,
        endeDatum: null,
        arbeitstage: [1, 2, 3, 4, 5],
        codePraefix: 'KIAutomSpez',
        ...meta,
      },
    ],
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
    zielrollen: ZIELROLLEN.map((titel, index) => ({
      id: `seed-zielrolle-${index + 1}`,
      titel,
      notiz: '',
      ...meta,
    })),
    einstellungen: { anzeigename: 'Sascha' },
  }
}
