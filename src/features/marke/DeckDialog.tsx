import { TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import type { Deck } from '../../domain/types.ts'
import { useForm, type Fehler } from '../../hooks/useForm.ts'

interface Werte extends Record<string, unknown> {
  titel: string
  modul: string
  tag: string
  beschreibung: string
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.titel.trim()) fehler.titel = 'Bitte einen Titel eingeben.'
  if (werte.modul && !/^\d+$/.test(werte.modul)) fehler.modul = 'Bitte eine ganze Zahl eingeben.'
  if (werte.tag && !/^\d+$/.test(werte.tag)) fehler.tag = 'Bitte eine ganze Zahl eingeben.'
  return fehler
}

/** Präsentation (Deck) anlegen oder bearbeiten; leere Zahlen werden zu `null`. */
export function DeckDialog({ deck, onSchliessen }: { deck?: Deck; onSchliessen: () => void }) {
  const { dispatch } = useStore()
  const { zeige } = useToast()
  const form = useForm<Werte>(
    {
      titel: deck?.titel ?? '',
      modul: deck?.modul?.toString() ?? '',
      tag: deck?.tag?.toString() ?? '',
      beschreibung: deck?.beschreibung ?? '',
    },
    validiere,
  )
  const { werte, setze, fehler } = form

  const speichern = () => {
    const gueltig = form.pruefen()
    if (!gueltig) return
    const daten = {
      titel: gueltig.titel.trim(),
      modul: gueltig.modul ? Number(gueltig.modul) : null,
      tag: gueltig.tag ? Number(gueltig.tag) : null,
      beschreibung: gueltig.beschreibung.trim(),
    }
    if (deck) {
      dispatch({ type: 'aendern', sammlung: 'decks', id: deck.id, aenderung: daten })
      zeige('Präsentation gespeichert')
    } else {
      dispatch({ type: 'anlegen', sammlung: 'decks', daten })
      zeige('Präsentation angelegt')
    }
    onSchliessen()
  }

  return (
    <FormDialog offen titel={deck ? 'Präsentation bearbeiten' : 'Präsentation anlegen'} geaendert={form.geaendert} onSpeichern={speichern} onSchliessen={onSchliessen}>
      <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
      <TextField label="Modul" inputMode="numeric" value={werte.modul} onChange={(e) => setze('modul', e.target.value)} error={fehler.modul} />
      <TextField label="Tag" inputMode="numeric" value={werte.tag} onChange={(e) => setze('tag', e.target.value)} error={fehler.tag} />
      <TextAreaField label="Inhalt" value={werte.beschreibung} onChange={(e) => setze('beschreibung', e.target.value)} rows={4} />
    </FormDialog>
  )
}
