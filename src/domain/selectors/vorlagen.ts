import { formatDatum } from '../dates.ts'
import type { AppData, Kontakt } from '../types.ts'

/** Platzhalter, die in Betreff und Text einer Vorlage ersetzt werden. */
export const PLATZHALTER: Array<{ name: string; beschreibung: string }> = [
  { name: 'name', beschreibung: 'Name des Kontakts' },
  { name: 'vorname', beschreibung: 'Erstes Wort des Namens' },
  { name: 'unternehmen', beschreibung: 'Unternehmen (des Kontakts oder der Bewerbung)' },
  { name: 'stelle', beschreibung: 'Stelle der gewählten Bewerbung' },
  { name: 'absender', beschreibung: 'Dein Anzeigename' },
  { name: 'datum', beschreibung: 'Heutiges Datum' },
]

export type PlatzhalterWerte = Record<string, string>

export function platzhalterWerte(data: AppData, kontakt: Kontakt, opts: { bewerbungId?: string | null; heute: string }): PlatzhalterWerte {
  const bewerbung = data.bewerbungen.find((b) => b.id === opts.bewerbungId)
  const firmaId = bewerbung?.unternehmenId ?? kontakt.unternehmenId
  return {
    name: kontakt.name,
    vorname: kontakt.name.trim().split(/\s+/)[0] ?? '',
    unternehmen: data.unternehmen.find((u) => u.id === firmaId)?.name ?? '',
    stelle: bewerbung?.stelle ?? '',
    absender: data.einstellungen.anzeigename,
    datum: formatDatum(opts.heute, 'lang'),
  }
}

/** Ersetzt `{{platzhalter}}` (Groß-/Kleinschreibung egal); unbekannte oder leere bleiben sichtbar stehen. */
export function fuelle(text: string, werte: PlatzhalterWerte): string {
  return text.replace(/\{\{\s*([a-zäöüß]+)\s*\}\}/gi, (ganz, name: string) => {
    const wert = werte[name.toLowerCase()]
    return wert ? wert : ganz
  })
}

/** Platzhalter, die nach dem Füllen noch offen sind (z. B. {{stelle}} ohne gewählte Bewerbung). */
export function offenePlatzhalter(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*([a-zäöüß]+)\s*\}\}/gi)].map((m) => m[1]!.toLowerCase()))]
}

/** mailto-Link: öffnet einen Entwurf im eigenen Mailprogramm, die App versendet nichts. */
export function mailtoLink(email: string, betreff: string, text: string): string {
  const parameter = [betreff && `subject=${encodeURIComponent(betreff)}`, text && `body=${encodeURIComponent(text.replace(/\r?\n/g, '\r\n'))}`].filter(Boolean).join('&')
  return `mailto:${encodeURIComponent(email.trim()).replace(/%40/g, '@')}${parameter ? `?${parameter}` : ''}`
}

/** Manche Mailprogramme schneiden sehr lange mailto-Links ab. */
export const MAILTO_MAX = 1800
