import type { Aenderung, AppData, Einstellungen, Neu, Sammlung } from '../domain/types.ts'

export type Action =
  | { [S in Sammlung]: { type: 'anlegen'; sammlung: S; daten: Neu<S>; /** optional vorgegebene ID, sonst erzeugt */ id?: string } }[Sammlung]
  | { [S in Sammlung]: { type: 'aendern'; sammlung: S; id: string; aenderung: Aenderung<S> } }[Sammlung]
  | { type: 'loeschen'; sammlung: Sammlung; id: string }
  | { type: 'einstellungen'; aenderung: Partial<Einstellungen> }
  /** Ergebnis eines Mailabrufs: neue Mails auf einmal, eine Aktivität, Abrufzeitpunkt merken */
  | { type: 'mailsAbgerufen'; mails: Array<Neu<'mails'>>; abrufAm: string }
  /** Mail in den Verlauf übernehmen; optional zuvor einen Kontakt anlegen. Inhalt der Mail wird danach entfernt. */
  | { type: 'mailUebernehmen'; mailId: string; kontaktId: string; bewerbungId: string | null; neuerKontakt?: Neu<'kontakte'> }
  /** Ersetzt alle Daten (Import, Zurücksetzen). Erzeugt keine Aktivität. */
  | { type: 'ersetzen'; daten: AppData }

/** Wird vom Store pro Dispatch gesetzt, damit der Reducer rein bleibt. */
export interface ActionMeta {
  now: Date
  newId: () => string
}
