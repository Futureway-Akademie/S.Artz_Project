import type { z } from 'zod'
import type {
  aktivitaetSchema,
  appDataSchema,
  aufgabeSchema,
  automationProfilSchema,
  bewerbungSchema,
  bezugSchema,
  deckSchema,
  designregelSchema,
  einstellungenSchema,
  interaktionSchema,
  kontaktSchema,
  kursAufgabeSchema,
  kursSchema,
  leadSchema,
  naechsteAktionSchema,
  projektSchema,
  routingRegelSchema,
  sammlungen,
  terminSchema,
  unternehmenSchema,
  zielrolleSchema,
} from '../data/schema.ts'

export type Bezug = z.infer<typeof bezugSchema>
export type RoutingRegel = z.infer<typeof routingRegelSchema>
export type AutomationProfil = z.infer<typeof automationProfilSchema>
export type Projekt = z.infer<typeof projektSchema>
export type ProjektStatus = NonNullable<Projekt['status']>
export type Aufgabe = z.infer<typeof aufgabeSchema>
export type Termin = z.infer<typeof terminSchema>
export type Kurs = z.infer<typeof kursSchema>
export type KursAufgabe = z.infer<typeof kursAufgabeSchema>
export type Designregel = z.infer<typeof designregelSchema>
export type Deck = z.infer<typeof deckSchema>
export type Unternehmen = z.infer<typeof unternehmenSchema>
export type NaechsteAktion = z.infer<typeof naechsteAktionSchema>
export type Kontakt = z.infer<typeof kontaktSchema>
export type Interaktion = z.infer<typeof interaktionSchema>
export type Lead = z.infer<typeof leadSchema>
export type Zielrolle = z.infer<typeof zielrolleSchema>
export type Bewerbung = z.infer<typeof bewerbungSchema>
export type Aktivitaet = z.infer<typeof aktivitaetSchema>
export type Einstellungen = z.infer<typeof einstellungenSchema>
export type AppData = z.infer<typeof appDataSchema>

export type Sammlung = (typeof sammlungen)[number]

/** Eintragstyp einer Sammlung, z. B. `Eintrag<'projekte'>` = `Projekt`. */
export type Eintrag<S extends Sammlung> = AppData[S][number]

/** Felder, die beim Anlegen vom Store gesetzt werden. */
export type MetaFelder = 'id' | 'erstelltAm' | 'geaendertAm'
export type Neu<S extends Sammlung> = Omit<Eintrag<S>, MetaFelder>
export type Aenderung<S extends Sammlung> = Partial<Neu<S>>
