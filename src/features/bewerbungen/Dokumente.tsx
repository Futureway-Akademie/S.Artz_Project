import { useId, useRef, useState } from 'react'
import { dateigroesse, useDokumente } from '../../app/dokumente.ts'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { SelectField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { useStore } from '../../data/storeContext.ts'
import { formatZeitpunkt } from '../../domain/dates.ts'
import type { Dokument } from '../../domain/types.ts'
import crm from '../kontakte/crm.module.css'
import { BewerbungenNavigation } from './BewerbungenNavigation.tsx'
import styles from './Dokumente.module.css'

/** Liste mit Hochladen, Öffnen und Löschen; mit `bewerbungId` nur die angehängten Dokumente dieser Bewerbung. */
export function DokumentListe({ bewerbungId }: { bewerbungId?: string }) {
  const { data, dispatch } = useStore()
  const { zeige } = useToast()
  const dok = useDokumente()
  const eingabe = useRef<HTMLInputElement>(null)
  const eingabeId = useId()
  const [laeuft, setLaeuft] = useState(false)
  const [loeschen, setLoeschen] = useState<Dokument | null>(null)
  const liste = data.dokumente.filter((d) => !bewerbungId || d.bewerbungIds.includes(bewerbungId)).sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const anhaengbar = bewerbungId ? data.dokumente.filter((d) => !d.bewerbungIds.includes(bewerbungId)) : []

  if (!dok.verfuegbar) return <p className={crm.leer}>Dokumente sind nur mit dem verschlüsselten Tresor verfügbar.</p>

  const hochladen = async (dateien: FileList | null) => {
    if (!dateien?.length) return
    setLaeuft(true)
    try {
      for (const d of Array.from(dateien)) await dok.hochladen(d, bewerbungId ? [bewerbungId] : [])
      zeige(dateien.length === 1 ? 'Dokument verschlüsselt gespeichert' : `${dateien.length} Dokumente verschlüsselt gespeichert`)
    } catch (e) {
      zeige(e instanceof Error ? e.message : 'Hochladen fehlgeschlagen')
    } finally {
      setLaeuft(false)
      if (eingabe.current) eingabe.current.value = ''
    }
  }

  const verknuepfen = (d: Dokument, an: boolean) =>
    bewerbungId && dispatch({ type: 'aendern', sammlung: 'dokumente', id: d.id, aenderung: { bewerbungIds: an ? [...d.bewerbungIds, bewerbungId] : d.bewerbungIds.filter((b) => b !== bewerbungId) } })

  return (
    <div className={styles.bereich}>
      <div className={styles.aktionen}>
        <label htmlFor={eingabeId} className={styles.dateiKnopf}>
          {laeuft ? 'Wird verschlüsselt …' : 'Dokument hinzufügen'}
        </label>
        <input id={eingabeId} ref={eingabe} type="file" className="visually-hidden" disabled={laeuft} multiple onChange={(e) => void hochladen(e.target.files)} />
        {anhaengbar.length > 0 && (
          <SelectField
            label="Vorhandenes anhängen"
            optionalKennzeichnen={false}
            value=""
            onChange={(e) => {
              const d = data.dokumente.find((x) => x.id === e.target.value)
              if (d) {
                verknuepfen(d, true)
                zeige(`„${d.name}“ angehängt`)
              }
            }}
            placeholder="Dokument wählen"
            options={anhaengbar.map((d) => ({ value: d.id, label: d.name }))}
          />
        )}
      </div>
      {liste.length === 0 ? (
        <p className={crm.leer}>Noch keine Dokumente.</p>
      ) : (
        <ul className={crm.liste} aria-label="Dokumente">
          {liste.map((d) => {
            const bewerbungen = data.bewerbungen.filter((b) => d.bewerbungIds.includes(b.id))
            return (
              <li key={d.id} className={crm.zeile}>
                <div className={crm.haupt}>
                  <span className={crm.name}>{d.name}</span>
                  <span className={crm.unter}>
                    {dateigroesse(d.groesse)} · {formatZeitpunkt(d.erstelltAm)}
                    {!bewerbungId && bewerbungen.length > 0 && ` · ${bewerbungen.map((b) => b.stelle).join(', ')}`}
                  </span>
                </div>
                <div className={crm.meta}>
                  <Button size="sm" variant="secondary" onClick={() => void dok.oeffnen(d).catch((e: unknown) => zeige(e instanceof Error ? e.message : 'Öffnen fehlgeschlagen'))} aria-label={`${d.name} öffnen`}>
                    Öffnen
                  </Button>
                  {bewerbungId ? (
                    <Button size="sm" variant="ghost" onClick={() => verknuepfen(d, false)} aria-label={`${d.name} von der Bewerbung lösen`}>
                      Lösen
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setLoeschen(d)} aria-label={`${d.name} löschen`}>
                      Löschen
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {loeschen && (
        <ConfirmDialog
          offen
          titel="Dokument löschen?"
          bestaetigenLabel="Dokument löschen"
          gefahr
          onAbbrechen={() => setLoeschen(null)}
          onBestaetigen={() => {
            const d = loeschen
            setLoeschen(null)
            void dok.loeschen(d).then(() => zeige('Dokument gelöscht'))
          }}
        >
          <p>„{loeschen.name}“ wird auf diesem Gerät und in der Cloud endgültig gelöscht.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}

/** Alle Dokumente (Lebenslauf, Zeugnisse, Anschreiben) – verschlüsselt gespeichert. */
export function DokumenteSeite() {
  const { data } = useStore()
  return (
    <Seite titel="Dokumente" einleitung="Lebenslauf, Zeugnisse und Anschreiben – im Browser verschlüsselt gespeichert und an Bewerbungen anhängbar.">
      <BewerbungenNavigation />
      {data.dokumente.length === 0 && <EmptyState title="Noch keine Dokumente">Füge deinen Lebenslauf oder Zeugnisse hinzu, um sie an Bewerbungen zu hängen.</EmptyState>}
      <Panel titel="Alle Dokumente">
        <DokumentListe />
      </Panel>
    </Seite>
  )
}
