import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button.tsx'
import { Dialog } from '../../components/ui/Dialog.tsx'
import { TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { stellenanzeigeAusAntwort, type Stellenanzeige } from '../../domain/selectors/kiEingaben.ts'
import { KiDialog } from '../ki/KiDialog.tsx'
import styles from '../aufgaben/AufgabeDialog.module.css'

type Phase = { art: 'einfuegen' } | { art: 'ki'; eingabe: string } | { art: 'pruefen'; anzeige: Stellenanzeige }

/**
 * Stellenanzeige einfügen → KI liest Stelle, Firma, Anforderungen, Ansprechpartner aus → du prüfst und legst an.
 * Angelegt werden Bewerbung (geplant), bei Bedarf Unternehmen und Ansprechpartner.
 */
export function StellenanzeigeDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const [phase, setPhase] = useState<Phase>({ art: 'einfuegen' })

  if (phase.art === 'ki') {
    return (
      <KiDialog
        aufgabe="stellenanzeige"
        eingabe={phase.eingabe}
        uebernehmenLabel="Weiter zur Prüfung"
        onUebernehmen={(antwort) => {
          const anzeige = stellenanzeigeAusAntwort(antwort)
          if (!anzeige) {
            zeige('Die Antwort ließ sich nicht auslesen – bitte erneut versuchen')
            setPhase({ art: 'einfuegen' })
            return
          }
          setPhase({ art: 'pruefen', anzeige: { ...anzeige, link: anzeige.link || link.trim() } })
        }}
        onSchliessen={() => setPhase((p) => (p.art === 'ki' ? { art: 'einfuegen' } : p))}
      />
    )
  }

  if (phase.art === 'pruefen') {
    return <Pruefen anzeige={phase.anzeige} onSchliessen={onSchliessen} onAngelegt={(id) => navigate(`/bewerbungen/${id}`)} data={data} dispatch={dispatch} zeige={zeige} />
  }

  return (
    <Dialog
      offen
      titel="Bewerbung aus Stellenanzeige"
      onSchliessen={onSchliessen}
      aktionen={
        <>
          <Button variant="secondary" onClick={onSchliessen}>
            Abbrechen
          </Button>
          <Button disabled={!text.trim()} onClick={() => setPhase({ art: 'ki', eingabe: [link.trim() && `Link: ${link.trim()}`, `Anzeige:\n${text.trim()}`].filter(Boolean).join('\n\n') })}>
            Mit KI auslesen
          </Button>
        </>
      }
    >
      <TextAreaField label="Text der Stellenanzeige" value={text} onChange={(e) => setText(e.target.value)} rows={10} hint="Kopiere den Text der Anzeige hier hinein (z. B. von LinkedIn oder einem Jobportal)." optionalKennzeichnen={false} />
      <TextField label="Link zur Anzeige" type="url" value={link} onChange={(e) => setLink(e.target.value)} />
    </Dialog>
  )
}

interface PruefenProps {
  anzeige: Stellenanzeige
  data: ReturnType<typeof useStore>['data']
  dispatch: ReturnType<typeof useStore>['dispatch']
  zeige: (t: string) => void
  onAngelegt: (id: string) => void
  onSchliessen: () => void
}

function Pruefen({ anzeige, data, dispatch, zeige, onAngelegt, onSchliessen }: PruefenProps) {
  const [w, setW] = useState({ ...anzeige, anforderungen: anzeige.anforderungen.join('\n') })
  const setze = (k: keyof typeof w, v: string) => setW({ ...w, [k]: v })
  const vorhandeneFirma = data.unternehmen.find((u) => u.name.trim().toLowerCase() === w.unternehmen.trim().toLowerCase())

  const anlegen = () => {
    if (!w.stelle.trim()) {
      zeige('Bitte die Stelle angeben')
      return
    }
    let unternehmenId: string | null = vorhandeneFirma?.id ?? null
    if (!unternehmenId && w.unternehmen.trim()) {
      unternehmenId = crypto.randomUUID()
      dispatch({ type: 'anlegen', sammlung: 'unternehmen', id: unternehmenId, daten: { name: w.unternehmen.trim(), branche: '', website: '', notiz: '', schlagworte: [] } })
    }
    let kontaktId: string | null = null
    if (w.ansprechpartner.trim()) {
      kontaktId = crypto.randomUUID()
      dispatch({
        type: 'anlegen',
        sammlung: 'kontakte',
        id: kontaktId,
        daten: {
          name: w.ansprechpartner.trim(),
          rolle: '',
          unternehmenId,
          email: w.email.trim(),
          telefon: '',
          linkedinUrl: '',
          kontext: 'jobsuche',
          herkunft: 'Stellenanzeige',
          notiz: '',
          projektIds: [],
          naechsteAktion: null,
          rechtsgrundlage: 'vertrag',
          zweck: `Bewerbung: ${w.stelle.trim()}`,
          schlagworte: [],
        },
      })
    }
    const id = crypto.randomUUID()
    const notiz = [w.ort.trim() && `Ort: ${w.ort.trim()}`, w.anforderungen.trim() && `Anforderungen:\n${w.anforderungen.trim()}`, w.bewerbungsfrist && `Bewerbungsfrist: ${w.bewerbungsfrist}`].filter(Boolean).join('\n\n')
    dispatch({
      type: 'anlegen',
      sammlung: 'bewerbungen',
      id,
      daten: { stelle: w.stelle.trim(), unternehmenId, zielrolleId: null, kontaktId, status: 'geplant', quelle: 'Stellenanzeige', beworbenAm: null, link: w.link.trim(), naechsterSchritt: 'Bewerbung schreiben', notiz, wiedervorlageAm: w.bewerbungsfrist || null },
    })
    zeige('Bewerbung angelegt')
    onSchliessen()
    onAngelegt(id)
  }

  return (
    <FormDialog offen titel="Angaben prüfen" geaendert speichernLabel="Bewerbung anlegen" onSpeichern={anlegen} onSchliessen={onSchliessen}>
      <TextField label="Stelle" required value={w.stelle} onChange={(e) => setze('stelle', e.target.value)} />
      <div className={styles.zeile}>
        <TextField label="Unternehmen" value={w.unternehmen} onChange={(e) => setze('unternehmen', e.target.value)} hint={vorhandeneFirma ? 'Schon vorhanden – wird verknüpft.' : w.unternehmen.trim() ? 'Wird neu angelegt.' : undefined} />
        <TextField label="Ort" value={w.ort} onChange={(e) => setze('ort', e.target.value)} />
      </div>
      <TextAreaField label="Anforderungen" value={w.anforderungen} onChange={(e) => setze('anforderungen', e.target.value)} rows={5} hint="Eine pro Zeile." />
      <div className={styles.zeile}>
        <TextField label="Ansprechpartner" value={w.ansprechpartner} onChange={(e) => setze('ansprechpartner', e.target.value)} hint="Wird als Kontakt angelegt (Rechtsgrundlage: Anbahnung)." />
        <TextField label="E-Mail" type="email" value={w.email} onChange={(e) => setze('email', e.target.value)} />
      </div>
      <div className={styles.zeile}>
        <TextField label="Link" type="url" value={w.link} onChange={(e) => setze('link', e.target.value)} />
        <TextField label="Bewerbungsfrist" type="date" value={w.bewerbungsfrist} onChange={(e) => setze('bewerbungsfrist', e.target.value)} hint="Wird zur Wiedervorlage." />
      </div>
    </FormDialog>
  )
}
