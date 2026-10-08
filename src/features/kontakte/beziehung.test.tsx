import { act, fireEvent, screen, within } from '@testing-library/react'
import { createEmptyData } from '../../data/empty.ts'
import { reducer } from '../../data/reducer.ts'
import { kontaktpflege, letzterKontakt, vorTagen } from '../../domain/selectors/beziehung.ts'
import type { AppData, Kontakt } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { createMeta } from '../../test/fakes.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-07-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }
const now = new Date(2026, 9, 7, 9, 0)

const kontakt = (id: string, name: string): Kontakt => ({
  id, name, rolle: '', unternehmenId: null, email: '', telefon: '', linkedinUrl: '', kontext: 'jobsuche', herkunft: '', notiz: '',
  projektIds: [], naechsteAktion: null, rechtsgrundlage: 'vertrag', zweck: 'Netzwerk', schlagworte: [], ...m,
})

function daten(): AppData {
  return {
    ...beispielSeed(now),
    kontakte: [kontakt('aktiv', 'Aktive Person'), kontakt('still', 'Stille Person')],
    interaktionen: [
      { id: 'i1', kontaktId: 'aktiv', art: 'telefonat', datum: '2026-10-02', text: 'Kurz gesprochen', projektId: null, bewerbungId: null, leadId: null, betreff: '', richtung: null, ...m },
      { id: 'i2', kontaktId: 'still', art: 'treffen', datum: '2026-07-20', text: 'Messe', projektId: null, bewerbungId: null, leadId: null, betreff: '', richtung: null, ...m },
    ],
  }
}

describe('Beziehungspflege', () => {
  it('kennt den letzten Kontakt und die Funkstille ab 60 Tagen', () => {
    const d = daten()
    expect(letzterKontakt(d, 'aktiv')).toBe('2026-10-02')
    expect(kontaktpflege(d, d.kontakte[0]!, now)).toEqual({ letzter: '2026-10-02', tage: 5, funkstille: false })
    expect(kontaktpflege(d, d.kontakte[1]!, now)).toMatchObject({ tage: 79, funkstille: true })
    expect([vorTagen(0), vorTagen(1), vorTagen(5)]).toEqual(['heute', 'gestern', 'vor 5 Tagen'])
  })

  it('setzt „zuletzt aktiv“ des Projekts automatisch, nie zurück', () => {
    const meta = createMeta('2026-10-07T10:00:00.000Z')
    let d: AppData = {
      ...createEmptyData(),
      projekte: [{ id: 'p1', titel: 'P', kategorie: '', beschreibung: '', status: null, zuletztAktiv: '2026-09-01', tools: [], bestandteile: [], notizen: '', automation: null, auftraggeberId: null, schlagworte: [], ...m }],
    }
    d = reducer(d, { type: 'anlegen', sammlung: 'aufgaben', daten: { titel: 'Schritt', notiz: '', erledigt: false, fokus: false, erledigtAm: null, faelligAm: null, bezug: { art: 'projekt', id: 'p1' } } }, meta)
    expect(d.projekte[0]!.zuletztAktiv).toBe('2026-10-07')
    expect(d.aktivitaeten).toHaveLength(1) // keine eigene Aktivität für die Projektänderung

    meta.setNow('2026-10-05T10:00:00.000Z')
    d = reducer(d, { type: 'anlegen', sammlung: 'interaktionen', daten: { kontaktId: 'k', art: 'notiz', datum: '2026-10-05', text: 'x', projektId: 'p1', bewerbungId: null, leadId: null, betreff: '', richtung: null } }, meta)
    expect(d.projekte[0]!.zuletztAktiv).toBe('2026-10-07')
  })

  describe('Bedienung', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(now)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('zeigt letzten Kontakt und Funkstille in der Liste und filtert danach', () => {
      renderApp('/kontakte', { daten: daten() })
      const liste = screen.getByRole('list', { name: 'Kontakte' })
      expect(within(liste).getByRole('link', { name: 'Aktive Person' }).closest('li')).toHaveTextContent('Letzter Kontakt vor 5 Tagen')
      expect(within(liste).getByRole('link', { name: 'Stille Person' }).closest('li')).toHaveTextContent('Funkstille')
      fireEvent.click(screen.getByRole('checkbox', { name: 'Funkstille' }))
      expect(within(screen.getByRole('list', { name: 'Kontakte' })).getAllByRole('link').map((l) => l.textContent)).toEqual(['Stille Person'])
    })

    it('fragt nach einem Verlaufseintrag nach der nächsten Aktion', () => {
      const { gespeichert } = renderApp('/kontakte/still', { daten: daten() })
      const form = screen.getByRole('form', { name: 'Verlaufseintrag hinzufügen' })
      fireEvent.change(within(form).getByLabelText(/^Inhalt/), { target: { value: 'Wieder gemeldet' } })
      fireEvent.click(within(form).getByRole('button', { name: 'Eintrag hinzufügen' }))
      const weiter = screen.getByRole('group', { name: 'Wie geht es weiter?' })
      fireEvent.change(within(weiter).getByLabelText('Nächste Aktion'), { target: { value: 'Angebot schicken' } })
      fireEvent.click(within(weiter).getByRole('button', { name: 'In 1 Woche' }))
      expect(screen.queryByRole('group', { name: 'Wie geht es weiter?' })).toBeNull()
      act(() => {
        window.dispatchEvent(new Event('pagehide'))
      })
      expect(gespeichert().kontakte.find((k) => k.id === 'still')!.naechsteAktion).toEqual({ text: 'Angebot schicken', faelligAm: '2026-10-14' })
    })
  })
})
