/**
 * KI-Aufgaben des Cockpits: feste Systemanweisungen auf dem Server (nicht vom Browser veränderbar),
 * Längengrenzen und Prüfung der Anfrage. Ohne Deno-APIs, daher auch in den App-Tests prüfbar.
 */

const GRUNDREGELN =
  'Antworte auf Deutsch. Erfinde keine Fakten, Namen, Zahlen oder Erfahrungen. Fehlt eine Information, setze einen deutlich markierten Platzhalter in eckigen Klammern, z. B. [Eintrittsdatum]. Keine Einleitung wie „Gerne“ – liefere direkt das Ergebnis.'

export const KI_AUFGABEN = {
  anschreiben: {
    titel: 'Anschreiben entwerfen',
    system: `Du schreibst Bewerbungsanschreiben. ${GRUNDREGELN} Maximal eine Seite, Sie-Form, konkret statt Floskeln, Bezug auf die Anforderungen der Stelle, klarer Abschluss mit nächstem Schritt. Gib nur den Brieftext aus, ohne Adressblock.`,
    maxEingabe: 12_000,
    maxAntwort: 1_500,
  },
  antwort: {
    titel: 'Antwort entwerfen',
    system: `Du formulierst Antworten auf E-Mails. ${GRUNDREGELN} Freundlich, knapp, passend zum Ton der Mail. Gib nur den Mailtext aus.`,
    maxEingabe: 8_000,
    maxAntwort: 800,
  },
  zusammenfassung: {
    titel: 'Zusammenfassen und nächsten Schritt vorschlagen',
    system: `Du fasst Kommunikationsverläufe zusammen. ${GRUNDREGELN} Gib aus: 1) Zusammenfassung in höchstens 4 Stichpunkten, 2) eine Zeile „Nächster Schritt: …“, 3) eine Zeile „Wiedervorlage: JJJJ-MM-TT“ mit einem sinnvollen Datum oder „Wiedervorlage: keine“.`,
    maxEingabe: 12_000,
    maxAntwort: 600,
  },
  tagesplan: {
    titel: 'Tagesplanung',
    system: `Du hilfst bei der Tagesplanung. ${GRUNDREGELN} Wähle aus den gelieferten offenen Punkten höchstens 5 für heute aus (Überfälliges und feste Termine zuerst) und begründe jede Wahl in einem kurzen Satz. Gib eine nummerierte Liste aus; jede Zeile beginnt mit der ID in eckigen Klammern, z. B. „1. [a1] …“.`,
    maxEingabe: 10_000,
    maxAntwort: 700,
  },
  chat: {
    titel: 'Frage an deine Daten',
    system: `Du beantwortest Fragen zu den gelieferten Daten aus einem persönlichen Arbeitscockpit. ${GRUNDREGELN} Nutze nur die gelieferten Daten; steht die Antwort nicht darin, sag das. Verweise auf Einträge mit ihrer ID in eckigen Klammern, z. B. [p1].`,
    maxEingabe: 24_000,
    maxAntwort: 1_200,
  },
  stellenanzeige: {
    titel: 'Stellenanzeige auslesen',
    system: `Du liest Stellenanzeigen aus. ${GRUNDREGELN} Antworte nur mit JSON: {"stelle": "", "unternehmen": "", "ort": "", "anforderungen": [""], "ansprechpartner": "", "email": "", "link": "", "bewerbungsfrist": "JJJJ-MM-TT oder leer"}. Leere Strings für Unbekanntes.`,
    maxEingabe: 16_000,
    maxAntwort: 900,
  },
} as const

export type KiAufgabe = keyof typeof KI_AUFGABEN

export interface KiAnfrage {
  aufgabe: KiAufgabe
  eingabe: string
}

export function kiAnfragePruefen(roh: unknown): { ok: true; anfrage: KiAnfrage } | { ok: false; fehler: string } {
  if (typeof roh !== 'object' || roh === null) return { ok: false, fehler: 'Ungültige Anfrage.' }
  const { aufgabe, eingabe } = roh as Record<string, unknown>
  if (typeof aufgabe !== 'string' || !Object.hasOwn(KI_AUFGABEN, aufgabe)) return { ok: false, fehler: 'Unbekannte Aufgabe.' }
  const a = aufgabe as KiAufgabe
  if (typeof eingabe !== 'string' || eingabe.trim().length === 0) return { ok: false, fehler: 'Es gibt nichts zu senden.' }
  if (eingabe.length > KI_AUFGABEN[a].maxEingabe) return { ok: false, fehler: `Zu lang: höchstens ${KI_AUFGABEN[a].maxEingabe.toLocaleString('de-DE')} Zeichen.` }
  return { ok: true, anfrage: { aufgabe: a, eingabe: eingabe.trim() } }
}

/** Monat für das Budget (Zeitzone Berlin), z. B. „2026-10“ */
export function budgetMonat(jetzt: Date): string {
  const teile = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit' }).formatToParts(jetzt)
  return `${teile.find((t) => t.type === 'year')!.value}-${teile.find((t) => t.type === 'month')!.value}`
}
