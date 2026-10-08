import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from './app/routes.tsx'
import { StoreGate } from './app/StoreGate.tsx'
import { NAVIGATION } from './components/layout/navigation.ts'
import { beispielSeed } from './test/beispielStart.ts'
import { STORAGE_KEY } from './data/storage.ts'
import { StoreProvider } from './data/store.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import { createFakeStorage } from './test/fakes.ts'

function renderApp(pfad = '/', storage = createFakeStorage()) {
  return render(
    <StoreProvider storage={storage} createInitialData={() => beispielSeed()}>
      <StoreGate>
        <ToastProvider>
          <MemoryRouter initialEntries={[pfad]}>
            <AppRoutes />
          </MemoryRouter>
        </ToastProvider>
      </StoreGate>
    </StoreProvider>,
  )
}

/**
 * Die Desktop-Navigation (volle Labels). jsdom wertet keine Media Queries aus, daher ist sie
 * dort per CSS ausgeblendet und wird mit hidden: true abgefragt.
 */
function hauptnavigation() {
  return screen.getAllByRole('navigation', { name: 'Hauptnavigation', hidden: true })[0]!
}
const navLink = (name: string) => within(hauptnavigation()).getByRole('link', { name, hidden: true })

describe('App-Shell', () => {
  it('erreicht alle Bereiche und Werkzeugkasten-Unterpunkte über die Navigation', () => {
    renderApp()
    const links = within(hauptnavigation()).getAllByRole('link', { hidden: true })
    // Ohne Anmeldung kein Admin: „Nutzer & Rollen“ erscheint nur für Admins
    const sichtbar = NAVIGATION.filter((n) => n.to !== '/admin')
    expect(links.map((l) => l.textContent)).toEqual(sichtbar.map((n) => n.label))
    expect(NAVIGATION).toHaveLength(24)

    for (const eintrag of sichtbar) {
      fireEvent.click(navLink(eintrag.label))
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        eintrag.label === 'Arbeitscockpit' ? 'Arbeitscockpit' : eintrag.label,
      )
      expect(navLink(eintrag.label)).toHaveAttribute('aria-current', 'page')
    }
  }, 20_000)

  it('setzt den Fokus nach einem Seitenwechsel auf die Überschrift', () => {
    renderApp()
    fireEvent.click(navLink('Projekte'))
    expect(screen.getByRole('heading', { level: 1, name: 'Projekte' })).toHaveFocus()
    expect(document.title).toBe('Projekte – PIKARTZ.AI Arbeitscockpit')
  })

  it('hat einen Skip-Link zum Inhalt', () => {
    renderApp()
    const skip = screen.getByRole('link', { name: 'Zum Inhalt springen' })
    expect(skip).toHaveAttribute('href', '#inhalt')
    expect(document.getElementById('inhalt')?.tagName).toBe('MAIN')
  })

  it('kennzeichnet den Demo-Modus sichtbar', () => {
    renderApp()
    expect(screen.getByRole('note', { name: 'Speicherhinweis' })).toHaveTextContent('Demo-Modus.')
  })

  it('öffnet und schließt das mobile Menü und gibt den Fokus zurück', () => {
    renderApp()
    const oeffnen = screen.getByRole('button', { name: 'Menü öffnen' })
    fireEvent.click(oeffnen)
    expect(oeffnen).toHaveAttribute('aria-expanded', 'true')
    const dialog = screen.getByRole('dialog', { name: 'Menü' })
    fireEvent.click(within(dialog).getByRole('link', { name: 'Weiterbildung' }))
    expect(oeffnen).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { level: 1, name: 'Weiterbildung' })).toHaveFocus()

    fireEvent.click(oeffnen)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Menü' })).getByRole('button', { name: 'Menü schließen' }))
    expect(oeffnen).toHaveFocus()
  })

  it('zeigt Unterseiten und eine Seite für unbekannte Adressen', () => {
    renderApp('/kontakte/unternehmen')
    expect(screen.getByRole('heading', { level: 1, name: 'Unternehmen' })).toBeInTheDocument()
  })

  it('zeigt eine Seite für unbekannte Adressen', () => {
    renderApp('/gibt-es-nicht')
    expect(screen.getByRole('heading', { level: 1, name: 'Seite nicht gefunden' })).toBeInTheDocument()
  })
})

describe('StoreGate', () => {
  it('zeigt bei defekten Daten Export und Zurücksetzen mit Bestätigung', () => {
    const storage = createFakeStorage({ [STORAGE_KEY]: '{kaputt' })
    renderApp('/', storage)
    expect(screen.getByRole('heading', { level: 1, name: 'Daten konnten nicht geladen werden' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rohdaten verschlüsselt sichern' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Daten zurücksetzen' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Arbeitscockpit' })).toBeInTheDocument()
  })
})
