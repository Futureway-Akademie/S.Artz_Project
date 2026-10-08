import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { CloudProvider } from '../../app/CloudProvider.tsx'
import { DateiSpeicherContext, useDokumente } from '../../app/dokumente.ts'
import { TresorContext, type TresorValue } from '../../app/tresorContext.ts'
import { ToastProvider } from '../../components/ui/Toast.tsx'
import { dateiEntschluesseln, dateiVerschluesseln, istVerschluesselteDatei, speicherImArbeitsspeicher } from '../../data/dateien.ts'
import { STORAGE_KEY } from '../../data/storage.ts'
import { StoreProvider } from '../../data/store.tsx'
import { useStore } from '../../data/storeContext.ts'
import type { AppData } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { createFakeCloud } from '../../test/fakeCloud.ts'
import { createFakeStorage } from '../../test/fakes.ts'
import { DokumenteSeite } from './Dokumente.tsx'

const neuerSchluessel = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
const text = (b: Uint8Array) => new TextDecoder().decode(b)

describe('Dateiverschlüsselung', () => {
  it('verschlüsselt mit Kennung, entschlüsselt wieder und lehnt Klartext ab', async () => {
    const schluessel = await neuerSchluessel()
    const klar = new TextEncoder().encode('Lebenslauf von Alex')
    const v = await dateiVerschluesseln(schluessel, klar)
    expect(istVerschluesselteDatei(v)).toBe(true)
    expect(text(v)).not.toContain('Lebenslauf')
    expect(text(await dateiEntschluesseln(schluessel, v))).toBe('Lebenslauf von Alex')
    await expect(dateiEntschluesseln(await neuerSchluessel(), v)).rejects.toThrow()
    await expect(speicherImArbeitsspeicher().speichern('x', klar)).rejects.toThrow(/Nur verschlüsselte/)
  })
})

function InhaltPruefen() {
  const { data } = useStore()
  const dok = useDokumente()
  const [inhalt, setInhalt] = useState<string | null>(null)
  const d = data.dokumente[0]
  return d ? (
    <>
      <button type="button" onClick={() => void dok.inhalt(d).then((b) => setInhalt(text(b)))}>
        Inhalt prüfen
      </button>
      {inhalt && <p>Inhalt: {inhalt}</p>}
    </>
  ) : null
}
describe('Dokumente in der App', () => {
  afterEach(() => localStorage.clear())

  it('speichert nur verschlüsselt (lokal und in der Cloud), öffnet wieder und löscht überall', async () => {
    const schluessel = await neuerSchluessel()
    const tresor = { datenschluessel: () => schluessel } as unknown as TresorValue
    const lokal = speicherImArbeitsspeicher()
    const cloud = createFakeCloud({ nutzer: { id: 'u1', email: 'ich@example.org' } })
    const storage = createFakeStorage()
    render(
      <CloudProvider dienst={cloud.dienst}>
        <TresorContext.Provider value={tresor}>
          <DateiSpeicherContext.Provider value={lokal}>
            <StoreProvider storage={storage} createInitialData={() => beispielSeed()} saveDelayMs={0}>
              <ToastProvider>
                <MemoryRouter>
                  <DokumenteSeite />
                  <InhaltPruefen />
                </MemoryRouter>
              </ToastProvider>
            </StoreProvider>
          </DateiSpeicherContext.Provider>
        </TresorContext.Provider>
      </CloudProvider>,
    )
    // Anmeldung abwarten (die Sitzung wird asynchron geladen)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    const datei = new File(['Zeugnis Inhalt'], 'zeugnis.pdf', { type: 'application/pdf' })
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Dokument hinzufügen'), { target: { files: [datei] } })
    })
    const liste = await screen.findByRole('list', { name: 'Dokumente' })
    expect(within(liste).getByText('zeugnis.pdf')).toBeInTheDocument()

    const [pfad, verschluesselt] = [...lokal.inhalt.entries()][0]!
    expect(istVerschluesselteDatei(verschluesselt)).toBe(true)
    expect(text(verschluesselt)).not.toContain('Zeugnis')
    await waitFor(() => expect(cloud.dateien.get(pfad)).toEqual(verschluesselt))
    const gespeichert = (): AppData => JSON.parse(storage.map.get(STORAGE_KEY)!)
    expect(gespeichert().dokumente[0]).toMatchObject({ name: 'zeugnis.pdf', mime: 'application/pdf', groesse: 14, pfad })

    // Auf einem anderen Gerät: lokal fehlt die Datei, sie kommt verschlüsselt aus der Cloud
    lokal.inhalt.clear()
    fireEvent.click(screen.getByRole('button', { name: 'Inhalt prüfen' }))
    expect(await screen.findByText('Inhalt: Zeugnis Inhalt')).toBeInTheDocument()
    expect(lokal.inhalt.has(pfad)).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'zeugnis.pdf löschen' }))
    await act(async () => {
      fireEvent.click(within(screen.getByRole('dialog', { name: 'Dokument löschen?' })).getByRole('button', { name: 'Dokument löschen' }))
    })
    await waitFor(() => expect(lokal.inhalt.size).toBe(0))
    expect(cloud.dateien.size).toBe(0)
    expect(gespeichert().dokumente).toEqual([])
  })
})
