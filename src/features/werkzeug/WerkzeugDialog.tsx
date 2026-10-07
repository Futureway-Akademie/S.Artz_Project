import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { loeschfolgen } from '../../data/reducer.ts'
import { leeresWerkzeug, WERKZEUG_STATUS, WERKZEUG_TYP, werkzeugPlattformen } from '../../domain/selectors/werkzeug.ts'
import type { Werkzeug, WerkzeugTyp } from '../../domain/types.ts'
import { listeAusKomma, useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from '../aufgaben/AufgabeDialog.module.css'

interface Werte extends Record<string, unknown> {
  titel: string
  beschreibung: string
  plattform: string
  status: string
  inhalt: string
  version: string
  link: string
  schlagworte: string
  projektIds: string[]
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.titel.trim()) fehler.titel = 'Bitte einen Titel eingeben.'
  return fehler
}

interface WerkzeugDialogProps {
  typ: WerkzeugTyp
  eintrag?: Werkzeug
  /** Neu angelegt: ID des Eintrags, z. B. um zur Detailseite zu wechseln */
  onAngelegt?: (id: string) => void
  onSchliessen: () => void
  onGeloescht?: () => void
}

function umschalten(liste: string[], id: string, an: boolean): string[] {
  return an ? [...liste, id] : liste.filter((x) => x !== id)
}

/** Werkzeug anlegen oder bearbeiten – Felder und Hinweise passen sich dem Typ an. */
export function WerkzeugDialog({ typ, eintrag, onAngelegt, onSchliessen, onGeloescht }: WerkzeugDialogProps) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const info = WERKZEUG_TYP[typ]
  const plattformListe = useId()
  const [loeschen, setLoeschen] = useState(false)
  const basis = eintrag ?? { ...leeresWerkzeug(typ), id: '' }
  const form = useForm<Werte>(
    {
      titel: basis.titel,
      beschreibung: basis.beschreibung,
      plattform: basis.plattform,
      status: basis.status,
      inhalt: basis.inhalt,
      version: basis.version,
      link: basis.link,
      schlagworte: basis.schlagworte.join(', '),
      projektIds: basis.projektIds,
    },
    validiere,
  )
  const { werte, setze, fehler } = form

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = {
      titel: g.titel.trim(),
      beschreibung: g.beschreibung.trim(),
      plattform: g.plattform.trim(),
      status: g.status as Werkzeug['status'],
      inhalt: g.inhalt.replace(/\s+$/, ''),
      version: g.version.trim(),
      link: g.link.trim(),
      schlagworte: listeAusKomma(g.schlagworte),
      projektIds: g.projektIds,
    }
    if (eintrag) {
      dispatch({ type: 'aendern', sammlung: 'werkzeug', id: eintrag.id, aenderung: daten })
      zeige(`${info.einzahl} gespeichert`)
    } else {
      const id = crypto.randomUUID()
      dispatch({ type: 'anlegen', sammlung: 'werkzeug', id, daten: { ...leeresWerkzeug(typ), ...daten } })
      zeige(`${info.einzahl} angelegt`)
      onAngelegt?.(id)
    }
    onSchliessen()
  }

  const folge = eintrag ? loeschfolgen(data, 'werkzeug', eintrag.id) : null

  return (
    <>
      <FormDialog
        offen
        titel={eintrag ? `${info.einzahl} bearbeiten` : `Neu: ${info.einzahl}`}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          eintrag && (
            <Button variant="ghost" onClick={() => setLoeschen(true)}>
              Löschen
            </Button>
          )
        }
      >
        <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
        <TextField label="Wofür" value={werte.beschreibung} onChange={(e) => setze('beschreibung', e.target.value)} hint="Ein Satz: Wann setzt du es ein?" />
        <div className={styles.zeile}>
          <TextField label={info.plattform.label} value={werte.plattform} onChange={(e) => setze('plattform', e.target.value)} list={plattformListe} hint={info.plattform.hinweis} />
          <datalist id={plattformListe}>
            {werkzeugPlattformen(data, typ).map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <SelectField
            label="Status"
            required
            value={werte.status}
            onChange={(e) => setze('status', e.target.value)}
            options={Object.entries(WERKZEUG_STATUS).map(([value, label]) => ({ value, label }))}
          />
        </div>
        <TextAreaField label={info.inhalt.label} value={werte.inhalt} onChange={(e) => setze('inhalt', e.target.value)} rows={typ === 'befehl' ? 4 : 10} hint={info.inhalt.hinweis} spellCheck={typ !== 'befehl'} />
        <div className={styles.zeile}>
          <TextField label="Version" value={werte.version} onChange={(e) => setze('version', e.target.value)} hint="z. B. v2 – mit Beispielen" />
          <TextField label="Link" type="url" value={werte.link} onChange={(e) => setze('link', e.target.value)} hint="Doku oder Quelle" />
        </div>
        <TextField label="Schlagworte" value={werte.schlagworte} onChange={(e) => setze('schlagworte', e.target.value)} hint="Mehrere mit Komma trennen." />
        {data.projekte.length > 0 && (
          <fieldset className={styles.gruppe}>
            <legend>Verknüpfungen</legend>
            <div className={styles.auswahlListe} role="group" aria-label="Projekte">
              {[...data.projekte]
                .sort((a, b) => a.titel.localeCompare(b.titel, 'de'))
                .map((p) => (
                  <label key={p.id} className={styles.check}>
                    <input type="checkbox" checked={werte.projektIds.includes(p.id)} onChange={(e) => setze('projektIds', umschalten(werte.projektIds, p.id, e.target.checked))} />
                    {p.titel}
                  </label>
                ))}
            </div>
          </fieldset>
        )}
      </FormDialog>
      {loeschen && eintrag && (
        <ConfirmDialog
          offen
          titel={`${info.einzahl} löschen?`}
          bestaetigenLabel={`${info.einzahl} löschen`}
          gefahr
          onAbbrechen={() => setLoeschen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'werkzeug', id: eintrag.id })
            zeige(`${info.einzahl} gelöscht`)
            onSchliessen()
            onGeloescht?.()
          }}
        >
          <p>„{eintrag.titel}“ wird endgültig gelöscht.</p>
          {folge && folge.entknuepft.length > 0 && <p>Die Verknüpfung mit {folge.entknuepft.length} anderen Werkzeugen wird entfernt.</p>}
        </ConfirmDialog>
      )}
    </>
  )
}
