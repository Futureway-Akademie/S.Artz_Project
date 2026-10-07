import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import { MemoryRouter } from 'react-router'
import { ToastProvider } from '../components/ui/Toast.tsx'
import { schluesselAbleiten, verschluesseln } from '../data/krypto.ts'
import { alsTresor, tresorOeffnen } from '../data/tresorKrypto.ts'
import { STORAGE_KEY } from '../data/storage.ts'
import { StoreProvider } from '../data/store.tsx'
import { beispielSeed } from '../test/beispielStart.ts'
import { createFakeStorage } from '../test/fakes.ts'
import { AppRoutes } from './routes.tsx'
import { StoreGate } from './StoreGate.tsx'
import { TresorGate } from './TresorGate.tsx'

const ITER = 1000
const PASSWORT = 'ein-langes-passwort'

function renderTresor(basis = createFakeStorage(), pfad = '/') {
  render(
    <TresorGate basis={basis} iterationen={ITER}>
      {(storage) => (
        <StoreProvider storage={storage} createInitialData={() => beispielSeed()} saveDelayMs={0}>
          <StoreGate>
            <ToastProvider>
              <MemoryRouter initialEntries={[pfad]}>
                <AppRoutes />
              </MemoryRouter>
            </ToastProvider>
          </StoreGate>
        </StoreProvider>
      )}
    </TresorGate>,
  )
  return basis
}

const tippe = (label: RegExp, wert: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: wert } })

async function einrichten(seitentitel = 'Arbeitscockpit') {
  tippe(/^Passwort \*$/,PASSWORT)
  tippe(/^Passwort wiederholen/, PASSWORT)
  fireEvent.click(screen.getByRole('checkbox', { name: /Ohne dieses Passwort/ }))
  fireEvent.click(screen.getByRole('button', { name: /öffnen/ }))
  await screen.findByRole('heading', { level: 1, name: seitentitel })
}

async function gespeicherterKlartext(basis: ReturnType<typeof createFakeStorage>, passwort = PASSWORT) {
  const umschlag = alsTresor(basis.map.get(STORAGE_KEY) ?? '')
  if (!umschlag) throw new Error('nicht verschlüsselt gespeichert')
  return (await tresorOeffnen(passwort, umschlag)).klartext
}

