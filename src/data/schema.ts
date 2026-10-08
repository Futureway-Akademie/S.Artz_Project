import { z } from 'zod'

/**
 * Zentrales Datenschema. Die TypeScript-Typen in src/domain/types.ts werden daraus abgeleitet.
 * Validiert gespeicherte Daten (localStorage) und JSON-Importe.
 */

export const SCHEMA_VERSION = 10

const id = z.string().min(1)
/** Kalenderdatum `YYYY-MM-DD`, lokal interpretiert. */
const datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum im Format JJJJ-MM-TT erwartet')
/** Monat `YYYY-MM`. */
const monat = z.string().regex(/^\d{4}-\d{2}$/, 'Monat im Format JJJJ-MM erwartet')
/** Zeitpunkt als ISO-8601. */
const zeitpunkt = z.iso.datetime({ offset: true })
const uhrzeit = z.string().regex(/^\d{2}:\d{2}$/, 'Uhrzeit im Format HH:MM erwartet')

const meta = {
  id,
  erstelltAm: zeitpunkt,
  geaendertAm: zeitpunkt,
}

export const bezugSchema = z.object({
  art: z.enum(['ohne', 'projekt', 'weiterbildung', 'kontakt', 'unternehmen', 'lead', 'bewerbung']),
  id: id.nullable(),
})

export const routingRegelSchema = z.object({
  bedingung: z.string(),
  ziel: z.string(),
  fallback: z.boolean(),
})

export const automationProfilSchema = z.object({
  plattform: z.enum(['n8n', 'make', 'sonstige']),
  modell: z.string().nullable(),
  promptVersion: z.string().nullable(),
  schwelleProzent: z.number().min(0).max(100).nullable(),
  statuswerte: z.array(z.string()),
  datenquellen: z.array(z.string()),
  pipeline: z.array(z.string()),
  routing: z.array(routingRegelSchema),
  /** `null`, solange zum Routing nichts belegt ist. */
  routingStatus: z.enum(['geplant', 'umgesetzt']).nullable(),
  logikHinweise: z.array(z.string()),
  verbindung: z.literal('nicht_verbunden'),
})

export const projektSchema = z.object({
  ...meta,
  titel: z.string().min(1),
  /** z. B. Karriere, Weiterbildung, Kundenprojekt; leer, wenn nicht belegt */
  kategorie: z.string(),
  beschreibung: z.string(),
  status: z.enum(['idee', 'in_arbeit', 'pausiert', 'abgeschlossen']).nullable(),
  /** Letzter bekannter Arbeitstag am Projekt */
  zuletztAktiv: datum.nullable(),
  tools: z.array(z.string()),
  bestandteile: z.array(z.string()),
  notizen: z.string(),
  automation: automationProfilSchema.nullable(),
  /** Auftraggeber (Unternehmen); Ansprechpartner sind Kontakte mit diesem Projekt in `projektIds` */
  auftraggeberId: id.nullable(),
  schlagworte: z.array(z.string()),
})

export const aufgabeSchema = z.object({
  ...meta,
  titel: z.string().min(1),
  notiz: z.string(),
  erledigt: z.boolean(),
  erledigtAm: zeitpunkt.nullable(),
  faelligAm: datum.nullable(),
  bezug: bezugSchema,
  /** Für heute im Fokus */
  fokus: z.boolean(),
})

export const terminSchema = z.object({
  ...meta,
  titel: z.string().min(1),
  datum,
  uhrzeit: uhrzeit.nullable(),
  ort: z.string(),
  notiz: z.string(),
  bezug: bezugSchema,
})

export const kursSchema = z.object({
  ...meta,
  titel: z.string().min(1),
  anbieter: z.string(),
  beschreibung: z.string(),
  /** z. B. „Mo–Fr 09:00–16:00“ */
  unterrichtszeit: z.string(),
  /** z. B. „800 UE“ */
  umfang: z.string(),
  module: z.array(z.string()),
  startMonat: monat,
  endeMonat: monat,
  /** Genaue Daten nur, wenn belegt. */
  startDatum: datum.nullable(),
  endeDatum: datum.nullable(),
  /** ISO-Wochentage, 1 = Montag … 7 = Sonntag */
  arbeitstage: z.array(z.number().int().min(1).max(7)),
  codePraefix: z.string().min(1),
})

export const kursAufgabeSchema = z.object({
  ...meta,
  kursId: id,
  code: z.string().min(1),
  titel: z.string().min(1),
  status: z.enum(['offen', 'in_arbeit', 'erledigt']),
  faelligAm: datum.nullable(),
  notiz: z.string(),
})

export const designregelSchema = z.object({
  ...meta,
  titel: z.string().min(1),
  beschreibung: z.string(),
  reihenfolge: z.number().int(),
})

export const deckSchema = z.object({
  ...meta,
  titel: z.string().min(1),
  modul: z.number().int().nullable(),
  tag: z.number().int().nullable(),
  beschreibung: z.string(),
})

