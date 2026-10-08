import { screen } from '@testing-library/react'
import { alsGoogleTermin, type MailDienst } from '../../data/gmail/gmail.ts'
import { GMAIL_SCOPE, KALENDER_SCOPE, tokenSetzen } from '../../data/gmail/googleAuth.ts'
import { renderApp } from '../../test/renderApp.tsx'

function dienst(): MailDienst {
  return {
    konfiguriert: true,
    termine: vi.fn().mockResolvedValue([{ id: 'g1', titel: 'Zahnarzt', datum: '2026-10-07', uhrzeit: '08:30', ort: 'Praxis' }]),
    profil: vi.fn(),
    suchen: vi.fn(),
    holen: vi.fn(),
    trennen: vi.fn(),
  }
}

describe('Google-Kalender (nur lesen)', () => {
  afterEach(() => tokenSetzen(null))

  it('übernimmt nur Titel, Datum, Uhrzeit und Ort', () => {
    expect(alsGoogleTermin({ id: 'x', summary: ' Treffen ', location: 'Büro', start: { date: '2026-10-09' } })).toEqual({ id: 'x', titel: 'Treffen', datum: '2026-10-09', uhrzeit: null, ort: 'Büro' })
    const mitZeit = alsGoogleTermin({ id: 'y', start: { dateTime: new Date(2026, 9, 9, 14, 5).toISOString() } })
    expect(mitZeit).toMatchObject({ titel: '(ohne Titel)', datum: '2026-10-09', uhrzeit: '14:05' })
    expect(alsGoogleTermin({ id: 'z' })).toBeNull()
  })

  it('zeigt Google-Termine im Kalender, wenn verbunden', async () => {
    tokenSetzen({ wert: 'tok', scopes: [GMAIL_SCOPE, KALENDER_SCOPE], gueltigBis: Date.now() + 3_600_000 })
    const d = dienst()
    renderApp('/kalender?ansicht=liste&datum=2026-10-01', { mail: d })
    expect(await screen.findByText(/Zahnarzt/)).toBeInTheDocument()
    expect(d.termine).toHaveBeenCalledWith('2026-10-01', expect.any(String))
    expect(screen.getByRole('checkbox', { name: /Google/ })).toBeChecked()
  })

  it('fragt ohne Anmeldung nichts ab', async () => {
    const d = dienst()
    renderApp('/kalender?ansicht=liste&datum=2026-10-01', { mail: d })
    await screen.findByRole('heading', { level: 1, name: 'Kalender' })
    expect(d.termine).not.toHaveBeenCalled()
    expect(screen.queryByRole('checkbox', { name: /Google/ })).toBeNull()
  })
})
