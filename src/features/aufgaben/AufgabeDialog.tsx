import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { bezugAlsText, bezugAusText, bezugOptionen as alleBezugOptionen } from '../../domain/selectors/bezug.ts'
import type { Aufgabe, Bezug } from '../../domain/types.ts'
import { useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from './AufgabeDialog.module.css'

interface Werte extends Record<string, unknown> {
  titel: string
  notiz: string
  faelligAm: string
  /** `ohne` | `projekt:<id>` | `weiterbildung:<id>` | `kontakt:<id>` */
  bezug: string
  erledigt: boolean
}

function validiereAufgabe(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.titel.trim()) fehler.titel = 'Bitte einen Titel eingeben.'
  if (werte.faelligAm && !/^\d{4}-\d{2}-\d{2}$/.test(werte.faelligAm)) fehler.faelligAm = 'Bitte ein gültiges Datum eingeben.'
  return fehler
}

interface AufgabeDialogProps {
  /** Bestehende Aufgabe bearbeiten; ohne: neue Aufgabe anlegen */
  aufgabe?: Aufgabe
  /** Vorbelegter Bezug für neue Aufgaben, z. B. das aktuelle Projekt */
  vorgabeBezug?: Bezug
  titel?: string
  onSchliessen: () => void
}

/** Anlegen und Bearbeiten einer Aufgabe bzw. eines nächsten Schritts (mit optionaler Frist und Bezug). */
export function AufgabeDialog({ aufgabe, vorgabeBezug = { art: 'ohne', id: null }, titel, onSchliessen }: AufgabeDialogProps) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [loeschenFragen, setLoeschenFragen] = useState(false)

  const start: Werte = {
    titel: aufgabe?.titel ?? '',
    notiz: aufgabe?.notiz ?? '',
    faelligAm: aufgabe?.faelligAm ?? '',
    bezug: bezugAlsText(aufgabe?.bezug ?? vorgabeBezug),
    erledigt: aufgabe?.erledigt ?? false,
  }
  const form = useForm(start, validiereAufgabe)
  const { werte, setze, fehler } = form

  const speichern = () => {
    const gueltig = form.pruefen()
    if (!gueltig) return
    const daten = {
      titel: gueltig.titel.trim(),
      notiz: gueltig.notiz.trim(),
      faelligAm: gueltig.faelligAm || null,
      bezug: bezugAusText(gueltig.bezug),
      erledigt: gueltig.erledigt,
    }
    if (aufgabe) {
      dispatch({ type: 'aendern', sammlung: 'aufgaben', id: aufgabe.id, aenderung: daten })
      zeige('Aufgabe gespeichert')
    } else {
      dispatch({ type: 'anlegen', sammlung: 'aufgaben', daten: { ...daten, erledigtAm: null } })
      zeige('Aufgabe angelegt')
    }
    onSchliessen()
  }

  const loeschen = () => {
    if (!aufgabe) return
    dispatch({ type: 'loeschen', sammlung: 'aufgaben', id: aufgabe.id })
    zeige('Aufgabe gelöscht')
    setLoeschenFragen(false)
    onSchliessen()
  }

  const bezugOptionen = alleBezugOptionen(data)
  // Bezug auf inzwischen gelöschte Einträge trotzdem anzeigen
  if (werte.bezug !== 'ohne' && !bezugOptionen.some((o) => o.value === werte.bezug)) {
    bezugOptionen.unshift({ value: werte.bezug, label: 'Nicht mehr vorhandener Bezug' })
  }

  return (
    <>
      <FormDialog
        offen
        titel={titel ?? (aufgabe ? 'Aufgabe bearbeiten' : 'Aufgabe anlegen')}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          aufgabe && (
            <Button variant="ghost" onClick={() => setLoeschenFragen(true)}>
              Löschen
            </Button>
          )
        }
      >
        <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
        <div className={styles.zeile}>
          <TextField
            label="Frist"
            type="date"
            value={werte.faelligAm}
            onChange={(e) => setze('faelligAm', e.target.value)}
            hint="Leer lassen, wenn es keine Frist gibt."
            error={fehler.faelligAm}
          />
          <SelectField
            label="Bezug"
            value={werte.bezug}
            onChange={(e) => setze('bezug', e.target.value)}
            placeholder="Ohne Bezug"
            options={bezugOptionen}
          />
        </div>
        <TextAreaField label="Notiz" value={werte.notiz} onChange={(e) => setze('notiz', e.target.value)} rows={3} />
        {aufgabe && (
          <label className={styles.check}>
            <input type="checkbox" checked={werte.erledigt} onChange={(e) => setze('erledigt', e.target.checked)} />
            Erledigt
          </label>
        )}
      </FormDialog>
      {loeschenFragen && aufgabe && (
        <ConfirmDialog
          offen
          titel="Aufgabe löschen?"
          bestaetigenLabel="Aufgabe löschen"
          gefahr
          onBestaetigen={loeschen}
          onAbbrechen={() => setLoeschenFragen(false)}
        >
          <p>„{aufgabe.titel}“ wird endgültig gelöscht.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
