import { formatDatum } from '../dates.ts'
import type { AppData } from '../types.ts'

export interface Treffer {
  /** Eindeutig über alle Bereiche */
  schluessel: string
  /** z. B. „Kontakt“ */
  art: string
  titel: string
  unter: string
  link: string
  /** Höher = besser */
  rang: number
}

const normal = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')

/** Rang: Titel beginnt mit dem Suchwort > Wort im Titel beginnt damit > irgendwo im Titel > nur in weiteren Feldern. */
function bewerte(titel: string, weitere: string[], woerter: string[]): number {
  const t = normal(titel)
  const rest = normal(weitere.join(' '))
  let rang = 0
  for (const w of woerter) {
    if (t.startsWith(w)) rang += 4
    else if (t.split(/[\s\-–/(,.]+/).some((teil) => teil.startsWith(w))) rang += 3
    else if (t.includes(w)) rang += 2
    else if (rest.includes(w)) rang += 1
    else return 0 // alle Wörter müssen vorkommen
  }
  return rang
}

/** Volltextsuche über alle Bereiche; leere Suche liefert nichts. */
export function suche(data: AppData, eingabe: string, max = 30): Treffer[] {
  const woerter = normal(eingabe).split(/\s+/).filter(Boolean)
  if (woerter.length === 0) return []
  const treffer: Treffer[] = []
  const add = (t: Omit<Treffer, 'rang'>, weitere: string[]) => {
    const rang = bewerte(t.titel, [t.unter, ...weitere], woerter)
    if (rang > 0) treffer.push({ ...t, rang })
  }
  const firma = (id: string | null) => data.unternehmen.find((u) => u.id === id)?.name ?? ''

  for (const p of data.projekte)
    add({ schluessel: `projekt:${p.id}`, art: 'Projekt', titel: p.titel, unter: p.kategorie, link: `/projekte/${p.id}` }, [p.beschreibung, p.notizen, ...p.tools, ...p.schlagworte])
  for (const k of data.kontakte)
    add(
      { schluessel: `kontakt:${k.id}`, art: 'Kontakt', titel: k.name, unter: [k.rolle, firma(k.unternehmenId)].filter(Boolean).join(' · '), link: `/kontakte/${k.id}` },
      [k.email, k.telefon, k.herkunft, k.notiz, ...k.schlagworte],
    )
  for (const u of data.unternehmen)
    add({ schluessel: `unternehmen:${u.id}`, art: 'Unternehmen', titel: u.name, unter: u.branche, link: `/kontakte/unternehmen/${u.id}` }, [u.website, u.notiz, ...u.schlagworte])
  for (const b of data.bewerbungen)
    add({ schluessel: `bewerbung:${b.id}`, art: 'Bewerbung', titel: b.stelle, unter: firma(b.unternehmenId), link: `/bewerbungen/${b.id}` }, [b.quelle, b.notiz, b.naechsterSchritt])
  for (const l of data.leads)
    add({ schluessel: `lead:${l.id}`, art: 'Lead', titel: l.titel, unter: firma(l.unternehmenId), link: `/kontakte/leads/${l.id}` }, [l.notiz, l.naechsterSchritt])
  for (const a of data.aufgaben)
    add(
      { schluessel: `aufgabe:${a.id}`, art: a.erledigt ? 'Aufgabe (erledigt)' : 'Aufgabe', titel: a.titel, unter: a.faelligAm ? `Frist ${formatDatum(a.faelligAm)}` : '', link: '/aufgaben' },
      [a.notiz],
    )
  for (const t of data.termine)
    add({ schluessel: `termin:${t.id}`, art: 'Termin', titel: t.titel, unter: formatDatum(t.datum), link: '/aufgaben?ansicht=termine' }, [t.ort, t.notiz])
  for (const i of data.interaktionen) {
    const person = data.kontakte.find((k) => k.id === i.kontaktId)
    add(
      { schluessel: `verlauf:${i.id}`, art: 'Verlauf', titel: i.betreff || i.text.slice(0, 80), unter: `${person?.name ?? ''} · ${formatDatum(i.datum)}`, link: person ? `/kontakte/${person.id}` : '/kontakte' },
      [i.text],
    )
  }
  for (const w of data.wissen)
    add(
      { schluessel: `wissen:${w.id}`, art: w.typ === 'tagebuch' ? 'Lerntagebuch' : 'Wissen', titel: w.titel, unter: [w.thema, w.datum && formatDatum(w.datum)].filter(Boolean).join(' · '), link: `/wissen/${w.id}` },
      [w.inhalt, w.quelle, ...w.schlagworte],
    )
  for (const k of data.kursAufgaben)
    add({ schluessel: `kursaufgabe:${k.id}`, art: 'Kursaufgabe', titel: `${k.code} ${k.titel}`, unter: '', link: '/weiterbildung' }, [k.notiz])

  return treffer.sort((a, b) => b.rang - a.rang || a.titel.localeCompare(b.titel, 'de')).slice(0, max)
}
