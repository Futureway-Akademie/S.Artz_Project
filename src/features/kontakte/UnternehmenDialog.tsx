import { TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import type { Unternehmen } from '../../domain/types.ts'
import { listeAusKomma, useForm, type Fehler } from '../../hooks/useForm.ts'

interface Werte extends Record<string, unknown> {
  name: string
  branche: string
  website: string
  notiz: string
  schlagworte: string
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.name.trim()) fehler.name = 'Bitte einen Namen eingeben.'
  if (werte.website && !/^https?:\/\//.test(werte.website.trim())) fehler.website = 'Bitte die vollständige Adresse mit https:// eingeben.'
  return fehler
}

export function UnternehmenDialog({ unternehmen, onSchliessen }: { unternehmen?: Unternehmen; onSchliessen: () => void }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const form = useForm<Werte>(
    {
      name: unternehmen?.name ?? '',
      branche: unternehmen?.branche ?? '',
      website: unternehmen?.website ?? '',
      notiz: unternehmen?.notiz ?? '',
      schlagworte: unternehmen?.schlagworte.join(', ') ?? '',
    },
    validiere,
  )
  const { werte, setze, fehler } = form
  const doppelt = data.unternehmen.some((u) => u.id !== unternehmen?.id && u.name.trim().toLowerCase() === werte.name.trim().toLowerCase())

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = { name: g.name.trim(), branche: g.branche.trim(), website: g.website.trim(), notiz: g.notiz.trim(), schlagworte: listeAusKomma(g.schlagworte) }
    if (unternehmen) {
      dispatch({ type: 'aendern', sammlung: 'unternehmen', id: unternehmen.id, aenderung: daten })
      zeige('Unternehmen gespeichert')
    } else {
      dispatch({ type: 'anlegen', sammlung: 'unternehmen', daten })
      zeige('Unternehmen angelegt')
    }
    onSchliessen()
  }

  return (
    <FormDialog offen titel={unternehmen ? 'Unternehmen bearbeiten' : 'Unternehmen anlegen'} geaendert={form.geaendert} onSpeichern={speichern} onSchliessen={onSchliessen}>
      <TextField
        label="Name"
        required
        value={werte.name}
        onChange={(e) => setze('name', e.target.value)}
        error={fehler.name}
        hint={doppelt ? 'Ein Unternehmen mit diesem Namen gibt es schon.' : undefined}
      />
      <TextField label="Branche" value={werte.branche} onChange={(e) => setze('branche', e.target.value)} />
      <TextField label="Website" type="url" value={werte.website} onChange={(e) => setze('website', e.target.value)} error={fehler.website} />
      <TextAreaField label="Notiz" value={werte.notiz} onChange={(e) => setze('notiz', e.target.value)} rows={3} />
      <TextField label="Schlagworte" value={werte.schlagworte} onChange={(e) => setze('schlagworte', e.target.value)} hint="Mehrere mit Komma trennen." />
    </FormDialog>
  )
}
