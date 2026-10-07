import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { KONTEXT, optionen, RECHTSGRUNDLAGE } from '../../domain/labels.ts'
import { kontaktDubletten } from '../../domain/selectors/schlagworte.ts'
import type { Kontakt } from '../../domain/types.ts'
import { listeAusKomma, useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from '../aufgaben/AufgabeDialog.module.css'

interface Werte extends Record<string, unknown> {
  name: string
  rolle: string
  unternehmenId: string
  email: string
  telefon: string
  linkedinUrl: string
  kontext: string
  herkunft: string
  notiz: string
  rechtsgrundlage: string
  zweck: string
  schlagworte: string
}

function validiere(werte: Werte): Fehler<Werte> {
  const fehler: Fehler<Werte> = {}
  if (!werte.name.trim()) fehler.name = 'Bitte einen Namen eingeben.'
  if (werte.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(werte.email.trim())) fehler.email = 'Bitte eine gültige E-Mail-Adresse eingeben.'
  if (werte.linkedinUrl && !/^https?:\/\//.test(werte.linkedinUrl.trim())) fehler.linkedinUrl = 'Bitte die vollständige Adresse mit https:// eingeben.'
  return fehler
}

interface KontaktDialogProps {
  kontakt?: Kontakt
  /** Vorbelegung, z. B. beim Anlegen aus einem Unternehmen heraus */
  vorgabeUnternehmenId?: string
  onSchliessen: () => void
  onAngelegt?: (id: string) => void
}

export function KontaktDialog({ kontakt, vorgabeUnternehmenId, onSchliessen, onAngelegt }: KontaktDialogProps) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const form = useForm<Werte>(
    {
      name: kontakt?.name ?? '',
      rolle: kontakt?.rolle ?? '',
      unternehmenId: kontakt?.unternehmenId ?? vorgabeUnternehmenId ?? '',
      email: kontakt?.email ?? '',
      telefon: kontakt?.telefon ?? '',
      linkedinUrl: kontakt?.linkedinUrl ?? '',
      kontext: kontakt?.kontext ?? 'jobsuche',
      herkunft: kontakt?.herkunft ?? '',
      notiz: kontakt?.notiz ?? '',
      rechtsgrundlage: kontakt?.rechtsgrundlage ?? '',
      zweck: kontakt?.zweck ?? '',
      schlagworte: kontakt?.schlagworte.join(', ') ?? '',
    },
    validiere,
  )
  const { werte, setze, fehler } = form
  const dubletten = kontaktDubletten(data, { name: werte.name, email: werte.email }, kontakt?.id)

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = {
      name: g.name.trim(),
      rolle: g.rolle.trim(),
      unternehmenId: g.unternehmenId || null,
      email: g.email.trim(),
      telefon: g.telefon.trim(),
      linkedinUrl: g.linkedinUrl.trim(),
      kontext: g.kontext as Kontakt['kontext'],
      herkunft: g.herkunft.trim(),
      notiz: g.notiz.trim(),
      rechtsgrundlage: (g.rechtsgrundlage || null) as Kontakt['rechtsgrundlage'],
      zweck: g.zweck.trim(),
      schlagworte: listeAusKomma(g.schlagworte),
    }
    if (kontakt) {
      dispatch({ type: 'aendern', sammlung: 'kontakte', id: kontakt.id, aenderung: daten })
      zeige('Kontakt gespeichert')
      onSchliessen()
    } else {
      const id = crypto.randomUUID()
      dispatch({ type: 'anlegen', sammlung: 'kontakte', id, daten: { ...daten, projektIds: [], naechsteAktion: null } })
      zeige('Kontakt angelegt')
      onSchliessen()
      onAngelegt?.(id)
    }
  }

  return (
    <FormDialog offen titel={kontakt ? 'Kontakt bearbeiten' : 'Kontakt anlegen'} geaendert={form.geaendert} onSpeichern={speichern} onSchliessen={onSchliessen}>
      <TextField label="Name" required value={werte.name} onChange={(e) => setze('name', e.target.value)} error={fehler.name} />
      {dubletten.length > 0 && (
        <p className={styles.hinweis} role="status">
          Möglicherweise doppelt:{' '}
          {dubletten.map((d) => `„${d.name}“ (${d.grund === 'email' ? 'gleiche E-Mail' : 'gleicher Name'})`).join(', ')}
        </p>
      )}
      <div className={styles.zeile}>
        <TextField label="Rolle" value={werte.rolle} onChange={(e) => setze('rolle', e.target.value)} hint="z. B. Recruiterin, Dozent" />
        <SelectField
          label="Unternehmen"
          value={werte.unternehmenId}
          onChange={(e) => setze('unternehmenId', e.target.value)}
          placeholder="Kein Unternehmen"
          options={[...data.unternehmen].sort((a, b) => a.name.localeCompare(b.name, 'de')).map((u) => ({ value: u.id, label: u.name }))}
          hint={data.unternehmen.length === 0 ? 'Unternehmen legst du unter „Unternehmen“ an.' : undefined}
        />
      </div>
      <div className={styles.zeile}>
        <SelectField label="Kontext" required value={werte.kontext} onChange={(e) => setze('kontext', e.target.value)} options={optionen(KONTEXT)} />
        <TextField label="Herkunft" value={werte.herkunft} onChange={(e) => setze('herkunft', e.target.value)} hint="Wo habt ihr euch kennengelernt?" />
      </div>
      <div className={styles.zeile}>
        <TextField label="E-Mail" type="email" value={werte.email} onChange={(e) => setze('email', e.target.value)} error={fehler.email} />
        <TextField label="Telefon" type="tel" value={werte.telefon} onChange={(e) => setze('telefon', e.target.value)} />
      </div>
      <TextField label="LinkedIn-URL" type="url" value={werte.linkedinUrl} onChange={(e) => setze('linkedinUrl', e.target.value)} error={fehler.linkedinUrl} />
      <TextAreaField label="Notiz" value={werte.notiz} onChange={(e) => setze('notiz', e.target.value)} rows={3} />
      <TextField label="Schlagworte" value={werte.schlagworte} onChange={(e) => setze('schlagworte', e.target.value)} hint="Mehrere mit Komma trennen, z. B. Recruiter, Köln" />
      <fieldset className={styles.gruppe}>
        <legend>Datenschutz</legend>
        <SelectField
          label="Rechtsgrundlage"
          value={werte.rechtsgrundlage}
          onChange={(e) => setze('rechtsgrundlage', e.target.value)}
          placeholder="Noch nicht festgelegt"
          options={optionen(RECHTSGRUNDLAGE)}
          hint={
            werte.rechtsgrundlage
              ? RECHTSGRUNDLAGE[werte.rechtsgrundlage as keyof typeof RECHTSGRUNDLAGE].hinweis
              : 'Warum darfst du die Daten dieser Person speichern? (DSGVO Art. 6)'
          }
        />
        <TextField label="Zweck" value={werte.zweck} onChange={(e) => setze('zweck', e.target.value)} hint="z. B. Bewerbung bei der Firma, Kundenanfrage, Netzwerk" />
      </fieldset>
    </FormDialog>
  )
}
