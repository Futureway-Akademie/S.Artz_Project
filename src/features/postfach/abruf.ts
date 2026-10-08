import type { MailDienst } from '../../data/gmail/gmail.ts'
import { abfragen, abrufAb, abrufZiele, mailZuordnen } from '../../domain/selectors/postfach.ts'
import type { AppData, Neu } from '../../domain/types.ts'

export interface AbrufErgebnis {
  mails: Array<Neu<'mails'>>
  /** Gefundene, aber keinem Kontakt oder Unternehmen zuordenbare Mails (nicht gespeichert) */
  verworfen: number
  abrufAm: string
}

/** Höchstzahl je Suchanfrage – schont Kontingent und Speicher */
export const MAX_JE_ANFRAGE = 50

/** Ruft passende Mails ab und ordnet sie zu. Bereits bekannte Mails werden nicht erneut geholt. */
export async function mailsAbrufen(dienst: MailDienst, data: AppData, now: Date): Promise<AbrufErgebnis> {
  const eigene = await dienst.profil()
  const bekannt = new Set(data.mails.map((m) => m.gmailId))
  const ids: string[] = []
  for (const anfrage of abfragen(abrufZiele(data), abrufAb(data, now))) {
    for (const id of await dienst.suchen(anfrage, MAX_JE_ANFRAGE)) if (!bekannt.has(id) && !ids.includes(id)) ids.push(id)
  }
  const mails: Array<Neu<'mails'>> = []
  let verworfen = 0
  for (const id of ids) {
    const zugeordnet = mailZuordnen(data, await dienst.holen(id), eigene)
    if (zugeordnet) mails.push(zugeordnet)
    else verworfen++
  }
  return { mails, verworfen, abrufAm: now.toISOString() }
}
