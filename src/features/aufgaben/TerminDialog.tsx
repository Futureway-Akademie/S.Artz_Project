import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { bezugAlsText, bezugAusText, bezugOptionen } from '../../domain/selectors/bezug.ts'
import type { Bezug, Termin } from '../../domain/types.ts'
import { useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from './AufgabeDialog.module.css'

interface Werte extends Record<string, unknown> {
  titel: string
  datum: string
  uhrzeit: string
  ort: string
  notiz: string
  bezug: string
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.titel.trim()) fehler.titel = 'Bitte einen Titel eingeben.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(werte.datum)) fehler.datum = 'Bitte ein Datum wählen.'
  if (werte.uhrzeit && !/^\d{2}:\d{2}$/.test(werte.uhrzeit)) fehler.uhrzeit = 'Bitte eine gültige Uhrzeit eingeben.'
  return fehler
}

interface TerminDialogProps {
  termin?: Termin
  vorgabeBezug?: Bezug
  /** Vorbelegtes Datum für neue Termine, z. B. der gewählte Kalendertag */
  vorgabeDatum?: string
  onSchliessen: () => void
}

/** Termin anlegen oder bearbeiten: Datum Pflicht, Uhrzeit optional. */
export function TerminDialog({ termin, vorgabeBezug = { art: 'ohne', id: null }, vorgabeDatum = '', onSchliessen }: TerminDialogProps) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [loeschenFragen, setLoeschenFragen] = useState(false)
  const form = useForm<Werte>(
    {
      titel: termin?.titel ?? '',
      datum: termin?.datum ?? vorgabeDatum,
      uhrzeit: termin?.uhrzeit ?? '',
      ort: termin?.ort ?? '',
      notiz: termin?.notiz ?? '',
      bezug: bezugAlsText(termin?.bezug ?? vorgabeBezug),
    },
    validiere,
  )
  const { werte, setze, fehler } = form

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = {
      titel: g.titel.trim(),
      datum: g.datum,
      uhrzeit: g.uhrzeit || null,
      ort: g.ort.trim(),
      notiz: g.notiz.trim(),
      bezug: bezugAusText(g.bezug),
    }
    if (termin) {
      dispatch({ type: 'aendern', sammlung: 'termine', id: termin.id, aenderung: daten })
      zeige('Termin gespeichert')
    } else {
      dispatch({ type: 'anlegen', sammlung: 'termine', daten })
      zeige('Termin angelegt')
    }
    onSchliessen()
  }

  return (
    <>
      <FormDialog
        offen
        titel={termin ? 'Termin bearbeiten' : 'Termin anlegen'}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          termin && (
            <Button variant="ghost" onClick={() => setLoeschenFragen(true)}>
              Löschen
            </Button>
          )
        }
      >
        <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
        <div className={styles.zeile}>
          <TextField label="Datum" type="date" required value={werte.datum} onChange={(e) => setze('datum', e.target.value)} error={fehler.datum} />
          <TextField label="Uhrzeit" type="time" value={werte.uhrzeit} onChange={(e) => setze('uhrzeit', e.target.value)} error={fehler.uhrzeit} />
        </div>
        <div className={styles.zeile}>
          <TextField label="Ort" value={werte.ort} onChange={(e) => setze('ort', e.target.value)} />
          <SelectField label="Bezug" value={werte.bezug} onChange={(e) => setze('bezug', e.target.value)} placeholder="Ohne Bezug" options={bezugOptionen(data)} />
        </div>
        <TextAreaField label="Notiz" value={werte.notiz} onChange={(e) => setze('notiz', e.target.value)} rows={3} />
      </FormDialog>
      {loeschenFragen && termin && (
        <ConfirmDialog
          offen
          titel="Termin löschen?"
          bestaetigenLabel="Termin löschen"
          gefahr
          onAbbrechen={() => setLoeschenFragen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'termine', id: termin.id })
            zeige('Termin gelöscht')
            onSchliessen()
          }}
        >
          <p>„{termin.titel}“ wird endgültig gelöscht.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
