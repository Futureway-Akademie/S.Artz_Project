import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useTresor } from '../../app/tresorContext.ts'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { ErrorState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { exportDateiname, exportJson, herunterladen, pruefeImport } from '../../data/exportImport.ts'
import { useStore } from '../../data/storeContext.ts'
import type { AppData } from '../../domain/types.ts'
import styles from './EinstellungenSeite.module.css'
import { SicherheitPanel } from './SicherheitPanel.tsx'

function umfang(data: AppData): string {
  const teile: Array<[number, string, string]> = [
    [data.projekte.length, 'Projekt', 'Projekte'],
    [data.aufgaben.length, 'Aufgabe', 'Aufgaben'],
    [data.termine.length, 'Termin', 'Termine'],
    [data.kontakte.length, 'Kontakt', 'Kontakte'],
    [data.bewerbungen.length, 'Bewerbung', 'Bewerbungen'],
  ]
  return teile.map(([n, eins, mehr]) => `${n} ${n === 1 ? eins : mehr}`).join(', ')
}

/** Eigenes Formular; über `key` neu aufgebaut, wenn sich der gespeicherte Name ändert (Import, Zurücksetzen). */
function AnzeigenameFormular({ gespeichert }: { gespeichert: string }) {
  const { dispatch } = useStore()
  const { zeige } = useToast()
  const [name, setName] = useState(gespeichert)

  const nameSpeichern = (event: FormEvent) => {
    event.preventDefault()
    dispatch({ type: 'einstellungen', aenderung: { anzeigename: name.trim() } })
    zeige('Anzeigename gespeichert')
  }

  return (
    <form className={styles.zeile} onSubmit={nameSpeichern}>
      <TextField
        label="Name für die Begrüßung"
        optionalKennzeichnen={false}
        value={name}
        onChange={(e) => setName(e.target.value)}
        hint="Leer lassen für eine Begrüßung ohne Namen."
      />
      <Button type="submit" variant="secondary">
        Speichern
      </Button>
    </form>
  )
}

export function EinstellungenSeite() {
  const { data, dispatch, persistenz, zuruecksetzen } = useStore()
  const { zeige } = useToast()
  const tresor = useTresor()
  const [importDaten, setImportDaten] = useState<{ data: AppData; datei: string } | null>(null)
  const [importFehler, setImportFehler] = useState<{ fehler: string; details?: string } | null>(null)
  const [zuruecksetzenFragen, setZuruecksetzenFragen] = useState(false)
  const dateiInput = useRef<HTMLInputElement>(null)

  const exportieren = () => {
    herunterladen(exportJson(data), exportDateiname(new Date()))
    zeige('Export erstellt')
  }

  const dateiGewaehlt = async (event: ChangeEvent<HTMLInputElement>) => {
    const datei = event.target.files?.[0]
    event.target.value = '' // dieselbe Datei erneut wählbar
    if (!datei) return
    setImportFehler(null)
    const ergebnis = pruefeImport(await datei.text())
    if (ergebnis.ok) setImportDaten({ data: ergebnis.data, datei: datei.name })
    else setImportFehler({ fehler: ergebnis.fehler, details: ergebnis.details })
  }

  const importieren = () => {
    if (!importDaten) return
    dispatch({ type: 'ersetzen', daten: importDaten.data })
    setImportDaten(null)
    zeige('Daten importiert')
  }

  return (
    <Seite titel="Einstellungen">
      <Panel titel="Speicherung">
        <p>
          Das Arbeitscockpit speichert alle Daten nur in diesem Browser. Es gibt kein Konto, keinen Server und keine Verbindung nach
          außen. {tresor ? 'Die Daten sind mit deinem Passwort verschlüsselt.' : 'Die Daten sind in dieser Ansicht nicht verschlüsselt.'}{' '}
          Browserdaten löschen, ein anderes Gerät oder ein privates Fenster bedeuten leere Daten. Sichere deine Daten regelmäßig über den
          Export.
        </p>
        <p className={styles.status}>
          {persistenz === 'lokal'
            ? 'Status: Daten werden in diesem Browser gespeichert.'
            : 'Status: Der Browser-Speicher ist nicht verfügbar. Änderungen gehen beim Schließen verloren.'}
        </p>
        <p className={styles.hinweis}>Aktueller Datenstand: {umfang(data)}.</p>
      </Panel>

      <SicherheitPanel />

      <Panel titel="Anzeigename">
        <AnzeigenameFormular key={data.einstellungen.anzeigename} gespeichert={data.einstellungen.anzeigename} />
      </Panel>

      <Panel titel="Daten sichern und übertragen">
        <div className={styles.block}>
          <h3 className={styles.unter}>Export</h3>
          <p className={styles.hinweis}>Lädt alle Daten als JSON-Datei herunter. Diese Datei kannst du später wieder importieren.</p>
          <div>
            <Button variant="secondary" onClick={exportieren}>
              Daten exportieren
            </Button>
          </div>
        </div>
        <div className={styles.block}>
          <h3 className={styles.unter}>Import</h3>
          <p className={styles.hinweis}>
            Ersetzt alle aktuellen Daten durch den Inhalt einer Exportdatei. Die Datei wird vorher geprüft.
          </p>
          <div>
            <Button variant="secondary" onClick={() => dateiInput.current?.click()}>
              Datei importieren …
            </Button>
            <input
              ref={dateiInput}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              tabIndex={-1}
              aria-label="Importdatei wählen"
              onChange={dateiGewaehlt}
            />
          </div>
          {importFehler && (
            <ErrorState title="Import nicht möglich">
              <p>{importFehler.fehler}</p>
              {importFehler.details && <p className={styles.details}>Details: {importFehler.details}</p>}
              <p>Deine aktuellen Daten wurden nicht verändert.</p>
            </ErrorState>
          )}
        </div>
      </Panel>

      <Panel titel="Zurücksetzen">
        <p className={styles.hinweis}>
          Löscht alle Daten in diesem Browser und startet wieder mit den Ausgangsdaten. Exportiere vorher, wenn du etwas behalten möchtest.
        </p>
        <div>
          <Button variant="danger" onClick={() => setZuruecksetzenFragen(true)}>
            Daten zurücksetzen
          </Button>
        </div>
      </Panel>

      {importDaten && (
        <ConfirmDialog
          offen
          titel="Daten importieren?"
          bestaetigenLabel="Importieren und ersetzen"
          gefahr
          onAbbrechen={() => setImportDaten(null)}
          onBestaetigen={importieren}
        >
          <p>„{importDaten.datei}“ ist gültig und enthält: {umfang(importDaten.data)}.</p>
          <p className={styles.warnung}>Alle aktuellen Daten ({umfang(data)}) werden ersetzt.</p>
        </ConfirmDialog>
      )}
      {zuruecksetzenFragen && (
        <ConfirmDialog
          offen
          titel="Daten zurücksetzen?"
          bestaetigenLabel="Ja, zurücksetzen"
          gefahr
          onAbbrechen={() => setZuruecksetzenFragen(false)}
          onBestaetigen={() => {
            zuruecksetzen()
            setZuruecksetzenFragen(false)
            zeige('Daten zurückgesetzt')
          }}
        >
          <p>Alle Daten in diesem Browser ({umfang(data)}) werden gelöscht und durch die Ausgangsdaten ersetzt.</p>
          <p className={styles.warnung}>Das lässt sich nicht rückgängig machen.</p>
        </ConfirmDialog>
      )}
    </Seite>
  )
}
