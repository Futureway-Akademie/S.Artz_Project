import { plusTage, toDatum } from '../domain/dates.ts'
import type { AppData, Werkzeug } from '../domain/types.ts'
import { werkzeugVorlagen } from './werkzeugVorlagen.ts'

/**
 * Fiktive Demo-Daten für Präsentationen: erfundene Firmen und Personen, Daten relativ zu heute.
 * Alle IDs beginnen mit „demo-“; so lassen sie sich vollständig wieder entfernen, ohne echte Daten zu berühren.
 */
export const DEMO_PRAEFIX = 'demo-'

export const istDemo = (id: string) => id.startsWith(DEMO_PRAEFIX)

export function hatDemoDaten(data: AppData): boolean {
  return data.kontakte.some((k) => istDemo(k.id))
}

export function demoHinzufuegen(data: AppData, now: Date): AppData {
  if (hatDemoDaten(data)) return data
  const h = toDatum(now)
  const t = (tage: number) => plusTage(h, tage)
  const zeit = now.toISOString()
  const m = { erstelltAm: zeit, geaendertAm: zeit }
  const iso = (tage: number, stunde = 9) => new Date(`${t(tage)}T${String(stunde).padStart(2, '0')}:15:00`).toISOString()
  const projekt = data.projekte[0]?.id

  const unternehmen = [
    { id: 'demo-u-nordlicht', name: 'Nordlicht Software GmbH', branche: 'Software', website: 'https://nordlicht.example', notiz: 'Baut KI-Assistenten für den Mittelstand.', schlagworte: ['KI'], ...m },
    { id: 'demo-u-gruenwerk', name: 'Grünwerk Energie AG', branche: 'Energie', website: 'https://gruenwerk.example', notiz: '', schlagworte: ['Automation'], ...m },
    { id: 'demo-u-hafen', name: 'Hafenstadt Logistik', branche: 'Logistik', website: 'https://hafenstadt.example', notiz: 'Interesse an Prozessautomatisierung.', schlagworte: ['Lead'], ...m },
  ]
  const kontakt = (id: string, name: string, rolle: string, unternehmenId: string, extra: Partial<AppData['kontakte'][number]> = {}) => ({
    id,
    name,
    rolle,
    unternehmenId,
    email: `${name.split(' ')[0]!.toLowerCase()}@${unternehmen.find((u) => u.id === unternehmenId)!.website.replace('https://', '')}`,
    telefon: '',
    linkedinUrl: '',
    kontext: 'jobsuche' as const,
    herkunft: 'Demo',
    notiz: '',
    projektIds: [],
    naechsteAktion: null,
    rechtsgrundlage: 'vertrag' as const,
    zweck: 'Bewerbung (Demo)',
    schlagworte: [],
    ...m,
    ...extra,
  })
  const kontakte = [
    kontakt('demo-k-lena', 'Lena Brandt', 'Recruiting', 'demo-u-nordlicht', { naechsteAktion: { text: 'Termin für Zweitgespräch bestätigen', faelligAm: t(0) } }),
    kontakt('demo-k-jonas', 'Jonas Keller', 'Teamleitung Digitalisierung', 'demo-u-gruenwerk'),
    kontakt('demo-k-mia', 'Mia Wagner', 'Geschäftsführung', 'demo-u-hafen', { kontext: 'pikartz', rechtsgrundlage: 'berechtigtes_interesse', zweck: 'Anbahnung eines Auftrags (Demo)', naechsteAktion: { text: 'Angebot nachfassen', faelligAm: t(-1) } }),
  ]
  const bewerbung = (id: string, stelle: string, unternehmenId: string, status: AppData['bewerbungen'][number]['status'], extra: Partial<AppData['bewerbungen'][number]> = {}) => ({
    id,
    stelle,
    unternehmenId,
    zielrolleId: data.zielrollen[0]?.id ?? null,
    kontaktId: null,
    status,
    quelle: 'Jobportal',
    beworbenAm: status === 'geplant' ? null : t(-14),
    link: '',
    naechsterSchritt: '',
    notiz: 'Anforderungen: Prompting, n8n, Kommunikation mit Fachabteilungen.',
    wiedervorlageAm: null,
    ...m,
    ...extra,
  })
  const bewerbungen = [
    bewerbung('demo-b-nordlicht', 'KI-Anwendungsentwicklung (m/w/d)', 'demo-u-nordlicht', 'im_gespraech', { kontaktId: 'demo-k-lena', naechsterSchritt: 'Zweitgespräch vorbereiten', wiedervorlageAm: t(2) }),
    bewerbung('demo-b-gruenwerk', 'Automatisierungsspezialist (m/w/d)', 'demo-u-gruenwerk', 'beworben', { kontaktId: 'demo-k-jonas', wiedervorlageAm: t(3) }),
    bewerbung('demo-b-geplant', 'KI-Texter (m/w/d)', 'demo-u-nordlicht', 'geplant'),
    bewerbung('demo-b-absage', 'Junior Data Analyst (m/w/d)', 'demo-u-gruenwerk', 'absage'),
  ]
  const interaktion = (id: string, kontaktId: string, tage: number, text: string, extra: Partial<AppData['interaktionen'][number]> = {}) => ({
    id,
    kontaktId,
    art: 'email' as const,
    datum: t(tage),
    text,
    projektId: null,
    bewerbungId: null,
    leadId: null,
    betreff: '',
    richtung: null,
    ...m,
    ...extra,
  })
  const interaktionen = [
    interaktion('demo-i-1', 'demo-k-lena', -10, 'Bewerbung für KI-Anwendungsentwicklung geschickt.', { bewerbungId: 'demo-b-nordlicht', betreff: 'Bewerbung KI-Anwendungsentwicklung', richtung: 'ausgang' }),
    interaktion('demo-i-2', 'demo-k-lena', -4, 'Vielen Dank für Ihre Bewerbung. Wir würden Sie gern zu einem zweiten Gespräch einladen. Passt Ihnen Donnerstag oder Freitag?', { bewerbungId: 'demo-b-nordlicht', betreff: 'Einladung zum Zweitgespräch', richtung: 'eingang' }),
    interaktion('demo-i-3', 'demo-k-mia', -6, 'Erstgespräch: Sendungsverfolgung soll automatisch Kunden informieren. Budget offen.', { art: 'telefonat', leadId: 'demo-l-hafen' }),
  ]
  const leads = [
    { id: 'demo-l-hafen', titel: 'Automatische Kundeninfo bei Sendungen', kontaktId: 'demo-k-mia', unternehmenId: 'demo-u-hafen', status: 'angebot' as const, betragEur: 4800, naechsterSchritt: 'Angebot nachfassen', notiz: '', projektId: projekt ?? null, wiedervorlageAm: t(1), ...m },
  ]
  const aufgabe = (id: string, titel: string, faelligAm: string | null, extra: Partial<AppData['aufgaben'][number]> = {}) => ({
    id,
    titel,
    notiz: '',
    erledigt: false,
    erledigtAm: null,
    faelligAm,
    bezug: { art: 'ohne' as const, id: null },
    fokus: false,
    ...m,
    ...extra,
  })
  const aufgaben = [
    aufgabe('demo-a-1', 'Zweitgespräch vorbereiten: Fragen notieren', t(1), { bezug: { art: 'bewerbung', id: 'demo-b-nordlicht' }, fokus: true }),
    aufgabe('demo-a-2', 'Angebot für Hafenstadt überarbeiten', t(-1), { bezug: { art: 'lead', id: 'demo-l-hafen' } }),
    aufgabe('demo-a-3', 'Portfolio-Fall „KI-Assistent“ ergänzen', t(4)),
    aufgabe('demo-a-4', 'Lebenslauf als PDF exportieren', t(-3), { erledigt: true, erledigtAm: iso(-3, 16) }),
  ]
  const termine = [
    { id: 'demo-t-1', titel: 'Zweitgespräch Nordlicht', datum: t(2), uhrzeit: '10:00', ort: 'Video-Call', notiz: '', bezug: { art: 'bewerbung' as const, id: 'demo-b-nordlicht' }, ...m },
    { id: 'demo-t-2', titel: 'Lernrunde n8n', datum: t(0), uhrzeit: '14:00', ort: '', notiz: '', bezug: { art: 'ohne' as const, id: null }, ...m },
  ]
  const wissen = [
    { id: 'demo-w-1', typ: 'erkenntnis' as const, titel: 'Gute Prompts haben ein Ausgabeformat', inhalt: 'Wenn das Format feststeht (z. B. JSON), sind Automationen stabiler.', thema: 'Prompting', quelle: '', schlagworte: ['Demo'], datum: t(-2), projektIds: [], kursId: null, kursAufgabeIds: [], ...m },
    { id: 'demo-w-2', typ: 'tool' as const, titel: 'n8n: Fehler-Workflow', inhalt: 'Ein Fehler-Workflow meldet fehlgeschlagene Ausführungen per Mail.', thema: 'n8n', quelle: '', schlagworte: ['Demo'], datum: null, projektIds: [], kursId: null, kursAufgabeIds: [], ...m },
  ]
  const vorlagen = werkzeugVorlagen().slice(0, 6)
  const werkzeug: Werkzeug[] = [
    ...vorlagen.map((v, i) => ({ ...v, id: `demo-wz-${i}`, ...m })),
    { ...werkzeugVorlagen().find((v) => v.typ === 'abo')!, id: 'demo-wz-abo', titel: 'KI-Abo (Demo)', abo: { kostenEur: 20, intervall: 'monatlich', naechsteVerlaengerung: t(5), kuendigungsfristTage: 3 }, ...m },
  ]

  return {
    ...data,
    unternehmen: [...data.unternehmen, ...unternehmen],
    kontakte: [...data.kontakte, ...kontakte],
    bewerbungen: [...data.bewerbungen, ...bewerbungen],
    interaktionen: [...data.interaktionen, ...interaktionen],
    leads: [...data.leads, ...leads],
    aufgaben: [...data.aufgaben, ...aufgaben],
    termine: [...data.termine, ...termine],
    wissen: [...data.wissen, ...wissen],
    werkzeug: [...data.werkzeug, ...werkzeug],
  }
}

