import { plusTage, toDatum } from '../dates.ts'
import type { AppData, Bewerbung, Mail, Neu } from '../types.ts'
import type { RohMail } from '../../data/gmail/gmail.ts'

/** Anbieter, deren Domain zu vielen Menschen gehört – nie als Unternehmensdomain abfragen */
const FREEMAIL = new Set([
  'gmail.com',
  'googlemail.com',
  'gmx.de',
  'gmx.net',
  'web.de',
  'outlook.com',
  'outlook.de',
  'hotmail.com',
  'hotmail.de',
  'live.com',
  'live.de',
  'yahoo.com',
  'yahoo.de',
  'icloud.com',
  'me.com',
  't-online.de',
  'posteo.de',
  'mailbox.org',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'freenet.de',
])

const EMAIL = /[^\s<>"',;]+@[^\s<>"',;]+\.[^\s<>"',;]+/

/** „Kim Muster <Kim@Example.org>“ → „kim@example.org“ */
export function adresseAus(text: string): string {
  return (text.match(EMAIL)?.[0] ?? '').toLowerCase()
}

/** „Kim Muster <kim@example.org>“ → „Kim Muster“; ohne Namen der Teil vor dem @ */
export function nameAus(text: string): string {
  const name = text.replace(/<[^>]*>/, '').replace(/"/g, '').trim()
  return name && !EMAIL.test(name) ? name : adresseAus(text).split('@')[0] ?? ''
}

const domainAusAdresse = (adresse: string) => adresse.split('@')[1] ?? ''

/** Domain einer Website („https://www.acme.de/jobs“ → „acme.de“) */
export function domainAusWebsite(website: string): string {
  const t = website.trim()
  if (!t) return ''
  try {
    return new URL(/^https?:\/\//.test(t) ? t : `https://${t}`).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

export interface AbrufZiele {
  adressen: string[]
  domains: string[]
}

/** Wonach gesucht wird: Adressen der Kontakte und Domains der Unternehmen (ohne Freemail-Anbieter) */
export function abrufZiele(data: AppData): AbrufZiele {
  const adressen = new Set(data.kontakte.map((k) => adresseAus(k.email)).filter(Boolean))
  const domains = new Set(
    data.unternehmen
      .map((u) => domainAusWebsite(u.website))
      .filter((d) => d.includes('.') && !FREEMAIL.has(d)),
  )
  return { adressen: [...adressen].sort(), domains: [...domains].sort() }
}

const gmailDatum = (datum: string) => datum.replace(/-/g, '/')

/** Beginn des Abrufs: ab dem letzten Abruf (mit einem Tag Überlappung), beim ersten Mal 90 Tage zurück */
export function abrufAb(data: AppData, now: Date): string {
  const letzter = data.einstellungen.letzterMailAbrufAm
  return letzter ? plusTage(toDatum(new Date(letzter)), -1) : plusTage(toDatum(now), -90)
}

/** Gmail-Suchanfragen, je höchstens `proAnfrage` Ziele (Gmail begrenzt die Länge einer Suche) */
export function abfragen(ziele: AbrufZiele, ab: string, proAnfrage = 15): string[] {
  const begriffe = [...ziele.adressen, ...ziele.domains].map((z) => `from:${z} to:${z} cc:${z}`)
  const anfragen: string[] = []
  for (let i = 0; i < begriffe.length; i += proAnfrage) anfragen.push(`{${begriffe.slice(i, i + proAnfrage).join(' ')}} after:${gmailDatum(ab)}`)
  return anfragen
}

/** Laufende Bewerbung zum Kontakt oder Unternehmen, sonst die zuletzt geänderte */
export function bewerbungVorschlag(data: AppData, kontaktId: string | null, unternehmenId: string | null): Bewerbung | null {
  const passend = data.bewerbungen.filter((b) => (kontaktId && b.kontaktId === kontaktId) || (unternehmenId && b.unternehmenId === unternehmenId))
  const laufend = (b: Bewerbung) => b.status !== 'absage' && b.status !== 'zurueckgezogen'
  return [...passend].sort((a, b) => Number(laufend(b)) - Number(laufend(a)) || b.geaendertAm.localeCompare(a.geaendertAm))[0] ?? null
}

/** Adressen der Gegenseite: beim Eingang der Absender, beim Ausgang die Empfänger */
export function gegenseite(mail: Pick<Mail, 'richtung' | 'von' | 'an'>, eigene = ''): string[] {
  const liste = mail.richtung === 'eingang' ? [adresseAus(mail.von)] : mail.an.map(adresseAus)
  return liste.filter((a) => a && a !== eigene)
}

/**
 * Ordnet eine abgerufene Mail Kontakt, Unternehmen und Bewerbung zu.
 * Gehört sie zu niemandem aus deinen Daten, liefert die Funktion `null` – sie wird dann nicht gespeichert.
 */
export function mailZuordnen(data: AppData, roh: RohMail, eigeneAdresse: string): Neu<'mails'> | null {
  const eigene = eigeneAdresse.toLowerCase()
  const richtung = roh.labels.includes('SENT') || (eigene !== '' && adresseAus(roh.von) === eigene) ? 'ausgang' : 'eingang'
  const adressen = gegenseite({ richtung, von: roh.von, an: roh.an }, eigene)
  const kontakt = data.kontakte.find((k) => adresseAus(k.email) && adressen.includes(adresseAus(k.email)))
  const domains = new Set(adressen.map(domainAusAdresse))
  const unternehmenId = kontakt?.unternehmenId ?? data.unternehmen.find((u) => domains.has(domainAusWebsite(u.website)) && !FREEMAIL.has(domainAusWebsite(u.website)))?.id ?? null
  if (!kontakt && !unternehmenId) return null
  const kontaktId = kontakt?.id ?? null
  return {
    gmailId: roh.id,
    threadId: roh.threadId,
    zeitpunkt: roh.zeitpunkt,
    von: roh.von,
    an: roh.an,
    betreff: roh.betreff,
    auszug: roh.auszug,
    richtung,
    kontaktId,
    unternehmenId,
    bewerbungId: bewerbungVorschlag(data, kontaktId, unternehmenId)?.id ?? null,
    status: 'neu',
    interaktionId: null,
  }
}

/** Neue (noch nicht übernommene) Mails, neueste zuerst */
export function postfachNeu(data: AppData): Mail[] {
  return data.mails.filter((m) => m.status === 'neu').sort((a, b) => b.zeitpunkt.localeCompare(a.zeitpunkt))
}

/** Kontakt aus einer Mail anlegen (z. B. Antwort der Personalabteilung) */
export function kontaktAusMail(data: AppData, mail: Mail): Neu<'kontakte'> {
  const roh = mail.richtung === 'eingang' ? mail.von : (mail.an.find((a) => adresseAus(a)) ?? '')
  const bewerbung = data.bewerbungen.find((b) => b.id === mail.bewerbungId)
  return {
    name: nameAus(roh) || adresseAus(roh),
    rolle: '',
    unternehmenId: mail.unternehmenId,
    email: adresseAus(roh),
    telefon: '',
    linkedinUrl: '',
    kontext: bewerbung ? 'jobsuche' : 'sonstiges',
    herkunft: 'E-Mail (Gmail)',
    notiz: '',
    projektIds: [],
    naechsteAktion: null,
    // Bewerbung = Anbahnung eines Arbeitsverhältnisses (Art. 6 Abs. 1 b); sonst bewusst offen lassen
    rechtsgrundlage: bewerbung ? 'vertrag' : null,
    zweck: bewerbung ? `Bewerbung: ${bewerbung.stelle}` : '',
    schlagworte: [],
  }
}
