import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { TextAreaField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { promptAusfuellen, promptPlatzhalter } from '../../domain/selectors/werkzeug.ts'
import styles from './Werkzeug.module.css'
import { inZwischenablage } from './zwischenablage.ts'

/**
 * Platzhalter {{…}} ausfüllen, Ergebnis ansehen und kopieren.
 * Die eingegebenen Werte bleiben nur auf dieser Seite und werden nicht gespeichert.
 */
export function Ausfuellen({ text, label }: { text: string; label: string }) {
  const { zeige } = useToast()
  const [werte, setWerte] = useState<Record<string, string>>({})
  const platzhalter = promptPlatzhalter(text)
  const ergebnis = promptAusfuellen(text, werte)
  const ausgefuellt = platzhalter.filter((p) => werte[p]?.trim()).length

  return (
    <Panel titel="Ausfüllen und kopieren">
      <p className={styles.hinweis}>
        {ausgefuellt} von {platzhalter.length} Platzhaltern ausgefüllt. Die Werte werden nicht gespeichert.
      </p>
      <div className={styles.felder}>
        {platzhalter.map((p) => (
          <TextAreaField key={p} label={p} optionalKennzeichnen={false} rows={2} value={werte[p] ?? ''} onChange={(e) => setWerte({ ...werte, [p]: e.target.value })} />
        ))}
      </div>
      <h3 className={styles.vorschauTitel}>Vorschau</h3>
      <pre className={styles.inhalt} aria-label={`${label} ausgefüllt`}>
        {ergebnis}
      </pre>
      <div className={styles.knoepfe}>
        <Button onClick={() => inZwischenablage(ergebnis, zeige, ausgefuellt < platzhalter.length ? 'Kopiert – noch nicht alle Platzhalter ausgefüllt' : undefined)}>Ausgefüllt kopieren</Button>
        {ausgefuellt > 0 && (
          <Button variant="ghost" onClick={() => setWerte({})}>
            Leeren
          </Button>
        )}
      </div>
    </Panel>
  )
}
