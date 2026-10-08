import { formatDatum, heute, plusTage } from '../dates.ts'
import { BEWERBUNG_STATUS, INTERAKTION_ART } from '../labels.ts'
import type { AppData, Bewerbung, Interaktion, Mail } from '../types.ts'

/**
 * Bereitet die Texte für KI-Aufgaben vor. Sie erscheinen vollständig im Freigabe-Dialog und können dort
 * gekürzt werden – gesendet wird nur, was dort steht. Unbekanntes wird als Platzhalter markiert, nie erfunden.
 */

const zeilen = (...z: Array<string | false | null | undefined>) => z.filter(Boolean).join('\n')

export function anschreibenEingabe(data: AppData, b: Bewerbung): string {
  const firma = data.unternehmen.find((u) => u.id === b.unternehmenId)
  const rolle = data.zielrollen.find((z) => z.id === b.zielrolleId)
  const kontakt = data.kontakte.find((k) => k.id === b.kontaktId)
  return zeilen(
    `Stelle: ${b.stelle}`,
    firma && `Unternehmen: ${firma.name}${firma.branche ? ` (${firma.branche})` : ''}`,
    kontakt && `Ansprechpartner: ${kontakt.name}${kontakt.rolle ? `, ${kontakt.rolle}` : ''}`,
    rolle && `Meine Zielrolle: ${rolle.titel}`,
    b.link && `Link zur Anzeige: ${b.link}`,
    b.notiz && `Notizen zur Stelle und Anforderungen:\n${b.notiz}`,
    'Meine passenden Erfahrungen und Stärken: [bitte ergänzen]',
    data.einstellungen.anzeigename && `Absender: ${data.einstellungen.anzeigename}`,
  )
}

function bezugszeilen(data: AppData, kontaktId: string | null, bewerbungId: string | null): string {
  const k = data.kontakte.find((x) => x.id === kontaktId)
  const firma = data.unternehmen.find((u) => u.id === k?.unternehmenId)
  const b = data.bewerbungen.find((x) => x.id === bewerbungId)
  return zeilen(
    k && `Kontakt: ${k.name}${k.rolle ? ` (${k.rolle})` : ''}${firma ? `, ${firma.name}` : ''}`,
    b && `Bewerbung: ${b.stelle} – Status: ${BEWERBUNG_STATUS[b.status].label}`,
  )
}

export function antwortEingabe(data: AppData, i: Interaktion): string {
  return zeilen(bezugszeilen(data, i.kontaktId, i.bewerbungId), i.betreff && `Betreff: ${i.betreff}`, `Erhaltene Nachricht vom ${formatDatum(i.datum)}:\n${i.text}`, 'Was ich antworten möchte: [kurz beschreiben]')
}

export function mailAntwortEingabe(data: AppData, m: Mail): string {
  return zeilen(bezugszeilen(data, m.kontaktId, m.bewerbungId), m.betreff && `Betreff: ${m.betreff}`, `Auszug der erhaltenen Mail:\n${m.auszug}`, 'Was ich antworten möchte: [kurz beschreiben]')
}

/** Verlauf eines Kontakts oder einer Bewerbung für die Zusammenfassung (neueste zuerst, höchstens 20 Einträge) */
export function zusammenfassungEingabe(data: AppData, ziel: { kontaktId?: string; bewerbungId?: string }, now: Date): string {
  const verlauf = data.interaktionen
    .filter((i) => (ziel.kontaktId && i.kontaktId === ziel.kontaktId) || (ziel.bewerbungId && i.bewerbungId === ziel.bewerbungId))
    .sort((a, b) => b.datum.localeCompare(a.datum))
    .slice(0, 20)
  const kontaktId = ziel.kontaktId ?? verlauf[0]?.kontaktId ?? null
  return zeilen(
    `Heute ist ${formatDatum(heute(now))} (${heute(now)}).`,
    bezugszeilen(data, kontaktId, ziel.bewerbungId ?? null),
    'Verlauf (neueste zuerst):',
    ...verlauf.map((i) => `- ${i.datum} · ${INTERAKTION_ART[i.art]}${i.richtung ? (i.richtung === 'eingang' ? ' (empfangen)' : ' (gesendet)') : ''}${i.betreff ? ` · ${i.betreff}` : ''}: ${i.text}`),
  )
}

/** Offene Punkte für die Tagesplanung: Fristen bis in 7 Tagen, Fokus, Termine heute, fällige Wiedervorlagen – mit IDs */
export function tagesplanEingabe(data: AppData, now: Date): string {
  const h = heute(now)
  const bald = plusTage(h, 7)
  const aufgaben = data.aufgaben.filter((a) => !a.erledigt && (a.fokus || (a.faelligAm !== null && a.faelligAm <= bald)))
  const termine = data.termine.filter((t) => t.datum === h)
  const wv = [
    ...data.kontakte.filter((k) => k.naechsteAktion?.faelligAm && k.naechsteAktion.faelligAm <= h).map((k) => `- [${k.id}] Wiedervorlage Kontakt ${k.name}: ${k.naechsteAktion!.text}`),
    ...data.bewerbungen.filter((b) => b.wiedervorlageAm && b.wiedervorlageAm <= h).map((b) => `- [${b.id}] Bewerbung nachfassen: ${b.stelle}${b.naechsterSchritt ? ` – ${b.naechsterSchritt}` : ''}`),
  ]
  return zeilen(
    `Heute ist ${formatDatum(h, 'lang')} (${h}).`,
    termine.length > 0 && 'Termine heute:',
    ...termine.map((t) => `- ${t.uhrzeit ?? 'ganztägig'} ${t.titel}`),
    'Offene Aufgaben:',
    ...(aufgaben.length ? aufgaben.map((a) => `- [${a.id}] ${a.titel}${a.faelligAm ? ` (Frist ${a.faelligAm}${a.faelligAm < h ? ', überfällig' : ''})` : ''}${a.fokus ? ' (im Fokus)' : ''}`) : ['- keine']),
    wv.length > 0 && 'Fällige Wiedervorlagen:',
    ...wv,
  )
}

/** IDs in eckigen Klammern aus einer KI-Antwort, z. B. „[a1]“ */
export function idsAusAntwort(text: string): string[] {
  return [...new Set([...text.matchAll(/\[([A-Za-z0-9_-]{1,64})\]/g)].map((m) => m[1]!))]
}

/** „Wiedervorlage: 2026-10-14“ aus einer Zusammenfassung lesen */
export function wiedervorlageAusAntwort(text: string): string | null {
  return text.match(/Wiedervorlage:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? null
}

/** „Nächster Schritt: …“ aus einer Zusammenfassung lesen */
export function naechsterSchrittAusAntwort(text: string): string | null {
  return text.match(/Nächster Schritt:\s*(.+)/)?.[1]?.trim() ?? null
}