describe('Passwortschutz', () => {
  it('verlangt beim ersten Start ein Passwort und speichert nur verschlüsselt', async () => {
    const basis = renderTresor()
    expect(screen.getByRole('heading', { name: 'Passwort festlegen' })).toBeInTheDocument()

    tippe(/^Passwort \*$/,'kurz')
    tippe(/^Passwort wiederholen/, 'kurz')
    fireEvent.click(screen.getByRole('button', { name: 'Festlegen und öffnen' }))
    expect(await screen.findByText(/mindestens 10 Zeichen/)).toBeInTheDocument()
    expect(screen.getByText('Bitte bestätigen.')).toBeInTheDocument()

    await einrichten()
    await waitFor(async () => expect(await gespeicherterKlartext(basis)).toContain('Lernspiel'))
    expect(basis.map.get(STORAGE_KEY)).not.toContain('Lernspiel')
  })

  it('verschlüsselt vorhandene unverschlüsselte Daten beim Festlegen', async () => {
    const basis = createFakeStorage({ [STORAGE_KEY]: JSON.stringify({ ...beispielSeed(), einstellungen: { anzeigename: 'Bestand', letzteSicherungAm: null, letzterMailAbrufAm: null } }) })
    renderTresor(basis)
    expect(screen.getByRole('heading', { name: 'Daten verschlüsseln' })).toBeInTheDocument()
    await einrichten()
    expect(basis.map.get(STORAGE_KEY)).not.toContain('Bestand')
    expect(await gespeicherterKlartext(basis)).toContain('Bestand')
    expect(screen.getByText(/Bestand/)).toBeInTheDocument()
  })

  it('entsperrt nur mit dem richtigen Passwort', async () => {
    const schluessel = await schluesselAbleiten(PASSWORT, undefined, ITER)
    const umschlag = await verschluesseln(schluessel, JSON.stringify({ ...beispielSeed(), einstellungen: { anzeigename: 'Geheim', letzteSicherungAm: null, letzterMailAbrufAm: null } }))
    renderTresor(createFakeStorage({ [STORAGE_KEY]: JSON.stringify(umschlag) }))
    expect(screen.getByRole('heading', { name: 'Gesperrt' })).toBeInTheDocument()

    tippe(/^Passwort/, 'falsches-passwort')
    fireEvent.click(screen.getByRole('button', { name: 'Entsperren' }))
    expect(await screen.findByText('Das Passwort ist falsch.')).toBeInTheDocument()
    expect(screen.queryByText(/Geheim/)).toBeNull()

    tippe(/^Passwort/, PASSWORT)
    fireEvent.click(screen.getByRole('button', { name: 'Entsperren' }))
    expect(await screen.findByText(/Geheim/)).toBeInTheDocument()
  })

  it('sperrt auf Knopfdruck und nach Inaktivität, ohne Änderungen zu verlieren', async () => {
    const basis = renderTresor(createFakeStorage(), '/einstellungen')
    await einrichten('Einstellungen')

    tippe(/^Name für die Begrüßung/, 'Kurz vor dem Sperren')
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Jetzt sperren' })[0]!)
    expect(screen.getByRole('heading', { name: 'Gesperrt' })).toBeInTheDocument()
    await waitFor(async () => expect(await gespeicherterKlartext(basis)).toContain('Kurz vor dem Sperren'))

    tippe(/^Passwort/, PASSWORT)
    fireEvent.click(screen.getByRole('button', { name: 'Entsperren' }))
    await screen.findByRole('heading', { level: 1, name: 'Einstellungen' })

    const jetzt = Date.now()
    const spy = vi.spyOn(Date, 'now').mockReturnValue(jetzt + 16 * 60_000)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    spy.mockRestore()
    expect(screen.getByRole('heading', { name: 'Gesperrt' })).toBeInTheDocument()
  })

  it('ändert das Passwort nach Prüfung des bisherigen', async () => {
    const basis = renderTresor(createFakeStorage(), '/einstellungen')
    await einrichten('Einstellungen')
    await waitFor(() => expect(basis.map.get(STORAGE_KEY)).toBeDefined())

    tippe(/^Bisheriges Passwort/, 'falsch-falsch-falsch')
    tippe(/^Neues Passwort \*$/,'neues-langes-passwort')
    tippe(/^Neues Passwort wiederholen/, 'neues-langes-passwort')
    fireEvent.click(screen.getByRole('button', { name: 'Passwort ändern' }))
    expect(await screen.findByText('Das bisherige Passwort ist falsch.')).toBeInTheDocument()

    tippe(/^Bisheriges Passwort/, PASSWORT)
    fireEvent.click(screen.getByRole('button', { name: 'Passwort ändern' }))
    expect(await screen.findByText('Passwort geändert')).toBeInTheDocument()
    expect(await gespeicherterKlartext(basis, 'neues-langes-passwort')).toContain('Lernspiel')
  })

  it('bietet bei vergessenem Passwort nur Löschen und Neubeginn an', async () => {
    const umschlag = await verschluesseln(await schluesselAbleiten(PASSWORT, undefined, ITER), '{}')
    const basis = renderTresor(createFakeStorage({ [STORAGE_KEY]: JSON.stringify(umschlag) }))
    fireEvent.click(screen.getByRole('button', { name: 'Passwort vergessen?' }))
    fireEvent.click(screen.getByRole('button', { name: 'Daten löschen und neu beginnen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, alles löschen und neu beginnen' }))
    expect(basis.map.has(STORAGE_KEY)).toBe(false)
    expect(screen.getByRole('heading', { name: 'Passwort festlegen' })).toBeInTheDocument()
  })

  it('Sperrbildschirme sind barrierefrei (axe-core)', async () => {
    const pruefe = async () =>
      (await axe.run(document.body, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, rules: { 'color-contrast': { enabled: false } } })).violations.map((v) => v.id)
    const umschlag = await verschluesseln(await schluesselAbleiten(PASSWORT, undefined, ITER), '{}')
    renderTresor(createFakeStorage({ [STORAGE_KEY]: JSON.stringify(umschlag) }))
    expect(await pruefe()).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Passwort vergessen?' }))
    expect(await pruefe()).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Daten löschen und neu beginnen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, alles löschen und neu beginnen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Festlegen und öffnen' }))
    expect(await pruefe()).toEqual([])
  })
})

