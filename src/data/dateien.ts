/**
 * Dateien (Lebenslauf, Zeugnisse …): Der Inhalt wird im Browser mit dem Datenschlüssel des Tresors
 * verschlüsselt (AES-GCM 256) und nur so gespeichert – lokal in IndexedDB und, wenn angemeldet,
 * zusätzlich in Supabase Storage. Weder Browser-Speicher noch Supabase sehen Klartext.
 */

/** Höchstgröße einer Datei */
export const MAX_DATEI = 10 * 1024 * 1024

/** Erkennungszeichen verschlüsselter Dateien, Version 1 */
const KENNUNG = new TextEncoder().encode('PKZ1')

export interface DateiSpeicher {
  speichern(pfad: string, daten: Uint8Array): Promise<void>
  laden(pfad: string): Promise<Uint8Array | null>
  loeschen(pfad: string): Promise<void>
}

export async function dateiVerschluesseln(schluessel: CryptoKey, daten: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, schluessel, daten as Uint8Array<ArrayBuffer>))
  const ergebnis = new Uint8Array(KENNUNG.length + iv.length + chiffre.length)
  ergebnis.set(KENNUNG, 0)
  ergebnis.set(iv, KENNUNG.length)
  ergebnis.set(chiffre, KENNUNG.length + iv.length)
  return ergebnis
}

export function istVerschluesselteDatei(daten: Uint8Array): boolean {
  return daten.length > KENNUNG.length + 12 && KENNUNG.every((b, i) => daten[i] === b)
}

export async function dateiEntschluesseln(schluessel: CryptoKey, daten: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  if (!istVerschluesselteDatei(daten)) throw new Error('Keine verschlüsselte Datei.')
  const iv = daten.slice(KENNUNG.length, KENNUNG.length + 12)
  const chiffre = daten.slice(KENNUNG.length + 12)
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, schluessel, chiffre))
}

/** Lokaler Speicher in IndexedDB (nur verschlüsselte Bytes) */
export function indexedDbSpeicher(name = 'pikartz-arbeitscockpit-dateien'): DateiSpeicher {
  const oeffnen = () =>
    new Promise<IDBDatabase>((ok, fehler) => {
      const anfrage = indexedDB.open(name, 1)
      anfrage.onupgradeneeded = () => anfrage.result.createObjectStore('dateien')
      anfrage.onsuccess = () => ok(anfrage.result)
      anfrage.onerror = () => fehler(anfrage.error ?? new Error('Dateispeicher nicht verfügbar.'))
    })
  const mit = async <T,>(modus: IDBTransactionMode, aktion: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await oeffnen()
    try {
      return await new Promise<T>((ok, fehler) => {
        const r = aktion(db.transaction('dateien', modus).objectStore('dateien'))
        r.onsuccess = () => ok(r.result)
        r.onerror = () => fehler(r.error ?? new Error('Dateispeicher-Fehler.'))
      })
    } finally {
      db.close()
    }
  }
  return {
    speichern: async (pfad, daten) => {
      if (!istVerschluesselteDatei(daten)) throw new Error('Abgebrochen: Nur verschlüsselte Dateien werden gespeichert.')
      await mit('readwrite', (s) => s.put(daten, pfad))
    },
    laden: async (pfad) => ((await mit<Uint8Array | undefined>('readonly', (s) => s.get(pfad) as IDBRequest<Uint8Array | undefined>)) ?? null),
    loeschen: async (pfad) => {
      await mit('readwrite', (s) => s.delete(pfad))
    },
  }
}

/** Für Tests und als Notlösung ohne IndexedDB */
export function speicherImArbeitsspeicher(): DateiSpeicher & { inhalt: Map<string, Uint8Array> } {
  const inhalt = new Map<string, Uint8Array>()
  return {
    inhalt,
    speichern: async (pfad, daten) => {
      if (!istVerschluesselteDatei(daten)) throw new Error('Abgebrochen: Nur verschlüsselte Dateien werden gespeichert.')
      inhalt.set(pfad, daten)
    },
    laden: async (pfad) => inhalt.get(pfad) ?? null,
    loeschen: async (pfad) => {
      inhalt.delete(pfad)
    },
  }
}
