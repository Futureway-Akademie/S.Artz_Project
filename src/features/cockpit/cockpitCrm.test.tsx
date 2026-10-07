import { fireEvent, screen, within } from '@testing-library/react'
import { createSeedData } from '../../data/seed.ts'
import { selectCrmUebersicht } from '../../domain/selectors/crm.ts'
import type { AppData, Bewerbung, Kontakt, Lead } from '../../domain/types.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-01T10:00:00.000Z'
const meta = { erstelltAm: zeit, geaendertAm: zeit }
const now = new Date(2026, 9, 7, 9, 0)

const kontakt = (id: string, faelligAm: string | null): Kontakt => ({
  id,
  name: id,
  rolle: '',
  unternehmenId: null,
  email: '',
  telefon: '',
  linkedinUrl: '',
  kontext: 'jobsuche',
  herkunft: '',
  notiz: '',
  projektIds: [],
  naechsteAktion: { text: `Aktion ${id}`, faelligAm },
  ...meta,
})

const bewerbung = (id: string, status: Bewerbung['status']): Bewerbung => ({
  id,
  stelle: id,
  unternehmenId: null,
  zielrolleId: null,
  kontaktId: null,
  status,
  quelle: '',
  beworbenAm: null,
  link: '',
  naechsterSchritt: '',
  notiz: '',
  ...meta,
})

const lead = (id: string, status: Lead['status'], betragEur: number | null): Lead => ({
  id,
  titel: id,
  kontaktId: null,
  unternehmenId: null,
  status,
  betragEur,
  naechsterSchritt: '',
  notiz: '',
  ...meta,
})

const mitCrm = (): AppData => ({
  ...createSeedData(now, []),
  kontakte: [kontakt('ueberfaellig', '2026-10-05'), kontakt('heute', '2026-10-07'), kontakt('spaeter', '2026-10-20'), kontakt('ohne', null)],
  bewerbungen: [bewerbung('a', 'beworben'), bewerbung('b', 'beworben'), bewerbung('c', 'im_gespraech'), bewerbung('d', 'absage')],
  leads: [lead('l1', 'neu', null), lead('l2', 'angebot', 1200), lead('l3', 'zusage', 5000)],
})

describe('Cockpit-Bereich für Kontakte und Bewerbungen', () => {
  it('berechnet die Übersicht aus gespeicherten Daten', () => {
    expect(selectCrmUebersicht(mitCrm(), now)).toEqual({
      faelligeWiedervorlagen: 2,
      laufendeBewerbungen: [
        { status: 'beworben', anzahl: 2 },
        { status: 'im_gespraech', anzahl: 1 },
      ],
      laufendeBewerbungenGesamt: 3,
      offeneLeads: 2,
      offeneLeadSumme: 1200,
      leer: false,
    })
    expect(selectCrmUebersicht(createSeedData(now, []), now)).toMatchObject({ leer: true, offeneLeadSumme: null, faelligeWiedervorlagen: 0 })
  })

  describe('im Cockpit', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(now)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('zeigt ohne CRM-Daten einen Leerzustand', () => {
      renderApp('/')
      const bereich = screen.getByRole('region', { name: 'Kontakte & Bewerbungen' })
      expect(within(bereich).getByText('Noch keine Kontakte, Bewerbungen oder Leads')).toBeInTheDocument()
    })

    it('zeigt fällige Wiedervorlagen, laufende Bewerbungen und offene Leads und verlinkt gefiltert', () => {
      renderApp('/', { daten: mitCrm() })
      const bereich = screen.getByRole('region', { name: 'Kontakte & Bewerbungen' })
      expect(within(bereich).getByRole('link', { name: 'Fällige Wiedervorlagen' }).closest('li')).toHaveTextContent('Fällige Wiedervorlagen2')
      expect(within(bereich).getByText('Beworben: 2 · Im Gespräch: 1')).toBeInTheDocument()
      expect(within(bereich).getByText(/1\.200,00\s€/)).toBeInTheDocument()

      fireEvent.click(within(bereich).getByRole('link', { name: 'Fällige Wiedervorlagen' }))
      expect(screen.getByRole('checkbox', { name: 'Mit fälliger Aktion' })).toBeChecked()
      const namen = within(screen.getByRole('list', { name: 'Kontakte' }))
        .getAllByRole('link')
        .map((l) => l.textContent)
      expect(namen).toEqual(['ueberfaellig', 'heute'])
    })
  })
})
