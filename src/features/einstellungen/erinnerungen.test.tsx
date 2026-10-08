/// <reference types="node" />
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { berlinJetzt, ERINNERUNG, faelligeAbos } from '../../../supabase/functions/_gemeinsam/push.ts'
import { CloudProvider } from '../../app/CloudProvider.tsx'
import type { PushApi } from '../../app/push.ts'
import { ToastProvider } from '../../components/ui/Toast.tsx'
import { createFakeCloud } from '../../test/fakeCloud.ts'
import { ErinnerungenPanel } from './ErinnerungenPanel.tsx'

describe('Push-Erinnerungen ohne Inhalte', () => {
  it('der Text enthält keine Daten, der Service Worker zeigt nur die Nutzlast', () => {
    expect(ERINNERUNG.text).toBe('Guten Morgen! Schau, was heute ansteht.')
    const sw = readFileSync('public/sw.js', 'utf8')
    expect(sw).toContain("self.addEventListener('push'")
    expect(sw).not.toMatch(/localStorage|indexedDB|caches\.match\(.*pikartz/)
  })

  it('verschickt einmal am Tag ab der gewählten Stunde (Zeitzone Berlin)', () => {
    const jetzt = new Date('2026-10-08T06:30:00Z') // 08:30 in Berlin (Sommerzeit)
    expect(berlinJetzt(jetzt)).toEqual({ datum: '2026-10-08', stunde: 8 })
    const abos = [
      { endpoint: 'a', stunde: 8, letzter_versand: null },
      { endpoint: 'b', stunde: 9, letzter_versand: null },
      { endpoint: 'c', stunde: 7, letzter_versand: '2026-10-08' },
      { endpoint: 'd', stunde: 6, letzter_versand: '2026-10-07' },
    ]
    expect(faelligeAbos(abos, jetzt).map((a) => a.endpoint)).toEqual(['a', 'd'])
  })

  it('schaltet die Erinnerung ein und aus', async () => {
    const fake = createFakeCloud({ nutzer: { id: 'u1', email: 'ich@example.org' } })
    const api: PushApi = {
      unterstuetzt: true,
      abonnieren: vi.fn().mockResolvedValue({ endpoint: 'https://push.example/abc', p256dh: 'p', auth: 'a' }),
      abbestellen: vi.fn().mockResolvedValue('https://push.example/abc'),
    }
    render(
      <CloudProvider dienst={fake.dienst}>
        <ToastProvider>
          <ErinnerungenPanel api={api} />
        </ToastProvider>
      </CloudProvider>,
    )
    fireEvent.change(await screen.findByLabelText('Uhrzeit'), { target: { value: '7' } })
    // Der Knopf ist erst aktiv, wenn die vorhandenen Abos geladen sind
    await waitFor(() => expect(screen.getByRole('button', { name: 'Erinnerung einschalten' })).toBeEnabled())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Erinnerung einschalten' }))
    })
    expect(await screen.findByText(/täglich um 07:00 Uhr/)).toBeInTheDocument()
    expect([...fake.pushAbos.values()]).toEqual([{ endpoint: 'https://push.example/abc', p256dh: 'p', auth: 'a', stunde: 7 }])
    fireEvent.click(screen.getByRole('button', { name: 'Ausschalten' }))
    await waitFor(() => expect(fake.pushAbos.size).toBe(0))
  })

  it('erklärt, wenn Push hier nicht geht', async () => {
    const fake = createFakeCloud({ nutzer: { id: 'u1', email: 'ich@example.org' } })
    render(
      <CloudProvider dienst={fake.dienst}>
        <ToastProvider>
          <ErinnerungenPanel api={{ unterstuetzt: false, abonnieren: vi.fn(), abbestellen: vi.fn() }} />
        </ToastProvider>
      </CloudProvider>,
    )
    expect(await screen.findByText(/als App installieren/)).toBeInTheDocument()
  })
})
