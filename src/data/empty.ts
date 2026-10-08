import type { AppData } from '../domain/types.ts'
import { SCHEMA_VERSION } from './schema.ts'

export function createEmptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    projekte: [],
    aufgaben: [],
    termine: [],
    kurse: [],
    kursAufgaben: [],
    designregeln: [],
    decks: [],
    unternehmen: [],
    kontakte: [],
    interaktionen: [],
    leads: [],
    zielrollen: [],
    bewerbungen: [],
    vorlagen: [],
    wissen: [],
    werkzeug: [],
    mails: [],
    kiProtokoll: [],
    dokumente: [],
    aktivitaeten: [],
    einstellungen: { anzeigename: '', letzteSicherungAm: null, letzterMailAbrufAm: null },
  }
}
