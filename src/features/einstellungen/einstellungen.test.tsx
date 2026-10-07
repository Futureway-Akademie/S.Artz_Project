import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { createEmptyData } from '../../data/empty.ts'
import { exportJson, pruefeImport } from '../../data/exportImport.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { renderApp } from '../../test/renderApp.tsx'

function datei(inhalt: string, name = 'export.json') {
  return new File([inhalt], name, { type: 'application/json' })
}

function waehleDatei(file: File) {
  fireEvent.change(screen.getByLabelText('Importdatei wählen'), { target: { files: [file] } })
}

describe('Export und Import (rein)', () => {
  it('exportiert alle Daten und liest sie unverändert wieder ein', () => {
    const daten = beispielSeed(new Date('2026-10-07T10:00:00.000Z'))
    const ergebnis = pruefeImport(exportJson(daten))
    expect(ergebnis).toEqual({ ok: true, data: daten })
  })

  it('meldet Fehler verständlich', () => {
    expect(pruefeImport('')).toEqual({ ok: false, fehler: 'Die Datei ist leer.' })
    expect(pruefeImport('{kaputt')).toMatchObject({ ok: false, fehler: 'Die Datei ist keine gültige JSON-Datei.' })
    expect(pruefeImport('{"irgendwas":1}')).toMatchObject({
      ok: false,
      fehler: 'Die Datei ist kein Export dieses Arbeitscockpits (Versionsangabe fehlt).',
    })
    expect(pruefeImport(JSON.stringify({ ...createEmptyData(), schemaVersion: 99 }))).toMatchObject({
      ok: false,
      fehler: 'Die Daten der Datei stammen aus einer neueren Version der App.',
    })
    const ungueltig = pruefeImport(JSON.stringify({ ...createEmptyData(), projekte: [{ id: 'x' }] }))
    expect(ungueltig).toMatchObject({ ok: false, fehler: 'Die Daten der Datei haben ein unerwartetes Format.' })
    if (!ungueltig.ok) expect(ungueltig.details).toContain('projekte.0')
  })
})

describe('Einstellungen', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()
  })

  it('zeigt den Demo-Hinweis und den Datenstand', () => {
    renderApp('/einstellungen')
    expect(within(screen.getByRole('region', { name: 'Demo-Modus' })).getByText(/nicht sicher und nicht dauerhaft/)).toBeInTheDocument()
    expect(screen.getByText(/Aktueller Datenstand: 12 Projekte/)).toBeInTheDocument()
  })

  it('speichert den Anzeigenamen mit Aktivität', () => {
    const { gespeichert } = renderApp('/einstellungen')
    fireEvent.change(screen.getByLabelText('Name für die Begrüßung'), { target: { value: 'Alex A.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().einstellungen.anzeigename).toBe('Alex A.')
    expect(gespeichert().aktivitaeten[0]!.zusammenfassung).toBe('Einstellungen geändert')
  })

  it('erzeugt beim Export eine JSON-Datei mit allen Daten', async () => {
    renderApp('/einstellungen')
    const klick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Daten exportieren' }))
    expect(klick).toHaveBeenCalledOnce()
    const anker = klick.mock.contexts[0] as HTMLAnchorElement
    expect(anker.download).toMatch(/^pikartz-cockpit-export-\d{4}-\d{2}-\d{2}\.json$/)
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob
    const inhalt = JSON.parse(await blob.text())
    expect(inhalt.schemaVersion).toBe(2)
    expect(inhalt.projekte).toHaveLength(12)
    klick.mockRestore()
  })

  it('importiert nach Prüfung und Bestätigung', async () => {
    const { gespeichert } = renderApp('/einstellungen')
    const neu = { ...createEmptyData(), einstellungen: { anzeigename: 'Importiert' } }
    waehleDatei(datei(JSON.stringify(neu)))
    const dialog = await screen.findByRole('dialog', { name: 'Daten importieren?' })
    expect(within(dialog).getByText(/enthält: 0 Projekte/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Importieren und ersetzen' }))
    expect(screen.getByText(/Aktueller Datenstand: 0 Projekte/)).toBeInTheDocument()
    expect(screen.getByLabelText('Name für die Begrüßung')).toHaveValue('Importiert')
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().einstellungen.anzeigename).toBe('Importiert')
  })

  it('lehnt ungültige Dateien ab und lässt die Daten unverändert', async () => {
    renderApp('/einstellungen')
    waehleDatei(datei('{kaputt'))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Die Datei ist keine gültige JSON-Datei.'))
    expect(screen.getByRole('alert')).toHaveTextContent('Deine aktuellen Daten wurden nicht verändert.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/Aktueller Datenstand: 12 Projekte/)).toBeInTheDocument()
  })

  it('setzt erst nach Bestätigung zurück', () => {
    renderApp('/einstellungen', { daten: { ...createEmptyData(), einstellungen: { anzeigename: 'Vorher' } } })
    expect(screen.getByText(/Aktueller Datenstand: 0 Projekte/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Daten zurücksetzen' }))
    const dialog = screen.getByRole('dialog', { name: 'Daten zurücksetzen?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
    expect(screen.getByText(/Aktueller Datenstand: 0 Projekte/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Daten zurücksetzen' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Daten zurücksetzen?' })).getByRole('button', { name: 'Ja, zurücksetzen' }))
    expect(screen.getByText(/Aktueller Datenstand: 12 Projekte/)).toBeInTheDocument()
    expect(screen.getByLabelText('Name für die Begrüßung')).toHaveValue('Alex')
  })
})
