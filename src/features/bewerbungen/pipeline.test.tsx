import { act, fireEvent, screen, within } from '@testing-library/react'
import { bewerbungKennzahlen, bewerbungPipeline } from '../../domain/selectors/bewerbungen.ts'
import { selectNaechsteSchritte } from '../../domain/selectors/cockpit.ts'
import type { AppData, Bewerbung } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-09-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }
const now = new Date(2026, 9, 7, 9, 0)

const bewerbung = (id: string, status: Bewerbung['status'], extra: Partial<Bewerbung> = {}): Bewerbung => ({
  id,
  stelle: `Stelle ${id}`,
  unternehmenId: null,
  zielrolleId: null,
  kontaktId: null,
  status,
  quelle: '',
  beworbenAm: null,
  link: '',
  naechsterSchritt: '',
  notiz: '',
  wiedervorlageAm: null,
  ...m,
  ...extra,
})

function daten(): AppData {
  return {
    ...beispielSeed(now),
    bewerbungen: [
      bewerbung('a', 'geplant'),
      bewerbung('b', 'beworben', { beworbenAm: '2026-09-10' }),
      bewerbung('c', 'beworben', { beworbenAm: '2026-10-01', wiedervorlageAm: '2026-10-05', naechsterSchritt: 'Anrufen' }),
      bewerbung('d', 'im_gespraech'),
      bewerbung('e', 'angebot'),
      bewerbung('f', 'absage'),
      bewerbung('g', 'zurueckgezogen', { wiedervorlageAm: '2026-10-01' }),
    ],
  }
}

describe('Bewerbungsübersicht', () => {
  it('berechnet Kennzahlen', () => {
    expect(bewerbungKennzahlen(daten(), now)).toEqual({
      gesamt: 7,
      laufend: 5,
      gespraeche: 2,
      angebote: 1,
      absagen: 1,
      antwortquote: 50, // 3 Rückmeldungen von 6 versendeten
      ohneAntwort: 1,
      faelligeWiedervorlagen: 1,
    })
  })

  it('ordnet die Pipeline nach Status, fällige Wiedervorlagen zuerst', () => {
    const p = bewerbungPipeline(daten())
    expect(p.map((s) => s.status)).toEqual(['geplant', 'beworben', 'im_gespraech', 'angebot', 'absage', 'zurueckgezogen'])
    expect(p[1]!.bewerbungen.map((b) => b.id)).toEqual(['c', 'b'])
  })

  it('zeigt Wiedervorlagen laufender Bewerbungen im Cockpit, beendete nicht', () => {
    const schritte = selectNaechsteSchritte(daten()).eintraege.filter((s) => s.art === 'wiedervorlage')
    expect(schritte.map((s) => [s.titel, s.bezug])).toEqual([['Anrufen', { art: 'bewerbung', id: 'c' }]])
  })

  describe('Seite', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(now)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('zeigt Kennzahlen und wechselt in der Pipeline den Status', () => {
      const { gespeichert } = renderApp('/bewerbungen', { daten: daten() })
      const kennzahlen = screen.getByRole('region', { name: 'Kennzahlen' })
      expect(within(kennzahlen).getByText('Antwortquote').closest('div')).toHaveTextContent('50 %')

      fireEvent.click(screen.getByRole('tab', { name: 'Pipeline' }))
      const beworben = screen.getByRole('region', { name: /^Beworben/ })
      expect(within(beworben).getAllByRole('link').map((l) => l.textContent)).toEqual(['Stelle c', 'Stelle b'])
      fireEvent.change(within(beworben).getByLabelText('Status von „Stelle b“'), { target: { value: 'im_gespraech' } })
      expect(within(screen.getByRole('region', { name: /^Im Gespräch/ })).getByRole('link', { name: 'Stelle b' })).toBeInTheDocument()
      act(() => {
        window.dispatchEvent(new Event('pagehide'))
      })
      expect(gespeichert().bewerbungen.find((b) => b.id === 'b')!.status).toBe('im_gespraech')
    })

    it('ändert den Status auch auf der Detailseite', () => {
      renderApp('/bewerbungen/d', { daten: daten() })
      fireEvent.change(screen.getByLabelText(/^Status/), { target: { value: 'angebot' } })
      expect(screen.getByText('Status gespeichert')).toBeInTheDocument()
    })
  })
})
