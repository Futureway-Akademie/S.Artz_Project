import type { BadgeTone } from '../components/ui/Badge.tsx'
import type { AutomationProfil, Bewerbung, Interaktion, Kontakt, KursAufgabe, Lead, ProjektStatus } from './types.ts'

export const PROJEKT_STATUS: Record<ProjektStatus, { label: string; ton: BadgeTone }> = {
  idee: { label: 'Idee', ton: 'neutral' },
  in_arbeit: { label: 'In Arbeit', ton: 'blue' },
  pausiert: { label: 'Pausiert', ton: 'warning' },
  abgeschlossen: { label: 'Abgeschlossen', ton: 'success' },
}

export const KEIN_STATUS = 'Kein Status hinterlegt'

export const PLATTFORM: Record<AutomationProfil['plattform'], string> = {
  n8n: 'n8n',
  make: 'Make.com',
  sonstige: 'Sonstige',
}

export const KURSAUFGABE_STATUS: Record<KursAufgabe['status'], { label: string; ton: BadgeTone }> = {
  offen: { label: 'Offen', ton: 'neutral' },
  in_arbeit: { label: 'In Arbeit', ton: 'blue' },
  erledigt: { label: 'Erledigt', ton: 'success' },
}

export const KONTEXT: Record<Kontakt['kontext'], string> = {
  jobsuche: 'Jobsuche',
  weiterbildung: 'Weiterbildung',
  pikartz: 'PIKARTZ.AI',
  sonstiges: 'Sonstiges',
}

/** Rechtsgrundlagen nach Art. 6 Abs. 1 DSGVO, die für ein persönliches CRM in Frage kommen. */
export const RECHTSGRUNDLAGE: Record<NonNullable<Kontakt['rechtsgrundlage']>, { label: string; hinweis: string }> = {
  einwilligung: { label: 'Einwilligung (Art. 6 Abs. 1 a)', hinweis: 'Die Person hat zugestimmt; sie kann jederzeit widerrufen.' },
  vertrag: { label: 'Vertrag oder Anbahnung (Art. 6 Abs. 1 b)', hinweis: 'Für einen Auftrag, ein Angebot oder eine Bewerbung nötig.' },
  berechtigtes_interesse: {
    label: 'Berechtigtes Interesse (Art. 6 Abs. 1 f)',
    hinweis: 'Geschäftlicher Kontakt, den die Person erwarten kann, z. B. nach einem Gespräch.',
  },
}

export const INTERAKTION_ART: Record<Interaktion['art'], string> = {
  email: 'E-Mail',
  telefonat: 'Telefonat',
  treffen: 'Treffen',
  nachricht: 'Nachricht',
  notiz: 'Notiz',
}

export const LEAD_STATUS: Record<Lead['status'], { label: string; ton: BadgeTone; offen: boolean }> = {
  neu: { label: 'Neu', ton: 'blue', offen: true },
  im_austausch: { label: 'Im Austausch', ton: 'blue', offen: true },
  angebot: { label: 'Angebot', ton: 'warning', offen: true },
  zusage: { label: 'Zusage', ton: 'success', offen: false },
  absage: { label: 'Absage', ton: 'neutral', offen: false },
}

export const BEWERBUNG_STATUS: Record<Bewerbung['status'], { label: string; ton: BadgeTone; laufend: boolean }> = {
  geplant: { label: 'Geplant', ton: 'neutral', laufend: true },
  beworben: { label: 'Beworben', ton: 'blue', laufend: true },
  im_gespraech: { label: 'Im Gespräch', ton: 'blue', laufend: true },
  angebot: { label: 'Angebot', ton: 'success', laufend: true },
  absage: { label: 'Absage', ton: 'neutral', laufend: false },
  zurueckgezogen: { label: 'Zurückgezogen', ton: 'neutral', laufend: false },
}

export function optionen<K extends string>(map: Record<K, string | { label: string }>): Array<{ value: K; label: string }> {
  return (Object.keys(map) as K[]).map((value) => {
    const eintrag = map[value]
    return { value, label: typeof eintrag === 'string' ? eintrag : eintrag.label }
  })
}
