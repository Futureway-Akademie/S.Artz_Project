import { useEffect, useState } from 'react'
import { useCloud } from '../../app/cloudContext.ts'
import { Button } from '../../components/ui/Button.tsx'
import { SelectField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import styles from './EinstellungenSeite.module.css'

import { browserPush, type PushApi } from '../../app/push.ts'

const STUNDEN = Array.from({ length: 17 }, (_, i) => i + 6).map((h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00 Uhr` }))

/** Tägliche Erinnerung aufs Handy – ohne Inhalte, nur „Schau, was heute ansteht“. */
export function ErinnerungenPanel({ api = browserPush }: { api?: PushApi }) {
  const cloud = useCloud()
  const { zeige } = useToast()
  const [abo, setAbo] = useState<{ endpoint: string; stunde: number } | null | undefined>(undefined)
  const [stunde, setStunde] = useState('8')
  const angemeldet = Boolean(cloud?.konfiguriert && cloud.nutzer)
  const dienst = cloud?.dienst

  useEffect(() => {
    if (!angemeldet || !dienst) return
    let aktiv = true
    dienst
      .pushAbos()
      .then((a) => aktiv && setAbo(a[0] ?? null))
      .catch(() => aktiv && setAbo(null))
    return () => {
      aktiv = false
    }
  }, [angemeldet, dienst])

  if (!angemeldet || !cloud) return null

  if (!api.unterstuetzt) {
    return (
      <Panel titel="Erinnerungen aufs Handy">
        <p className={styles.hinweis}>
          Nicht verfügbar: Dafür das Cockpit als App installieren (über https) und Push einrichten (Anleitung: docs/push-einrichtung.md).
        </p>
      </Panel>
    )
  }

  const einschalten = async () => {
    try {
      const neu = await api.abonnieren()
      await cloud.dienst.pushSpeichern(neu, Number(stunde))
      setAbo({ endpoint: neu.endpoint, stunde: Number(stunde) })
      zeige('Erinnerung eingeschaltet')
    } catch (e) {
      zeige(e instanceof Error ? e.message : 'Einschalten fehlgeschlagen')
    }
  }

  const ausschalten = async () => {
    const endpoint = (await api.abbestellen()) ?? abo?.endpoint
    if (endpoint) await cloud.dienst.pushEntfernen(endpoint)
    setAbo(null)
    zeige('Erinnerung ausgeschaltet')
  }

  return (
    <Panel titel="Erinnerungen aufs Handy">
      <p className={styles.hinweis}>
        Einmal am Tag ein Hinweis „Schau, was heute ansteht“. Inhalte aus deinen Daten werden nie verschickt – der Server kennt sie nicht.
      </p>
      {abo ? (
        <div className={styles.knoepfe}>
          <p className={styles.status}>Eingeschaltet – täglich um {String(abo.stunde).padStart(2, '0')}:00 Uhr.</p>
          <Button variant="ghost" onClick={() => void ausschalten()}>
            Ausschalten
          </Button>
        </div>
      ) : (
        <div className={styles.zeile}>
          <SelectField label="Uhrzeit" value={stunde} onChange={(e) => setStunde(e.target.value)} options={STUNDEN} optionalKennzeichnen={false} />
          <Button onClick={() => void einschalten()} disabled={abo === undefined}>
            Erinnerung einschalten
          </Button>
        </div>
      )}
    </Panel>
  )
}
