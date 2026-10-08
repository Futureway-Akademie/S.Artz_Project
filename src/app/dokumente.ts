import { createContext, useContext } from 'react'
import { dateiEntschluesseln, dateiVerschluesseln, indexedDbSpeicher, MAX_DATEI, type DateiSpeicher } from '../data/dateien.ts'
import { useStore } from '../data/storeContext.ts'
import type { Dokument } from '../domain/types.ts'
import { useCloud } from './cloudContext.ts'
import { useTresor } from './tresorContext.ts'

/** Lokaler Dateispeicher (IndexedDB); in Tests durch einen Speicher im Arbeitsspeicher ersetzbar */
export const DateiSpeicherContext = createContext<DateiSpeicher>(indexedDbSpeicher())

async function bytes(datei: Blob): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(typeof datei.arrayBuffer === 'function' ? await datei.arrayBuffer() : await new Response(datei).arrayBuffer())
}

/**
 * Dokumente hochladen, öffnen und löschen. Verschlüsselt wird vor dem Speichern mit dem Datenschlüssel des Tresors;
 * ohne geöffneten Tresor (z. B. ohne Verschlüsselung) sind Dokumente nicht verfügbar.
 */
export function useDokumente() {
  const tresor = useTresor()
  const cloud = useCloud()
  const lokal = useContext(DateiSpeicherContext)
  const { dispatch } = useStore()
  const angemeldet = Boolean(cloud?.konfiguriert && cloud.nutzer)

  const hochladen = async (datei: File, bewerbungIds: string[] = []): Promise<string> => {
    if (!tresor) throw new Error('Dokumente brauchen den verschlüsselten Tresor.')
    if (datei.size > MAX_DATEI) throw new Error('Die Datei ist zu groß (höchstens 10 MB).')
    const verschluesselt = await dateiVerschluesseln(tresor.datenschluessel(), await bytes(datei))
    const pfad = crypto.randomUUID()
    await lokal.speichern(pfad, verschluesselt)
    // In der Cloud nur als Chiffretext; scheitert das, bleibt die Datei lokal erhalten
    if (angemeldet) await cloud!.dienst.dateiHochladen(pfad, verschluesselt).catch(() => undefined)
    const id = crypto.randomUUID()
    dispatch({ type: 'anlegen', sammlung: 'dokumente', id, daten: { name: datei.name, mime: datei.type || 'application/octet-stream', groesse: datei.size, pfad, bewerbungIds, notiz: '' } })
    return id
  }

  /** Entschlüsselter Inhalt; holt die Datei bei Bedarf aus der Cloud und legt sie lokal ab */
  const inhalt = async (dok: Dokument): Promise<Uint8Array<ArrayBuffer>> => {
    if (!tresor) throw new Error('Dokumente brauchen den verschlüsselten Tresor.')
    let verschluesselt = await lokal.laden(dok.pfad)
    if (!verschluesselt && angemeldet) {
      verschluesselt = await cloud!.dienst.dateiLaden(dok.pfad)
      if (verschluesselt) await lokal.speichern(dok.pfad, verschluesselt)
    }
    if (!verschluesselt) throw new Error('Die Datei liegt nicht auf diesem Gerät. Melde dich an, um sie aus der Cloud zu laden.')
    return dateiEntschluesseln(tresor.datenschluessel(), verschluesselt)
  }

  const oeffnen = async (dok: Dokument) => {
    const daten = await inhalt(dok)
    const url = URL.createObjectURL(new Blob([daten], { type: dok.mime }))
    const a = document.createElement('a')
    a.href = url
    a.download = dok.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const loeschen = async (dok: Dokument) => {
    await lokal.loeschen(dok.pfad)
    if (angemeldet) await cloud!.dienst.dateiLoeschen(dok.pfad).catch(() => undefined)
    dispatch({ type: 'loeschen', sammlung: 'dokumente', id: dok.id })
  }

  return { verfuegbar: tresor !== null, hochladen, inhalt, oeffnen, loeschen }
}

export const dateigroesse = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toLocaleString('de-DE', { maximumFractionDigits: 0 })} KB` : `${(bytes / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`