export const unternehmenSchema = z.object({
  ...meta,
  name: z.string().min(1),
  branche: z.string(),
  website: z.string(),
  notiz: z.string(),
  schlagworte: z.array(z.string()),
})

export const naechsteAktionSchema = z.object({
  text: z.string().min(1),
  faelligAm: datum.nullable(),
})

export const kontaktSchema = z.object({
  ...meta,
  name: z.string().min(1),
  rolle: z.string(),
  unternehmenId: id.nullable(),
  email: z.string(),
  telefon: z.string(),
  linkedinUrl: z.string(),
  kontext: z.enum(['jobsuche', 'weiterbildung', 'pikartz', 'sonstiges']),
  herkunft: z.string(),
  notiz: z.string(),
  projektIds: z.array(id),
  naechsteAktion: naechsteAktionSchema.nullable(),
  /** DSGVO Art. 6 Abs. 1: a) Einwilligung, b) Vertrag/Anbahnung, f) berechtigtes Interesse; null = noch nicht festgelegt */
  rechtsgrundlage: z.enum(['einwilligung', 'vertrag', 'berechtigtes_interesse']).nullable(),
  /** Wozu die Daten gespeichert werden (Zweckbindung) */
  zweck: z.string(),
  schlagworte: z.array(z.string()),
})

export const interaktionSchema = z.object({
  ...meta,
  kontaktId: id,
  art: z.enum(['email', 'telefonat', 'treffen', 'nachricht', 'notiz']),
  datum,
  text: z.string().min(1),
  projektId: id.nullable(),
  bewerbungId: id.nullable(),
  leadId: id.nullable(),
  /** Nur bei E-Mails: Betreff und Richtung */
  betreff: z.string(),
  richtung: z.enum(['eingang', 'ausgang']).nullable(),
})

export const leadSchema = z.object({
  ...meta,
  titel: z.string().min(1),
  kontaktId: id.nullable(),
  unternehmenId: id.nullable(),
  status: z.enum(['neu', 'im_austausch', 'angebot', 'zusage', 'absage']),
  betragEur: z.number().min(0).nullable(),
  naechsterSchritt: z.string(),
  notiz: z.string(),
  projektId: id.nullable(),
  wiedervorlageAm: datum.nullable(),
})

export const zielrolleSchema = z.object({
  ...meta,
  titel: z.string().min(1),
  notiz: z.string(),
})

export const bewerbungSchema = z.object({
  ...meta,
  stelle: z.string().min(1),
  unternehmenId: id.nullable(),
  zielrolleId: id.nullable(),
  kontaktId: id.nullable(),
  status: z.enum(['geplant', 'beworben', 'im_gespraech', 'angebot', 'absage', 'zurueckgezogen']),
  quelle: z.string(),
  beworbenAm: datum.nullable(),
  link: z.string(),
  naechsterSchritt: z.string(),
  notiz: z.string(),
  wiedervorlageAm: datum.nullable(),
})

/** E-Mail-Vorlage mit Platzhaltern wie {{name}} */
export const vorlageSchema = z.object({
  ...meta,
  titel: z.string().min(1),
  betreff: z.string(),
  text: z.string(),
})

/** Zweites Gehirn: Wissen zu KI und Weiterbildung */
export const wissenSchema = z.object({
  ...meta,
  typ: z.enum(['notiz', 'tool', 'erkenntnis', 'quelle', 'tagebuch']),
  titel: z.string().min(1),
  inhalt: z.string(),
  /** Freies Thema, z. B. „Prompting“, „n8n“ */
  thema: z.string(),
  /** Link oder Herkunft */
  quelle: z.string(),
  schlagworte: z.array(z.string()),
  /** Datum, beim Lerntagebuch der Kurstag */
  datum: datum.nullable(),
  projektIds: z.array(id),
  kursId: id.nullable(),
  kursAufgabeIds: z.array(id),
})

export const werkzeugTypen = ['prompt', 'befehl', 'agent', 'skill', 'anleitung', 'integration', 'workflow', 'abo'] as const

export const schrittSchema = z.object({
  text: z.string().min(1),
  erledigt: z.boolean(),
})

/** Nur Angaben, nie Zugangsdaten: wo der Schlüssel liegt, nicht der Schlüssel selbst. */
export const integrationAngabenSchema = z.object({
  art: z.enum(['mcp', 'api', 'app', 'sonstige']),
  /** z. B. „Passwortmanager, Eintrag Supabase“ */
  schluesselOrt: z.string(),
  /** Speicher- bzw. Verarbeitungsort, z. B. „EU (Frankfurt)“ */
  region: z.string(),
  /** Auftragsverarbeitungsvertrag (Art. 28 DSGVO) */
  avv: z.enum(['ja', 'nein', 'nicht_noetig']).nullable(),
})

export const aboAngabenSchema = z.object({
  kostenEur: z.number().min(0).nullable(),
  intervall: z.enum(['monatlich', 'jaehrlich', 'nutzung', 'kostenlos']),
  naechsteVerlaengerung: datum.nullable(),
  /** Kündigungsfrist in Tagen vor der Verlängerung */
  kuendigungsfristTage: z.number().int().min(0).nullable(),
})

