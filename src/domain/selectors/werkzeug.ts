import { werkzeugTypen } from '../../data/schema.ts'
import type { IconName } from '../../components/ui/Icon.tsx'
import type { AppData, Schritt, Werkzeug, WerkzeugTyp } from '../types.ts'
import { hatSchlagwort } from './schlagworte.ts'

export interface WerkzeugTypInfo {
  /** Teil der Adresse, z. B. /werkzeug/prompts */
  slug: string
  einzahl: string
  mehrzahl: string
  /** Kurzlabel für die Icon-Leiste */
  kurz: string
  icon: IconName
  hinweis: string
  plattform: { label: string; hinweis: string }
  inhalt: { label: string; hinweis: string }
  /** Auslöser bzw. Einsatzfall, falls der Typ einen hat */
  ausloeser?: { label: string; hinweis: string }
  /** Schritte; `abhaken` = Checkliste mit Fortschritt */
  schritte?: { hinweis: string; abhaken: boolean }
  /** Startstatus beim Anlegen */
  status: Werkzeug['status']
}

export const WERKZEUG_TYP: Record<WerkzeugTyp, WerkzeugTypInfo> = {
  prompt: {
    slug: 'prompts',
    einzahl: 'Masterprompt',
    mehrzahl: 'Masterprompts',
    kurz: 'Prompts',
    icon: 'prompt',
    hinweis: 'Bewährte Prompts zu wiederkehrenden Aufgaben – mit Platzhaltern zum Ausfüllen.',
    plattform: { label: 'Zielmodell', hinweis: 'z. B. Claude, GPT, Gemini' },
    inhalt: { label: 'Prompt', hinweis: 'Platzhalter in doppelte geschweifte Klammern setzen, z. B. {{thema}}.' },
    status: 'aktiv',
  },
  befehl: {
    slug: 'befehle',
    einzahl: 'Befehl',
    mehrzahl: 'Befehle',
    kurz: 'Befehle',
    icon: 'befehl',
    hinweis: 'Befehle für Terminal, Claude Code, Git und Co. – schnell kopiert.',
    plattform: { label: 'Umgebung', hinweis: 'z. B. Terminal, Claude Code, Git, PowerShell' },
    inhalt: { label: 'Befehl', hinweis: 'Genau so, wie er eingegeben wird. Platzhalter mit {{name}}.' },
    status: 'aktiv',
  },
  agent: {
    slug: 'agenten',
    einzahl: 'Agent',
    mehrzahl: 'Agenten',
    kurz: 'Agenten',
    icon: 'agent',
    hinweis: 'Deine KI-Agenten mit Rolle, Systemprompt und Werkzeugen.',
    plattform: { label: 'Plattform', hinweis: 'z. B. Claude Code, Claude Projects, n8n' },
    inhalt: { label: 'Systemprompt', hinweis: 'Rolle, Ziel, Regeln und Ausgabeformat des Agenten.' },
    ausloeser: { label: 'Einsatzfall', hinweis: 'Wann setzt du den Agenten ein?' },
    status: 'geplant',
  },
  skill: {
    slug: 'skills',
    einzahl: 'Skill',
    mehrzahl: 'Skills',
    kurz: 'Skills',
    icon: 'skill',
    hinweis: 'Wiederverwendbare Fähigkeiten, z. B. Claude-Skills oder Slash-Befehle.',
    plattform: { label: 'Plattform', hinweis: 'z. B. Claude Code, Claude.ai' },
    inhalt: { label: 'Anweisungen', hinweis: 'Was der Skill tut und wann er greift.' },
    ausloeser: { label: 'Auslöser', hinweis: 'z. B. Slash-Befehl /review oder Stichwort' },
    status: 'aktiv',
  },
  anleitung: {
    slug: 'anleitungen',
    einzahl: 'Anleitung',
    mehrzahl: 'Anleitungen',
    kurz: 'Anleit.',
    icon: 'anleitung',
    hinweis: 'Pläne zum Installieren oder Implementieren von Apps, MCP-Servern und APIs.',
    plattform: { label: 'Für', hinweis: 'z. B. MCP-Server, API, App, Supabase' },
    inhalt: { label: 'Notizen', hinweis: 'Voraussetzungen, Stolperfallen, Ergebnis.' },
    schritte: { hinweis: 'Ein Schritt je Zeile – später einzeln abhaken.', abhaken: true },
    status: 'geplant',
  },
  integration: {
    slug: 'integrationen',
    einzahl: 'Integration',
    mehrzahl: 'Integrationen',
    kurz: 'Integr.',
    icon: 'integration',
    hinweis: 'MCP-Server, APIs und Apps mit Status und Datenschutz – Schlüssel bleiben im Passwortmanager.',
    plattform: { label: 'Anbieter', hinweis: 'z. B. Anthropic, Google, Supabase' },
    inhalt: { label: 'Notizen', hinweis: 'Wofür, Grenzen, Erfahrungen. Keine Schlüssel oder Passwörter!' },
    status: 'geplant',
  },
  workflow: {
    slug: 'workflows',
    einzahl: 'Workflow',
    mehrzahl: 'Workflows',
    kurz: 'Workfl.',
    icon: 'workflow',
    hinweis: 'Automatisierte Abläufe, z. B. in n8n oder Make.',
    plattform: { label: 'Plattform', hinweis: 'z. B. n8n, Make, Zapier' },
    inhalt: { label: 'Notizen', hinweis: 'Ablauf, Export-Ort, Besonderheiten.' },
    ausloeser: { label: 'Auslöser', hinweis: 'z. B. Webhook, Zeitplan, neue Mail' },
    schritte: { hinweis: 'Ein Schritt (Knoten) je Zeile.', abhaken: false },
    status: 'geplant',
  },
  abo: {
    slug: 'abos',
    einzahl: 'Modell / Abo',
    mehrzahl: 'Modelle & Abos',
    kurz: 'Abos',
    icon: 'abo',
    hinweis: 'KI-Modelle und Abos mit Kosten, Verlängerung und Kündigungsfrist.',
    plattform: { label: 'Anbieter', hinweis: 'z. B. Anthropic, OpenAI, Lovable' },
    inhalt: { label: 'Notizen', hinweis: 'Tarif, Grenzen, Wofür du es nutzt.' },
    status: 'aktiv',
  },
}

