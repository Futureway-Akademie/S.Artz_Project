import { useState } from 'react'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { TextAreaField, TextField } from '../../components/ui/Field.tsx'
import { FormDialog } from '../../components/ui/FormDialog.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { zielrollenZeilen } from '../../domain/selectors/bewerbungen.ts'
import type { Zielrolle } from '../../domain/types.ts'
import { useForm, type Fehler } from '../../hooks/useForm.ts'
import styles from '../kontakte/crm.module.css'
import { BewerbungenNavigation } from './BewerbungenNavigation.tsx'

interface Werte extends Record<string, unknown> {
  titel: string
  notiz: string
}

const validiere = (w: Werte): Fehler<Werte> => (w.titel.trim() ? {} : { titel: 'Bitte einen Titel eingeben.' })

function ZielrolleDialog({ zielrolle, onSchliessen }: { zielrolle?: Zielrolle; onSchliessen: () => void }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const [loeschenFragen, setLoeschenFragen] = useState(false)
  const form = useForm<Werte>({ titel: zielrolle?.titel ?? '', notiz: zielrolle?.notiz ?? '' }, validiere)
  const { werte, setze, fehler } = form
  const zugeordnet = zielrolle ? data.bewerbungen.filter((b) => b.zielrolleId === zielrolle.id).length : 0

  const speichern = () => {
    const g = form.pruefen()
    if (!g) return
    const daten = { titel: g.titel.trim(), notiz: g.notiz.trim() }
    if (zielrolle) dispatch({ type: 'aendern', sammlung: 'zielrollen', id: zielrolle.id, aenderung: daten })
    else dispatch({ type: 'anlegen', sammlung: 'zielrollen', daten })
    zeige(zielrolle ? 'Zielrolle gespeichert' : 'Zielrolle angelegt')
    onSchliessen()
  }

  return (
    <>
      <FormDialog
        offen
        titel={zielrolle ? 'Zielrolle bearbeiten' : 'Zielrolle anlegen'}
        geaendert={form.geaendert}
        onSpeichern={speichern}
        onSchliessen={onSchliessen}
        nebenaktion={
          zielrolle && (
            <Button variant="ghost" onClick={() => setLoeschenFragen(true)}>
              Löschen
            </Button>
          )
        }
      >
        <TextField label="Titel" required value={werte.titel} onChange={(e) => setze('titel', e.target.value)} error={fehler.titel} />
        <TextAreaField label="Notiz" value={werte.notiz} onChange={(e) => setze('notiz', e.target.value)} rows={3} />
      </FormDialog>
      {loeschenFragen && zielrolle && (
        <ConfirmDialog
          offen
          titel="Zielrolle löschen?"
          bestaetigenLabel="Zielrolle löschen"
          gefahr
          onAbbrechen={() => setLoeschenFragen(false)}
          onBestaetigen={() => {
            dispatch({ type: 'loeschen', sammlung: 'zielrollen', id: zielrolle.id })
            zeige('Zielrolle gelöscht')
            onSchliessen()
          }}
        >
          <p>„{zielrolle.titel}“ wird endgültig gelöscht.</p>
          {zugeordnet > 0 && <p className={styles.folge}>{zugeordnet} Bewerbungen bleiben erhalten, verlieren aber die Zielrolle.</p>}
        </ConfirmDialog>
      )}
    </>
  )
}

export function ZielrollenSeite() {
  const { data } = useStore()
  const [dialog, setDialog] = useState<Zielrolle | 'neu' | null>(null)
  const zeilen = zielrollenZeilen(data)

  return (
    <Seite titel="Zielrollen" einleitung="Rollen, auf die du dich bewerben möchtest. Sie sind keine Bewerbungen." aktionen={<Button onClick={() => setDialog('neu')}>Zielrolle anlegen</Button>}>
      <BewerbungenNavigation />
      {zeilen.length === 0 ? (
        <EmptyState title="Noch keine Zielrollen" />
      ) : (
        <ul className={styles.liste} aria-label="Zielrollen">
          {zeilen.map(({ zielrolle, bewerbungen, laufend }) => (
            <li key={zielrolle.id} className={styles.zeile}>
              <div className={styles.haupt}>
                <span className={styles.name}>{zielrolle.titel}</span>
                {zielrolle.notiz && <span className={styles.unter}>{zielrolle.notiz}</span>}
              </div>
              <div className={styles.meta}>
                <span className={styles.unter}>{bewerbungen === 0 ? 'Noch keine Bewerbung' : `${bewerbungen} Bewerbungen, ${laufend} laufend`}</span>
                <Button size="sm" variant="ghost" onClick={() => setDialog(zielrolle)} aria-label={`Zielrolle „${zielrolle.titel}“ bearbeiten`}>
                  Bearbeiten
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog && <ZielrolleDialog zielrolle={dialog === 'neu' ? undefined : dialog} onSchliessen={() => setDialog(null)} />}
    </Seite>
  )
}
