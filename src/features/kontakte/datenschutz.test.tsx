import { act, fireEvent, screen, within } from '@testing-library/react'
import type { AppData, Kontakt } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

const alt = { erstelltAm: '2024-01-10T10:00:00.000Z', geaendertAm: '2024-01-10T10:00:00.000Z' }

const kontakt = (id: string, name: string, extra: Partial<Kontakt> = {}): Kontakt => ({
  id,
  name,
  rolle: '',
  unternehmenId: null,
  email: '',
  telefon: '',
  linkedinUrl: '',
  kontext: 'jobsuche',
  herkunft: '',
  notiz: '',
  projektIds: [],
  naechsteAktion: null,
  rechtsgrundlage: null,
  zweck: '',
  ...alt,
  ...extra,
})

const daten = (): AppData => ({
  ...beispielSeed(),
  kontakte: [
    kontakt('k1', 'Kim Muster'),
    kontakt('k2', 'Lou Beispiel', { rechtsgrundlage: 'einwilligung', zweck: 'Netzwerk', erstelltAm: new Date().toISOString(), geaendertAm: new Date().toISOString() }),
  ],
})

describe('Datenschutz bei Kontakten', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
  })

  it('erfasst Rechtsgrundlage und Zweck beim Anlegen', () => {
    const { gespeichert } = renderApp('/kontakte')
    fireEvent.click(screen.getByRole('button', { name: 'Kontakt anlegen' }))
    const dialog = screen.getByRole('dialog', { name: 'Kontakt anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Kim Muster' } })
    fireEvent.change(within(dialog).getByLabelText(/^Rechtsgrundlage/), { target: { value: 'vertrag' } })
    expect(within(dialog).getByText(/Für einen Auftrag, ein Angebot oder eine Bewerbung nötig/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^Zweck/), { target: { value: 'Kundenanfrage' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

    const panel = screen.getByRole('region', { name: 'Datenschutz' })
    expect(within(panel).getByText('Vertrag oder Anbahnung (Art. 6 Abs. 1 b)')).toBeInTheDocument()
    expect(within(panel).getByText('Kundenanfrage')).toBeInTheDocument()
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().kontakte[0]).toMatchObject({ rechtsgrundlage: 'vertrag', zweck: 'Kundenanfrage' })
  })

  it('weist auf fehlende Angaben und lange Ruhe hin und erstellt eine Auskunft', async () => {
    renderApp('/kontakte/k1', { daten: daten() })
    const panel = screen.getByRole('region', { name: 'Datenschutz' })
    expect(within(panel).getAllByText('Noch nicht festgelegt')).toHaveLength(2)
    expect(within(panel).getByText(/Seit 12 Monaten keine Aktivität/)).toBeInTheDocument()

    const klick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(within(panel).getByRole('button', { name: 'Auskunft erstellen (Art. 15)' }))
    const anker = klick.mock.contexts[0] as HTMLAnchorElement
    expect(anker.download).toMatch(/^auskunft-kim-muster-\d{4}-\d{2}-\d{2}\.txt$/)
    const text = await (vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob).text()
    expect(text).toContain('Name: Kim Muster')
    expect(text).toContain('Rechtsgrundlage: nicht festgelegt')
    klick.mockRestore()
  })

  it('filtert Kontakte mit Prüfbedarf', () => {
    renderApp('/kontakte', { daten: daten() })
    const hinweis = screen.getByText('Datenschutz:').closest('p')!
    expect(hinweis).toHaveTextContent('1 Kontakt braucht eine Prüfung')
    fireEvent.click(within(hinweis).getByRole('button', { name: 'Anzeigen' }))
    expect(screen.getByRole('checkbox', { name: 'Datenschutz prüfen' })).toBeChecked()
    const namen = within(screen.getByRole('list', { name: 'Kontakte' }))
      .getAllByRole('link')
      .map((l) => l.textContent)
    expect(namen).toEqual(['Kim Muster'])
  })

  it('löscht vollständig und nennt verknüpfte Einträge, die bleiben', () => {
    const d = daten()
    const { gespeichert } = renderApp('/kontakte/k1', {
      daten: {
        ...d,
        bewerbungen: [
          { id: 'b1', stelle: 'Teamleitung', unternehmenId: null, zielrolleId: null, kontaktId: 'k1', status: 'beworben', quelle: '', beworbenAm: null, link: '', naechsterSchritt: '', notiz: '', ...alt },
        ],
        aktivitaeten: [{ id: 'a1', zeitpunkt: alt.erstelltAm, art: 'angelegt', bezug: { sammlung: 'kontakte', id: 'k1', titel: 'Kim Muster' }, zusammenfassung: 'Kontakt „Kim Muster“ angelegt' }],
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    const dialog = screen.getByRole('dialog', { name: 'Kontakt löschen?' })
    expect(within(dialog).getByText(/auch aus dem Aktivitätsprotokoll/)).toBeInTheDocument()
    expect(within(dialog).getByText('Bewerbung: Teamleitung')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Kontakt löschen' }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(JSON.stringify(gespeichert())).not.toContain('Kim Muster')
  })

  it('erklärt den Datenschutz in den Einstellungen und verlinkt den Prüffilter', () => {
    renderApp('/einstellungen', { daten: daten() })
    const panel = screen.getByRole('region', { name: 'Datenschutz' })
    expect(within(panel).getByText(/Nichts verlässt diesen Browser/)).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('link', { name: 'Kontakte mit Prüfbedarf anzeigen (1)' }))
    expect(screen.getByRole('checkbox', { name: 'Datenschutz prüfen' })).toBeChecked()
  })
})