/** Entfernt alle Demo-Einträge (und Verweise darauf) – echte Daten bleiben unverändert. */
export function demoEntfernen(data: AppData): AppData {
  const ohne = <T extends { id: string }>(liste: T[]) => liste.filter((e) => !istDemo(e.id))
  const bezugOk = (b: { id: string | null }) => !(b.id && istDemo(b.id))
  return {
    ...data,
    unternehmen: ohne(data.unternehmen),
    kontakte: ohne(data.kontakte),
    bewerbungen: ohne(data.bewerbungen),
    interaktionen: ohne(data.interaktionen),
    leads: ohne(data.leads),
    aufgaben: ohne(data.aufgaben).map((a) => (bezugOk(a.bezug) ? a : { ...a, bezug: { art: 'ohne' as const, id: null } })),
    termine: ohne(data.termine).map((x) => (bezugOk(x.bezug) ? x : { ...x, bezug: { art: 'ohne' as const, id: null } })),
    wissen: ohne(data.wissen),
    werkzeug: ohne(data.werkzeug).map((w) => ({ ...w, werkzeugIds: w.werkzeugIds.filter((id) => !istDemo(id)) })),
    mails: data.mails.filter((x) => !(x.kontaktId && istDemo(x.kontaktId))),
    aktivitaeten: data.aktivitaeten.filter((a) => !(a.bezug.id && istDemo(a.bezug.id))),
  }
}
