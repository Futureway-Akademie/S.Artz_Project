import { heute, nachFrist } from '../dates.ts'
import type { AppData, Bewerbung, Kontakt, Lead, Unternehmen } from '../types.ts'

export interface KontaktFilter {
  suche: string
  /** `alle` oder ein Kontext */
  kontext: Kontakt['kontext'] | 'alle'
  /** Nur Kontakte mit heute fälliger oder überfälliger nächster Aktion */
  nurFaellig: boolean
}

export const LEERER_KONTAKT_FILTER: KontaktFilter = { suche: '', kontext: 'alle', nurFaellig: false }

export function unternehmenName(data: AppData, id: string | null): string | null {
  return id ? (data.unternehmen.find((u) => u.id === id)?.name ?? null) : null
}

export function istAktionFaellig(kontakt: Kontakt, now: Date): boolean {
  const f = kontakt.naechsteAktion?.faelligAm
  return Boolean(f && f <= heute(now))
}

/** Gefilterte Kontakte: zuerst die mit nächster Aktion (nach Frist), dann alphabetisch. */
export function kontaktListe(data: AppData, filter: KontaktFilter, now: Date): Kontakt[] {
  const suche = filter.suche.trim().toLowerCase()
  return data.kontakte
    .filter((k) => filter.kontext === 'alle' || k.kontext === filter.kontext)
    .filter((k) => !filter.nurFaellig || istAktionFaellig(k, now))
    .filter(
      (k) =>
        !suche ||
        [k.name, k.rolle, k.email, k.herkunft, k.notiz, unternehmenName(data, k.unternehmenId) ?? '', k.naechsteAktion?.text ?? '']
          .join(' ')
          .toLowerCase()
          .includes(suche),
    )
    .sort((a, b) => {
      const aktionA = a.naechsteAktion ? 0 : 1
      const aktionB = b.naechsteAktion ? 0 : 1
      if (aktionA !== aktionB) return aktionA - aktionB
      if (a.naechsteAktion && b.naechsteAktion) {
        const n = nachFrist(a.naechsteAktion, b.naechsteAktion)
        if (n) return n
      }
      return a.name.localeCompare(b.name, 'de')
    })
}

export interface UnternehmenVerknuepfungen {
  kontakte: Kontakt[]
  bewerbungen: Bewerbung[]
  leads: Lead[]
}

export function unternehmenVerknuepfungen(data: AppData, id: string): UnternehmenVerknuepfungen {
  return {
    kontakte: data.kontakte.filter((k) => k.unternehmenId === id).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    bewerbungen: data.bewerbungen.filter((b) => b.unternehmenId === id),
    leads: data.leads.filter((l) => l.unternehmenId === id),
  }
}

export function unternehmenListe(data: AppData, suche: string): Array<{ unternehmen: Unternehmen } & UnternehmenVerknuepfungen> {
  const s = suche.trim().toLowerCase()
  return data.unternehmen
    .filter((u) => !s || `${u.name} ${u.branche} ${u.notiz}`.toLowerCase().includes(s))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map((unternehmen) => ({ unternehmen, ...unternehmenVerknuepfungen(data, unternehmen.id) }))
}
