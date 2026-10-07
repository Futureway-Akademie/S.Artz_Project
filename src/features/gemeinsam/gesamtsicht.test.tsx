import { act, fireEvent, screen, within } from '@testing-library/react'
import { selectVerknuepft } from '../../domain/selectors/verknuepft.ts'
import type { AppData } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }
const now = new Date(2026, 9, 7, 10, 0)

function daten(): AppData {
  return {
    ...beispielSeed(now),
    unternehmen: [{ id: 'u1', name: 'Kunde GmbH', branche: 'Handel', website: '', notiz: '', schlagworte: [], ...m }],
    kontakte: [
      {
        id: 'k1', name: 'Kim Muster', rolle: 'Recruiterin', unternehmenId: 'u1', email: '', telefon: '', linkedinUrl: '', kontext: 'jobsuche',
        herkunft: '', notiz: '', projektIds: ['seed-projekt-kundenformular'], naechsteAktion: null, rechtsgrundlage: 'vertrag', zweck: 'Bewerbung', schlagworte: [], ...m,
      },
    ],
    bewerbungen: [
      { id: 'b1', stelle: 'Analyst', unternehmenId: 'u1', zielrolleId: null, kontaktId: 'k1', status: 'im_gespraech', quelle: '', beworbenAm: null, link: '', naechsterSchritt: 'Gespräch vorbereiten', notiz: '', wiedervorlageAm: '2026-10-09', ...m },
    ],
    leads: [{ id: 'l1', titel: 'Workshop', kontaktId: 'k1', unternehmenId: 'u1', status: 'angebot', betragEur: 900, naechsterSchritt: '', notiz: '', projektId: 'seed-projekt-kundenformular', wiedervorlageAm: null, ...m }],
    interaktionen: [
      { id: 'i1', kontaktId: 'k1', art: 'email', datum: '2026-10-02', text: 'Unterlagen geschickt', projektId: null, bewerbungId: 'b1', leadId: null, betreff: 'Meine Bewerbung', richtung: 'ausgang', ...m },
      { id: 'i2', kontaktId: 'k1', art: 'telefonat', datum: '2026-10-03', text: 'Angebot besprochen', projektId: null, bewerbungId: null, leadId: 'l1', betreff: '', richtung: null, ...m },
    ],
    aufgaben: [
      ...beispielSeed(now).aufgaben,
      { id: 'a1', titel: 'Gespräch üben', notiz: '', erledigt: false, fokus: false, erledigtAm: null, faelligAm: '2026-10-08', bezug: { art: 'bewerbung', id: 'b1' }, ...m },
      { id: 'a2', titel: 'Kim anrufen', notiz: '', erledigt: false, fokus: false, erledigtAm: null, faelligAm: null, bezug: { art: 'kontakt', id: 'k1' }, ...m },
    ],
    termine: [{ id: 't1', titel: 'Vorstellungsgespräch', datum: '2026-10-12', uhrzeit: '10:00', ort: '', notiz: '', bezug: { art: 'bewerbung', id: 'b1' }, ...m }],
  }
}

describe('Gesamtsicht', () => {
  it('sammelt beim Unternehmen auch Einträge seiner Kontakte, Bewerbungen und Leads', () => {
    const v = selectVerknuepft(daten(), { art: 'unternehmen', id: 'u1' }, now)
    expect(v.aufgaben.map((a) => a.titel)).toEqual(['Gespräch üben', 'Kim anrufen'])
    expect(v.termine.map((t) => t.titel)).toEqual(['Vorstellungsgespräch'])
    expect(v.verlauf.map((i) => i.id)).toEqual(['i2', 'i1'])
    expect(v.kontakte.map((k) => k.name)).toEqual(['Kim Muster'])
    expect(v.bewerbungen).toHaveLength(1)
    expect(v.leads).toHaveLength(1)
  })

  it('zeigt beim Projekt verknüpfte Leads und deren Verlauf, bei der Bewerbung nur ihren Verlauf', () => {
    const p = selectVerknuepft(daten(), { art: 'projekt', id: 'seed-projekt-kundenformular' }, now)
    expect(p.leads.map((l) => l.titel)).toEqual(['Workshop'])
    expect(p.verlauf.map((i) => i.id)).toEqual(['i2'])
    expect(p.kontakte.map((k) => k.name)).toEqual(['Kim Muster'])
    const b = selectVerknuepft(daten(), { art: 'bewerbung', id: 'b1' }, now)
    expect(b.verlauf.map((i) => i.id)).toEqual(['i1'])
    expect(b.aufgaben.map((a) => a.titel)).toEqual(['Gespräch üben'])
  })

  describe('in der App', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(now)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('Bewerbung: eigene Detailseite mit Angaben, Verlauf, Termin und Aufgabe', () => {
      renderApp('/bewerbungen', { daten: daten() })
      fireEvent.click(within(screen.getByRole('list', { name: 'Bewerbungen' })).getByRole('link', { name: 'Analyst' }))
      expect(screen.getByRole('heading', { level: 1, name: 'Analyst' })).toBeInTheDocument()
      const alles = screen.getByRole('region', { name: 'Alles dazu' })
      expect(within(alles).getByRole('button', { name: 'Gespräch üben' })).toBeInTheDocument()
      expect(within(alles).getByRole('button', { name: 'Vorstellungsgespräch' })).toBeInTheDocument()
      expect(within(alles).getByText('Meine Bewerbung')).toBeInTheDocument()
      const angaben = screen.getByRole('region', { name: 'Angaben' })
      expect(within(angaben).getByRole('link', { name: 'Kim Muster' })).toHaveAttribute('href', '/kontakte/k1')
    })

    it('legt aus der Gesamtsicht eine Aufgabe mit passendem Bezug an', () => {
      const { gespeichert } = renderApp('/kontakte/leads/l1', { daten: daten() })
      expect(screen.getByRole('heading', { level: 1, name: 'Workshop' })).toBeInTheDocument()
      fireEvent.click(within(screen.getByRole('region', { name: 'Alles dazu' })).getByRole('button', { name: '+ Aufgabe' }))
      const dialog = screen.getByRole('dialog')
      fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Angebot schreiben' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      expect(within(screen.getByRole('region', { name: 'Alles dazu' })).getByRole('button', { name: 'Angebot schreiben' })).toBeInTheDocument()
      act(() => {
        window.dispatchEvent(new Event('pagehide'))
      })
      expect(gespeichert().aufgaben.find((a) => a.titel === 'Angebot schreiben')!.bezug).toEqual({ art: 'lead', id: 'l1' })
    })

    it('Unternehmen zeigt indirekt verknüpfte Aufgaben mit Herkunft', () => {
      renderApp('/kontakte/unternehmen/u1', { daten: daten() })
      const alles = screen.getByRole('region', { name: 'Alles dazu' })
      expect(within(alles).getByRole('button', { name: 'Kim anrufen' }).closest('li')).toHaveTextContent('Kim Muster')
      expect(within(alles).getByRole('link', { name: 'Analyst' })).toHaveAttribute('href', '/bewerbungen/b1')
      expect(within(alles).getByRole('link', { name: 'Workshop' })).toHaveAttribute('href', '/kontakte/leads/l1')
    })
  })
})
