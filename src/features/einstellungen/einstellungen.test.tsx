import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { createEmptyData } from '../../data/empty.ts'
import { exportJson, pruefeImport } from '../../data/exportImport.ts'
import { sicherungErstellen, sicherungLesen } from '../../data/sicherung.ts'
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

  it('zeigt den Speicherhinweis und den Datenstand', () => {
    renderApp('/einstellungen')
    expect(within(screen.getByRole('region', { name: 'Speicherung' })).getByText(/keine Verbindung nach/)).toBeInTheDocument()
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

  it('erstellt eine verschlüsselte Sicherung und merkt sich den Zeitpunkt', async () => {
    const { gespeichert } = renderApp('/einstellungen')
    expect(screen.getByText(/Letzte Sicherung: noch keine/)).toBeInTheDocument()
    const klick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(screen.getByRole('button', { name: 'Verschlüsselte Sicherung erstellen' }))
    const dialog = screen.getByRole('dialog', { name: 'Verschlüsselte Sicherung erstellen' })
    fireEvent.change(within(dialog).getByLabelText(/^Passwort für die Sicherung/), { target: { value: 'kurz' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sicherung herunterladen' }))
    expect(await within(dialog).findByText(/mindestens 10 Zeichen/)).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText(/^Passwort für die Sicherung/), { target: { value: 'sicherung-passwort' } })
    fireEvent.change(within(dialog).getByLabelText(/^Passwort wiederholen/), { target: { value: 'sicherung-passwort' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sicherung herunterladen' }))
    await waitFor(() => expect(klick).toHaveBeenCalledOnce(), { timeout: 5000 })
    const anker = klick.mock.contexts[0] as HTMLAnchorElement
    expect(anker.download).toMatch(/^pikartz-cockpit-sicherung-\d{4}-\d{2}-\d{2}\.json$/)
    const text = await (vi.mocked(URL.createObjectURL).mock.calls[0]![0] as Blob).text()
    expect(text).not.toContain('Lernspiel')
    const inhalt = JSON.parse(await sicherungLesen(text, 'sicherung-passwort'))
    expect(inhalt.projekte).toHaveLength(12)
    expect(await screen.findByText('Verschlüsselte Sicherung erstellt')).toBeInTheDocument()
    expect(screen.queryByText(/Letzte Sicherung: noch keine/)).toBeNull()
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(gespeichert().einstellungen.letzteSicherungAm).not.toBeNull()
    expect(gespeichert().aktivitaeten[0]!.zusammenfassung).toBe('Sicherung erstellt')
    klick.mockRestore()
  }, 15000)

  it('öffnet eine verschlüsselte Sicherung nur mit ihrem Passwort', async () => {
    renderApp('/einstellungen')
    const neu = { ...createEmptyData(), einstellungen: { anzeigename: 'Aus Sicherung', letzteSicherungAm: null, letzterMailAbrufAm: null } }
    waehleDatei(datei(await sicherungErstellen(JSON.stringify(neu), 'sicherung-passwort', 1000)))
    const dialog = await screen.findByRole('dialog', { name: 'Sicherung öffnen' })
    fireEvent.change(within(dialog).getByLabelText(/^Passwort der Sicherung/), { target: { value: 'falsches-passwort' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Öffnen und prüfen' }))
    expect(await within(dialog).findByText(/Passwort ist falsch/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText(/^Passwort der Sicherung/), { target: { value: 'sicherung-passwort' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Öffnen und prüfen' }))
    const bestaetigen = await screen.findByRole('dialog', { name: 'Daten importieren?' })
    fireEvent.click(within(bestaetigen).getByRole('button', { name: 'Importieren und ersetzen' }))
    expect(screen.getByLabelText('Name für die Begrüßung')).toHaveValue('Aus Sicherung')
  })

  it('importiert nach Prüfung und Bestätigung', async () => {
    const { gespeichert } = renderApp('/einstellungen')
    const neu = { ...createEmptyData(), einstellungen: { anzeigename: 'Importiert', letzteSicherungAm: null, letzterMailAbrufAm: null } }
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
    renderApp('/einstellungen', { daten: { ...createEmptyData(), einstellungen: { anzeigename: 'Vorher', letzteSicherungAm: null, letzterMailAbrufAm: null } } })
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
