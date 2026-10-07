import { TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import type { Kurs } from '../../domain/types.ts'
import { listeAusZeilen, useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from '../aufgaben/AufgabeDialog.module.css'

interface Werte extends Record<string, unknown> {
  anbieter: string
  beschreibung: string
  startDatum: string
  endeDatum: string
  unterrichtszeit: string
  umfang: string
  module: string
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (werte.startDatum && werte.endeDatum && werte.endeDatum < werte.startDatum) fehler.endeDatum = 'Das Ende liegt vor dem Start.'
  return fehler
}

/** Kursdaten pflegen; Start- und Endmonat folgen den Daten. */
export function KursDialog({ kurs, onSchliessen }: { kurs: Kurs; onSchliessen: () => void }) {
  const { dispatch } = useStore()
  const { zeige } = useToast()
  const form = useForm<Werte>(
    {
      anbieter: kurs.anbieter,
      beschreibung: kurs.beschreibung,
      startDatum: kurs.startDatum ?? '',
      endeDatum: kurs.endeDatum ?? '',
      unterrichtszeit: kurs.unterrichtszeit,
      umfang: kurs.umfang,
      module: kurs.module.join('\n'),
    },
    validiere,
  )
  const { werte, setze, fehler } = form

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    dispatch({
      type: 'aendern',
      sammlung: 'kurse',
      id: kurs.id,
      aenderung: {
        anbieter: g.anbieter.trim(),
        beschreibung: g.beschreibung.trim(),
        startDatum: g.startDatum || null,
        endeDatum: g.endeDatum || null,
        startMonat: g.startDatum ? g.startDatum.slice(0, 7) : kurs.startMonat,
        endeMonat: g.endeDatum ? g.endeDatum.slice(0, 7) : kurs.endeMonat,
        unterrichtszeit: g.unterrichtszeit.trim(),
        umfang: g.umfang.trim(),
        module: listeAusZeilen(g.module),
      },
    })
    zeige('Kursdaten gespeichert')
    onSchliessen()
  }

  return (
    <FormDialog offen titel="Kurs bearbeiten" geaendert={form.geaendert} onSpeichern={speichern} onSchliessen={onSchliessen}>
      <TextField label="Anbieter" value={werte.anbieter} onChange={(e) => setze('anbieter', e.target.value)} />
      <TextField label="Form" value={werte.beschreibung} onChange={(e) => setze('beschreibung', e.target.value)} hint="z. B. Vollzeit Online-Live" />
      <div className={styles.zeile}>
        <TextField label="Start" type="date" value={werte.startDatum} onChange={(e) => setze('startDatum', e.target.value)} />
        <TextField label="Ende" type="date" value={werte.endeDatum} onChange={(e) => setze('endeDatum', e.target.value)} error={fehler.endeDatum} />
      </div>
      <div className={styles.zeile}>
        <TextField label="Unterrichtszeit" value={werte.unterrichtszeit} onChange={(e) => setze('unterrichtszeit', e.target.value)} />
        <TextField label="Umfang" value={werte.umfang} onChange={(e) => setze('umfang', e.target.value)} />
      </div>
      <TextAreaField label="Module" value={werte.module} onChange={(e) => setze('module', e.target.value)} rows={5} hint="Ein Modul pro Zeile." />
    </FormDialog>
  )
}
