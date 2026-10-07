import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { reducer } from '../../data/reducer.ts'
import { suche } from '../../domain/selectors/suche.ts'
import { selectVerknuepft } from '../../domain/selectors/verknuepft.ts'
import { leeresWerkzeug, promptAusfuellen, promptPlatzhalter, werkzeugListe, werkzeugVerknuepft, werkzeugZaehler } from '../../domain/selectors/werkzeug.ts'
import type { AppData, Werkzeug } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { createMeta } from '../../test/fakes.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-01T10:00:00.000Z'
const now = new Date(2026, 9, 7, 9, 0)

export const werkzeug = (id: string, typ: Werkzeug['typ'], extra: Partial<Werkzeug> = {}): Werkzeug => ({
  ...leeresWerkzeug(typ),
  id,
  titel: id,
  erstelltAm: zeit,
  geaendertAm: zeit,
  ...extra,
})

function daten(): AppData {
  return {
    ...beispielSeed(now),
    werkzeug: [
      werkzeug('p1', 'prompt', { titel: 'Anschreiben formulieren', plattform: 'Claude', inhalt: 'Schreibe an {{firma}}', schlagworte: ['Karriere'], projektIds: ['seed-projekt-ki-skills'] }),
      werkzeug('p2', 'prompt', { titel: 'Altes Prompt', status: 'archiviert' }),
      werkzeug('a1', 'agent', { titel: 'Recherche-Agent', werkzeugIds: ['i1'] }),
      werkzeug('i1', 'integration', { titel: 'Supabase MCP', plattform: 'Supabase' }),
    ],
  }
}

