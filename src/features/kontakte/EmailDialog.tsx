import { useState } from 'react'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { heute } from '../../domain/dates.ts'
import { fuelle, MAILTO_MAX, mailtoLink, offenePlatzhalter, platzhalterWerte } from '../../domain/selectors/vorlagen.ts'
import type { Kontakt } from '../../domain/types.ts'
import { useNow } from '../../hooks/useNow.ts'
import styles from '../aufgaben/AufgabeDialog.module.css'

/**
 * E-Mail an einen Kontakt vorbereiten: Vorlage wählen, Text anpassen, im eigenen Mailprogramm öffnen.
 * Die App selbst versendet nichts und ist mit keinem Postfach verbunden.
 */
export function EmailDialog({ kontakt, onSchliessen }: { kontakt: Kontakt; onSchliessen: () => void }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const now = useNow()
  const bewerbungen = data.bewerbungen.filter((b) => b.kontaktId === kontakt.id || (kontakt.unternehmenId !== null && b.unternehmenId === kontakt.unternehmenId))
  const [vorlageId, setVorlageId] = useState('')
  const [bewerbungId, setBewerbungId] = useState(bewerbungen.length === 1 ? bewerbungen[0]!.id : '')
  const [betreff, setBetreff] = useState('')
  const [text, setText] = useState('')
  const [festhalten, setFesthalten] = useState(true)

  const anwenden = (vId: string, bId: string) => {
    const vorlage = data.vorlagen.find((v) => v.id === vId)
    if (!vorlage) return
    const werte = platzhalterWerte(data, kontakt, { bewerbungId: bId || null, heute: heute(now) })
    setBetreff(fuelle(vorlage.betreff, werte))
    setText(fuelle(vorlage.text, werte))
  }

  const offen = offenePlatzhalter(`${betreff} ${text}`)
  const link = mailtoLink(kontakt.email, betreff, text)
  const zuLang = link.length > MAILTO_MAX

  const geoeffnet = () => {
    if (festhalten) {
      dispatch({
        type: 'anlegen',
        sammlung: 'interaktionen',
        daten: {
          kontaktId: kontakt.id,
          art: 'email',
          datum: heute(now),
          text: text.trim().slice(0, 500) || betreff.trim() || 'E-Mail geschrieben',
          projektId: null,
          bewerbungId: bewerbungId || null,
          leadId: null,
          betreff: betreff.trim(),
          richtung: 'ausgang',
        },
      })
      zeige('Entwurf geöffnet und im Verlauf festgehalten')
    } else {
      zeige('Entwurf im Mailprogramm geöffnet')
    }
    onSchliessen()
  }

  return (
    <Dialog
      offen
      titel={`E-Mail an ${kontakt.name}`}
      onSchliessen={onSchliessen}
      aktionen={
        <>
          <Button variant="secondary" onClick={onSchliessen}>
            Abbrechen
          </Button>
          <a className={styles.mailKnopf} href={link} onClick={geoeffnet}>
            Im Mailprogramm öffnen
          </a>
        </>
      }
    >
      <div className={styles.zeile}>
        <SelectField
          label="Vorlage"
          value={vorlageId}
          onChange={(e) => {
            setVorlageId(e.target.value)
            anwenden(e.target.value, bewerbungId)
          }}
          placeholder="Ohne Vorlage"
          options={data.vorlagen.map((v) => ({ value: v.id, label: v.titel }))}
        />
        <SelectField
          label="Zu Bewerbung"
          value={bewerbungId}
          onChange={(e) => {
            setBewerbungId(e.target.value)
            anwenden(vorlageId, e.target.value)
          }}
          placeholder="Keine"
          options={bewerbungen.map((b) => ({ value: b.id, label: b.stelle }))}
          hint="Füllt {{stelle}} und das Unternehmen."
        />
      </div>
      <TextField label="An" value={kontakt.email} readOnly />
      <TextField label="Betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />
      <TextAreaField label="Text" value={text} onChange={(e) => setText(e.target.value)} rows={9} />
      {offen.length > 0 && (
        <p className={styles.hinweis} role="status">
          Noch offen: {offen.map((p) => `{{${p}}}`).join(', ')} – bitte ergänzen oder entfernen.
        </p>
      )}
      {zuLang && (
        <p className={styles.hinweis} role="status">
          Der Text ist sehr lang; manche Mailprogramme kürzen ihn. Kopiere ihn notfalls von Hand.
        </p>
      )}
      <label className={styles.check}>
        <input type="checkbox" checked={festhalten} onChange={(e) => setFesthalten(e.target.checked)} />
        Im Verlauf festhalten
      </label>
      <p className={styles.hinweis}>Die App versendet nichts selbst. Der Entwurf öffnet sich in deinem eigenen Mailprogramm.</p>
    </Dialog>
  )
}
