import { parseDatum, plusTage, toDatum } from '../dates.ts'
import type { AppData, Werkzeug } from '../types.ts'

export type Abo = NonNullable<Werkzeug['abo']>

export const ABO_INTERVALL: Record<Abo['intervall'], string> = {
  monatlich: 'Monatlich',
  jaehrlich: 'Jährlich',
  nutzung: 'Nach Nutzung (Ø pro Monat)',
  kostenlos: 'Kostenlos',
}

/** Laufende Abos: aktiv oder in Arbeit, nicht geplant oder archiviert (gekündigt). */
export const laeuft = (w: Werkzeug) => w.abo !== null && (w.status === 'aktiv' || w.status === 'in_arbeit')

/** Kosten pro Monat; `null`, wenn kein Betrag eingetragen ist. */
export function monatsKosten(abo: Abo): number | null {
  if (abo.intervall === 'kostenlos') return 0
  if (abo.kostenEur === null) return null
  return abo.intervall === 'jaehrlich' ? abo.kostenEur / 12 : abo.kostenEur
}

export interface AboUebersicht {
  /** Summe pro Monat aller laufenden Abos mit Betrag */
  summe: number
  anzahl: number
  /** Laufende Abos ohne eingetragenen Betrag (nicht in der Summe) */
  ohneBetrag: number
  jeAbo: Array<{ id: string; titel: string; monat: number }>
}

export function aboUebersicht(data: AppData): AboUebersicht {
  const laufend = data.werkzeug.filter(laeuft)
  const jeAbo = laufend
    .map((w) => ({ id: w.id, titel: w.titel, monat: monatsKosten(w.abo!) }))
    .filter((a): a is { id: string; titel: string; monat: number } => a.monat !== null)
    .sort((a, b) => b.monat - a.monat || a.titel.localeCompare(b.titel, 'de'))
  return {
    summe: Math.round(jeAbo.reduce((s, a) => s + a.monat, 0) * 100) / 100,
    anzahl: laufend.length,
    ohneBetrag: laufend.length - jeAbo.length,
    jeAbo,
  }
}

/** Datum plus Monate; am Monatsende auf den letzten Tag begrenzt (31.01. + 1 Monat = 28./29.02.). */
export function plusMonate(datum: string, monate: number): string {
  const d = parseDatum(datum)
  const tag = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + monate)
  const letzter = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(tag, letzter))
  return toDatum(d)
}

const schritt = (abo: Abo) => (abo.intervall === 'jaehrlich' ? 12 : 1)

/** Verlängerungstermine zwischen `von` und `bis`, ausgehend vom eingetragenen nächsten Termin. */
export function verlaengerungen(abo: Abo, von: string, bis: string): string[] {
  if (!abo.naechsteVerlaengerung || abo.intervall === 'kostenlos') return []
  const termine: string[] = []
  let n = 0
  let d = abo.naechsteVerlaengerung
  while (d <= bis && n < 600) {
    if (d >= von) termine.push(d)
    n++
    d = plusMonate(abo.naechsteVerlaengerung, n * schritt(abo))
  }
  return termine
}

/** Nächste Verlängerung ab heute (fortgeschrieben, falls der eingetragene Termin vorbei ist). */
export function naechsteVerlaengerung(abo: Abo, heute: string): string | null {
  return verlaengerungen(abo, heute, plusMonate(heute, 13))[0] ?? null
}

/** Letzter Tag, an dem noch gekündigt werden kann */
export function kuendigenBis(verlaengerung: string, abo: Abo): string | null {
  return abo.kuendigungsfristTage === null ? null : plusTage(verlaengerung, -abo.kuendigungsfristTage)
}

export interface AboTermin {
  art: 'kuendigung' | 'verlaengerung'
  datum: string
  werkzeug: Werkzeug
  /** Zugehörige Verlängerung */
  verlaengerung: string
}

/** Verlängerungen und Kündigungsfristen laufender Abos im Zeitraum */
export function aboTermine(data: AppData, von: string, bis: string): AboTermin[] {
  const termine: AboTermin[] = []
  for (const w of data.werkzeug.filter(laeuft)) {
    const abo = w.abo!
    const vorlauf = abo.kuendigungsfristTage ?? 0
    for (const v of verlaengerungen(abo, von, plusTage(bis, vorlauf))) {
      if (v <= bis) termine.push({ art: 'verlaengerung', datum: v, werkzeug: w, verlaengerung: v })
      const k = kuendigenBis(v, abo)
      if (k && k >= von && k <= bis) termine.push({ art: 'kuendigung', datum: k, werkzeug: w, verlaengerung: v })
    }
  }
  return termine.sort((a, b) => a.datum.localeCompare(b.datum) || a.werkzeug.titel.localeCompare(b.werkzeug.titel, 'de'))
}