export const WERKZEUG_TYPEN: readonly WerkzeugTyp[] = werkzeugTypen

export const WERKZEUG_STATUS: Record<Werkzeug['status'], string> = {
  geplant: 'Geplant',
  in_arbeit: 'In Arbeit',
  aktiv: 'Aktiv',
  archiviert: 'Archiviert',
}

export function typAusSlug(slug: string | undefined): WerkzeugTyp | undefined {
  return WERKZEUG_TYPEN.find((t) => WERKZEUG_TYP[t].slug === slug)
}

export const werkzeugLink = (w: Pick<Werkzeug, 'typ' | 'id'>) => `/werkzeug/${WERKZEUG_TYP[w.typ].slug}/${w.id}`

export interface WerkzeugFilter {
  suche: string
  status: Werkzeug['status'] | ''
  plattform: string
  schlagwort: string
}

export const LEERER_WERKZEUG_FILTER: WerkzeugFilter = { suche: '', status: '', plattform: '', schlagwort: '' }

const STATUS_REIHENFOLGE: Record<Werkzeug['status'], number> = { in_arbeit: 0, aktiv: 1, geplant: 2, archiviert: 3 }

/** Einträge eines Typs: in Arbeit, aktiv, geplant, archiviert – innerhalb alphabetisch. */
export function werkzeugListe(data: AppData, typ: WerkzeugTyp, filter: WerkzeugFilter = LEERER_WERKZEUG_FILTER): Werkzeug[] {
  const s = filter.suche.trim().toLowerCase()
  return data.werkzeug
    .filter((w) => w.typ === typ)
    .filter((w) => !filter.status || w.status === filter.status)
    .filter((w) => !filter.plattform || w.plattform.trim().toLowerCase() === filter.plattform.toLowerCase())
    .filter((w) => hatSchlagwort(w, filter.schlagwort))
    .filter((w) => !s || [w.titel, w.beschreibung, w.inhalt, w.plattform, w.version, ...w.schlagworte].join(' ').toLowerCase().includes(s))
    .sort((a, b) => STATUS_REIHENFOLGE[a.status] - STATUS_REIHENFOLGE[b.status] || a.titel.localeCompare(b.titel, 'de'))
}

