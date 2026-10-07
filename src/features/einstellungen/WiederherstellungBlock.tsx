import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTresor } from '../../app/tresorContext.ts'
import { Button } from '../../components/ui/Button.tsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.tsx'
import { TextField } from '../../components/ui/Field.tsx'
import { useToast } from '../../components/ui/toastContext.ts'
import { wiederherstellungsMail } from '../../data/wiederherstellung.ts'
import styles from './EinstellungenSeite.module.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Passwort-Wiederherstellung per E-Mail-Link einrichten.
 * Der Link wird nur einmal erzeugt und angezeigt; die App speichert den Schlüssel nicht im Klartext.
 */
export function WiederherstellungBlock() {
  const tresor = useTresor()
  const { zeige } = useToast()
  const [email, setEmail] = useState(tresor?.wiederherstellung ?? '')
  const [fehler, setFehler] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)
  const [laeuft, setLaeuft] = useState(false)
  const [entfernen, setEntfernen] = useState(false)

  if (!tresor) return null

  const einrichten = async (event: FormEvent) => {
    event.preventDefault()
    if (!EMAIL.test(email.trim())) {
      setFehler('Bitte eine gültige E-Mail-Adresse eingeben.')
      return
    }
    setFehler(null)
    setLaeuft(true)
    try {
      setLink(await tresor.wiederherstellungEinrichten(email.trim()))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <div className={styles.block}>
      <h3 id="wiederherstellung" className={styles.unter}>
        Passwort-Wiederherstellung per E-Mail
      </h3>
      <p className={styles.hinweis}>
        Du schickst dir selbst eine Mail mit einem Wiederherstellungslink. Vergisst du dein Passwort, klickst du auf den Link und vergibst
        ein neues – deine Daten bleiben erhalten. Der Schlüssel steht nur im Link und wird nie an einen Server übertragen. Wer die Mail
        und Zugang zu diesem Rechner hat, kann die Daten öffnen: Schütze dein Postfach mit Zwei-Faktor-Anmeldung.
      </p>
      <p className={styles.status}>
        Status: {tresor.wiederherstellung ? `eingerichtet für ${tresor.wiederherstellung}` : 'nicht eingerichtet'}
      </p>

      {link ? (
        <div className={styles.linkBox} role="status">
          <p>
            <strong>Fast fertig:</strong> Schick dir jetzt die Mail und bewahre sie auf. Der Link wird nur dieses eine Mal angezeigt.
          </p>
          <div className={styles.knoepfe}>
            <a className={styles.mailKnopf} href={wiederherstellungsMail(email, link)} onClick={() => zeige('Mail im Mailprogramm geöffnet')}>
              Mail an mich öffnen
            </a>
            <Button variant="ghost" onClick={() => setLink(null)}>
              Fertig
            </Button>
          </div>
        </div>
      ) : (
        <form className={styles.zeile} onSubmit={einrichten} noValidate aria-labelledby="wiederherstellung">
          <TextField label="Deine E-Mail-Adresse" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fehler ?? undefined} />
          <Button type="submit" variant="secondary" disabled={laeuft}>
            {tresor.wiederherstellung ? 'Neuen Link erzeugen' : 'Einrichten'}
          </Button>
        </form>
      )}
      {tresor.wiederherstellung && !link && (
        <div>
          <Button size="sm" variant="ghost" onClick={() => setEntfernen(true)}>
            Wiederherstellung entfernen
          </Button>
        </div>
      )}
      {tresor.wiederherstellung && !link && <p className={styles.hinweis}>Ein neuer Link macht den alten ungültig.</p>}
      {entfernen && (
        <ConfirmDialog
          offen
          titel="Wiederherstellung entfernen?"
          bestaetigenLabel="Entfernen"
          gefahr
          onAbbrechen={() => setEntfernen(false)}
          onBestaetigen={async () => {
            await tresor.wiederherstellungEntfernen()
            setEntfernen(false)
            zeige('Wiederherstellung entfernt')
          }}
        >
          <p>Der Link in deiner Mail funktioniert danach nicht mehr. Ohne Passwort gibt es dann keine Wiederherstellung.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
