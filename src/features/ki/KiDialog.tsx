import { useState } from 'react'
import { KI_AUFGABEN, type KiAufgabe } from '../../../supabase/functions/_gemeinsam/ki.ts'
import { useKi } from '../../app/useKi.ts'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { TextAreaField } from '../../components/ui/Field.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { inZwischenablage } from '../werkzeug/zwischenablage.ts'
import styles from './KiDialog.module.css'

interface KiDialogProps {
  aufgabe: KiAufgabe
  /** Vorbereiteter Text; du siehst und bestätigst genau das, was gesendet wird */
  eingabe: string
  /** Ergebnis übernehmen (z. B. als Entwurf, Wiedervorlage) */
  onUebernehmen?: (text: string) => void
  uebernehmenLabel?: string
  onSchliessen: () => void
}

type Phase = { art: 'pruefen' } | { art: 'laeuft' } | { art: 'fertig'; text: string; tokens: number; uebrig: number } | { art: 'fehler'; meldung: string }

const zahl = (n: number) => n.toLocaleString('de-DE')

/**
 * Freigabe-Dialog für jeden KI-Aufruf: zeigt den zu sendenden Text (bearbeitbar), sendet erst nach Bestätigung,
 * protokolliert nur Aufgabe, Länge und Verbrauch – nie den Inhalt.
 */
export function KiDialog({ aufgabe, eingabe, onUebernehmen, uebernehmenLabel = 'Übernehmen', onSchliessen }: KiDialogProps) {
  const ki = useKi()
  const { dispatch } = useStore()
  const { zeige } = useToast()
  const [text, setText] = useState(eingabe)
  const [ergebnis, setErgebnis] = useState('')
  const [phase, setPhase] = useState<Phase>({ art: 'pruefen' })
  const info = KI_AUFGABEN[aufgabe]
  const zuLang = text.length > info.maxEingabe

  const senden = async () => {
    setPhase({ art: 'laeuft' })
    try {
      const a = await ki.anfragen(aufgabe, text)
      dispatch({ type: 'kiProtokoll', eintrag: { aufgabe, zeichen: text.length, tokens: a.tokens } })
      setErgebnis(a.text)
      setPhase({ art: 'fertig', ...a })
    } catch (e) {
      setPhase({ art: 'fehler', meldung: e instanceof Error ? e.message : String(e) })
    }
  }

  const aktionen =
    phase.art === 'fertig' ? (
      <>
        <Button variant="secondary" onClick={() => void inZwischenablage(ergebnis, zeige)}>
          Kopieren
        </Button>
        {onUebernehmen && (
          <Button
            onClick={() => {
              onUebernehmen(ergebnis)
              onSchliessen()
            }}
          >
            {uebernehmenLabel}
          </Button>
        )}
      </>
    ) : phase.art === 'pruefen' && ki.verfuegbar ? (
      <>
        <Button variant="secondary" onClick={onSchliessen}>
          Abbrechen
        </Button>
        <Button onClick={() => void senden()} disabled={zuLang || !text.trim()}>
          Senden
        </Button>
      </>
    ) : phase.art === 'fehler' ? (
      <Button variant="secondary" onClick={() => setPhase({ art: 'pruefen' })}>
        Zurück
      </Button>
    ) : undefined

  return (
    <Dialog offen titel={`KI: ${info.titel}`} onSchliessen={onSchliessen} aktionen={aktionen}>
      {!ki.verfuegbar ? (
        <p className={styles.hinweis} role="status">
          {ki.grund}
        </p>
      ) : phase.art === 'pruefen' ? (
        <>
          <p className={styles.hinweis}>
            Dieser Text wird an Claude (AWS, Rechenzentrum Frankfurt) gesendet – sonst nichts. Entferne vorher, was nicht nötig ist. Gespeichert wird dort nichts.
          </p>
          <TextAreaField
            label="Zu sendender Text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            optionalKennzeichnen={false}
            error={zuLang ? `Zu lang: höchstens ${zahl(info.maxEingabe)} Zeichen.` : undefined}
            hint={`${zahl(text.length)} Zeichen`}
          />
        </>
      ) : phase.art === 'laeuft' ? (
        <p role="status">Claude arbeitet …</p>
      ) : phase.art === 'fehler' ? (
        <p className={styles.fehler} role="alert">
          {phase.meldung}
        </p>
      ) : (
        <>
          <TextAreaField label="Ergebnis" value={ergebnis} onChange={(e) => setErgebnis(e.target.value)} rows={14} optionalKennzeichnen={false} hint="Bitte prüfen und anpassen – KI kann sich irren." />
          <p className={styles.hinweis}>
            Verbrauch: {zahl(phase.tokens)} Tokens · Restbudget diesen Monat: {zahl(phase.uebrig)}
          </p>
        </>
      )}
    </Dialog>
  )
}
