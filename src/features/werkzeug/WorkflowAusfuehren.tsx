import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { webhookAdressePruefen } from '../../../supabase/functions/_gemeinsam/pruefen.ts'
import { useCloud, useRechte } from '../../app/cloudContext.ts'
import { Button } from '../../components/ui/Button.tsx'
import { TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import type { WebhookInfo } from '../../data/cloud/cloud.ts'
import { darf } from '../../domain/bereiche.ts'
import { formatZeitpunkt } from '../../domain/dates.ts'
import styles from './Werkzeug.module.css'

/**
 * Workflow über seinen Webhook starten (n8n, Make …). Die Adresse wird einmal hinterlegt und liegt danach
 * nur bei Supabase – der Browser kann sie nicht mehr lesen. Gestartet wird über eine Server-Funktion.
 */
export function WorkflowAusfuehren({ werkzeugId }: { werkzeugId: string }) {
  const cloud = useCloud()
  const rechte = useRechte()
  const { zeige } = useToast()
  const [info, setInfo] = useState<WebhookInfo | null | undefined>(undefined)
  const [adresse, setAdresse] = useState('')
  const [fehler, setFehler] = useState<string | undefined>()
  const [eingabe, setEingabe] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const angemeldet = Boolean(cloud?.konfiguriert && cloud.nutzer)
  const dienst = cloud?.dienst

  const laden = useCallback(async () => {
    if (!dienst) return
    setInfo((await dienst.webhooks()).find((w) => w.werkzeugId === werkzeugId) ?? null)
  }, [dienst, werkzeugId])

  useEffect(() => {
    if (!angemeldet || !dienst) return
    let aktiv = true
    dienst
      .webhooks()
      .then((liste) => aktiv && setInfo(liste.find((w) => w.werkzeugId === werkzeugId) ?? null))
      .catch(() => aktiv && setInfo(null))
    return () => {
      aktiv = false
    }
  }, [angemeldet, dienst, werkzeugId])

  if (!darf(rechte, 'automationen')) return null
  if (!angemeldet || !cloud) {
    return (
      <Panel titel="Ausführen">
        <p className={styles.hinweis}>Workflows lassen sich mit Supabase und Anmeldung starten. Die Webhook-Adresse liegt dann geschützt auf dem Server.</p>
      </Panel>
    )
  }

  const hinterlegen = async (e: FormEvent) => {
    e.preventDefault()
    const f = webhookAdressePruefen(adresse)
    setFehler(f ?? undefined)
    if (f) return
    await cloud.dienst.webhookSpeichern(werkzeugId, adresse.trim())
    setAdresse('')
    await laden()
    zeige('Webhook geschützt hinterlegt')
  }

  const starten = async () => {
    setLaeuft(true)
    try {
      const r = await cloud.dienst.workflowStarten(werkzeugId, eingabe.trim())
      zeige(r.ok ? 'Workflow gestartet' : `Workflow meldet: ${r.meldung}`)
      await laden()
    } catch (err) {
      zeige(err instanceof Error ? err.message : 'Start fehlgeschlagen')
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <Panel titel="Ausführen">
      {info === undefined ? (
        <p>Lädt …</p>
      ) : info ? (
        <>
          <p className={styles.hinweis}>
            Webhook hinterlegt (Adresse nicht einsehbar).{' '}
            {info.letzteAusfuehrung ? `Zuletzt: ${formatZeitpunkt(info.letzteAusfuehrung)} – ${info.letzteMeldung}` : 'Noch nie gestartet.'}
          </p>
          <TextAreaField label="Mitgeben (optional)" value={eingabe} onChange={(e) => setEingabe(e.target.value)} rows={2} optionalKennzeichnen={false} hint="Wird an den Workflow gesendet – nur, was nötig ist." />
          <div className={styles.knoepfe}>
            <Button onClick={() => void starten()} disabled={laeuft}>
              {laeuft ? 'Startet …' : 'Workflow starten'}
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                void cloud.dienst
                  .webhookEntfernen(werkzeugId)
                  .then(laden)
                  .then(() => zeige('Webhook entfernt'))
              }
            >
              Webhook entfernen
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={(e) => void hinterlegen(e)} noValidate aria-label="Webhook hinterlegen">
          <TextField
            label="Webhook-Adresse"
            type="url"
            autoComplete="off"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            error={fehler}
            hint="Aus n8n (Webhook-Knoten, Produktions-URL) oder Make. Wird geschützt gespeichert und hier nie wieder angezeigt."
            optionalKennzeichnen={false}
          />
          <div className={styles.knoepfe}>
            <Button type="submit">Webhook hinterlegen</Button>
          </div>
        </form>
      )}
    </Panel>
  )
}
