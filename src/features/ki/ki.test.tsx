import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CloudProvider } from '../../app/CloudProvider.tsx'
import { ToastProvider } from '../../components/ui/Toast.tsx'
import { STORAGE_KEY } from '../../data/storage.ts'
import { StoreProvider } from '../../data/store.tsx'
import type { AppData } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { createFakeCloud } from '../../test/fakeCloud.ts'
import { createFakeStorage } from '../../test/fakes.ts'
import { KiDialog } from './KiDialog.tsx'

const admin = { userId: 'u1', email: 'admin@example.org', anzeigename: '', rolleId: null, istAdmin: true, gesperrt: false, bereicheAn: [], bereicheAus: [] }

function umgebung(inhalt: ReactNode, cloud = createFakeCloud({ nutzer: { id: 'u1', email: 'admin@example.org' }, profile: [admin], kiAntwort: (_a, e) => `Entwurf zu: ${e}` })) {
  const storage = createFakeStorage()
  render(
    <CloudProvider dienst={cloud.dienst}>
      <StoreProvider storage={storage} createInitialData={() => beispielSeed()} saveDelayMs={0}>
        <ToastProvider>{inhalt}</ToastProvider>
      </StoreProvider>
    </CloudProvider>,
  )
  return { cloud, gespeichert: (): AppData => JSON.parse(storage.map.get(STORAGE_KEY)!) }
}

describe('KI-Freigabe-Dialog', () => {
  afterEach(() => localStorage.clear())

  it('sendet erst nach Bestätigung genau den (bearbeiteten) Text und protokolliert ohne Inhalt', async () => {
    const uebernehmen = vi.fn()
    const fake = createFakeCloud({ nutzer: { id: 'u1', email: 'admin@example.org' }, profile: [admin], kiAntwort: (_a, e) => `Entwurf zu: ${e}` })
    const { gespeichert } = umgebung(<KiDialog aufgabe="anschreiben" eingabe="Stelle: KI-Trainer, Telefon 0170 1234567" onUebernehmen={uebernehmen} uebernehmenLabel="Als Entwurf übernehmen" onSchliessen={() => {}} />, fake)
    const dialog = await screen.findByRole('dialog', { name: 'KI: Anschreiben entwerfen' })
    await screen.findByRole('button', { name: 'Senden' })
    expect(fake.kiAnfragen).toEqual([])

    fireEvent.change(within(dialog).getByLabelText(/^Zu sendender Text/), { target: { value: 'Stelle: KI-Trainer' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Senden' }))
    })
    expect(fake.kiAnfragen).toEqual([{ aufgabe: 'anschreiben', eingabe: 'Stelle: KI-Trainer' }])
    expect(within(dialog).getByLabelText(/^Ergebnis/)).toHaveValue('Entwurf zu: Stelle: KI-Trainer')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Als Entwurf übernehmen' }))
    expect(uebernehmen).toHaveBeenCalledWith('Entwurf zu: Stelle: KI-Trainer')

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    const protokoll = gespeichert().kiProtokoll
    expect(protokoll).toEqual([expect.objectContaining({ aufgabe: 'anschreiben', zeichen: 18, tokens: 100 })])
    expect(JSON.stringify(protokoll)).not.toContain('KI-Trainer')
  })

  it('erklärt, warum die KI nicht verfügbar ist, und sendet nichts', async () => {
    const ohne = createFakeCloud({ nutzer: null })
    umgebung(<KiDialog aufgabe="antwort" eingabe="Hallo" onSchliessen={() => {}} />, ohne)
    expect(await screen.findByText(/Bitte melde dich an/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Senden' })).toBeNull()
  })
})

describe('KI bei Bewerbungen', () => {
  afterEach(() => localStorage.clear())

  it('entwirft ein Anschreiben und übernimmt es in die Notizen der Bewerbung', async () => {
    const { renderApp } = await import('../../test/renderApp.tsx')
    const zeit = '2026-10-01T10:00:00.000Z'
    const daten = {
      ...beispielSeed(),
      bewerbungen: [{ id: 'b1', stelle: 'KI-Trainer', unternehmenId: null, zielrolleId: null, kontaktId: null, status: 'geplant' as const, quelle: '', beworbenAm: null, link: '', naechsterSchritt: '', notiz: 'Anforderung: n8n', wiedervorlageAm: null, erstelltAm: zeit, geaendertAm: zeit }],
    }
    const fake = createFakeCloud({ nutzer: { id: 'u1', email: 'admin@example.org' }, profile: [admin], kiAntwort: () => 'Sehr geehrte Damen und Herren, …' })
    const { gespeichert } = renderApp('/bewerbungen/b1', { daten, cloud: fake.dienst })
    fireEvent.click(await screen.findByRole('button', { name: 'Anschreiben mit KI' }))
    const dialog = await screen.findByRole('dialog', { name: 'KI: Anschreiben entwerfen' })
    expect((within(dialog).getByLabelText(/^Zu sendender Text/) as HTMLTextAreaElement).value).toContain('Stelle: KI-Trainer')
    await act(async () => {
      fireEvent.click(await within(dialog).findByRole('button', { name: 'Senden' }))
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'In die Notizen übernehmen' }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().bewerbungen[0]!.notiz).toMatch(/^Anforderung: n8n\n\n— Anschreiben \(KI-Entwurf, .+\) —\nSehr geehrte Damen und Herren, …$/)
  })
})