/** Vorkommende Plattformen eines Typs ohne Dubletten, alphabetisch */
export function werkzeugPlattformen(data: AppData, typ?: WerkzeugTyp): string[] {
  const m = new Map<string, string>()
  for (const w of data.werkzeug) {
    const p = w.plattform.trim()
    if ((!typ || w.typ === typ) && p && !m.has(p.toLowerCase())) m.set(p.toLowerCase(), p)
  }
  return [...m.values()].sort((a, b) => a.localeCompare(b, 'de'))
}

/** Anzahl je Typ (ohne Archiviertes) */
export function werkzeugZaehler(data: AppData): Record<WerkzeugTyp, number> {
  const z = Object.fromEntries(WERKZEUG_TYPEN.map((t) => [t, 0])) as Record<WerkzeugTyp, number>
  for (const w of data.werkzeug) if (w.status !== 'archiviert') z[w.typ]++
  return z
}

/** Zuletzt geänderte Einträge über alle Typen */
export function zuletztGeaenderteWerkzeuge(data: AppData, anzahl = 6): Werkzeug[] {
  return [...data.werkzeug].sort((a, b) => b.geaendertAm.localeCompare(a.geaendertAm)).slice(0, anzahl)
}

/** Verknüpfte Werkzeuge in beide Richtungen: eigene Verweise und Einträge, die auf diesen verweisen. */
export function werkzeugVerknuepft(data: AppData, w: Werkzeug): Werkzeug[] {
  return data.werkzeug
    .filter((x) => x.id !== w.id && (w.werkzeugIds.includes(x.id) || x.werkzeugIds.includes(w.id)))
    .sort((a, b) => a.typ.localeCompare(b.typ) || a.titel.localeCompare(b.titel, 'de'))
}

/** Neuer, leerer Eintrag eines Typs */
export function leeresWerkzeug(typ: WerkzeugTyp): Omit<Werkzeug, 'id' | 'erstelltAm' | 'geaendertAm'> {
  return {
    typ,
    titel: '',
    beschreibung: '',
    inhalt: '',
    plattform: '',
    status: WERKZEUG_TYP[typ].status,
    version: '',
    link: '',
    ausloeser: '',
    schritte: [],
    integration: typ === 'integration' ? { art: 'mcp', schluesselOrt: '', region: '', avv: null } : null,
    abo: typ === 'abo' ? { kostenEur: null, intervall: 'monatlich', naechsteVerlaengerung: null, kuendigungsfristTage: null } : null,
    werkzeugIds: [],
    projektIds: [],
    schlagworte: [],
  }
}

const PLATZHALTER = /\{\{\s*([^{}]+?)\s*\}\}/g
const schluessel = (name: string) => name.trim().toLowerCase()

/** Platzhalter wie {{Zielgruppe}} in Reihenfolge des ersten Vorkommens, ohne Dubletten (Groß-/Kleinschreibung egal). */
export function promptPlatzhalter(text: string): string[] {
  const m = new Map<string, string>()
  for (const [, name] of text.matchAll(PLATZHALTER)) if (!m.has(schluessel(name!))) m.set(schluessel(name!), name!.trim())
  return [...m.values()]
}

/** Setzt ausgefüllte Platzhalter ein; leere bleiben als {{…}} sichtbar. */
export function promptAusfuellen(text: string, werte: Record<string, string>): string {
  const normiert = new Map(Object.entries(werte).map(([k, v]) => [schluessel(k), v]))
  return text.replace(PLATZHALTER, (ganz, name: string) => normiert.get(schluessel(name)) || ganz)
}

/** Typen, deren Inhalt kopiert und ausgefüllt wird */
export const MIT_PLATZHALTERN: readonly WerkzeugTyp[] = ['prompt', 'befehl', 'agent', 'skill']

/** Schritte aus Text (eine Zeile je Schritt); Erledigt-Status gleichlautender Schritte bleibt erhalten. */
export function schritteAusText(text: string, vorher: Schritt[] = []): Schritt[] {
  const offen = [...vorher]
  return text
    .split(/\r?\n/)
    .map((z) => z.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .map((text) => {
      const i = offen.findIndex((s) => s.text === text)
      const erledigt = i >= 0 ? offen.splice(i, 1)[0]!.erledigt : false
      return { text, erledigt }
    })
}

export function schrittFortschritt(w: Pick<Werkzeug, 'schritte'>): { erledigt: number; gesamt: number } {
  return { erledigt: w.schritte.filter((s) => s.erledigt).length, gesamt: w.schritte.length }
}
