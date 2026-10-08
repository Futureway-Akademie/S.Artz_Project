import { useState } from 'react'
import { useGmailDienst, useGoogle } from '../../app/gmailContext.ts'
import { Button } from '../../components/ui/Button.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { anmeldungStarten, meldungGelesen } from '../../data/gmail/googleAuth.ts'
import styles from './EinstellungenSeite.module.css'

const uhrzeit = (ms: number) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

/** Gmail nur lesend verbinden: Weiterleitung zu Google, Token nur im Arbeitsspeicher. */
export function GmailPanel({ onVerbinden = () => anmeldungStarten() }: { onVerbinden?: () => void }) {
  const google = useGoogle()
  const dienst = useGmailDienst()
  const { zeige } = useToast()
  const [adresse, setAdresse] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  if (!google.konfiguriert) {
    return (
      <Panel titel="Gmail (nur lesen)">
        <p className={styles.hinweis}>
          Nicht eingerichtet – es besteht keine Verbindung zu Google. Damit Mails zu Bewerbungen und Kontakten abgerufen werden können, wird ein eigenes
          Google-Cloud-Projekt mit Leseberechtigung eingerichtet (Anleitung: docs/gmail-einrichtung.md).
        </p>
      </Panel>
    )
  }

  const pruefen = async () => {
    setLaeuft(true)
    try {
      setAdresse(await dienst.profil())
    } catch (e) {
      zeige(e instanceof Error ? e.message : 'Verbindung fehlgeschlagen')
    } finally {
      setLaeuft(false)
    }
  }

  const trennen = async () => {
    await dienst.trennen()
    setAdresse(null)
    zeige('Gmail getrennt – Zugriff bei Google widerrufen')
  }

  return (
    <Panel titel="Gmail (nur lesen)">
      {google.meldung && (
        <div className={google.meldung.art === 'fehler' ? styles.warnung : styles.status} role={google.meldung.art === 'fehler' ? 'alert' : 'status'}>
          <p>{google.meldung.art === 'fehler' ? google.meldung.grund : 'Mit Google verbunden.'}</p>
          <Button variant="ghost" size="sm" onClick={meldungGelesen}>
            Ausblenden
          </Button>
        </div>
      )}
      {google.verbunden ? (
        <>
          <p className={styles.status}>
            Verbunden{adresse ? ` als ${adresse}` : ''} – Zugang gültig bis {uhrzeit(google.gueltigBis!)} Uhr. Der Zugang liegt nur im Arbeitsspeicher und endet beim Neuladen.
          </p>
          <div className={styles.knoepfe}>
            <Button variant="secondary" onClick={pruefen} disabled={laeuft}>
              {laeuft ? 'Prüft …' : 'Verbindung prüfen'}
            </Button>
            <Button variant="ghost" onClick={trennen}>
              Trennen
            </Button>
          </div>
        </>
      ) : (
        <>
          <ul className={styles.punkte}>
            <li>Nur Leseberechtigung – die App kann keine Mails senden, ändern oder löschen.</li>
            <li>Abgerufen werden nur Mails von und an deine Kontakte und Unternehmen; gespeichert werden Absender, Betreff, Datum und ein kurzer Auszug – verschlüsselt im Tresor.</li>
            <li>Der Zugang gilt etwa eine Stunde und wird nirgends gespeichert.</li>
            <li>Du wirst zu Google weitergeleitet. Danach ist der Tresor gesperrt – einfach wieder entsperren.</li>
          </ul>
          <Button onClick={onVerbinden}>Mit Google verbinden</Button>
        </>
      )}
    </Panel>
  )
}
