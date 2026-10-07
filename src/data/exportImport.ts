import type { AppData } from '../domain/types.ts'
import { LADEFEHLER_TEXT, parseAppData } from './storage.ts'

/** Alle Daten als formatiertes JSON (gleiches Format wie im Speicher, also wieder importierbar). */
export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

/** Bietet Text als Datei zum Herunterladen an. */
export function herunterladen(text: string, dateiname: string, typ = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: typ }))
  const link = document.createElement('a')
  link.href = url
  link.download = dateiname
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export type ImportErgebnis = { ok: true; data: AppData } | { ok: false; fehler: string; details?: string }

/** Prüft eine Importdatei (JSON, Version, Schema) und liefert verständliche Fehlermeldungen. */
export function pruefeImport(text: string): ImportErgebnis {
  if (!text.trim()) return { ok: false, fehler: 'Die Datei ist leer.' }
  const ergebnis = parseAppData(text)
  if (ergebnis.status === 'ok') return { ok: true, data: ergebnis.data }
  const fehler =
    ergebnis.grund === 'json'
      ? 'Die Datei ist keine gültige JSON-Datei.'
      : ergebnis.grund === 'version_unbekannt'
        ? 'Die Datei ist kein Export dieses Arbeitscockpits (Versionsangabe fehlt).'
        : LADEFEHLER_TEXT[ergebnis.grund].replace('gespeicherten Daten', 'Daten der Datei')
  return { ok: false, fehler, details: ergebnis.details }
}
