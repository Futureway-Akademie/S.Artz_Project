import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { useKi } from '../../app/useKi.ts'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { TextAreaField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useStore } from '../../data/storeContext.ts'
import { CHAT_BEREICHE, chatEingabe, idZiel, type ChatBereich } from '../../domain/selectors/kiEingaben.ts'
import type { AppData } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from './AssistentSeite.module.css'
import { KiDialog } from './KiDialog.tsx'

/** Antworttext mit [ID]-Verweisen als Links zu den Einträgen */
function mitVerweisen(data: AppData, text: string): ReactNode[] {
  return text.split(/(\[[A-Za-z0-9_-]{1,64}\])/g).map((teil, i) => {
    const id = teil.match(/^\[([A-Za-z0-9_-]+)\]$/)?.[1]
    const ziel = id ? idZiel(data, id) : null
    return ziel ? (
      <Link key={i} to={ziel.link}>
        {ziel.titel}
      </Link>
    ) : (
      teil
    )
  })
}

/** Fragen an die eigenen Daten: Bereiche wählen, Text prüfen, Antwort mit Verweisen auf die Einträge. */
export function AssistentSeite() {
  const { data } = useStore()
  const ki = useKi()
  const now = useNow()
  const [frage, setFrage] = useState('')
  const [bereiche, setBereiche] = useState<ChatBereich[]>(['projekte', 'aufgaben', 'bewerbungen'])
  const [eingabe, setEingabe] = useState<string | null>(null)
  const [antwort, setAntwort] = useState<{ frage: string; text: string } | null>(null)
  const [fehler, setFehler] = useState<string | undefined>()

  const vorbereiten = (e: FormEvent) => {
    e.preventDefault()
    if (!frage.trim()) {
      setFehler('Bitte eine Frage eingeben.')
      return
    }
    if (bereiche.length === 0) {
      setFehler('Bitte mindestens einen Bereich wählen.')
      return
    }
    setFehler(undefined)
    setEingabe(chatEingabe(data, frage, bereiche, now))
  }

  return (
    <Seite titel="KI-Assistent" einleitung="Stell Fragen zu deinen Daten. Du wählst, welche Bereiche einbezogen werden, und siehst vor dem Senden genau, was an Claude geht.">
      {!ki.verfuegbar && (
        <p className={styles.hinweis} role="status">
          {ki.grund} Anleitung: docs/ki-einrichtung.md.
        </p>
      )}
      <Panel titel="Frage">
        <form className={styles.form} onSubmit={vorbereiten} noValidate aria-label="Frage an deine Daten">
          <TextAreaField label="Deine Frage" value={frage} onChange={(e) => setFrage(e.target.value)} rows={3} error={fehler} hint="z. B. „Welche Bewerbungen warten auf Antwort?“ oder „Was ist bei Projekt X offen?“" />
          <fieldset className={styles.bereiche}>
            <legend>Einbeziehen</legend>
            {CHAT_BEREICHE.map((b) => (
              <label key={b.key} className={styles.check}>
                <input type="checkbox" checked={bereiche.includes(b.key)} onChange={(e) => setBereiche(e.target.checked ? [...bereiche, b.key] : bereiche.filter((x) => x !== b.key))} />
                {b.label}
              </label>
            ))}
          </fieldset>
          <div>
            <Button type="submit">Prüfen und senden</Button>
          </div>
        </form>
      </Panel>
      {antwort && (
        <Panel titel="Antwort">
          <p className={styles.frage}>{antwort.frage}</p>
          <p className={styles.antwort}>{mitVerweisen(data, antwort.text)}</p>
          <p className={styles.hinweis}>KI kann sich irren – prüfe wichtige Angaben in den verlinkten Einträgen.</p>
        </Panel>
      )}
      {eingabe !== null && (
        <KiDialog
          aufgabe="chat"
          eingabe={eingabe}
          uebernehmenLabel="Antwort anzeigen"
          onUebernehmen={(text) => setAntwort({ frage: frage.trim(), text })}
          onSchliessen={() => setEingabe(null)}
        />
      )}
    </Seite>
  )
}
