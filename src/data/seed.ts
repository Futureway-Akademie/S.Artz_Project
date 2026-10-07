import type { AppData, Aufgabe, Projekt } from '../domain/types.ts'
import { createEmptyData } from './empty.ts'

/**
 * Ausgangsdaten beim ersten Start und nach „Zurücksetzen“.
 *
 * Quelle: Saschas Projekt-Übersicht (Stand 2026-10-07), zusammengefasst in
 * docs/sources/arbeitskontext.md, plus Designregeln und Zielrollen aus dem Projektbrief.
 *
 * Das Repository ist öffentlich. Hier stehen je Projekt nur Titel, Kategorie, Status und
 * „zuletzt aktiv“. Beschreibungen, Tools, Notizen und nächste Schritte liegen lokal in
 * `seed.privat.ts` (von Git ignoriert) und werden eingebunden, wenn die Datei existiert.
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

const PROJEKTE: ProjektKern[] = [
  { id: 'seed-projekt-diamond-world', titel: 'Diamond World (Videospiel)', kategorie: 'Privat / Kreativ', status: 'in_arbeit', zuletztAktiv: '2026-10-07' },
  { id: 'seed-projekt-portfolio-website', titel: 'PikArtz Portfolio-Website', kategorie: 'Karriere', status: 'in_arbeit', zuletztAktiv: '2026-10-01' },
  { id: 'seed-projekt-kleinanzeigen', titel: 'Kleinanzeigen / Keller-Sammlung', kategorie: 'Privat', status: 'in_arbeit', zuletztAktiv: '2026-09-18' },
  { id: 'seed-projekt-amazon-gallery', titel: 'Amazon Gallery Generator (Bud Voyage Easy-Grow-Kit)', kategorie: 'E-Commerce', status: 'in_arbeit', zuletztAktiv: '2026-09-07' },
  { id: 'seed-projekt-weiterbildungs-tagebuch', titel: 'KI-Weiterbildung: Tagebuch → Schulungsplattform', kategorie: 'Weiterbildung', status: 'in_arbeit', zuletztAktiv: '2026-09-07' },
  { id: 'seed-projekt-lebenslauf', titel: 'Lebenslauf Optimierung', kategorie: 'Karriere', status: 'abgeschlossen', zuletztAktiv: '2026-09-07' },
  { id: 'seed-projekt-karriere-booster', titel: 'Karriere Booster (LinkedIn)', kategorie: 'Karriere', status: 'in_arbeit', zuletztAktiv: '2026-09-07' },
  { id: 'seed-projekt-jobsuche', titel: 'Jobsuche Festanstellung', kategorie: 'Karriere', status: 'in_arbeit', zuletztAktiv: '2026-08-19' },
  { id: 'seed-projekt-ci-skills', titel: 'CI-Skills (ci-entwurf / ci-board)', kategorie: 'KI-Agenten', status: 'in_arbeit', zuletztAktiv: '2026-08-19' },
  { id: 'seed-projekt-datenschutz-agent', titel: 'Datenschutz-Agent (DSGVO)', kategorie: 'KI-Agenten', status: 'idee', zuletztAktiv: '2026-08-19' },
  { id: 'seed-projekt-handwerker-leadmagnet', titel: 'Handwerker-Leadmagnet (navis5)', kategorie: 'Kundenprojekt', status: 'in_arbeit', zuletztAktiv: '2026-08-19' },
  { id: 'seed-projekt-fidelio-homepage', titel: 'Fidelio-Homepage', kategorie: 'Kundenprojekt / Verein', status: 'in_arbeit', zuletztAktiv: '2026-08-19' },
]

/** Lokale Details, falls `seed.privat.ts` existiert (sonst leer, z. B. im öffentlichen Repository). */
const privateModule = import.meta.glob<{ PROJEKT_DETAILS: ProjektQuelle[] }>('./seed.privat.ts', { eager: true })
export const LOKALE_DETAILS: ProjektQuelle[] = Object.values(privateModule)[0]?.PROJEKT_DETAILS ?? []

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

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/**
 * @param details Projektdetails (Beschreibung, Tools, Notizen, nächste Schritte); Standard: lokale Datei.
 *   Der Kern (Titel, Kategorie, Status, zuletzt aktiv) kommt immer aus dem Repository.
 */
export function createSeedData(now: Date = new Date(), details: ProjektQuelle[] = LOKALE_DETAILS): AppData {
  const zeit = now.toISOString()
  const meta = { erstelltAm: zeit, geaendertAm: zeit }

  const quellen: ProjektQuelle[] = PROJEKTE.map((kern) => {
    const detail = details.find((d) => d.projekt.id === kern.id)
    return {
      projekt: {
        beschreibung: detail?.projekt.beschreibung ?? '',
        tools: detail?.projekt.tools ?? [],
        bestandteile: detail?.projekt.bestandteile ?? [],
        notizen: detail?.projekt.notizen ?? '',
        ...kern,
      },
      offen: detail?.offen,
      erledigt: detail?.erledigt,
    }
  })

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
    kurse: [
      {
        id: 'seed-kurs-ki-automations-spezialist',
        titel: 'KI Automations Spezialist',
        anbieter: 'FutureWay KI Akademie GmbH',
        beschreibung: 'Vollzeit Online-Live',
        unterrichtszeit: 'Mo–Fr 09:00–16:05',
        umfang: '800 UE',
        module: [
          'KI (Langdock, Claude, Mistral)',
          'Automatisierung (n8n, Make, Claude Code)',
          'Software (Supabase, Azure, Vercel, Hetzner)',
          'Portfolio-Projekt',
          'Zertifizierungen (Abschlusstest + Microsoft AI-901)',
          'Karriere-Coaching',
        ],
        startMonat: '2026-08',
        endeMonat: '2026-12',
        startDatum: '2026-08-03',
        endeDatum: '2026-12-18',
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
