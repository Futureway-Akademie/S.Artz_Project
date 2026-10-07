import type { AppData, Kontakt } from '../types.ts'

const normal = (s: string) => s.trim().toLocaleLowerCase('de')

/** Alle vorkommenden Schlagworte, ohne Dubletten (Groß-/Kleinschreibung egal), alphabetisch. */
export function alleSchlagworte(eintraege: Array<{ schlagworte: string[] }>): string[] {
  const gesehen = new Map<string, string>()
  for (const e of eintraege) for (const s of e.schlagworte) if (s.trim() && !gesehen.has(normal(s))) gesehen.set(normal(s), s.trim())
  return [...gesehen.values()].sort((a, b) => a.localeCompare(b, 'de'))
}

export function hatSchlagwort(eintrag: { schlagworte: string[] }, schlagwort: string): boolean {
  return !schlagwort || eintrag.schlagworte.some((s) => normal(s) === normal(schlagwort))
}

export interface Dublette {
  id: string
  name: string
  grund: 'name' | 'email'
}

/** Kontakte mit gleichem Namen oder gleicher E-Mail (ohne den Eintrag selbst). */
export function kontaktDubletten(data: AppData, werte: { name: string; email: string }, eigeneId?: string): Dublette[] {
  const name = normal(werte.name)
  const email = normal(werte.email)
  const treffer: Dublette[] = []
  for (const k of data.kontakte as Kontakt[]) {
    if (k.id === eigeneId) continue
    if (email && normal(k.email) === email) treffer.push({ id: k.id, name: k.name, grund: 'email' })
    else if (name && normal(k.name) === name) treffer.push({ id: k.id, name: k.name, grund: 'name' })
  }
  return treffer
}

/** Projekt mit gleichem Titel (ohne das Projekt selbst). */
export function projektDublette(data: AppData, titel: string, eigeneId?: string): string | null {
  const t = normal(titel)
  return t ? (data.projekte.find((p) => p.id !== eigeneId && normal(p.titel) === t)?.titel ?? null) : null
}
