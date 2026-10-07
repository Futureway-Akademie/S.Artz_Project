import { act, fireEvent, screen, within } from '@testing-library/react'
import { fuelle, mailtoLink, offenePlatzhalter, platzhalterWerte } from '../../domain/selectors/vorlagen.ts'
import type { AppData } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

const zeit = '2026-10-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }

function daten(): AppData {
  return {
    ...beispielSeed(),
    unternehmen: [{ id: 'u1', name: 'Kunde GmbH', branche: '', website: '', notiz: '', schlagworte: [], ...m }],
    kontakte: [
      {
        id: 'k1', name: 'Kim Muster', rolle: '', unternehmenId: 'u1', email: 'kim@example.org', telefon: '', linkedinUrl: '', kontext: 'jobsuche',
        herkunft: '', notiz: '', projektIds: [], naechsteAktion: null, rechtsgrundlage: 'vertrag', zweck: 'Bewerbung', schlagworte: [], ...m,
      },
      {
        id: 'k2', name: 'Ohne Mail', rolle: '', unternehmenId: null, email: '', telefon: '', linkedinUrl: '', kontext: 'jobsuche',
        herkunft: '', notiz: '', projektIds: [], naechsteAktion: null, rechtsgrundlage: null, zweck: '', schlagworte: [], ...m,
      },
    ],
    bewerbungen: [
      { id: 'b1', stelle: 'Datenanalyst', unternehmenId: 'u1', zielrolleId: null, kontaktId: 'k1', status: 'beworben', quelle: '', beworbenAm: null, link: '', naechsterSchritt: '', notiz: '', wiedervorlageAm: null, ...m },
    ],
  }
}

describe('Vorlagen und Platzhalter', () => {
  it('füllt Platzhalter und meldet offene', () => {
    const d = daten()
    const werte = platzhalterWerte(d, d.kontakte[0]!, { bewerbungId: 'b1', heute: '2026-10-07' })
    expect(fuelle('Hallo {{Vorname}}, Stelle {{stelle}} bei {{unternehmen}} – {{absender}}', werte)).toBe('Hallo Kim, Stelle Datenanalyst bei Kunde GmbH – Alex')
    const ohne = platzhalterWerte(d, d.kontakte[0]!, { bewerbungId: null, heute: '2026-10-07' })
    const text = fuelle('Als {{stelle}}, {{unbekannt}}', ohne)
    expect(text).toBe('Als {{stelle}}, {{unbekannt}}')
    expect(offenePlatzhalter(text)).toEqual(['stelle', 'unbekannt'])
  })

  it('baut einen mailto-Link mit kodiertem Betreff und Text', () => {
    expect(mailtoLink('kim@example.org', 'Frage & Antwort', 'Zeile 1\nZeile 2')).toBe('mailto:kim@example.org?subject=Frage%20%26%20Antwort&body=Zeile%201%0D%0AZeile%202')
    expect(mailtoLink('kim@example.org', '', '')).toBe('mailto:kim@example.org')
  })

  it('bringt drei neutrale Startvorlagen mit', () => {
    expect(beispielSeed().vorlagen.map((v) => v.titel)).toEqual(['Nachfassen zur Bewerbung', 'Dank nach dem Gespräch', 'Erstkontakt'])
  })
})

describe('E-Mail schreiben', () => {
  it('öffnet einen Entwurf aus einer Vorlage und hält ihn im Verlauf fest', () => {
    const { gespeichert } = renderApp('/kontakte/k1', { daten: daten() })
    fireEvent.click(screen.getByRole('button', { name: 'E-Mail schreiben' }))
    const dialog = screen.getByRole('dialog', { name: 'E-Mail an Kim Muster' })
    expect(within(dialog).getByLabelText(/^Zu Bewerbung/)).toHaveDisplayValue('Datenanalyst')
    fireEvent.change(within(dialog).getByLabelText(/^Vorlage/), { target: { value: 'vorlage-nachfassen-bewerbung' } })
    expect(within(dialog).getByLabelText(/^Betreff/)).toHaveValue('Meine Bewerbung als Datenanalyst')
    expect((within(dialog).getByLabelText(/^Text/) as HTMLTextAreaElement).value).toContain('Hallo Kim Muster,')
    const link = within(dialog).getByRole('link', { name: 'Im Mailprogramm öffnen' })
    expect(link.getAttribute('href')).toMatch(/^mailto:kim@example\.org\?subject=Meine%20Bewerbung%20als%20Datenanalyst&body=/)

    link.addEventListener('click', (e) => e.preventDefault()) // jsdom: keine Navigation
    fireEvent.click(link)
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    const eintrag = gespeichert().interaktionen[0]!
    expect(eintrag).toMatchObject({ kontaktId: 'k1', art: 'email', richtung: 'ausgang', betreff: 'Meine Bewerbung als Datenanalyst', bewerbungId: 'b1' })
    expect(within(screen.getByRole('list', { name: 'Verlauf' })).getByText(/Gesendet: Meine Bewerbung als Datenanalyst/)).toBeInTheDocument()
  })

  it('bietet „E-Mail schreiben“ nur mit hinterlegter Adresse an', () => {
    renderApp('/kontakte/k2', { daten: daten() })
    expect(screen.queryByRole('button', { name: 'E-Mail schreiben' })).toBeNull()
  })

  it('verwaltet Vorlagen', () => {
    const { gespeichert } = renderApp('/kontakte/vorlagen', { daten: daten() })
    fireEvent.click(screen.getByRole('button', { name: 'Vorlage anlegen' }))
    const dialog = screen.getByRole('dialog', { name: 'Vorlage anlegen' })
    fireEvent.change(within(dialog).getByLabelText(/^Name der Vorlage/), { target: { value: 'Absage bedauern' } })
    fireEvent.change(within(dialog).getByLabelText(/^Betreff/), { target: { value: 'Danke, {{name}}' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Speichern' }))
    expect(within(screen.getByRole('list', { name: 'Vorlagen' })).getByText('Absage bedauern')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Vorlage „Erstkontakt“ bearbeiten' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Vorlage bearbeiten' })).getByRole('button', { name: 'Löschen' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Vorlage löschen?' })).getByRole('button', { name: 'Vorlage löschen' }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().vorlagen.map((v) => v.titel).sort()).toEqual(['Absage bedauern', 'Dank nach dem Gespräch', 'Nachfassen zur Bewerbung'])
  })
})
