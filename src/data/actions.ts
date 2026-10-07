import type { Aenderung, AppData, Einstellungen, Neu, Sammlung } from '../domain/types.ts'

export type Action =
  | { [S in Sammlung]: { type: 'anlegen'; sammlung: S; daten: Neu<S>; /** optional vorgegebene ID, sonst erzeugt */ id?: string } }[Sammlung]
  | { [S in Sammlung]: { type: 'aendern'; sammlung: S; id: string; aenderung: Aenderung<S> } }[Sammlung]
  | { type: 'loeschen'; sammlung: Sammlung; id: string }
  | { type: 'einstellungen'; aenderung: Partial<Einstellungen> }
  /** Ersetzt alle Daten (Import, Zurücksetzen). Erzeugt keine Aktivität. */
  | { type: 'ersetzen'; daten: AppData }

/** Wird vom Store pro Dispatch gesetzt, damit der Reducer rein bleibt. */
export interface ActionMeta {
  now: Date
  newId: () => string
}
