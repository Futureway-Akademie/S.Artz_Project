import { act, fireEvent, render, screen } from '@testing-library/react'
import { GmailContext } from '../../app/gmailContext.ts'
import { ToastProvider } from '../../components/ui/Toast.tsx'
import type { MailDienst } from '../../data/gmail/gmail.ts'
import { tokenSetzen } from '../../data/gmail/googleAuth.ts'
import { GmailPanel } from './GmailPanel.tsx'

function dienst(konfiguriert: boolean): MailDienst {
  return {
    konfiguriert,
    profil: vi.fn().mockResolvedValue('ich@example.org'),
    suchen: vi.fn(),
    holen: vi.fn(),
    trennen: vi.fn().mockImplementation(async () => tokenSetzen(null)),
  }
}

function zeige(d: MailDienst, onVerbinden = vi.fn()) {
  render(
    <ToastProvider>
      <GmailContext.Provider value={d}>
        <GmailPanel onVerbinden={onVerbinden} />
      </GmailContext.Provider>
    </ToastProvider>,
  )
  return onVerbinden
}

describe('Gmail in den Einstellungen', () => {
  afterEach(() => tokenSetzen(null))

  it('ohne Einrichtung: nur Hinweis, keine Verbindung', () => {
    const d = dienst(false)
    zeige(d)
    expect(screen.getByRole('region', { name: 'Gmail (nur lesen)' })).toHaveTextContent('Nicht eingerichtet')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('eingerichtet: erklärt den Ablauf und startet die Anmeldung erst auf Klick', () => {
    const onVerbinden = zeige(dienst(true))
    expect(screen.getByText(/Nur Leseberechtigung/)).toBeInTheDocument()
    expect(onVerbinden).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Mit Google verbinden' }))
    expect(onVerbinden).toHaveBeenCalledTimes(1)
  })

  it('verbunden: zeigt Gültigkeit und Adresse und trennt die Verbindung', async () => {
    tokenSetzen({ wert: 'tok', gueltigBis: new Date(2026, 9, 7, 10, 30).getTime() + 365 * 86_400_000 })
    const d = dienst(true)
    zeige(d)
    expect(screen.getByText(/Zugang gültig bis 10:30 Uhr/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Verbindung prüfen' }))
    expect(await screen.findByText(/Verbunden als ich@example.org/)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Trennen' }))
    })
    expect(d.trennen).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Mit Google verbinden' })).toBeInTheDocument()
  })
})