describe('Werkzeugkasten', () => {
  it('filtert, zählt ohne Archiviertes und kennt Verknüpfungen in beide Richtungen', () => {
    const d = daten()
    expect(werkzeugListe(d, 'prompt').map((w) => w.id)).toEqual(['p1', 'p2'])
    expect(werkzeugListe(d, 'prompt', { suche: 'firma', status: '', plattform: '', schlagwort: '' }).map((w) => w.id)).toEqual(['p1'])
    expect(werkzeugListe(d, 'prompt', { suche: '', status: '', plattform: 'claude', schlagwort: '' }).map((w) => w.id)).toEqual(['p1'])
    expect(werkzeugZaehler(d)).toMatchObject({ prompt: 1, agent: 1, integration: 1, abo: 0 })
    const i1 = d.werkzeug.find((w) => w.id === 'i1')!
    expect(werkzeugVerknuepft(d, i1).map((w) => w.id)).toEqual(['a1'])
  })

  it('ist durchsuchbar und am Projekt sichtbar', () => {
    const d = daten()
    expect(suche(d, 'anschreiben')[0]).toMatchObject({ art: 'Masterprompt', link: '/werkzeug/prompts/p1' })
    expect(selectVerknuepft(d, { art: 'projekt', id: 'seed-projekt-ki-skills' }, now).werkzeug.map((w) => w.id)).toEqual(['p1'])
  })

  it('löst Verknüpfungen beim Löschen von Projekt oder Werkzeug', () => {
    let d = reducer(daten(), { type: 'loeschen', sammlung: 'projekte', id: 'seed-projekt-ki-skills' }, createMeta())
    expect(d.werkzeug.find((w) => w.id === 'p1')!.projektIds).toEqual([])
    d = reducer(d, { type: 'loeschen', sammlung: 'werkzeug', id: 'i1' }, createMeta())
    expect(d.werkzeug.find((w) => w.id === 'a1')!.werkzeugIds).toEqual([])
  })

  it('erkennt Platzhalter ohne Dubletten und füllt nur ausgefüllte ein', () => {
    const text = 'Schreibe an {{Firma}} für {{ Stelle }} – {{firma}} {{leer}}'
    expect(promptPlatzhalter(text)).toEqual(['Firma', 'Stelle', 'leer'])
    expect(promptAusfuellen(text, { firma: 'ACME', Stelle: 'KI-Trainer', leer: '' })).toBe('Schreibe an ACME für KI-Trainer – ACME {{leer}}')
  })

  describe('Bedienung', () => {
    it('füllt Platzhalter eines Masterprompts aus und kopiert das Ergebnis', async () => {
      const schreiben = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: schreiben }, configurable: true })
      renderApp('/werkzeug/prompts/p1', { daten: daten() })
      const panel = screen.getByRole('region', { name: 'Ausfüllen und kopieren' })
      expect(panel).toHaveTextContent('0 von 1 Platzhaltern')
      fireEvent.change(within(panel).getByLabelText('firma'), { target: { value: 'ACME GmbH' } })
      expect(within(panel).getByLabelText('Prompt ausgefüllt')).toHaveTextContent('Schreibe an ACME GmbH')
      fireEvent.click(within(panel).getByRole('button', { name: 'Ausgefüllt kopieren' }))
      await waitFor(() => expect(schreiben).toHaveBeenCalledWith('Schreibe an ACME GmbH'))
      expect(await screen.findByText('In die Zwischenablage kopiert')).toBeInTheDocument()
    })

    it('kopiert einen Befehl direkt aus der Liste', async () => {
      const schreiben = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: schreiben }, configurable: true })
      renderApp('/werkzeug/befehle', { daten: { ...daten(), werkzeug: [werkzeug('b1', 'befehl', { titel: 'Tests', plattform: 'Terminal', inhalt: 'npx vitest run' })] } })
      fireEvent.click(screen.getByRole('button', { name: 'Tests kopieren' }))
      await waitFor(() => expect(schreiben).toHaveBeenCalledWith('npx vitest run'))
    })


    it('legt einen Masterprompt an und zeigt ihn im Detail', () => {
      const { gespeichert } = renderApp('/werkzeug/prompts')
      expect(screen.getByRole('heading', { level: 1, name: 'Masterprompts' })).toBeInTheDocument()
      fireEvent.click(screen.getAllByRole('button', { name: 'Neu: Masterprompt' })[0]!)
      const dialog = screen.getByRole('dialog', { name: 'Neu: Masterprompt' })
      fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Zusammenfassen' } })
      fireEvent.change(within(dialog).getByLabelText(/^Zielmodell/), { target: { value: 'Claude' } })
      fireEvent.change(within(dialog).getByLabelText(/^Prompt/), { target: { value: 'Fasse {{text}} zusammen.' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(screen.getByRole('heading', { level: 1, name: 'Zusammenfassen' })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Prompt' })).toHaveTextContent('Fasse {{text}} zusammen.')
      expect(screen.getByRole('region', { name: 'Ausfüllen und kopieren' })).toHaveTextContent('0 von 1 Platzhaltern')
      act(() => {
        window.dispatchEvent(new Event('pagehide'))
      })
      expect(gespeichert().werkzeug[0]).toMatchObject({ typ: 'prompt', titel: 'Zusammenfassen', plattform: 'Claude', status: 'aktiv' })
    })

    it('zeigt die Übersicht mit allen Bereichen und Anzahl', () => {
      renderApp('/werkzeug', { daten: daten() })
      const kacheln = screen.getByRole('list', { name: 'Bereiche des Werkzeugkastens' })
      expect(within(kacheln).getAllByRole('link')).toHaveLength(8)
      expect(within(kacheln).getByRole('link', { name: /Agenten/ })).toHaveTextContent('1')
    })

    it('zeigt für unbekannte Bereiche „Seite nicht gefunden“', () => {
      renderApp('/werkzeug/gibts-nicht')
      expect(screen.getByRole('heading', { level: 1, name: 'Seite nicht gefunden' })).toBeInTheDocument()
    })

    it('klappt den Werkzeugkasten in der Navigation ein und aus', () => {
      renderApp('/')
      const nav = screen.getAllByRole('navigation', { name: 'Hauptnavigation', hidden: true })[0]!
      const knopf = within(nav).getByRole('button', { name: 'KI-Werkzeugkasten', hidden: true })
      expect(knopf).toHaveAttribute('aria-expanded', 'true')
      fireEvent.click(knopf)
      expect(knopf).toHaveAttribute('aria-expanded', 'false')
      expect(within(nav).queryByRole('link', { name: 'Masterprompts' })).toBeNull()
    })
  })
})
