import { useEffect, useState } from 'react'
import { useCloud } from '../../app/cloudContext.ts'
import { useFreigaben } from '../../app/freigabeContext.ts'
import { Seite } from '../../components/layout/Seite.tsx'
import { Badge } from '../../components/ui/Badge.tsx'
import { Panel } from '../../components/ui/Panel.tsx'
import { EmptyState } from '../../components/ui/States.tsx'
import { formatDatum, formatZeitpunkt } from '../../domain/dates.ts'
import { PROJEKT_STATUS } from '../../domain/labels.ts'
import { WERKZEUG_TYP } from '../../domain/selectors/werkzeug.ts'
import { WISSEN_TYP } from '../../domain/selectors/wissen.ts'
import { TEILBARE_BEREICHE } from '../../data/freigabe/ausschnitt.ts'
import { erhalteneBereiche, type ErhaltenerBereich } from '../../data/freigabe/freigabe.ts'
import crm from '../kontakte/crm.module.css'

/** Was der Admin mit mir geteilt hat – nur lesen, entschlüsselt im Browser. */
export function GeteiltSeite() {
  const cloud = useCloud()
  const { privat } = useFreigaben()
  const [bereiche, setBereiche] = useState<ErhaltenerBereich[] | null>(null)
  const dienst = cloud?.dienst

  useEffect(() => {
    if (!privat || !dienst) return
    let aktiv = true
    erhalteneBereiche(dienst, privat)
      .then((b) => aktiv && setBereiche(b))
      .catch(() => aktiv && setBereiche([]))
    return () => {
      aktiv = false
    }
  }, [privat, dienst])

  if (!cloud?.konfiguriert || !cloud.nutzer) {
    return (
      <Seite titel="Geteilt mit mir">
        <EmptyState title="Nur mit Anmeldung">Geteilte Bereiche siehst du nach der Anmeldung (Einstellungen → Konto).</EmptyState>
      </Seite>
    )
  }

  return (
    <Seite titel="Geteilt mit mir" einleitung="Bereiche, die der Admin mit dir teilt – nur zum Lesen, Ende-zu-Ende-verschlüsselt.">
      {!privat || bereiche === null ? (
        <p role="status">Wird entschlüsselt …</p>
      ) : bereiche.length === 0 ? (
        <EmptyState title="Noch nichts geteilt">Sobald der Admin einen Bereich mit dir teilt, erscheint er hier.</EmptyState>
      ) : (
        bereiche.map((b) => {
          const { ausschnitt: a } = b
          const titel = TEILBARE_BEREICHE.find((x) => x.key === a.bereich)?.label ?? a.bereich
          return (
            <Panel key={`${b.besitzerId}:${a.bereich}`} titel={titel}>
              <p className={crm.unter}>Stand: {formatZeitpunkt(b.aktualisiertAm)}</p>
              {a.projekte.length > 0 && (
                <ul className={crm.liste} aria-label="Geteilte Projekte">
                  {a.projekte.map((p) => {
                    const offen = a.aufgaben.filter((x) => x.bezug.art === 'projekt' && x.bezug.id === p.id && !x.erledigt)
                    return (
                      <li key={p.id} className={crm.zeile}>
                        <div className={crm.haupt}>
                          <span className={crm.name}>{p.titel}</span>
                          {p.beschreibung && <span className={crm.vorschau}>{p.beschreibung}</span>}
                          {offen.length > 0 && <span className={crm.unter}>Nächste Schritte: {offen.map((x) => x.titel).join(' · ')}</span>}
                        </div>
                        {p.status && <Badge>{PROJEKT_STATUS[p.status].label}</Badge>}
                      </li>
                    )
                  })}
                </ul>
              )}
              {a.bereich === 'aufgaben' && (
                <ul className={crm.liste} aria-label="Geteilte Aufgaben und Termine">
                  {a.termine.map((t) => (
                    <li key={t.id} className={crm.zeile}>
                      <span className={crm.name}>{t.titel}</span>
                      <span className={crm.unter}>
                        Termin · {formatDatum(t.datum)}
                        {t.uhrzeit && ` ${t.uhrzeit}`}
                      </span>
                    </li>
                  ))}
                  {a.aufgaben
                    .filter((x) => !x.erledigt)
                    .map((x) => (
                      <li key={x.id} className={crm.zeile}>
                        <span className={crm.name}>{x.titel}</span>
                        <span className={crm.unter}>{x.faelligAm ? `Frist ${formatDatum(x.faelligAm)}` : 'Ohne Frist'}</span>
                      </li>
                    ))}
                </ul>
              )}
              {a.wissen.length > 0 && (
                <ul className={crm.liste} aria-label="Geteiltes Wissen">
                  {a.wissen.map((w) => (
                    <li key={w.id} className={crm.zeile}>
                      <div className={crm.haupt}>
                        <span className={crm.name}>{w.titel}</span>
                        {w.inhalt && <span className={crm.vorschau}>{w.inhalt}</span>}
                      </div>
                      <Badge>{WISSEN_TYP[w.typ].label}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {a.werkzeug.length > 0 && (
                <ul className={crm.liste} aria-label="Geteilte Werkzeuge">
                  {a.werkzeug.map((w) => (
                    <li key={w.id} className={crm.zeile}>
                      <div className={crm.haupt}>
                        <span className={crm.name}>{w.titel}</span>
                        {w.inhalt && <span className={crm.vorschau}>{w.inhalt}</span>}
                      </div>
                      <Badge>{WERKZEUG_TYP[w.typ].einzahl}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )
        })
      )}
    </Seite>
  )
}
