import { formatDatum, formatZeitpunkt, toDatum } from '../dates.ts'
import { BEWERBUNG_STATUS, INTERAKTION_ART, KONTEXT, LEAD_STATUS, RECHTSGRUNDLAGE } from '../labels.ts'
import type { AppData, Kontakt } from '../types.ts'

/** Nach so vielen Monaten ohne Aktivität soll geprüft werden, ob die Daten noch gebraucht werden. */
export const PRUEFUNG_NACH_MONATEN = 12

/** Letzte Aktivität zu einer Person (ISO-Datum oder Zeitpunkt): Änderung, Verlauf, Aufgaben, Termine. */
export function letzteAktivitaet(data: AppData, kontakt: Kontakt): string {
  const zeitpunkte = [
    kontakt.geaendertAm,
    ...data.interaktionen.filter((i) => i.kontaktId === kontakt.id).map((i) => i.datum),
    ...data.aufgaben.filter((a) => a.bezug.art === 'kontakt' && a.bezug.id === kontakt.id).map((a) => a.geaendertAm),
    ...data.termine.filter((t) => t.bezug.art === 'kontakt' && t.bezug.id === kontakt.id).map((t) => t.datum),
  ]
  return zeitpunkte.reduce((max, z) => (z.slice(0, 10) > max.slice(0, 10) ? z : max))
}

/** Kontakte, bei denen seit 12 Monaten nichts passiert ist (Datenminimierung, Art. 5 Abs. 1 c/e DSGVO). */
export function kontakteZurPruefung(data: AppData, now: Date): Kontakt[] {
  const grenze = new Date(now)
  grenze.setMonth(grenze.getMonth() - PRUEFUNG_NACH_MONATEN)
  const grenzDatum = toDatum(grenze)
  return data.kontakte.filter((k) => letzteAktivitaet(data, k).slice(0, 10) < grenzDatum)
}

/** Kontakte, die geprüft werden sollten: ruhend oder ohne Rechtsgrundlage bzw. Zweck. */
export function kontakteMitPruefbedarf(data: AppData, now: Date): Kontakt[] {
  const ruhend = new Set(kontakteZurPruefung(data, now).map((k) => k.id))
  return data.kontakte.filter((k) => ruhend.has(k.id) || !k.rechtsgrundlage || !k.zweck.trim())
}

function zeile(label: string, wert: string | null | undefined): string {
  return `${label}: ${wert && wert.trim() ? wert : '–'}`
}

/**
 * Auskunft nach Art. 15 DSGVO: alle gespeicherten Angaben zu einer Person als lesbarer Text.
 * Enthält Stammdaten, Zweck und Rechtsgrundlage, Verlauf und alle Einträge, die mit der Person verknüpft sind.
 */
export function datenauskunft(data: AppData, kontaktId: string, now: Date): string | null {
  const k = data.kontakte.find((x) => x.id === kontaktId)
  if (!k) return null
  const firma = data.unternehmen.find((u) => u.id === k.unternehmenId)
  const interaktionen = data.interaktionen.filter((i) => i.kontaktId === k.id).sort((a, b) => a.datum.localeCompare(b.datum))
  const aufgaben = data.aufgaben.filter((a) => a.bezug.art === 'kontakt' && a.bezug.id === k.id)
  const termine = data.termine.filter((t) => t.bezug.art === 'kontakt' && t.bezug.id === k.id)
  const leads = data.leads.filter((l) => l.kontaktId === k.id)
  const bewerbungen = data.bewerbungen.filter((b) => b.kontaktId === k.id)
  const projekte = data.projekte.filter((p) => k.projektIds.includes(p.id))

  const abschnitt = (titel: string, eintraege: string[]) => [``, `## ${titel}`, ...(eintraege.length ? eintraege : ['Keine Einträge.'])]

  return [
    `# Auskunft über gespeicherte personenbezogene Daten (Art. 15 DSGVO)`,
    ``,
    `Erstellt am ${formatZeitpunkt(now.toISOString())}. Die Daten liegen ausschließlich verschlüsselt im Browser der verantwortlichen Person und werden nicht an Dritte übermittelt.`,
    ...abschnitt('Stammdaten', [
      zeile('Name', k.name),
      zeile('Rolle', k.rolle),
      zeile('Unternehmen', firma?.name),
      zeile('E-Mail', k.email),
      zeile('Telefon', k.telefon),
      zeile('LinkedIn', k.linkedinUrl),
      zeile('Herkunft des Kontakts', k.herkunft),
      zeile('Kontext', KONTEXT[k.kontext]),
      zeile('Notiz', k.notiz),
      zeile('Nächste geplante Aktion', k.naechsteAktion ? `${k.naechsteAktion.text}${k.naechsteAktion.faelligAm ? ` (${formatDatum(k.naechsteAktion.faelligAm)})` : ''}` : null),
      zeile('Gespeichert seit', formatZeitpunkt(k.erstelltAm)),
      zeile('Zuletzt geändert', formatZeitpunkt(k.geaendertAm)),
    ]),
    ...abschnitt('Zweck und Rechtsgrundlage', [
      zeile('Zweck', k.zweck),
      zeile('Rechtsgrundlage', k.rechtsgrundlage ? RECHTSGRUNDLAGE[k.rechtsgrundlage].label : 'nicht festgelegt'),
    ]),
    ...abschnitt('Verlauf', interaktionen.map((i) => `- ${formatDatum(i.datum)} · ${INTERAKTION_ART[i.art]}: ${i.text}`)),
    ...abschnitt('Noch nicht übernommene E-Mails (aus Gmail)', data.mails.filter((m) => m.kontaktId === k.id && m.status === 'neu').map((m) => `- ${formatZeitpunkt(m.zeitpunkt)} · ${m.richtung === 'eingang' ? 'Eingang' : 'Ausgang'}: ${m.betreff || '(ohne Betreff)'}`)),
    ...abschnitt('Aufgaben', aufgaben.map((a) => `- ${a.titel}${a.faelligAm ? ` (Frist ${formatDatum(a.faelligAm)})` : ''}${a.erledigt ? ' – erledigt' : ''}`)),
    ...abschnitt('Termine', termine.map((t) => `- ${formatDatum(t.datum)}${t.uhrzeit ? ` ${t.uhrzeit}` : ''} · ${t.titel}`)),
    ...abschnitt('Leads', leads.map((l) => `- ${l.titel} (${LEAD_STATUS[l.status].label})`)),
    ...abschnitt('Bewerbungen', bewerbungen.map((b) => `- ${b.stelle} (${BEWERBUNG_STATUS[b.status].label})`)),
    ...abschnitt('Verknüpfte Projekte', projekte.map((p) => `- ${p.titel}`)),
    ``,
    `## Deine Rechte`,
    `Du kannst Berichtigung (Art. 16), Löschung (Art. 17) und Einschränkung der Verarbeitung (Art. 18) verlangen sowie einer Verarbeitung aus berechtigtem Interesse widersprechen (Art. 21). Eine Einwilligung kannst du jederzeit widerrufen.`,
    ``,
  ].join('\n')
}
