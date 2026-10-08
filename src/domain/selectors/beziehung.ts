import { heute, tageZwischen } from '../dates.ts'
import type { AppData, Kontakt } from '../types.ts'

/** Ab so vielen Tagen ohne Verlaufseintrag gilt ein Kontakt als „Funkstille“. */
export const FUNKSTILLE_NACH_TAGEN = 60

/** Datum des letzten Verlaufseintrags (Telefonat, E-Mail, Treffen …) oder `null`. */
export function letzterKontakt(data: AppData, kontaktId: string): string | null {
  let letztes: string | null = null
  for (const i of data.interaktionen) if (i.kontaktId === kontaktId && (letztes === null || i.datum > letztes)) letztes = i.datum
  return letztes
}

export interface Kontaktpflege {
  /** Letzter Verlaufseintrag */
  letzter: string | null
  /** Tage seit dem letzten Verlaufseintrag bzw. seit dem Anlegen */
  tage: number
  funkstille: boolean
}

export function kontaktpflege(data: AppData, kontakt: Kontakt, now: Date): Kontaktpflege {
  const letzter = letzterKontakt(data, kontakt.id)
  const tage = Math.max(0, tageZwischen(letzter ?? kontakt.erstelltAm.slice(0, 10), heute(now)))
  return { letzter, tage, funkstille: tage >= FUNKSTILLE_NACH_TAGEN }
}

/** „heute“, „gestern“, „vor 12 Tagen“ */
export function vorTagen(tage: number): string {
  if (tage === 0) return 'heute'
  if (tage === 1) return 'gestern'
  return `vor ${tage} Tagen`
}
