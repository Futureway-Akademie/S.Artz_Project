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

describe('KI für Verlauf', () => {
  afterEach(() => localStorage.clear())

  it('fasst den Verlauf eines Kontakts zusammen und übernimmt nächste Aktion mit Wiedervorlage', async () => {
    const { renderApp } = await import('../../test/renderApp.tsx')
    const zeit = '2026-10-01T10:00:00.000Z'
    const m = { erstelltAm: zeit, geaendertAm: zeit }
    const daten = {
      ...beispielSeed(),
      kontakte: [{ id: 'k1', name: 'Kim Muster', rolle: '', unternehmenId: null, email: '', telefon: '', linkedinUrl: '', kontext: 'jobsuche' as const, herkunft: '', notiz: '', projektIds: [], naechsteAktion: null, rechtsgrundlage: null, zweck: '', schlagworte: [], ...m }],
      interaktionen: (['2026-10-01', '2026-10-05'] as const).map((datum, n) => ({ id: `i${n}`, kontaktId: 'k1', art: 'telefonat' as const, datum, text: `Gespräch ${n}`, projektId: null, bewerbungId: null, leadId: null, betreff: '', richtung: null, ...m })),
    }
    const fake = createFakeCloud({ nutzer: { id: 'u1', email: 'admin@example.org' }, profile: [admin], kiAntwort: () => '- Interesse an Zusammenarbeit\nNächster Schritt: Angebot schicken\nWiedervorlage: 2026-10-12' })
    const { gespeichert } = renderApp('/kontakte/k1', { daten, cloud: fake.dienst })
    fireEvent.click(await screen.findByRole('button', { name: 'Zusammenfassen mit KI' }))
    const dialog = await screen.findByRole('dialog', { name: /KI: Zusammenfassen/ })
    await act(async () => {
      fireEvent.click(await within(dialog).findByRole('button', { name: 'Senden' }))
    })
    expect(fake.kiAnfragen[0]!.eingabe).toContain('Gespräch 1')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Als nächste Aktion übernehmen' }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().kontakte[0]!.naechsteAktion).toEqual({ text: 'Angebot schicken', faelligAm: '2026-10-12' })
  })
})

describe('KI-Tagesplanung', () => {
  afterEach(() => localStorage.clear())

  it('schlägt Aufgaben vor und nimmt nur passende in den Fokus', async () => {
    const { renderApp } = await import('../../test/renderApp.tsx')
    const zeit = '2026-10-01T10:00:00.000Z'
    const aufgabe = (id: string, titel: string) => ({ id, titel, notiz: '', erledigt: false, erledigtAm: null, faelligAm: '2026-10-01', bezug: { art: 'ohne' as const, id: null }, fokus: false, erstelltAm: zeit, geaendertAm: zeit })
    const daten = { ...beispielSeed(), aufgaben: [aufgabe('a1', 'Portfolio'), aufgabe('a2', 'Rechnung')] }
    const fake = createFakeCloud({ nutzer: { id: 'u1', email: 'admin@example.org' }, profile: [admin], kiAntwort: () => '1. [a2] Rechnung zuerst, überfällig\n2. [gibtsnicht] erfunden' })
    const { gespeichert } = renderApp('/', { daten, cloud: fake.dienst })
    fireEvent.click(await screen.findByRole('button', { name: 'Tag mit KI planen' }))
    const dialog = await screen.findByRole('dialog', { name: 'KI: Tagesplanung' })
    await act(async () => {
      fireEvent.click(await within(dialog).findByRole('button', { name: 'Senden' }))
    })
    expect(fake.kiAnfragen[0]!.eingabe).toContain('[a1] Portfolio')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Vorgeschlagene Aufgaben in den Fokus' }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().aufgaben.map((a) => [a.id, a.fokus])).toEqual([
      ['a1', false],
      ['a2', true],
    ])
  })
})

describe('KI-Assistent: Fragen an die eigenen Daten', () => {
  afterEach(() => localStorage.clear())

  it('sendet nur gewählte Bereiche und verlinkt die Einträge in der Antwort', async () => {
    const { renderApp } = await import('../../test/renderApp.tsx')
    const fake = createFakeCloud({ nutzer: { id: 'u1', email: 'admin@example.org' }, profile: [admin], kiAntwort: () => 'Am weitesten ist [seed-projekt-ki-skills].' })
    renderApp('/assistent', { cloud: fake.dienst })
    fireEvent.change(await screen.findByLabelText(/^Deine Frage/), { target: { value: 'Welches Projekt ist am weitesten?' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bewerbungen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen und senden' }))
    const dialog = await screen.findByRole('dialog', { name: 'KI: Frage an deine Daten' })
    await act(async () => {
      fireEvent.click(await within(dialog).findByRole('button', { name: 'Senden' }))
    })
    expect(fake.kiAnfragen[0]!.eingabe).toContain('Projekt: KI-Skills')
    expect(fake.kiAnfragen[0]!.eingabe).not.toContain('Bewerbung:')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Antwort anzeigen' }))
    const panel = screen.getByRole('region', { name: 'Antwort' })
    expect(within(panel).getByRole('link', { name: 'KI-Skills' })).toHaveAttribute('href', '/projekte/seed-projekt-ki-skills')
  })
})