describe('Passwort-Wiederherstellung per E-Mail-Link', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('richtet den Link ein und setzt damit ein neues Passwort, ohne Daten zu verlieren', async () => {
    const basis = renderTresor(createFakeStorage(), '/einstellungen')
    await einrichten('Einstellungen')
    tippe(/^Name für die Begrüßung/, 'Vor dem Vergessen')
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    tippe(/^Deine E-Mail-Adresse/, 'ich@example.org')
    fireEvent.click(screen.getByRole('button', { name: 'Einrichten' }))
    const mail = await screen.findByRole('link', { name: 'Mail an mich öffnen' })
    const href = mail.getAttribute('href')!
    expect(href.startsWith('mailto:ich@example.org?')).toBe(true)
    const link = decodeURIComponent(href).match(/http:\/\/localhost(:\d+)?\/wiederherstellen#schluessel=\S+/)![0]
    expect(screen.getByText(/eingerichtet für ich@example.org/)).toBeInTheDocument()
    await waitFor(async () => expect(await gespeicherterKlartext(basis)).toContain('Vor dem Vergessen'))
    cleanup()

    // Gesperrt: „Passwort vergessen?“ verweist auf die Mail
    renderTresor(basis)
    fireEvent.click(screen.getByRole('button', { name: 'Passwort vergessen?' }))
    expect(screen.getByText(/Wiederherstellung ist eingerichtet/).closest('p')).toHaveTextContent('ich@example.org')
    cleanup()

    // Klick auf den Link in der Mail
    const url = new URL(link)
    window.history.replaceState(null, '', url.pathname + url.hash)
    renderTresor(basis)
    expect(window.location.hash).toBe('') // Schlüssel sofort aus der Adresszeile entfernt
    expect(screen.getByRole('heading', { name: 'Passwort wiederherstellen' })).toBeInTheDocument()
    tippe(/^Neues Passwort \*$/, 'ganz-neues-passwort')
    tippe(/^Neues Passwort wiederholen/, 'ganz-neues-passwort')
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen und Passwort setzen' }))
    expect(await screen.findByText(/Vor dem Vergessen/)).toBeInTheDocument()

    expect(await gespeicherterKlartext(basis, 'ganz-neues-passwort')).toContain('Vor dem Vergessen')
    await expect(gespeicherterKlartext(basis, PASSWORT)).rejects.toThrow()
  })

  it('meldet einen unpassenden Link verständlich', async () => {
    const basis = createFakeStorage({ [STORAGE_KEY]: JSON.stringify(await verschluesseln(await schluesselAbleiten(PASSWORT, undefined, ITER), '{}')) })
    window.history.replaceState(null, '', '/wiederherstellen#schluessel=' + encodeURIComponent('B'.repeat(43) + '='))
    renderTresor(basis)
    tippe(/^Neues Passwort \*$/, 'ganz-neues-passwort')
    tippe(/^Neues Passwort wiederholen/, 'ganz-neues-passwort')
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen und Passwort setzen' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/keine Wiederherstellung eingerichtet|passt nicht/)
  })
})
