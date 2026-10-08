import { screen } from '@testing-library/react'
import { alsGoogleTermin, type MailDienst } from '../../data/gmail/gmail.ts'
import { GMAIL_SCOPE, KALENDER_SCOPE, tokenSetzen } from '../../data/gmail/googleAuth.ts'
import { renderApp } from '../../test/renderApp.tsx'

function dienst(): MailDienst {
  return {
    konfiguriert: true,
    termine: vi.fn().mockResolvedValue([{ id: 'g1', titel: 'Zahnarzt', datum: '2026-10-07', uhrzeit: '08:30', ort: 'Praxis' }]),
    terminEintragen: vi.fn().mockResolvedValue(undefined),
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

describe('Termine in Google-Kalender eintragen', () => {
  afterEach(() => tokenSetzen(null))

  it('baut ein Ereignis mit Zeitzone Berlin bzw. ganztägig', async () => {
    const { googleEreignis } = await import('../../data/gmail/gmail.ts')
    expect(googleEreignis({ titel: 'Gespräch', datum: '2026-10-16', uhrzeit: '10:00', ort: 'Video' })).toEqual({
      summary: 'Gespräch',
      location: 'Video',
      start: { dateTime: '2026-10-16T10:00:00', timeZone: 'Europe/Berlin' },
      end: { dateTime: '2026-10-16T11:00:00', timeZone: 'Europe/Berlin' },
    })
    expect(googleEreignis({ titel: 'Messe', datum: '2026-10-31', uhrzeit: null, ort: '' })).toEqual({ summary: 'Messe', location: undefined, start: { date: '2026-10-31' }, end: { date: '2026-11-01' } })
  })

  it('fragt die Schreibberechtigung erst an und trägt danach nach Bestätigung ein', async () => {
    const { fireEvent, within, act } = await import('@testing-library/react')
    const { KALENDER_SCHREIBEN_SCOPE } = await import('../../data/gmail/googleAuth.ts')
    const zeit = '2026-10-01T10:00:00.000Z'
    const daten = { ...(await import('../../test/beispielStart.ts')).beispielSeed(), termine: [{ id: 't1', titel: 'Zweitgespräch', datum: '2099-10-16', uhrzeit: '10:00', ort: 'Video', notiz: '', bezug: { art: 'ohne' as const, id: null }, erstelltAm: zeit, geaendertAm: zeit }] }
    const d = dienst()

    // Nur Leseberechtigung: Klick führt zur Anfrage bei Google
    tokenSetzen({ wert: 'tok', scopes: [GMAIL_SCOPE, KALENDER_SCOPE], gueltigBis: Date.now() + 3_600_000 })
    const { unmount } = renderApp('/aufgaben?ansicht=termine', { daten, mail: d })
    fireEvent.click(await screen.findByRole('button', { name: '„Zweitgespräch“ in Google-Kalender eintragen' }))
    expect(screen.getByRole('dialog', { name: 'Berechtigung bei Google anfragen?' })).toBeInTheDocument()
    unmount()

    // Mit Schreibberechtigung: Bestätigen trägt ein
    tokenSetzen({ wert: 'tok', scopes: [GMAIL_SCOPE, KALENDER_SCOPE, KALENDER_SCHREIBEN_SCOPE], gueltigBis: Date.now() + 3_600_000 })
    renderApp('/aufgaben?ansicht=termine', { daten, mail: d })
    fireEvent.click(await screen.findByRole('button', { name: '„Zweitgespräch“ in Google-Kalender eintragen' }))
    const dialog = screen.getByRole('dialog', { name: 'In Google-Kalender eintragen?' })
    expect(d.terminEintragen).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Eintragen' }))
    })
    expect(d.terminEintragen).toHaveBeenCalledWith({ titel: 'Zweitgespräch', datum: '2099-10-16', uhrzeit: '10:00', ort: 'Video' })
  })
})
