import type { ActionMeta } from '../data/actions.ts'
import type { KeyValueStorage } from '../data/storage.ts'

/** In-Memory-Storage für Tests; optional mit Fehler beim Schreiben. */
export function createFakeStorage(initial: Record<string, string> = {}, opts: { setItemFehler?: Error } = {}) {
  const map = new Map(Object.entries(initial))
  const storage: KeyValueStorage & { map: Map<string, string> } = {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      if (opts.setItemFehler) throw opts.setItemFehler
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
  return storage
}

/** Deterministische Meta-Daten: fortlaufende IDs, feste Zeit. */
export function createMeta(iso = '2026-10-07T10:00:00.000Z'): ActionMeta & { setNow: (iso: string) => void } {
  let counter = 0
  const meta = {
    now: new Date(iso),
    newId: () => `id-${++counter}`,
    setNow: (next: string) => {
      meta.now = new Date(next)
    },
  }
  return meta
}
