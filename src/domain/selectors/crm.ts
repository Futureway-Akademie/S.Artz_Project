import { heute, nachFrist } from '../dates.ts'
import { kontaktpflege } from './beziehung.ts'
import { hatSchlagwort } from './schlagworte.ts'
import { kontakteMitPruefbedarf } from './datenschutz.ts'
import { BEWERBUNG_STATUS, LEAD_STATUS } from '../labels.ts'
import { bewerbungenNachStatus } from './bewerbungen.ts'
import { selectLeadSumme } from './leads.ts'
import type { AppData, Bewerbung, Kontakt, Lead, Unternehmen } from '../types.ts'

export interface KontaktFilter {
  suche: string
  /** `alle` oder ein Kontext */
  kontext: Kontakt['kontext'] | 'alle'
  /** Nur Kontakte mit heute fälliger oder überfälliger nächster Aktion */
  nurFaellig: boolean
  /** Nur Kontakte ohne Aktivität seit 12 Monaten oder ohne Rechtsgrundlage (DSGVO-Prüfung) */
  nurPruefen: boolean
  /** Nur Kontakte ohne Verlaufseintrag seit 60 Tagen */
  nurFunkstille: boolean
  /** Leer = alle */
  schlagwort: string
}

export const LEERER_KONTAKT_FILTER: KontaktFilter = { suche: '', kontext: 'alle', nurFaellig: false, nurPruefen: false, nurFunkstille: false, schlagwort: '' }

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
  const pruefen = new Set(filter.nurPruefen ? kontakteMitPruefbedarf(data, now).map((k) => k.id) : [])
  return data.kontakte
    .filter((k) => !filter.nurPruefen || pruefen.has(k.id))
    .filter((k) => !filter.nurFunkstille || kontaktpflege(data, k, now).funkstille)
    .filter((k) => hatSchlagwort(k, filter.schlagwort))
    .filter((k) => filter.kontext === 'alle' || k.kontext === filter.kontext)
    .filter((k) => !filter.nurFaellig || istAktionFaellig(k, now))
    .filter(
      (k) =>
        !suche ||
        [k.name, k.rolle, k.email, k.herkunft, k.notiz, ...k.schlagworte, unternehmenName(data, k.unternehmenId) ?? '', k.naechsteAktion?.text ?? '']
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

export function unternehmenListe(data: AppData, suche: string, schlagwort = ''): Array<{ unternehmen: Unternehmen } & UnternehmenVerknuepfungen> {
  const s = suche.trim().toLowerCase()
  return data.unternehmen
    .filter((u) => !s || `${u.name} ${u.branche} ${u.notiz} ${u.schlagworte.join(' ')}`.toLowerCase().includes(s))
    .filter((u) => hatSchlagwort(u, schlagwort))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
    .map((unternehmen) => ({ unternehmen, ...unternehmenVerknuepfungen(data, unternehmen.id) }))
}

export interface CrmUebersicht {
  /** Kontakte mit heute fälliger oder überfälliger nächster Aktion */
  faelligeWiedervorlagen: number
  laufendeBewerbungen: Array<{ status: Bewerbung['status']; anzahl: number }>
  laufendeBewerbungenGesamt: number
  offeneLeads: number
  /** Summe nur über offene Leads mit Betrag; ohne Beträge `null` */
  offeneLeadSumme: number | null
  /** Gibt es überhaupt CRM-Daten? */
  leer: boolean
}

export function selectCrmUebersicht(data: AppData, now: Date): CrmUebersicht {
  const laufend = data.bewerbungen.filter((b) => BEWERBUNG_STATUS[b.status].laufend)
  const offeneLeads = data.leads.filter((l) => LEAD_STATUS[l.status].offen)
  return {
    faelligeWiedervorlagen: data.kontakte.filter((k) => istAktionFaellig(k, now)).length,
    laufendeBewerbungen: bewerbungenNachStatus(laufend),
    laufendeBewerbungenGesamt: laufend.length,
    offeneLeads: offeneLeads.length,
    offeneLeadSumme: selectLeadSumme(offeneLeads),
    leer: data.kontakte.length === 0 && data.bewerbungen.length === 0 && data.leads.length === 0,
  }
}
