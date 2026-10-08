import { render, screen } from '@testing-library/react'
import { budgetMonat, KI_AUFGABEN, kiAnfragePruefen } from '../../supabase/functions/_gemeinsam/ki.ts'
import type { Profil } from '../domain/bereiche.ts'
import { createFakeCloud } from '../test/fakeCloud.ts'
import { CloudProvider } from './CloudProvider.tsx'
import { useKi } from './useKi.ts'

describe('KI-Zugang', () => {
  it('prüft Aufgabe und Länge; die Systemanweisungen liegen auf dem Server', () => {
    expect(kiAnfragePruefen({ aufgabe: 'anschreiben', eingabe: '  Stelle: KI-Trainer ' })).toEqual({ ok: true, anfrage: { aufgabe: 'anschreiben', eingabe: 'Stelle: KI-Trainer' } })
    expect(kiAnfragePruefen({ aufgabe: 'system', eingabe: 'x' })).toMatchObject({ ok: false, fehler: 'Unbekannte Aufgabe.' })
    expect(kiAnfragePruefen({ aufgabe: 'toString', eingabe: 'x' })).toMatchObject({ ok: false })
    expect(kiAnfragePruefen({ aufgabe: 'antwort', eingabe: '   ' })).toMatchObject({ ok: false })
    expect(kiAnfragePruefen({ aufgabe: 'antwort', eingabe: 'x'.repeat(KI_AUFGABEN.antwort.maxEingabe + 1) })).toMatchObject({ ok: false })
    for (const a of Object.values(KI_AUFGABEN)) expect(a.system).toContain('Erfinde keine Fakten')
  })

  it('rechnet das Budget im Monat nach deutscher Zeit', () => {
    expect(budgetMonat(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11')
    expect(budgetMonat(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10')
  })
})

function Status() {
  const ki = useKi()
  return <p>{ki.verfuegbar ? 'verfügbar' : ki.grund}</p>
}

const profil: Profil = { userId: 'u2', email: 'kim@example.org', anzeigename: '', rolleId: 'r1', istAdmin: false, gesperrt: false, bereicheAn: [], bereicheAus: [] }

describe('useKi', () => {
  afterEach(() => localStorage.clear())

  it('ist ohne Supabase und ohne Anmeldung nicht verfügbar', async () => {
    render(<Status />)
    expect(screen.getByText(/braucht die Einrichtung von Supabase/)).toBeInTheDocument()
  })

  it('braucht Anmeldung und den Bereich „ki“', async () => {
    const ohne = createFakeCloud({ nutzer: null })
    const { unmount } = render(
      <CloudProvider dienst={ohne.dienst}>
        <Status />
      </CloudProvider>,
    )
    expect(await screen.findByText(/Bitte melde dich an/)).toBeInTheDocument()
    unmount()

    const kunde = createFakeCloud({ nutzer: { id: 'u2', email: 'kim@example.org' }, profile: [profil], rollen: [{ id: 'r1', name: 'Kunde', bereiche: ['cockpit'] }] })
    const r = render(
      <CloudProvider dienst={kunde.dienst}>
        <Status />
      </CloudProvider>,
    )
    expect(await screen.findByText('Der KI-Assistent ist für dich nicht freigegeben.')).toBeInTheDocument()
    r.unmount()

    const mitKi = createFakeCloud({ nutzer: { id: 'u2', email: 'kim@example.org' }, profile: [{ ...profil, bereicheAn: ['ki'] }], rollen: [] })
    render(
      <CloudProvider dienst={mitKi.dienst}>
        <Status />
      </CloudProvider>,
    )
    expect(await screen.findByText('verfügbar')).toBeInTheDocument()
  })
})
