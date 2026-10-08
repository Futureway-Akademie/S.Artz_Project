import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import type { Designregel } from '../../domain/types.ts'
import { useForm, type Fehler } from '../../hooks/useForm.ts'

interface Werte extends Record<string, unknown> {
  titel: string
  beschreibung: string
}

function validiere(werte: Werte): Fehler<Werte> {
  return werte.titel.trim() ? {} : { titel: 'Bitte einen Titel eingeben.' }
}

/** Designregel anlegen oder bearbeiten. */
export function RegelDialog({ regel, onSchliessen }: { regel?: Designregel; onSchliessen: () => void }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [loeschenFragen, setLoeschenFragen] = useState(false)
  const form = useForm<Werte>({ titel: regel?.titel ?? '', beschreibung: regel?.beschreibung ?? '' }, validiere)
  const { werte, setze, fehler } = form

  const speichern = () => {
    const gueltig = form.pruefen()
    if (!gueltig) return
    const daten = { titel: gueltig.titel.trim(), beschreibung: gueltig.beschreibung.trim() }
    if (regel) {
      dispatch({ type: 'aendern', sammlung: 'designregeln', id: regel.id, aenderung: daten })
      zeige('Designregel gespeichert')
    } else {
      const reihenfolge = Math.max(0, ...data.designregeln.map((r) => r.reihenfolge)) + 1
      dispatch({ type: 'anlegen', sammlung: 'designregeln', daten: { ...daten, reihenfolge } })
      zeige('Designregel angelegt')
    }
    onSchliessen()
  }

  return (
    <>
      <FormDialog
        offen
        titel={regel ? 'Designregel bearbeiten' : 'Designregel anlegen'}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          regel && (
            <Button variant="ghost" onClick={() => setLoeschenFragen(true)}>
              Löschen
            </Button>
          )
        }
      >
        <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
        <TextAreaField label="Regel" value={werte.beschreibung} onChange={(e) => setze('beschreibung', e.target.value)} rows={3} />
      </FormDialog>
      {loeschenFragen && regel && (
        <ConfirmDialog
          offen
          titel="Designregel löschen?"
          bestaetigenLabel="Regel löschen"
          gefahr
          onAbbrechen={() => setLoeschenFragen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'designregeln', id: regel.id })
            zeige('Designregel gelöscht')
            onSchliessen()
          }}
        >
          <p>„{regel.titel}“ wird endgültig gelöscht.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
