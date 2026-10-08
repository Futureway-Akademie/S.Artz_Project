import { render, screen, waitFor } from '@testing-library/react'
import { CloudProvider, RECHTE_KEY } from '../app/CloudProvider.tsx'
import { useRechte } from '../app/cloudContext.ts'
import { createFakeCloud } from '../test/fakeCloud.ts'
import { ALLE_RECHTE, bereichVonPfad, darf, darfPfad, darfTeilen, effektiveBereiche, imKreis, kreisPaar, kreisPartner, rechteAus, type Profil, type Rolle } from './bereiche.ts'

const kunde: Rolle = { id: 'r1', name: 'Kunde', bereiche: ['cockpit', 'projekte', 'kalender', 'unbekannt'] }
const profil = (extra: Partial<Profil> = {}): Profil => ({
  userId: 'u2',
  email: 'kim@example.org',
  anzeigename: '',
  rolleId: 'r1',
  istAdmin: false,
  gesperrt: false,
  bereicheAn: [],
  bereicheAus: [],
  ...extra,
})

describe('Bereiche und Rechte', () => {
  it('berechnet Rolle plus Freigaben minus Sperren und ignoriert Unbekanntes', () => {
    expect(effektiveBereiche(kunde.bereiche, ['dashboard'], ['kalender'])).toEqual(['cockpit', 'dashboard', 'projekte'])
  })

  it('Admin und Nicht-Angemeldete dürfen alles, Gesperrte nichts', () => {
    expect(rechteAus(null, [])).toBe(ALLE_RECHTE)
    expect(rechteAus(profil({ istAdmin: true }), [])).toMatchObject({ alle: true, istAdmin: true })
    const gesperrt = rechteAus(profil({ gesperrt: true }), [kunde])
    expect(gesperrt).toMatchObject({ gesperrt: true })
    expect(darf(gesperrt, 'cockpit')).toBe(false)
  })

  it('Teilen: Admin immer, Gesperrte nie, sonst Abweichung je Nutzer vor Rolle', () => {
    const teilende: Rolle = { ...kunde, darfTeilen: true }
    expect(darfTeilen(profil({ istAdmin: true }), undefined)).toBe(true)
    expect(darfTeilen(profil(), kunde)).toBe(false)
    expect(darfTeilen(profil(), teilende)).toBe(true)
    expect(darfTeilen(profil({ darfTeilen: false }), teilende)).toBe(false)
    expect(darfTeilen(profil({ darfTeilen: true }), kunde)).toBe(true)
    expect(darfTeilen(profil({ darfTeilen: true, gesperrt: true }), teilende)).toBe(false)
    expect(rechteAus(profil(), [teilende]).darfTeilen).toBe(true)
    expect(rechteAus(profil({ istAdmin: true }), []).darfTeilen).toBe(true)
    expect(rechteAus(null, []).darfTeilen).toBe(false)
  })

  it('Freigabe-Kreis: Paare sind ungerichtet', () => {
    expect(kreisPaar('u3', 'u2')).toEqual({ a: 'u2', b: 'u3' })
    const paare = [kreisPaar('u2', 'u3'), kreisPaar('u4', 'u2')]
    expect(imKreis(paare, 'u3', 'u2')).toBe(true)
    expect(imKreis(paare, 'u3', 'u4')).toBe(false)
    expect(kreisPartner(paare, 'u2')).toEqual(['u3', 'u4'])
    expect(kreisPartner(paare, 'u3')).toEqual(['u2'])
  })

  it('ordnet Adressen Bereichen zu', () => {
    const r = rechteAus(profil(), [kunde])
    expect(bereichVonPfad('/')).toBe('cockpit')
    expect(bereichVonPfad('/kontakte/leads/1?x=1')).toBe('kontakte')
    expect(bereichVonPfad('/werkzeug/prompts')).toBe('werkzeug')
    expect(bereichVonPfad('/einstellungen')).toBeNull()
    expect(darfPfad(r, '/projekte/p1')).toBe(true)
    expect(darfPfad(r, '/kontakte')).toBe(false)
    expect(darfPfad(r, '/einstellungen')).toBe(true)
    expect(darfPfad(r, '/admin')).toBe(false)
    expect(darfPfad(rechteAus(profil({ istAdmin: true }), []), '/admin')).toBe(true)
  })
})

function Anzeige() {
  const rechte = useRechte()
  return <p>{rechte.alle ? 'alles' : [...rechte.bereiche].join(',')}</p>
}

describe('Rechte in der App', () => {
  afterEach(() => localStorage.clear())

  it('lädt nach der Anmeldung Profil und Rolle und merkt sich die Rechte für dieses Gerät', async () => {
    const fake = createFakeCloud({ nutzer: { id: 'u2', email: 'kim@example.org' }, profile: [profil()], rollen: [kunde] })
    const { unmount } = render(
      <CloudProvider dienst={fake.dienst}>
        <Anzeige />
      </CloudProvider>,
    )
    expect(await screen.findByText('cockpit,kalender,projekte')).toBeInTheDocument()
    unmount()
    expect(JSON.parse(localStorage.getItem(RECHTE_KEY)!)).toMatchObject({ alle: false, bereiche: ['cockpit', 'kalender', 'projekte'] })

    // Ohne Anmeldung (z. B. offline) gelten die gemerkten Rechte weiter
    const ohne = createFakeCloud({ nutzer: null })
    render(
      <CloudProvider dienst={ohne.dienst}>
        <Anzeige />
      </CloudProvider>,
    )
    await waitFor(() => expect(screen.getByText('cockpit,kalender,projekte')).toBeInTheDocument())
  })
})
