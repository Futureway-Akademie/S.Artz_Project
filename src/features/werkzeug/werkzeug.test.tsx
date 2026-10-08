import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { reducer } from '../../data/reducer.ts'
import { suche } from '../../domain/selectors/suche.ts'
import { selectVerknuepft } from '../../domain/selectors/verknuepft.ts'
import { geheimnisVerdacht, leeresWerkzeug, promptAusfuellen, promptPlatzhalter, schritteAusText, werkzeugListe, werkzeugVerknuepft, werkzeugZaehler } from '../../domain/selectors/werkzeug.ts'
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

  it('übernimmt Schritte zeilenweise und behält den Erledigt-Status', () => {
    expect(schritteAusText('1. Node installieren\n- Repo klonen\n\n  Starten ', [{ text: 'Repo klonen', erledigt: true }])).toEqual([
      { text: 'Node installieren', erledigt: false },
      { text: 'Repo klonen', erledigt: true },
      { text: 'Starten', erledigt: false },
    ])
  })

  it('erkennt Schlüssel und Passwörter, aber keine normalen Texte', () => {
    expect(geheimnisVerdacht('sk-ant-TESTTESTTESTTESTTEST')).toBe('API-Schlüssel (sk-…)')
    expect(geheimnisVerdacht('Passwort: Geheim123!')).toBe('Passwort oder Schlüssel')
    expect(geheimnisVerdacht('Token AbCdEfGh1234567890IjKlMnOpQrStUv')).toBe('Schlüssel oder Token')
    expect(geheimnisVerdacht('Passwortmanager › Supabase')).toBeNull()
    expect(geheimnisVerdacht('https://supabase.com/docs/guides/getting-started/mcp?queryGroups=Client123')).toBeNull()
    expect(geheimnisVerdacht('Fasse {{text}} in drei Punkten zusammen.')).toBeNull()
    expect(geheimnisVerdacht('3f2a9c1e-5b7d-4e2a-9c1e-5b7d4e2a9c1e')).toBeNull()
  })

  describe('Bedienung', () => {
    it('legt ein Abo mit Kosten und Frist an – Summe, Cockpit und Dashboard zeigen es', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(now)
      try {
        const { unmount } = renderApp('/werkzeug/abos')
        fireEvent.click(screen.getAllByRole('button', { name: 'Neu: Modell / Abo' })[0]!)
        const dialog = screen.getByRole('dialog', { name: 'Neu: Modell / Abo' })
        fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Claude Pro' } })
        fireEvent.change(within(dialog).getByLabelText(/^Kosten pro Monat/), { target: { value: 'zwanzig' } })
        fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
        expect(within(dialog).getByText('Bitte einen Betrag wie 20 oder 21,42 eingeben.')).toBeInTheDocument()
        fireEvent.change(within(dialog).getByLabelText(/^Kosten pro Monat/), { target: { value: '21,42' } })
        fireEvent.change(within(dialog).getByLabelText(/^Nächste Verlängerung/), { target: { value: '2026-10-15' } })
        fireEvent.change(within(dialog).getByLabelText(/^Kündigungsfrist/), { target: { value: '3' } })
        fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
        const panel = screen.getByRole('region', { name: 'Kosten und Fristen' })
        expect(panel).toHaveTextContent('Kündigen bis')
        expect(panel).toHaveTextContent('12. Oktober 2026')
        fireEvent.click(screen.getByRole('link', { name: 'Modelle & Abos' }))
        expect(screen.getByText(/Laufende Kosten:/)).toHaveTextContent(/Laufende Kosten: 21,42\s€ pro Monat/)
        fireEvent.click(screen.getAllByRole('link', { name: 'Arbeitscockpit', hidden: true })[0]!)
        expect(screen.getByRole('region', { name: 'Abo-Fristen' })).toHaveTextContent('Claude Pro: kündigen bis')
        fireEvent.click(screen.getAllByRole('link', { name: 'Dashboard', hidden: true })[0]!)
        expect(screen.getByText('KI-Abos pro Monat').parentElement).toHaveTextContent(/21,42\s€/)
        unmount()
      } finally {
        vi.useRealTimers()
      }
    })

    it('speichert Integrationen mit Datenschutz-Angaben und warnt vor Schlüsseln', () => {
      const { gespeichert } = renderApp('/werkzeug/integrationen')
      fireEvent.click(screen.getAllByRole('button', { name: 'Neu: Integration' })[0]!)
      const dialog = screen.getByRole('dialog', { name: 'Neu: Integration' })
      fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Supabase MCP' } })
      fireEvent.change(within(dialog).getByLabelText(/^Art/), { target: { value: 'mcp' } })
      fireEvent.change(within(dialog).getByLabelText(/^Auftragsverarbeitung/), { target: { value: 'ja' } })
      fireEvent.change(within(dialog).getByLabelText(/^Region/), { target: { value: 'EU (Frankfurt)' } })
      fireEvent.change(within(dialog).getByLabelText(/^Ablageort/), { target: { value: 'sk-ant-TESTTESTTESTTESTTEST' } })
      expect(within(dialog).getByRole('alert')).toHaveTextContent('API-Schlüssel')
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      expect(screen.getByRole('dialog', { name: 'Neu: Integration' })).toBeInTheDocument()
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Bitte den Schlüssel entfernen')

      fireEvent.change(within(dialog).getByLabelText(/^Ablageort/), { target: { value: 'Passwortmanager › Supabase' } })
      expect(within(dialog).queryByRole('alert')).toBeNull()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      const panel = screen.getByRole('region', { name: 'Zugang und Datenschutz' })
      expect(panel).toHaveTextContent('liegen in: Passwortmanager › Supabase')
      expect(panel).toHaveTextContent('Abgeschlossen')
      act(() => {
        window.dispatchEvent(new Event('pagehide'))
      })
      expect(gespeichert().werkzeug[0]!.integration).toEqual({ art: 'mcp', schluesselOrt: 'Passwortmanager › Supabase', region: 'EU (Frankfurt)', avv: 'ja' })
      expect(JSON.stringify(gespeichert())).not.toContain('sk-ant-')
    })


    it('verknüpft einen Agenten mit einer Integration – sichtbar in beide Richtungen', () => {
      const d = { ...daten(), werkzeug: daten().werkzeug.map((w) => (w.id === 'a1' ? { ...w, werkzeugIds: [] } : w)) }
      renderApp('/werkzeug/agenten/a1', { daten: d })
      fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))
      const dialog = screen.getByRole('dialog', { name: 'Agent bearbeiten' })
      fireEvent.change(within(dialog).getByLabelText(/^Einsatzfall/), { target: { value: 'Firmenrecherche vor Bewerbungen' } })
      const werkzeuge = within(dialog).getByRole('group', { name: 'Werkzeuge' })
      expect(within(werkzeuge).getAllByRole('checkbox')[0]).toHaveAccessibleName('Supabase MCP (Integration)')
      fireEvent.click(within(werkzeuge).getByRole('checkbox', { name: 'Supabase MCP (Integration)' }))
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      expect(screen.getByText('Firmenrecherche vor Bewerbungen')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('link', { name: 'Supabase MCP' }))
      expect(screen.getByRole('heading', { level: 1, name: 'Supabase MCP' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Recherche-Agent' })).toHaveAttribute('href', '/werkzeug/agenten/a1')
    })

    it('zeigt Workflow-Schritte als Ablauf und hakt Anleitungsschritte mit Fortschritt ab', () => {
      const d = {
        ...daten(),
        werkzeug: [
          werkzeug('wf', 'workflow', { titel: 'Kontaktformular', schritte: [{ text: 'Webhook', erledigt: false }, { text: 'KI-Klassifizierung', erledigt: false }] }),
          werkzeug('an', 'anleitung', { titel: 'MCP einrichten', schritte: [{ text: 'Server installieren', erledigt: false }, { text: 'Testen', erledigt: false }] }),
        ],
      }
      const { unmount } = renderApp('/werkzeug/workflows/wf', { daten: d })
      expect(within(screen.getByRole('region', { name: 'Ablauf' })).getAllByRole('listitem').map((l) => l.textContent)).toEqual(['Webhook', 'KI-Klassifizierung'])
      unmount()
      renderApp('/werkzeug/anleitungen/an', { daten: d })
      const schritte = screen.getByRole('region', { name: 'Schritte' })
      fireEvent.click(within(schritte).getByRole('checkbox', { name: 'Server installieren' }))
      expect(within(schritte).getByRole('progressbar', { name: 'Schritte erledigt' })).toHaveAttribute('aria-valuenow', '1')
    })


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
