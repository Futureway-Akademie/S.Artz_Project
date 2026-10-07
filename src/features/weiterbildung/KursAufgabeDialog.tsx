import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { KURSAUFGABE_STATUS, optionen } from '../../domain/labels.ts'
import { kursCodeMuster } from '../../domain/selectors/weiterbildung.ts'
import type { Kurs, KursAufgabe } from '../../domain/types.ts'
import { useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from '../aufgaben/AufgabeDialog.module.css'

interface Werte extends Record<string, unknown> {
  code: string
  titel: string
  status: string
  faelligAm: string
  notiz: string
}

interface KursAufgabeDialogProps {
  kurs: Kurs
  aufgabe?: KursAufgabe
  codeVorschlag: string
  onSchliessen: () => void
}

/** Kursaufgabe im Format KURS_X_YY anlegen oder bearbeiten. */
export function KursAufgabeDialog({ kurs, aufgabe, codeVorschlag, onSchliessen }: KursAufgabeDialogProps) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [loeschenFragen, setLoeschenFragen] = useState(false)
  const muster = kursCodeMuster(kurs.codePraefix)

  const validiere = (werte: Werte): Fehler<Werte> => {
    const fehler: Fehler<Werte> = {}
    const code = werte.code.trim()
    if (!muster.test(code)) fehler.code = `Bitte im Format ${kurs.codePraefix}_X_YY eingeben, z. B. ${kurs.codePraefix}_3_07.`
    else if (data.kursAufgaben.some((a) => a.code === code && a.id !== aufgabe?.id)) fehler.code = 'Diesen Code gibt es schon.'
    if (!werte.titel.trim()) fehler.titel = 'Bitte einen Titel eingeben.'
    return fehler
  }

  const form = useForm<Werte>(
    {
      code: aufgabe?.code ?? codeVorschlag,
      titel: aufgabe?.titel ?? '',
      status: aufgabe?.status ?? 'offen',
      faelligAm: aufgabe?.faelligAm ?? '',
      notiz: aufgabe?.notiz ?? '',
    },
    validiere,
  )
  const { werte, setze, fehler } = form

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = {
      code: g.code.trim(),
      titel: g.titel.trim(),
      status: g.status as KursAufgabe['status'],
      faelligAm: g.faelligAm || null,
      notiz: g.notiz.trim(),
    }
    if (aufgabe) {
      dispatch({ type: 'aendern', sammlung: 'kursAufgaben', id: aufgabe.id, aenderung: daten })
      zeige('Kursaufgabe gespeichert')
    } else {
      dispatch({ type: 'anlegen', sammlung: 'kursAufgaben', daten: { ...daten, kursId: kurs.id } })
      zeige('Kursaufgabe angelegt')
    }
    onSchliessen()
  }

  return (
    <>
      <FormDialog
        offen
        titel={aufgabe ? 'Kursaufgabe bearbeiten' : 'Kursaufgabe anlegen'}
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
        <div className={styles.zeile}>
          <TextField label="Code" required value={werte.code} onChange={(e) => setze('code', e.target.value)} error={fehler.code} hint={`Format ${kurs.codePraefix}_Modul_Nummer`} />
          <SelectField label="Status" required value={werte.status} onChange={(e) => setze('status', e.target.value)} options={optionen(KURSAUFGABE_STATUS)} />
        </div>
        <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
        <TextField label="Frist" type="date" value={werte.faelligAm} onChange={(e) => setze('faelligAm', e.target.value)} />
        <TextAreaField label="Notiz" value={werte.notiz} onChange={(e) => setze('notiz', e.target.value)} rows={3} />
      </FormDialog>
      {loeschenFragen && aufgabe && (
        <ConfirmDialog
          offen
          titel="Kursaufgabe löschen?"
          bestaetigenLabel="Kursaufgabe löschen"
          gefahr
          onAbbrechen={() => setLoeschenFragen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'kursAufgaben', id: aufgabe.id })
            zeige('Kursaufgabe gelöscht')
            onSchliessen()
          }}
        >
          <p>
            „{aufgabe.code} {aufgabe.titel}“ wird endgültig gelöscht.
          </p>
        </ConfirmDialog>
      )}
    </>
  )
}
