import type { AppData, Wissen } from '../types.ts'
import { hatSchlagwort } from './schlagworte.ts'

export const WISSEN_TYP: Record<Wissen['typ'], { label: string; mehrzahl: string; hinweis: string }> = {
  notiz: { label: 'Notiz', mehrzahl: 'Notizen', hinweis: 'Freie Mitschrift' },
  prompt: { label: 'Prompt', mehrzahl: 'Prompts', hinweis: 'Bewährter Prompt zum Wiederverwenden' },
  tool: { label: 'Tool', mehrzahl: 'Tools', hinweis: 'Werkzeug mit Einsatzzweck und Erfahrungen' },
  erkenntnis: { label: 'Erkenntnis', mehrzahl: 'Erkenntnisse', hinweis: 'Was du gelernt hast – kurz und merkbar' },
  quelle: { label: 'Quelle', mehrzahl: 'Quellen', hinweis: 'Artikel, Video, Doku mit Zusammenfassung' },
  tagebuch: { label: 'Lerntagebuch', mehrzahl: 'Lerntagebuch', hinweis: 'Was du an einem Kurstag gelernt hast' },
}

export interface WissenFilter {
  suche: string
  typ: Wissen['typ'] | ''
  thema: string
  schlagwort: string
}

export const LEERER_WISSEN_FILTER: WissenFilter = { suche: '', typ: '', thema: '', schlagwort: '' }

/** Gefilterte Einträge, neueste zuerst (Tagebuch nach Datum, sonst nach letzter Änderung). */
export function wissenListe(data: AppData, filter: WissenFilter = LEERER_WISSEN_FILTER): Wissen[] {
  const s = filter.suche.trim().toLowerCase()
  return data.wissen
    .filter((w) => !filter.typ || w.typ === filter.typ)
    .filter((w) => !filter.thema || w.thema.toLowerCase() === filter.thema.toLowerCase())
    .filter((w) => hatSchlagwort(w, filter.schlagwort))
    .filter((w) => !s || [w.titel, w.inhalt, w.thema, w.quelle, ...w.schlagworte].join(' ').toLowerCase().includes(s))
    .sort((a, b) => (b.datum ?? b.geaendertAm.slice(0, 10)).localeCompare(a.datum ?? a.geaendertAm.slice(0, 10)) || b.geaendertAm.localeCompare(a.geaendertAm))
}

/** Alle Themen ohne Dubletten (Groß-/Kleinschreibung egal), alphabetisch */
export function wissenThemen(data: AppData): string[] {
  const m = new Map<string, string>()
  for (const w of data.wissen) if (w.thema.trim() && !m.has(w.thema.trim().toLowerCase())) m.set(w.thema.trim().toLowerCase(), w.thema.trim())
  return [...m.values()].sort((a, b) => a.localeCompare(b, 'de'))
}

/** Lerntagebuch-Eintrag eines Tages (es gibt höchstens einen je Tag) */
export function tagebuchEintrag(data: AppData, datum: string): Wissen | undefined {
  return data.wissen.find((w) => w.typ === 'tagebuch' && w.datum === datum)
}

export function letzteTagebuchEintraege(data: AppData, anzahl = 5): Wissen[] {
  return data.wissen
    .filter((w) => w.typ === 'tagebuch')
    .sort((a, b) => (b.datum ?? '').localeCompare(a.datum ?? ''))
    .slice(0, anzahl)
}

/** Anzahl je Typ für die Übersicht */
export function wissenZaehler(data: AppData): Record<Wissen['typ'], number> {
  const z = { notiz: 0, prompt: 0, tool: 0, erkenntnis: 0, quelle: 0, tagebuch: 0 }
  for (const w of data.wissen) z[w.typ]++
  return z
}
