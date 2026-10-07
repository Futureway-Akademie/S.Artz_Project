/**
 * Datums-Hilfen. Kalenderdaten sind `YYYY-MM-DD` und werden lokal interpretiert.
 * `now` wird immer übergeben, damit Logik testbar bleibt und das Gerätedatum gilt.
 */

const LOCALE = 'de-DE'

export function parseDatum(datum: string): Date {
  const [jahr, monat, tag] = datum.split('-').map(Number) as [number, number, number]
  return new Date(jahr, monat - 1, tag)
}

export function toDatum(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function heute(now: Date): string {
  return toDatum(now)
}

/** Ganze Kalendertage von `von` bis `bis` (negativ, wenn `bis` davor liegt). */
export function tageZwischen(von: string, bis: string): number {
  const a = parseDatum(von)
  const b = parseDatum(bis)
  // UTC-Differenz vermeidet Sprünge durch Sommerzeit
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  )
}

export function plusTage(datum: string, tage: number): string {
  const d = parseDatum(datum)
  d.setDate(d.getDate() + tage)
  return toDatum(d)
}

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag */
export function isoWochentag(datum: string): number {
  const tag = parseDatum(datum).getDay()
  return tag === 0 ? 7 : tag
}

export function isWorkday(datum: string, arbeitstage: number[] = [1, 2, 3, 4, 5]): boolean {
  return arbeitstage.includes(isoWochentag(datum))
}

/** Arbeitstage im Bereich [von, bis] einschließlich beider Grenzen (ohne Feiertage). */
export function countWorkdays(von: string, bis: string, arbeitstage: number[] = [1, 2, 3, 4, 5]): number {
  if (tageZwischen(von, bis) < 0) return 0
  let anzahl = 0
  for (let d = von; tageZwischen(d, bis) >= 0; d = plusTage(d, 1)) {
    if (isWorkday(d, arbeitstage)) anzahl++
  }
  return anzahl
}

export function nextWorkday(datum: string, arbeitstage: number[] = [1, 2, 3, 4, 5]): string {
  let d = plusTage(datum, 1)
  for (let i = 0; i < 14 && !isWorkday(d, arbeitstage); i++) d = plusTage(d, 1)
  return d
}

/** Erster und letzter Tag eines Monats `YYYY-MM`. */
export function monatsGrenzen(monat: string): { erster: string; letzter: string } {
  const [jahr, m] = monat.split('-').map(Number) as [number, number]
  return { erster: toDatum(new Date(jahr, m - 1, 1)), letzter: toDatum(new Date(jahr, m, 0)) }
}

export type FristStatus = 'ohne' | 'ueberfaellig' | 'heute' | 'bald' | 'spaeter'

export function fristStatus(faelligAm: string | null, now: Date, baldTage = 7): FristStatus {
  if (!faelligAm) return 'ohne'
  const diff = tageZwischen(heute(now), faelligAm)
  if (diff < 0) return 'ueberfaellig'
  if (diff === 0) return 'heute'
  if (diff <= baldTage) return 'bald'
  return 'spaeter'
}

/** z. B. „Noch keine Frist hinterlegt“, „Überfällig seit 3 Tagen“, „Heute fällig“, „Fällig in 2 Tagen“. */
export function relativeDueLabel(faelligAm: string | null, now: Date): string {
  if (!faelligAm) return 'Noch keine Frist hinterlegt'
  const diff = tageZwischen(heute(now), faelligAm)
  if (diff < -1) return `Überfällig seit ${-diff} Tagen`
  if (diff === -1) return 'Überfällig seit gestern'
  if (diff === 0) return 'Heute fällig'
  if (diff === 1) return 'Morgen fällig'
  if (diff <= 7) return `Fällig in ${diff} Tagen`
  return `Fällig am ${formatDatum(faelligAm)}`
}

export function formatDatum(datum: string, stil: 'kurz' | 'lang' = 'kurz'): string {
  const optionen: Intl.DateTimeFormatOptions =
    stil === 'lang'
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }
  return new Intl.DateTimeFormat(LOCALE, optionen).format(parseDatum(datum))
}

export function formatMonat(monat: string): string {
  return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(parseDatum(`${monat}-01`))
}

export function formatZeitpunkt(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  )
}

/** Sortierschlüssel: überfällig/mit Frist nach Datum, ohne Frist zuletzt. */
export function nachFrist<T extends { faelligAm: string | null }>(a: T, b: T): number {
  if (a.faelligAm === b.faelligAm) return 0
  if (!a.faelligAm) return 1
  if (!b.faelligAm) return -1
  return a.faelligAm < b.faelligAm ? -1 : 1
}
