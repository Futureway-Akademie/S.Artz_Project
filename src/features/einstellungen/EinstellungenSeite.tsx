import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useTresor } from '../../app/tresorContext.ts'
import { Link } from 'react-router'
import { kontakteMitPruefbedarf } from '../../domain/selectors/datenschutz.ts'
import { Seite } from '../../components/layout/Seite.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { ErrorState } from '../../components/ui/States.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { PasswortDialog } from '../../components/ui/PasswortDialog.tsx'
import { exportJson, herunterladen, pruefeImport } from '../../data/exportImport.ts'
import { FalschesPasswort } from '../../data/krypto.ts'
import { istVerschluesselt, sicherungDateiname, sicherungErstellen, sicherungLesen } from '../../data/sicherung.ts'
import { formatZeitpunkt } from '../../domain/dates.ts'
import { useStore } from '../../data/storeContext.ts'
import type { AppData } from '../../domain/types.ts'
import styles from './EinstellungenSeite.module.css'
import { KiProtokollPanel } from '../ki/KiProtokollPanel.tsx'
import { GmailPanel } from './GmailPanel.tsx'
import { KontoPanel } from './KontoPanel.tsx'
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
  const [verschluesselterImport, setVerschluesselterImport] = useState<{ text: string; datei: string } | null>(null)
  const [sicherungFragen, setSicherungFragen] = useState(false)
  const [zuruecksetzenFragen, setZuruecksetzenFragen] = useState(false)
  const dateiInput = useRef<HTMLInputElement>(null)

  const sicherungSpeichern = async (passwort: string) => {
    const jetzt = new Date()
    herunterladen(await sicherungErstellen(exportJson(data), passwort), sicherungDateiname(jetzt))
    dispatch({ type: 'einstellungen', aenderung: { letzteSicherungAm: jetzt.toISOString() } })
    setSicherungFragen(false)
    zeige('Verschlüsselte Sicherung erstellt')
    return null
  }

  const importPruefen = (text: string, datei: string) => {
    const ergebnis = pruefeImport(text)
    if (ergebnis.ok) setImportDaten({ data: ergebnis.data, datei })
    else setImportFehler({ fehler: ergebnis.fehler, details: ergebnis.details })
  }

  const verschluesseltOeffnen = async (passwort: string) => {
    if (!verschluesselterImport) return null
    try {
      const text = await sicherungLesen(verschluesselterImport.text, passwort)
      setVerschluesselterImport(null)
      importPruefen(text, verschluesselterImport.datei)
      return null
    } catch (error) {
      if (error instanceof FalschesPasswort) return 'Das Passwort ist falsch oder die Datei ist beschädigt.'
      throw error
    }
  }

  const dateiGewaehlt = async (event: ChangeEvent<HTMLInputElement>) => {
    const datei = event.target.files?.[0]
    event.target.value = '' // dieselbe Datei erneut wählbar
    if (!datei) return
    setImportFehler(null)
    const text = await datei.text()
    if (istVerschluesselt(text)) setVerschluesselterImport({ text, datei: datei.name })
    else importPruefen(text, datei.name)
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

      <KontoPanel />

      <GmailPanel />

      <KiProtokollPanel />

      <Panel titel="Datenschutz">
        <ul className={styles.punkte}>
          <li>
            <strong>Nichts verlässt diesen Browser.</strong> Kein Konto, kein Server, keine Cookies, kein Tracking, keine Schriften oder Skripte
            von fremden Servern. Eine Sicherheitsrichtlinie blockiert jede Verbindung nach außen.
          </li>
          <li>
            <strong>Verschlüsselt.</strong> Die Daten im Browser und jede Sicherungsdatei sind mit deinem Passwort verschlüsselt (AES-256).
          </li>
          <li>
            <strong>Kontakte sind Daten anderer Menschen.</strong> Halte je Kontakt Zweck und Rechtsgrundlage fest (DSGVO Art. 6), erstelle auf
            Wunsch eine Auskunft (Art. 15) und lösche, was du nicht mehr brauchst (Art. 17). Beim Löschen verschwindet die Person auch aus dem
            Aktivitätsprotokoll; ältere Sicherungsdateien enthalten sie aber weiterhin – lösche alte Sicherungen, wenn du sie nicht mehr brauchst.
          </li>
          <li>
            <strong>Informieren.</strong> Wer Kontaktdaten beruflich speichert, sollte die Person darüber informieren (Art. 13/14), z. B. mit
            einem Satz in der E-Mail-Signatur.
          </li>
        </ul>
        <p>
          <Link to="/kontakte?pruefen=1">Kontakte mit Prüfbedarf anzeigen ({kontakteMitPruefbedarf(data, new Date()).length})</Link>
        </p>
      </Panel>

      <Panel titel="Anzeigename">
        <AnzeigenameFormular key={data.einstellungen.anzeigename} gespeichert={data.einstellungen.anzeigename} />
      </Panel>

      <Panel titel="Daten sichern und übertragen">
        <div className={styles.block}>
          <h3 className={styles.unter}>Sicherung</h3>
          <p className={styles.hinweis}>
            Lädt alle Daten als verschlüsselte Datei herunter. Ohne das Passwort der Sicherung kann niemand sie lesen – auch du nicht.
            Bewahre die Datei an einem sicheren Ort auf, z. B. auf einem USB-Stick.
          </p>
          <p className={styles.status}>
            Letzte Sicherung:{' '}
            {data.einstellungen.letzteSicherungAm ? formatZeitpunkt(data.einstellungen.letzteSicherungAm) : 'noch keine'}
          </p>
          <div>
            <Button variant="secondary" onClick={() => setSicherungFragen(true)}>
              Verschlüsselte Sicherung erstellen
            </Button>
          </div>
        </div>
        <div className={styles.block}>
          <h3 className={styles.unter}>Import</h3>
          <p className={styles.hinweis}>
            Ersetzt alle aktuellen Daten durch den Inhalt einer Sicherung. Verschlüsselte Sicherungen fragen nach ihrem Passwort; die
            Datei wird vorher geprüft.
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

      {sicherungFragen && (
        <PasswortDialog
          titel="Verschlüsselte Sicherung erstellen"
          neu
          bestaetigenLabel="Sicherung herunterladen"
          onAbsenden={sicherungSpeichern}
          onSchliessen={() => setSicherungFragen(false)}
        >
          <p>Vergibst du ein anderes Passwort als für die App, notiere es sicher. Ohne Passwort lässt sich die Sicherung nicht öffnen.</p>
        </PasswortDialog>
      )}
      {verschluesselterImport && (
        <PasswortDialog
          titel="Sicherung öffnen"
          neu={false}
          bestaetigenLabel="Öffnen und prüfen"
          onAbsenden={verschluesseltOeffnen}
          onSchliessen={() => setVerschluesselterImport(null)}
        >
          <p>„{verschluesselterImport.datei}“ ist verschlüsselt.</p>
        </PasswortDialog>
      )}
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
