import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { LEAD_STATUS, optionen } from '../../domain/labels.ts'
import { parseEuro } from '../../domain/selectors/leads.ts'
import type { Lead } from '../../domain/types.ts'
import { useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from '../aufgaben/AufgabeDialog.module.css'

interface Werte extends Record<string, unknown> {
  titel: string
  kontaktId: string
  unternehmenId: string
  status: string
  betrag: string
  naechsterSchritt: string
  notiz: string
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.titel.trim()) fehler.titel = 'Bitte einen Titel eingeben.'
  if (Number.isNaN(parseEuro(werte.betrag))) fehler.betrag = 'Bitte einen Betrag wie 1.500,00 eingeben oder leer lassen.'
  return fehler
}

/** Lead für PIKARTZ.AI-Anfragen (Schulung, Automation); Betrag optional. */
export function LeadDialog({ lead, onSchliessen }: { lead?: Lead; onSchliessen: () => void }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [loeschenFragen, setLoeschenFragen] = useState(false)
  const form = useForm<Werte>(
    {
      titel: lead?.titel ?? '',
      kontaktId: lead?.kontaktId ?? '',
      unternehmenId: lead?.unternehmenId ?? '',
      status: lead?.status ?? 'neu',
      betrag: lead?.betragEur !== null && lead?.betragEur !== undefined ? lead.betragEur.toLocaleString('de-DE', { minimumFractionDigits: 2 }) : '',
      naechsterSchritt: lead?.naechsterSchritt ?? '',
      notiz: lead?.notiz ?? '',
    },
    validiere,
  )
  const { werte, setze, fehler } = form

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = {
      titel: g.titel.trim(),
      kontaktId: g.kontaktId || null,
      unternehmenId: g.unternehmenId || null,
      status: g.status as Lead['status'],
      betragEur: parseEuro(g.betrag),
      naechsterSchritt: g.naechsterSchritt.trim(),
      notiz: g.notiz.trim(),
    }
    if (lead) {
      dispatch({ type: 'aendern', sammlung: 'leads', id: lead.id, aenderung: daten })
      zeige('Lead gespeichert')
    } else {
      dispatch({ type: 'anlegen', sammlung: 'leads', daten })
      zeige('Lead angelegt')
    }
    onSchliessen()
  }

  return (
    <>
      <FormDialog
        offen
        titel={lead ? 'Lead bearbeiten' : 'Lead anlegen'}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          lead && (
            <Button variant="ghost" onClick={() => setLoeschenFragen(true)}>
              Löschen
            </Button>
          )
        }
      >
        <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} hint="z. B. Schulung KI-Grundlagen" />
        <div className={styles.zeile}>
          <SelectField
            label="Kontakt"
            value={werte.kontaktId}
            onChange={(e) => setze('kontaktId', e.target.value)}
            placeholder="Kein Kontakt"
            options={data.kontakte.map((k) => ({ value: k.id, label: k.name }))}
          />
          <SelectField
            label="Unternehmen"
            value={werte.unternehmenId}
            onChange={(e) => setze('unternehmenId', e.target.value)}
            placeholder="Kein Unternehmen"
            options={data.unternehmen.map((u) => ({ value: u.id, label: u.name }))}
          />
        </div>
        <div className={styles.zeile}>
          <SelectField label="Status" required value={werte.status} onChange={(e) => setze('status', e.target.value)} options={optionen(LEAD_STATUS)} />
          <TextField label="Betrag in €" inputMode="decimal" value={werte.betrag} onChange={(e) => setze('betrag', e.target.value)} error={fehler.betrag} hint="Leer lassen, wenn noch offen." />
        </div>
        <TextField label="Nächster Schritt" value={werte.naechsterSchritt} onChange={(e) => setze('naechsterSchritt', e.target.value)} />
        <TextAreaField label="Notiz" value={werte.notiz} onChange={(e) => setze('notiz', e.target.value)} rows={3} />
      </FormDialog>
      {loeschenFragen && lead && (
        <ConfirmDialog
          offen
          titel="Lead löschen?"
          bestaetigenLabel="Lead löschen"
          gefahr
          onAbbrechen={() => setLoeschenFragen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'leads', id: lead.id })
            zeige('Lead gelöscht')
            onSchliessen()
          }}
        >
          <p>„{lead.titel}“ wird endgültig gelöscht.</p>
        </ConfirmDialog>
      )}
    </>
  )
}
