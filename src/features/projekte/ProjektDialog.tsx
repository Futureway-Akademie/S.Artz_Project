import { useId } from 'react'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { KEIN_STATUS, optionen, PROJEKT_STATUS } from '../../domain/labels.ts'
import { projektKategorien } from '../../domain/selectors/projekte.ts'
import { projektDublette } from '../../domain/selectors/schlagworte.ts'
import type { Projekt, ProjektStatus } from '../../domain/types.ts'
import { listeAusKomma, listeAusZeilen, useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from './ProjektDialog.module.css'

interface Werte extends Record<string, unknown> {
  titel: string
  kategorie: string
  status: string
  zuletztAktiv: string
  beschreibung: string
  tools: string
  bestandteile: string
  notizen: string
  auftraggeberId: string
  schlagworte: string
}

function validiereProjekt(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.titel.trim()) fehler.titel = 'Bitte einen Titel eingeben.'
  if (werte.zuletztAktiv && !/^\d{4}-\d{2}-\d{2}$/.test(werte.zuletztAktiv)) fehler.zuletztAktiv = 'Bitte ein gültiges Datum eingeben.'
  return fehler
}

interface ProjektDialogProps {
  /** Bestehendes Projekt bearbeiten; ohne: neues Projekt anlegen */
  projekt?: Projekt
  onSchliessen: () => void
  /** Nach dem Anlegen, z. B. um zur Detailseite zu wechseln */
  onAngelegt?: (id: string) => void
}

export function ProjektDialog({ projekt, onSchliessen, onAngelegt }: ProjektDialogProps) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const kategorienListe = useId()

  const form = useForm<Werte>(
    {
      titel: projekt?.titel ?? '',
      kategorie: projekt?.kategorie ?? '',
      status: projekt?.status ?? '',
      zuletztAktiv: projekt?.zuletztAktiv ?? '',
      beschreibung: projekt?.beschreibung ?? '',
      tools: projekt?.tools.join(', ') ?? '',
      bestandteile: projekt?.bestandteile.join('\n') ?? '',
      notizen: projekt?.notizen ?? '',
      auftraggeberId: projekt?.auftraggeberId ?? '',
      schlagworte: projekt?.schlagworte.join(', ') ?? '',
    },
    validiereProjekt,
  )
  const { werte, setze, fehler } = form
  const dublette = projektDublette(data, werte.titel, projekt?.id)

  const speichern = () => {
    const gueltig = form.pruefen()
    if (!gueltig) return
    const daten = {
      titel: gueltig.titel.trim(),
      kategorie: gueltig.kategorie.trim(),
      // Der Status wird nur hier manuell gesetzt, nie automatisch
      status: (gueltig.status || null) as ProjektStatus | null,
      zuletztAktiv: gueltig.zuletztAktiv || null,
      beschreibung: gueltig.beschreibung.trim(),
      tools: listeAusKomma(gueltig.tools),
      bestandteile: listeAusZeilen(gueltig.bestandteile),
      notizen: gueltig.notizen.trim(),
      auftraggeberId: gueltig.auftraggeberId || null,
      schlagworte: listeAusKomma(gueltig.schlagworte),
    }
    if (projekt) {
      dispatch({ type: 'aendern', sammlung: 'projekte', id: projekt.id, aenderung: daten })
      zeige('Projekt gespeichert')
      onSchliessen()
    } else {
      const id = crypto.randomUUID()
      dispatch({ type: 'anlegen', sammlung: 'projekte', id, daten: { ...daten, automation: null } })
      zeige('Projekt angelegt')
      onSchliessen()
      onAngelegt?.(id)
    }
  }

  return (
    <FormDialog
      offen
      titel={projekt ? 'Projekt bearbeiten' : 'Projekt anlegen'}
      geaendert={form.geaendert}
      onSpeichern={speichern}
      onSchliessen={onSchliessen}
    >
      <TextField
        label="Titel"
        required
        value={werte.titel}
        onChange={(e) => setze('titel', e.target.value)}
        error={fehler.titel}
        hint={dublette ? `Ein Projekt „${dublette}“ gibt es schon.` : undefined}
      />
      <div className={styles.zeile}>
        <TextField
          label="Kategorie"
          value={werte.kategorie}
          onChange={(e) => setze('kategorie', e.target.value)}
          list={kategorienListe}
          hint="z. B. Karriere, Kundenprojekt, Privat"
        />
        <datalist id={kategorienListe}>
          {projektKategorien(data).map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
        <SelectField
          label="Status"
          value={werte.status}
          onChange={(e) => setze('status', e.target.value)}
          placeholder={KEIN_STATUS}
          options={optionen(PROJEKT_STATUS)}
          hint="Wird nie automatisch geändert."
        />
      </div>
      <div className={styles.zeile}>
        <SelectField
          label="Auftraggeber"
          value={werte.auftraggeberId}
          onChange={(e) => setze('auftraggeberId', e.target.value)}
          placeholder="Kein Auftraggeber"
          options={[...data.unternehmen].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((u) => ({ value: u.id, label: u.name }))}
          hint={data.unternehmen.length === 0 ? 'Unternehmen legst du unter „Kontakte“ an.' : 'Ansprechpartner verknüpfst du beim Kontakt.'}
        />
        <TextField
          label="Zuletzt aktiv"
          type="date"
          value={werte.zuletztAktiv}
          onChange={(e) => setze('zuletztAktiv', e.target.value)}
          error={fehler.zuletztAktiv}
          hint="Wird automatisch gesetzt, wenn du am Projekt arbeitest."
        />
      </div>
      <TextAreaField label="Beschreibung" value={werte.beschreibung} onChange={(e) => setze('beschreibung', e.target.value)} rows={3} />
      <TextField
        label="Tools"
        value={werte.tools}
        onChange={(e) => setze('tools', e.target.value)}
        hint="Mehrere Tools mit Komma trennen."
      />
      <TextAreaField
        label="Bestandteile"
        value={werte.bestandteile}
        onChange={(e) => setze('bestandteile', e.target.value)}
        rows={3}
        hint="Ein Bestandteil pro Zeile."
      />
      <TextAreaField label="Notizen" value={werte.notizen} onChange={(e) => setze('notizen', e.target.value)} rows={4} />
      <TextField label="Schlagworte" value={werte.schlagworte} onChange={(e) => setze('schlagworte', e.target.value)} hint="Mehrere mit Komma trennen." />
    </FormDialog>
  )
}
