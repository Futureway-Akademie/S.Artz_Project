import { act, fireEvent, screen, within } from '@testing-library/react'
import { reducer } from '../../data/reducer.ts'
import { suche } from '../../domain/selectors/suche.ts'
import { selectVerknuepft } from '../../domain/selectors/verknuepft.ts'
import { tagebuchEintrag, wissenListe, wissenThemen } from '../../domain/selectors/wissen.ts'
import type { AppData, Wissen } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { createMeta } from '../../test/fakes.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }
const now = new Date(2026, 9, 7, 9, 0)

const eintrag = (id: string, extra: Partial<Wissen>): Wissen => ({
  id,
  typ: 'notiz',
  titel: id,
  inhalt: '',
  thema: '',
  quelle: '',
  schlagworte: [],
  datum: null,
  projektIds: [],
  kursId: null,
  kursAufgabeIds: [],
  ...m,
  ...extra,
})

function daten(): AppData {
  return {
    ...beispielSeed(now),
    wissen: [
      eintrag('w1', { typ: 'erkenntnis', titel: 'Klassifizieren mit Begründung', inhalt: 'Ordne die Anfrage einer Kategorie zu …', thema: 'Prompting', schlagworte: ['n8n'], projektIds: ['seed-projekt-ki-skills'] }),
      eintrag('w2', { typ: 'tagebuch', titel: 'Kurstag 47', inhalt: 'Webhooks verstanden', datum: '2026-10-06', kursId: 'seed-kurs-beispiel' }),
      eintrag('w3', { typ: 'tool', titel: 'Werkzeug B', thema: 'prompting' }),
    ],
  }
}

describe('Zweites Gehirn', () => {
  it('filtert, kennt Themen ohne Dubletten und findet das Tagebuch je Tag', () => {
    const d = daten()
    expect(wissenThemen(d)).toEqual(['Prompting'])
    expect(wissenListe(d, { suche: '', typ: 'erkenntnis', thema: '', schlagwort: '' }).map((w) => w.id)).toEqual(['w1'])
    expect(wissenListe(d, { suche: 'webhooks', typ: '', thema: '', schlagwort: '' }).map((w) => w.id)).toEqual(['w2'])
    expect(wissenListe(d, { suche: '', typ: '', thema: 'PROMPTING', schlagwort: '' }).map((w) => w.id).sort()).toEqual(['w1', 'w3'])
    expect(tagebuchEintrag(d, '2026-10-06')?.id).toBe('w2')
  })

  it('ist mit Projekten verknüpft und durchsuchbar', () => {
    const d = daten()
    expect(selectVerknuepft(d, { art: 'projekt', id: 'seed-projekt-ki-skills' }, now).wissen.map((w) => w.id)).toEqual(['w1'])
    expect(suche(d, 'klassifizieren')[0]).toMatchObject({ art: 'Wissen', link: '/wissen/w1' })
    expect(suche(d, 'webhooks')[0]).toMatchObject({ art: 'Lerntagebuch' })
  })

  it('löst Verknüpfungen, wenn Projekt oder Kurs gelöscht werden', () => {
    let d = reducer(daten(), { type: 'loeschen', sammlung: 'projekte', id: 'seed-projekt-ki-skills' }, createMeta())
    expect(d.wissen.find((w) => w.id === 'w1')!.projektIds).toEqual([])
    d = reducer(d, { type: 'loeschen', sammlung: 'kurse', id: 'seed-kurs-beispiel' }, createMeta())
    expect(d.wissen.find((w) => w.id === 'w2')!.kursId).toBeNull()
  })

  describe('Bedienung', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(now)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('legt eine Erkenntnis mit Thema, Schlagworten und Projekt an und zeigt ihn im Detail', () => {
      const { gespeichert } = renderApp('/wissen')
      expect(screen.getByText('Noch kein Wissen festgehalten')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Wissen festhalten' }))
      const dialog = screen.getByRole('dialog', { name: 'Wissen festhalten' })
      fireEvent.change(within(dialog).getByLabelText(/^Art/), { target: { value: 'erkenntnis' } })
      fireEvent.change(within(dialog).getByLabelText(/^Titel/), { target: { value: 'Zusammenfassen in 3 Punkten' } })
      fireEvent.change(within(dialog).getByLabelText(/^Thema/), { target: { value: 'Prompting' } })
      fireEvent.change(within(dialog).getByLabelText(/^Inhalt/), { target: { value: 'Fasse den Text in 3 Punkten zusammen.' } })
      fireEvent.change(within(dialog).getByLabelText(/^Schlagworte/), { target: { value: 'Claude, Alltag' } })
      fireEvent.click(within(within(dialog).getByRole('group', { name: 'Projekte' })).getByRole('checkbox', { name: 'KI-Skills' }))
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      fireEvent.click(within(screen.getByRole('list', { name: 'Wissen' })).getByRole('link', { name: 'Zusammenfassen in 3 Punkten' }))
      expect(screen.getByRole('heading', { level: 1, name: 'Zusammenfassen in 3 Punkten' })).toBeInTheDocument()
      expect(screen.getByText('Fasse den Text in 3 Punkten zusammen.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'KI-Skills' })).toHaveAttribute('href', '/projekte/seed-projekt-ki-skills')
      act(() => {
        window.dispatchEvent(new Event('pagehide'))
      })
      expect(gespeichert().wissen[0]).toMatchObject({ typ: 'erkenntnis', thema: 'Prompting', schlagworte: ['Claude', 'Alltag'], projektIds: ['seed-projekt-ki-skills'] })
    })

    it('führt das Lerntagebuch auf der Weiterbildungsseite mit dem heutigen Kurstag', () => {
      renderApp('/weiterbildung')
      const panel = screen.getByRole('region', { name: 'Lerntagebuch' })
      fireEvent.click(within(panel).getByRole('button', { name: 'Heute eintragen' }))
      const dialog = screen.getByRole('dialog', { name: 'Wissen festhalten' })
      expect(within(dialog).getByLabelText(/^Titel/)).toHaveValue('Kurstag 48 – Mi., 07.10.2026')
      expect(within(dialog).getByLabelText(/^Kurstag/)).toHaveValue('2026-10-07')
      fireEvent.change(within(dialog).getByLabelText(/^Inhalt/), { target: { value: 'Supabase und RLS' } })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
      expect(within(screen.getByRole('region', { name: 'Lerntagebuch' })).getByRole('link', { name: 'Heutigen Eintrag öffnen' })).toBeInTheDocument()
    })

    it('zeigt verknüpftes Wissen auf der Projektseite', () => {
      renderApp('/projekte/seed-projekt-ki-skills', { daten: daten() })
      expect(within(screen.getByRole('region', { name: 'Alles dazu' })).getByRole('link', { name: 'Klassifizieren mit Begründung' })).toHaveAttribute('href', '/wissen/w1')
    })
  })
})