/** KI-Werkzeugkasten: Masterprompts, Befehle, Agenten, Skills, Anleitungen, Integrationen, Workflows, Modelle & Abos */
export const werkzeugSchema = z.object({
  ...meta,
  typ: z.enum(werkzeugTypen),
  titel: z.string().min(1),
  /** Wofür ist es da? */
  beschreibung: z.string(),
  /** Prompt, Befehl, Systemprompt oder freie Notiz */
  inhalt: z.string(),
  /** Zielmodell, Umgebung, Plattform oder Anbieter – je nach Typ */
  plattform: z.string(),
  status: z.enum(['geplant', 'in_arbeit', 'aktiv', 'archiviert']),
  /** Versionsnotiz, z. B. „v3 – mit Beispielen“ */
  version: z.string(),
  /** Doku- oder Quell-Link */
  link: z.string(),
  /** Auslöser bei Workflows, Einsatzfall bei Agenten */
  ausloeser: z.string(),
  schritte: z.array(schrittSchema),
  integration: integrationAngabenSchema.nullable(),
  abo: aboAngabenSchema.nullable(),
  /** Verknüpfte Werkzeuge, z. B. Integrationen eines Agenten */
  werkzeugIds: z.array(id),
  projektIds: z.array(id),
  schlagworte: z.array(z.string()),
})

/**
 * Aus Gmail abgerufene Mail (nur Kopfzeilen und Auszug). Nach Übernahme oder Verwerfen bleiben nur
 * Gmail-ID und Status, damit sie nicht erneut abgerufen wird (Datenminimierung).
 */
export const mailSchema = z.object({
  ...meta,
  gmailId: z.string().min(1),
  threadId: z.string(),
  zeitpunkt,
  von: z.string(),
  an: z.array(z.string()),
  betreff: z.string(),
  auszug: z.string(),
  richtung: z.enum(['eingang', 'ausgang']),
  kontaktId: id.nullable(),
  unternehmenId: id.nullable(),
  bewerbungId: id.nullable(),
  status: z.enum(['neu', 'uebernommen', 'verworfen']),
  /** Verlaufseintrag nach der Übernahme */
  interaktionId: id.nullable(),
})

export const sammlungen = [
  'projekte',
  'aufgaben',
  'termine',
  'kurse',
  'kursAufgaben',
  'designregeln',
  'decks',
  'unternehmen',
  'kontakte',
  'interaktionen',
  'leads',
  'zielrollen',
  'bewerbungen',
  'vorlagen',
  'wissen',
  'werkzeug',
  'mails',
] as const

/** Protokoll der KI-Aufrufe: was, wann, wie viel – nie der Inhalt */
export const kiProtokollSchema = z.object({
  id,
  zeitpunkt,
  aufgabe: z.enum(['anschreiben', 'antwort', 'zusammenfassung', 'tagesplan', 'chat', 'stellenanzeige']),
  /** Anzahl gesendeter Zeichen */
  zeichen: z.number().int().min(0),
  tokens: z.number().int().min(0),
})

export const aktivitaetSchema = z.object({
  id,
  zeitpunkt,
  art: z.enum(['angelegt', 'geaendert', 'erledigt', 'wieder_geoeffnet', 'geloescht', 'einstellungen']),
  bezug: z.object({
    sammlung: z.enum(sammlungen).nullable(),
    id: id.nullable(),
    /** Titel zum Zeitpunkt der Aktivität, bleibt nach Umbenennen oder Löschen lesbar. */
    titel: z.string(),
  }),
  zusammenfassung: z.string().min(1),
})

export const einstellungenSchema = z.object({
  anzeigename: z.string(),
  /** Zeitpunkt der letzten verschlüsselten Sicherung (Export) */
  letzteSicherungAm: z.iso.datetime().nullable(),
  /** Letzter erfolgreicher Mailabruf (Gmail); der nächste Abruf beginnt dort */
  letzterMailAbrufAm: z.iso.datetime().nullable(),
})

export const appDataSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  projekte: z.array(projektSchema),
  aufgaben: z.array(aufgabeSchema),
  termine: z.array(terminSchema),
  kurse: z.array(kursSchema),
  kursAufgaben: z.array(kursAufgabeSchema),
  designregeln: z.array(designregelSchema),
  decks: z.array(deckSchema),
  unternehmen: z.array(unternehmenSchema),
  kontakte: z.array(kontaktSchema),
  interaktionen: z.array(interaktionSchema),
  leads: z.array(leadSchema),
  zielrollen: z.array(zielrolleSchema),
  bewerbungen: z.array(bewerbungSchema),
  vorlagen: z.array(vorlageSchema),
  wissen: z.array(wissenSchema),
  werkzeug: z.array(werkzeugSchema),
  mails: z.array(mailSchema),
  kiProtokoll: z.array(kiProtokollSchema),
  aktivitaeten: z.array(aktivitaetSchema),
  einstellungen: einstellungenSchema,
})
