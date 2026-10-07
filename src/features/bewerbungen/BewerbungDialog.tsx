import { useId, useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { BEWERBUNG_STATUS, optionen } from '../../domain/labels.ts'
import type { Bewerbung } from '../../domain/types.ts'
import { useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from '../aufgaben/AufgabeDialog.module.css'

interface Werte extends Record<string, unknown> {
  stelle: string
  unternehmenId: string
  zielrolleId: string
  kontaktId: string
  status: string
  quelle: string
  beworbenAm: string
  link: string
  naechsterSchritt: string
  notiz: string
  wiedervorlageAm: string
}

/** Vorschläge für das Feld „Quelle“; freie Eingabe bleibt möglich. */
const QUELLEN = ['Jobsuche-Assistent', 'LinkedIn', 'Stepstone', 'Direkt', 'Empfehlung']

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.stelle.trim()) fehler.stelle = 'Bitte die Stelle eingeben.'
  if (werte.link && !/^https?:\/\//.test(werte.link.trim())) fehler.link = 'Bitte die vollständige Adresse mit https:// eingeben.'
  return fehler
}

export function BewerbungDialog({ bewerbung, onSchliessen }: { bewerbung?: Bewerbung; onSchliessen: () => void }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const quellenListe = useId()
  const [loeschenFragen, setLoeschenFragen] = useState(false)
  const form = useForm<Werte>(
    {
      stelle: bewerbung?.stelle ?? '',
      unternehmenId: bewerbung?.unternehmenId ?? '',
      zielrolleId: bewerbung?.zielrolleId ?? '',
      kontaktId: bewerbung?.kontaktId ?? '',
      status: bewerbung?.status ?? 'geplant',
      quelle: bewerbung?.quelle ?? '',
      beworbenAm: bewerbung?.beworbenAm ?? '',
      link: bewerbung?.link ?? '',
      naechsterSchritt: bewerbung?.naechsterSchritt ?? '',
      notiz: bewerbung?.notiz ?? '',
      wiedervorlageAm: bewerbung?.wiedervorlageAm ?? '',
    },
    validiere,
  )
  const { werte, setze, fehler } = form

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = {
      stelle: g.stelle.trim(),
      unternehmenId: g.unternehmenId || null,
      zielrolleId: g.zielrolleId || null,
      kontaktId: g.kontaktId || null,
      status: g.status as Bewerbung['status'],
      quelle: g.quelle.trim(),
      beworbenAm: g.beworbenAm || null,
      link: g.link.trim(),
      naechsterSchritt: g.naechsterSchritt.trim(),
      notiz: g.notiz.trim(),
      wiedervorlageAm: g.wiedervorlageAm || null,
    }
    if (bewerbung) {
      dispatch({ type: 'aendern', sammlung: 'bewerbungen', id: bewerbung.id, aenderung: daten })
      zeige('Bewerbung gespeichert')
    } else {
      dispatch({ type: 'anlegen', sammlung: 'bewerbungen', daten })
      zeige('Bewerbung angelegt')
    }
    onSchliessen()
  }

  return (
    <>
      <FormDialog
        offen
        titel={bewerbung ? 'Bewerbung bearbeiten' : 'Bewerbung anlegen'}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          bewerbung && (
            <Button variant="ghost" onClick={() => setLoeschenFragen(true)}>
              Löschen
            </Button>
          )
        }
      >
        <TextField label="Stelle" required value={werte.stelle} onChange={(e) => setze('stelle', e.target.value)} error={fehler.stelle} />
        <div className={styles.zeile}>
          <SelectField
            label="Unternehmen"
            value={werte.unternehmenId}
            onChange={(e) => setze('unternehmenId', e.target.value)}
            placeholder="Kein Unternehmen"
            options={data.unternehmen.map((u) => ({ value: u.id, label: u.name }))}
          />
          <SelectField
            label="Zielrolle"
            value={werte.zielrolleId}
            onChange={(e) => setze('zielrolleId', e.target.value)}
            placeholder="Keine Zielrolle"
            options={data.zielrollen.map((z) => ({ value: z.id, label: z.titel }))}
          />
        </div>
        <div className={styles.zeile}>
          <SelectField label="Status" required value={werte.status} onChange={(e) => setze('status', e.target.value)} options={optionen(BEWERBUNG_STATUS)} />
          <TextField label="Beworben am" type="date" value={werte.beworbenAm} onChange={(e) => setze('beworbenAm', e.target.value)} />
        </div>
        <div className={styles.zeile}>
          <SelectField
            label="Ansprechpartner"
            value={werte.kontaktId}
            onChange={(e) => setze('kontaktId', e.target.value)}
            placeholder="Kein Kontakt"
            options={data.kontakte.map((k) => ({ value: k.id, label: k.name }))}
          />
          <TextField label="Quelle" value={werte.quelle} onChange={(e) => setze('quelle', e.target.value)} list={quellenListe} hint="z. B. Jobsuche-Assistent, LinkedIn" />
          <datalist id={quellenListe}>
            {QUELLEN.map((q) => (
              <option key={q} value={q} />
            ))}
          </datalist>
        </div>
        <TextField label="Link zur Ausschreibung" type="url" value={werte.link} onChange={(e) => setze('link', e.target.value)} error={fehler.link} />
        <div className={styles.zeile}>
          <TextField label="Nächster Schritt" value={werte.naechsterSchritt} onChange={(e) => setze('naechsterSchritt', e.target.value)} />
          <TextField
            label="Wiedervorlage am"
            type="date"
            value={werte.wiedervorlageAm}
            onChange={(e) => setze('wiedervorlageAm', e.target.value)}
            hint="Erscheint im Cockpit und im Kalender."
          />
        </div>
        <TextAreaField label="Notiz" value={werte.notiz} onChange={(e) => setze('notiz', e.target.value)} rows={3} />
      </FormDialog>
      {loeschenFragen && bewerbung && (
        <ConfirmDialog
          offen
          titel="Bewerbung löschen?"
          bestaetigenLabel="Bewerbung löschen"
          gefahr
          onAbbrechen={() => setLoeschenFragen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'bewerbungen', id: bewerbung.id })
            zeige('Bewerbung gelöscht')
            onSchliessen()
          }}
        >
          <p>„{bewerbung.stelle}“ wird endgültig gelöscht.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
