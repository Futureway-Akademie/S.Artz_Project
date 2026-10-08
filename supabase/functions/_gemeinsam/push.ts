/**
 * Erinnerungen per Push – bewusst ohne Inhalte: Der Server kennt die (verschlüsselten) Daten nicht.
 * Reine Logik ohne Deno-APIs, daher auch in den App-Tests prüfbar.
 */

export const ERINNERUNG = {
  titel: 'PIKARTZ.AI Arbeitscockpit',
  text: 'Guten Morgen! Schau, was heute ansteht.',
} as const

export interface PushAbo {
  endpoint: string
  stunde: number
  letzter_versand: string | null
}

/** Datum und Stunde in Berlin */
export function berlinJetzt(jetzt: Date): { datum: string; stunde: number } {
  const teile = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(jetzt)
  const t = (typ: string) => teile.find((x) => x.type === typ)!.value
  return { datum: `${t('year')}-${t('month')}-${t('day')}`, stunde: Number(t('hour')) }
}

/** Abos, die jetzt dran sind: gewählte Stunde erreicht und heute noch nichts verschickt */
export function faelligeAbos<T extends PushAbo>(abos: readonly T[], jetzt: Date): T[] {
  const { datum, stunde } = berlinJetzt(jetzt)
  return abos.filter((a) => a.stunde <= stunde && (a.letzter_versand ?? '') < datum)
}
