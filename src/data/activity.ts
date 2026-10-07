import type { Aktivitaet, Eintrag, Sammlung } from '../domain/types.ts'

interface SammlungInfo {
  /** z. B. „Projekt“ */
  einzahl: string
  /** Lesbarer Titel eines Eintrags */
  titel: (eintrag: never) => string
  /** Deutsche Feldnamen für Änderungs-Zusammenfassungen */
  felder: Record<string, string>
}

const gemeinsam = { schlagworte: 'Schlagworte', notiz: 'Notiz', notizen: 'Notizen', beschreibung: 'Beschreibung', titel: 'Titel', status: 'Status' }

export const SAMMLUNG_INFO: Record<Sammlung, SammlungInfo> = {
  projekte: {
    einzahl: 'Projekt',
    titel: (p: Eintrag<'projekte'>) => p.titel,
    felder: { ...gemeinsam, tools: 'Tools', bestandteile: 'Bestandteile', automation: 'Automation', auftraggeberId: 'Auftraggeber', kategorie: 'Kategorie', zuletztAktiv: 'Zuletzt aktiv' },
  },
  aufgaben: {
    einzahl: 'Aufgabe',
    titel: (a: Eintrag<'aufgaben'>) => a.titel,
    felder: { ...gemeinsam, faelligAm: 'Frist', bezug: 'Bezug', erledigt: 'Erledigt', fokus: 'Fokus' },
  },
  termine: {
    einzahl: 'Termin',
    titel: (t: Eintrag<'termine'>) => t.titel,
    felder: { ...gemeinsam, datum: 'Datum', uhrzeit: 'Uhrzeit', ort: 'Ort', bezug: 'Bezug' },
  },
  kurse: {
    einzahl: 'Kurs',
    titel: (k: Eintrag<'kurse'>) => k.titel,
    felder: { ...gemeinsam, anbieter: 'Anbieter', startDatum: 'Startdatum', endeDatum: 'Enddatum', arbeitstage: 'Arbeitstage' },
  },
  kursAufgaben: {
    einzahl: 'Weiterbildungsaufgabe',
    titel: (k: Eintrag<'kursAufgaben'>) => `${k.code} ${k.titel}`,
    felder: { ...gemeinsam, code: 'Code', faelligAm: 'Frist' },
  },
  designregeln: {
    einzahl: 'Designregel',
    titel: (d: Eintrag<'designregeln'>) => d.titel,
    felder: { ...gemeinsam, reihenfolge: 'Reihenfolge' },
  },
  decks: {
    einzahl: 'Deck',
    titel: (d: Eintrag<'decks'>) => d.titel,
    felder: { ...gemeinsam, modul: 'Modul', tag: 'Tag' },
  },
  unternehmen: {
    einzahl: 'Unternehmen',
    titel: (u: Eintrag<'unternehmen'>) => u.name,
    felder: { ...gemeinsam, name: 'Name', branche: 'Branche', website: 'Website' },
  },
  kontakte: {
    einzahl: 'Kontakt',
    titel: (k: Eintrag<'kontakte'>) => k.name,
    felder: {
      ...gemeinsam,
      name: 'Name',
      rolle: 'Rolle',
      unternehmenId: 'Unternehmen',
      email: 'E-Mail',
      telefon: 'Telefon',
      linkedinUrl: 'LinkedIn',
      kontext: 'Kontext',
      herkunft: 'Herkunft',
      projektIds: 'Projekte',
      naechsteAktion: 'Nächste Aktion',
      rechtsgrundlage: 'Rechtsgrundlage',
      zweck: 'Zweck',
    },
  },
  interaktionen: {
    einzahl: 'Verlaufseintrag',
    titel: (i: Eintrag<'interaktionen'>) => i.text.slice(0, 60),
    felder: { ...gemeinsam, art: 'Art', datum: 'Datum', text: 'Text', projektId: 'Projekt', bewerbungId: 'Bewerbung', leadId: 'Lead', betreff: 'Betreff', richtung: 'Richtung' },
  },
  leads: {
    einzahl: 'Lead',
    titel: (l: Eintrag<'leads'>) => l.titel,
    felder: {
      ...gemeinsam,
      kontaktId: 'Kontakt',
      unternehmenId: 'Unternehmen',
      betragEur: 'Betrag',
      naechsterSchritt: 'Nächster Schritt',
      projektId: 'Projekt',
      wiedervorlageAm: 'Wiedervorlage',
    },
  },
  zielrollen: {
    einzahl: 'Zielrolle',
    titel: (z: Eintrag<'zielrollen'>) => z.titel,
    felder: { ...gemeinsam },
  },
  bewerbungen: {
    einzahl: 'Bewerbung',
    titel: (b: Eintrag<'bewerbungen'>) => b.stelle,
    felder: {
      ...gemeinsam,
      stelle: 'Stelle',
      unternehmenId: 'Unternehmen',
      zielrolleId: 'Zielrolle',
      kontaktId: 'Ansprechpartner',
      quelle: 'Quelle',
      beworbenAm: 'Bewerbungsdatum',
      link: 'Link',
      naechsterSchritt: 'Nächster Schritt',
      wiedervorlageAm: 'Wiedervorlage',
    },
  },
}

export function titelVon<S extends Sammlung>(sammlung: S, eintrag: Eintrag<S>): string {
  return (SAMMLUNG_INFO[sammlung].titel as (e: Eintrag<S>) => string)(eintrag)
}

function gleich(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Namen der Felder, deren Wert sich tatsächlich geändert hat (ohne Meta-Felder). */
export function geaenderteFelder(vorher: Record<string, unknown>, nachher: Record<string, unknown>): string[] {
  const ignoriert = new Set(['id', 'erstelltAm', 'geaendertAm'])
  const keys = new Set([...Object.keys(vorher), ...Object.keys(nachher)])
  return [...keys].filter((key) => !ignoriert.has(key) && !gleich(vorher[key], nachher[key]))
}

export function feldnamen(sammlung: Sammlung, felder: string[]): string {
  const labels = SAMMLUNG_INFO[sammlung].felder
  return felder.map((feld) => labels[feld] ?? feld).join(', ')
}

export function aktivitaetText(
  art: Aktivitaet['art'],
  sammlung: Sammlung,
  titel: string,
  felder: string[] = [],
): string {
  const was = `${SAMMLUNG_INFO[sammlung].einzahl} „${titel}“`
  switch (art) {
    case 'angelegt':
      return `${was} angelegt`
    case 'geloescht':
      return `${was} gelöscht`
    case 'erledigt':
      return `${was} erledigt`
    case 'wieder_geoeffnet':
      return `${was} wieder geöffnet`
    default:
      return `${was} geändert: ${feldnamen(sammlung, felder)}`
  }
}
