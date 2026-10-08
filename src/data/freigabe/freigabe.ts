import type { AppData } from '../../domain/types.ts'
import type { CloudDienst } from '../cloud/cloud.ts'
import { ausschnitt, istTeilbar, type Ausschnitt, type TeilbarerBereich } from './ausschnitt.ts'
import {
  alsEmpfaengerEntpacken,
  bereichsschluesselErzeugen,
  fuerEmpfaengerVerpacken,
  inhaltEntschluesseln,
  inhaltVerschluesseln,
  privatEntschluesseln,
  privatVerschluesseln,
  schluesselpaarErzeugen,
} from './freigabeKrypto.ts'

/**
 * Eigenes Schlüsselpaar laden oder – beim ersten Mal bzw. nach einem neuen Tresor – erzeugen und
 * (privat nur verschlüsselt) bei Supabase hinterlegen. Liefert den privaten Schlüssel.
 */
export async function eigenesSchluesselpaar(cloud: CloudDienst, datenschluessel: CryptoKey): Promise<CryptoKey> {
  const vorhanden = await cloud.eigeneSchluessel()
  if (vorhanden) {
    try {
      return await privatEntschluesseln(datenschluessel, vorhanden.privatVerschluesselt)
    } catch {
      // Mit einem anderen Tresor angelegt: neu erzeugen; geteilte Bereiche werden beim nächsten Aktualisieren neu verpackt
    }
  }
  const paar = await schluesselpaarErzeugen()
  await cloud.schluesselSpeichern(paar.oeffentlich, await privatVerschluesseln(datenschluessel, paar.privat))
  return paar.privat
}

export interface TeilenErgebnis {
  geteiltMit: string[]
  /** Empfänger ohne Schlüssel (haben sich noch nie angemeldet) */
  ohneSchluessel: string[]
}

/**
 * Bereich mit genau diesen Empfängern teilen (leere Liste = Freigabe beenden).
 * Jedes Mal entsteht ein neuer Bereichsschlüssel und eine neue Version: Wer nicht mehr dabei ist, kann nichts Neues lesen.
 */
export async function bereichTeilen(cloud: CloudDienst, data: AppData, bereich: TeilbarerBereich, empfaengerIds: string[], now: Date): Promise<TeilenErgebnis> {
  const vorher = (await cloud.eigeneFreigaben()).find((f) => f.bereich === bereich)
  if (empfaengerIds.length === 0) {
    if (vorher) await cloud.freigabeEntfernen(bereich)
    return { geteiltMit: [], ohneSchluessel: [] }
  }
  const oeffentlich = await cloud.oeffentlicheSchluessel(empfaengerIds)
  const mit = empfaengerIds.filter((id) => oeffentlich[id])
  const ohneSchluessel = empfaengerIds.filter((id) => !oeffentlich[id])
  if (mit.length === 0) {
    if (vorher) await cloud.freigabeEntfernen(bereich)
    return { geteiltMit: [], ohneSchluessel }
  }
  const schluessel = await bereichsschluesselErzeugen()
  const umschlag = await inhaltVerschluesseln(schluessel, ausschnitt(data, bereich, now))
  const verpackt = await Promise.all(mit.map(async (id) => ({ empfaengerId: id, verpackt: await fuerEmpfaengerVerpacken(schluessel, oeffentlich[id]!) })))
  await cloud.freigabeSchreiben(bereich, (vorher?.version ?? 0) + 1, umschlag, verpackt)
  return { geteiltMit: mit, ohneSchluessel }
}

/** Alle eigenen Freigaben mit dem aktuellen Stand neu verschlüsseln (nach Änderungen an den Daten) */
export async function freigabenAktualisieren(cloud: CloudDienst, data: AppData, now: Date): Promise<number> {
  const eigene = (await cloud.eigeneFreigaben()).filter((f) => istTeilbar(f.bereich) && f.empfaenger.length > 0)
  for (const f of eigene) await bereichTeilen(cloud, data, f.bereich as TeilbarerBereich, f.empfaenger, now)
  return eigene.length
}

export interface ErhaltenerBereich {
  besitzerId: string
  aktualisiertAm: string
  ausschnitt: Ausschnitt
}

/** Mit mir geteilte Bereiche entschlüsseln; Unlesbares (z. B. nach neuem Schlüsselpaar) wird übersprungen */
export async function erhalteneBereiche(cloud: CloudDienst, privat: CryptoKey): Promise<ErhaltenerBereich[]> {
  const ergebnis: ErhaltenerBereich[] = []
  for (const f of await cloud.freigabenFuerMich()) {
    if (!istTeilbar(f.bereich)) continue
    try {
      const schluessel = await alsEmpfaengerEntpacken(f.verpackt, privat)
      ergebnis.push({ besitzerId: f.besitzerId, aktualisiertAm: f.aktualisiertAm, ausschnitt: await inhaltEntschluesseln<Ausschnitt>(schluessel, f.umschlag) })
    } catch {
      // nicht (mehr) lesbar
    }
  }
  return ergebnis
}
