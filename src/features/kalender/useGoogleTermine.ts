import { useEffect, useState } from 'react'
import { useGmailDienst, useGoogle } from '../../app/gmailContext.ts'
import type { KalenderEintrag } from '../../domain/selectors/kalender.ts'

/**
 * Termine aus Google-Kalender für den sichtbaren Zeitraum – nur gelesen und nur im Arbeitsspeicher,
 * nichts davon wird gespeichert. Ohne Einrichtung oder Anmeldung: keine.
 */
export function useGoogleTermine(von: string, bis: string): KalenderEintrag[] {
  const google = useGoogle()
  const dienst = useGmailDienst()
  const schluessel = `${von}|${bis}`
  const [stand, setStand] = useState<{ schluessel: string; eintraege: KalenderEintrag[] } | null>(null)

  useEffect(() => {
    if (!google.verbunden) return
    let aktiv = true
    dienst
      .termine(von, bis)
      .then((termine) => {
        if (!aktiv) return
        setStand({
          schluessel,
          eintraege: termine.map((t) => ({ schluessel: `google:${t.id}`, art: 'google', id: t.id, datum: t.datum, uhrzeit: t.uhrzeit, titel: t.titel, zusatz: t.ort || null, link: null, erledigt: false })),
        })
      })
      .catch(() => aktiv && setStand({ schluessel, eintraege: [] }))
    return () => {
      aktiv = false
    }
  }, [google.verbunden, dienst, von, bis, schluessel])

  return google.verbunden && stand?.schluessel === schluessel ? stand.eintraege : []
}
