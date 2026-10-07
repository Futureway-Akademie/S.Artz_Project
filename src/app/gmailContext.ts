import { createContext, useContext, useSyncExternalStore } from 'react'
import { gmailDienst, type MailDienst } from '../data/gmail/gmail.ts'
import { abonnieren, aktuellerToken, googleVersion, letzteMeldung, tokenGueltigBis } from '../data/gmail/googleAuth.ts'

/** Gmail-Zugang; in Tests durch eine Attrappe ersetzbar */
export const GmailContext = createContext<MailDienst>(gmailDienst)

export function useGmailDienst(): MailDienst {
  return useContext(GmailContext)
}

/** Anmeldestatus bei Google (Token nur im Arbeitsspeicher) */
export function useGoogle() {
  useSyncExternalStore(abonnieren, googleVersion)
  const dienst = useGmailDienst()
  const token = aktuellerToken()
  return { konfiguriert: dienst.konfiguriert, verbunden: token !== null, gueltigBis: token ? tokenGueltigBis() : null, meldung: letzteMeldung() }
}
