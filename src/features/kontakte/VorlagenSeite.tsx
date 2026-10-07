import { useState } from 'react'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { PLATZHALTER } from '../../domain/selectors/vorlagen.ts'
import type { Vorlage } from '../../domain/types.ts'
import { useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from './crm.module.css'
import { KontakteNavigation } from './KontakteNavigation.tsx'

interface Werte extends Record<string, unknown> {
  titel: string
  betreff: string
  text: string
}

function validiere(werte: Werte): Fehler<Werte> {
  return werte.titel.trim() ? {} : { titel: 'Bitte einen Namen für die Vorlage eingeben.' }
}

function VorlageDialog({ vorlage, onSchliessen }: { vorlage?: Vorlage; onSchliessen: () => void }) {
  const { dispatch } = useStore()
  const { zeige } = useToast()
  const [loeschen, setLoeschen] = useState(false)
  const form = useForm<Werte>({ titel: vorlage?.titel ?? '', betreff: vorlage?.betreff ?? '', text: vorlage?.text ?? '' }, validiere)
  const { werte, setze, fehler } = form

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = { titel: g.titel.trim(), betreff: g.betreff.trim(), text: g.text.trim() }
    if (vorlage) dispatch({ type: 'aendern', sammlung: 'vorlagen', id: vorlage.id, aenderung: daten })
    else dispatch({ type: 'anlegen', sammlung: 'vorlagen', daten })
    zeige(vorlage ? 'Vorlage gespeichert' : 'Vorlage angelegt')
    onSchliessen()
  }

  return (
    <>
      <FormDialog
        offen
        titel={vorlage ? 'Vorlage bearbeiten' : 'Vorlage anlegen'}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          vorlage && (
            <Button variant="ghost" onClick={() => setLoeschen(true)}>
              Löschen
            </Button>
          )
        }
      >
        <TextField label="Name der Vorlage" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
        <TextField label="Betreff" value={werte.betreff} onChange={(e) => setze('betreff', e.target.value)} />
        <TextAreaField
          label="Text"
          value={werte.text}
          onChange={(e) => setze('text', e.target.value)}
          rows={10}
          hint={`Platzhalter: ${PLATZHALTER.map((p) => `{{${p.name}}}`).join(', ')}`}
        />
      </FormDialog>
      {loeschen && vorlage && (
        <ConfirmDialog
          offen
          titel="Vorlage löschen?"
          bestaetigenLabel="Vorlage löschen"
          gefahr
          onAbbrechen={() => setLoeschen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'vorlagen', id: vorlage.id })
            zeige('Vorlage gelöscht')
            onSchliessen()
          }}
        >
          <p>„{vorlage.titel}“ wird gelöscht.</p>
        </ConfirmDialog>
      )}
    </>
  )
}

/** E-Mail-Vorlagen verwalten; verwendet werden sie über „E-Mail schreiben“ beim Kontakt. */
export function VorlagenSeite() {
  const { data } = useStore()
  const [dialog, setDialog] = useState<Vorlage | 'neu' | null>(null)

  return (
    <Seite
      titel="E-Mail-Vorlagen"
      einleitung="Wiederkehrende E-Mails mit Platzhaltern. Geschrieben wird beim Kontakt über „E-Mail schreiben“ – im eigenen Mailprogramm."
      aktionen={<Button onClick={() => setDialog('neu')}>Vorlage anlegen</Button>}
    >
      <KontakteNavigation />
      {data.vorlagen.length === 0 ? (
        <EmptyState title="Noch keine Vorlagen" action={<Button onClick={() => setDialog('neu')}>Erste Vorlage anlegen</Button>} />
      ) : (
        <ul className={styles.liste} aria-label="Vorlagen">
          {[...data.vorlagen]
            .sort((a, b) => a.titel.localeCompare(b.titel, 'de'))
            .map((v) => (
              <li key={v.id} className={styles.zeile}>
                <div className={styles.haupt}>
                  <span className={styles.name}>{v.titel}</span>
                  <span className={styles.unter}>Betreff: {v.betreff || '–'}</span>
                </div>
                <div className={styles.meta}>
                  <Button size="sm" variant="ghost" onClick={() => setDialog(v)} aria-label={`Vorlage „${v.titel}“ bearbeiten`}>
                    Bearbeiten
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}
      <section aria-labelledby="platzhalter" className={styles.einfach}>
        <h2 id="platzhalter" className={styles.unter}>
          Platzhalter
        </h2>
        <dl className={styles.daten}>
          {PLATZHALTER.map((p) => (
            <div key={p.name} className={styles.platzhalter}>
              <dt>
                <code>{`{{${p.name}}}`}</code>
              </dt>
              <dd>{p.beschreibung}</dd>
            </div>
          ))}
        </dl>
      </section>
      {dialog && <VorlageDialog vorlage={dialog === 'neu' ? undefined : dialog} onSchliessen={() => setDialog(null)} />}
    </Seite>
  )
}
