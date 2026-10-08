import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { useStore } from '../../data/storeContext.ts'
import { PLATTFORM } from '../../domain/labels.ts'
import {
  automationenNachPlattform,
  automationenNachProjekt,
  projekteOhneAutomation,
  type AutomationEintrag,
} from '../../domain/selectors/automationen.ts'
import type { Projekt } from '../../domain/types.ts'
import { AutomationDialog } from './AutomationDialog.tsx'
import styles from './AutomationenSeite.module.css'

const NICHT = <span className={styles.leer}>Nicht hinterlegt</span>

function Liste({ werte, geordnet = false }: { werte: string[]; geordnet?: boolean }) {
  if (werte.length === 0) return NICHT
  const Tag = geordnet ? 'ol' : 'ul'
  return (
    <Tag className={styles.liste}>
      {werte.map((w, i) => (
        <li key={`${i}-${w}`}>{w}</li>
      ))}
    </Tag>
  )
}

function Zeile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

function AutomationKarte({ eintrag, onBearbeiten }: { eintrag: AutomationEintrag; onBearbeiten: (p: Projekt) => void }) {
  const { projekt, automation: a } = eintrag
  return (
    <article className={styles.karte} aria-label={`Automation ${projekt.titel}`}>
      <div className={styles.kopf}>
        <h3 className={styles.titel}>
          <Link to={`/projekte/${projekt.id}`}>{projekt.titel}</Link>
        </h3>
        <div className={styles.badges}>
          <Badge tone="blue">{PLATTFORM[a.plattform]}</Badge>
          <Badge>Nicht verbunden</Badge>
        </div>
      </div>
      <dl className={styles.daten}>
        <Zeile label="Modell">{a.modell ?? NICHT}</Zeile>
        <Zeile label="Prompt-Version">{a.promptVersion ?? NICHT}</Zeile>
        <Zeile label="Schwelle">{a.schwelleProzent !== null ? <span className="num">{a.schwelleProzent.toLocaleString('de-DE')} %</span> : NICHT}</Zeile>
        <Zeile label="Statuswerte">
          <Liste werte={a.statuswerte} />
        </Zeile>
        <Zeile label="Datenquellen">
          <Liste werte={a.datenquellen} />
        </Zeile>
        <Zeile label="Pipeline">
          <Liste werte={a.pipeline} geordnet />
        </Zeile>
        <Zeile label="Routing">
          {a.routing.length === 0 ? (
            NICHT
          ) : (
            <ul className={styles.liste}>
              {a.routing.map((r, i) => (
                <li key={`${i}-${r.bedingung}`}>
                  {r.fallback ? <strong>Fallback</strong> : r.bedingung} → {r.ziel}
                </li>
              ))}
            </ul>
          )}
          {a.routingStatus && (
            <p className={styles.stand}>
              Stand: <Badge tone={a.routingStatus === 'umgesetzt' ? 'success' : 'warning'}>{a.routingStatus === 'umgesetzt' ? 'Umgesetzt' : 'Geplant'}</Badge>
            </p>
          )}
        </Zeile>
        <Zeile label="Logik-Hinweise">
          <Liste werte={a.logikHinweise} />
        </Zeile>
      </dl>
      <div>
        <Button size="sm" variant="secondary" onClick={() => onBearbeiten(projekt)} aria-label={`Automation von „${projekt.titel}“ bearbeiten`}>
          Bearbeiten
        </Button>
      </div>
    </article>
  )
}

export function AutomationenSeite() {
  const { data } = useStore()
  const [gruppierung, setGruppierung] = useState<'plattform' | 'projekt'>('plattform')
  const [dialog, setDialog] = useState<Projekt | 'neu' | null>(null)

  const gruppen = gruppierung === 'plattform' ? automationenNachPlattform(data) : automationenNachProjekt(data)
  const anzahl = data.projekte.filter((p) => p.automation).length
  const freieProjekte = projekteOhneAutomation(data).length

  return (
    <Seite
      titel="Automationen"
      einleitung="Aufbau deiner Automationen je Projekt. Das Cockpit ist nicht mit n8n, Make.com oder anderen Diensten verbunden und zeigt keinen Live-Status."
      aktionen={
        freieProjekte > 0 && <Button onClick={() => setDialog('neu')}>Automation erfassen</Button>
      }
    >
      {anzahl === 0 ? (
        <EmptyState
          title="Noch keine Automation erfasst"
          action={freieProjekte > 0 && <Button onClick={() => setDialog('neu')}>Automation erfassen</Button>}
        >
          Für keines deiner Projekte ist bisher eine Automation mit Plattform, Modell oder Routing hinterlegt.
        </EmptyState>
      ) : (
        <>
          <div className={styles.umschalter} role="group" aria-label="Gruppierung">
            <Button size="sm" variant={gruppierung === 'plattform' ? 'primary' : 'secondary'} aria-pressed={gruppierung === 'plattform'} onClick={() => setGruppierung('plattform')}>
              Nach Plattform
            </Button>
            <Button size="sm" variant={gruppierung === 'projekt' ? 'primary' : 'secondary'} aria-pressed={gruppierung === 'projekt'} onClick={() => setGruppierung('projekt')}>
              Nach Projekt
            </Button>
          </div>
          {gruppen.map((g) => (
            <section key={g.schluessel} className={styles.gruppe} aria-labelledby={`gruppe-${g.schluessel}`}>
              <h2 id={`gruppe-${g.schluessel}`} className={styles.gruppenTitel}>
                {g.titel} {gruppierung === 'plattform' && <span className={styles.zahl}>({g.eintraege.length})</span>}
              </h2>
              <div className={styles.raster}>
                {g.eintraege.map((e) => (
                  <AutomationKarte key={e.projekt.id} eintrag={e} onBearbeiten={setDialog} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {dialog && <AutomationDialog projekt={dialog === 'neu' ? undefined : dialog} onSchliessen={() => setDialog(null)} />}
    </Seite>
  )
}
