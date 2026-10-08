import { act, fireEvent, screen, within } from '@testing-library/react'
import { createFakeCloud } from '../../test/fakeCloud.ts'
import { renderApp } from '../../test/renderApp.tsx'

describe('Konto und Login', () => {
  it('zeigt ohne Supabase-Konfiguration, dass nichts nach außen geht', () => {
    renderApp('/einstellungen')
    const panel = screen.getByRole('region', { name: 'Konto und Synchronisierung' })
    expect(within(panel).getByText(/keinerlei Verbindung nach außen/)).toBeInTheDocument()
    expect(within(panel).queryByRole('button')).toBeNull()
  })

  it('schickt einen Anmeldelink, meldet an und wieder ab', async () => {
    const cloud = createFakeCloud()
    renderApp('/einstellungen', { cloud: cloud.dienst })
    const panel = await screen.findByRole('form', { name: 'Anmelden' })
    fireEvent.change(within(panel).getByLabelText(/^E-Mail-Adresse/), { target: { value: 'falsch' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Anmeldelink senden' }))
    expect(await within(panel).findByText('Bitte eine gültige E-Mail-Adresse eingeben.')).toBeInTheDocument()

    fireEvent.change(within(panel).getByLabelText(/^E-Mail-Adresse/), { target: { value: 'ich@example.org' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Anmeldelink senden' }))
    expect(await screen.findByText(/Anmeldelink an ich@example.org geschickt/)).toBeInTheDocument()
    expect(cloud.links).toEqual([{ email: 'ich@example.org', zurueck: `${window.location.origin}/` }])

    act(() => cloud.anmelden({ id: 'u1', email: 'ich@example.org' }))
    expect(await screen.findByText('Angemeldet als ich@example.org')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }))
    expect(await screen.findByRole('form', { name: 'Anmelden' })).toBeInTheDocument()
  })
})
