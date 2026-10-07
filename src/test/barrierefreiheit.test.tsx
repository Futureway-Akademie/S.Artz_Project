import { fireEvent, screen, within } from '@testing-library/react'
import axe from 'axe-core'
import { beispielSeed } from './beispielStart.ts'
import type { AppData } from '../domain/types.ts'
import { renderApp } from './renderApp.tsx'

/**
 * Automatische Barrierefreiheitsprüfung (axe-core, WCAG 2.x A/AA) aller Seiten.
 * Farbkontraste prüft jsdom nicht (kein Layout); sie sind in src/styles/contrast.test.ts abgedeckt.
 */
async function pruefe(container: Element) {
  const ergebnis = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return ergebnis.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

const zeit = '2026-10-01T10:00:00.000Z'
const meta = { erstelltAm: zeit, geaendertAm: zeit }

function beispieldaten(): AppData {
  const seed = beispielSeed(new Date(), [
    { projekt: { id: 'seed-projekt-ki-skills', titel: '', kategorie: '', status: null, zuletztAktiv: null, tools: ['Werkzeug A'] }, offen: ['Bilder ausgeben'], erledigt: ['Skill gebaut'] },
  ])
  return {
    ...seed,
    unternehmen: [{ id: 'u1', name: 'Beispiel GmbH', branche: 'Handel', website: 'https://example.org', notiz: '', schlagworte: [], ...meta }],
    kontakte: [
      {
        id: 'k1',
        name: 'Kim Muster',
        rolle: 'Recruiterin',
        unternehmenId: 'u1',
        email: 'kim@example.org',
        telefon: '0123',
        linkedinUrl: 'https://www.linkedin.com/in/kim',
        kontext: 'jobsuche',
        herkunft: 'Messe',
        notiz: '',
        projektIds: ['seed-projekt-ki-skills'],
        naechsteAktion: { text: 'Nachfassen', faelligAm: '2026-10-07' },
        rechtsgrundlage: 'berechtigtes_interesse',
        zweck: 'Bewerbung',
        schlagworte: [],
        ...meta,
      },
    ],
    interaktionen: [{ id: 'i1', kontaktId: 'k1', art: 'telefonat', datum: '2026-10-05', text: 'Erstgespräch', projektId: null, bewerbungId: null, leadId: null, betreff: '', richtung: null, ...meta }],
    termine: [{ id: 't1', titel: 'Coaching', datum: '2030-01-10', uhrzeit: '10:00', ort: 'Online', notiz: '', bezug: { art: 'ohne', id: null }, ...meta }],
    kursAufgaben: [{ id: 'ka1', kursId: 'seed-kurs-beispiel', code: 'KURS_1_01', titel: 'Übung', status: 'erledigt', faelligAm: null, notiz: '', ...meta }],
    leads: [{ id: 'l1', titel: 'Schulung', kontaktId: 'k1', unternehmenId: 'u1', status: 'neu', betragEur: null, naechsterSchritt: '', notiz: '', projektId: null, wiedervorlageAm: null, ...meta }],
    bewerbungen: [
      {
        id: 'b1',
        stelle: 'Datenanalyst',
        unternehmenId: 'u1',
        zielrolleId: 'seed-zielrolle-1',
        kontaktId: 'k1',
        status: 'beworben',
        quelle: 'LinkedIn',
        beworbenAm: '2026-10-01',
        link: 'https://example.org/job',
        naechsterSchritt: '',
        notiz: '',
        wiedervorlageAm: '2026-10-09',
        ...meta,
      },
    ],
    projekte: seed.projekte.map((p) =>
      p.id === 'seed-projekt-kundenformular'
        ? {
            ...p,
            automation: {
              plattform: 'make',
              modell: 'Testmodell',
              promptVersion: null,
              schwelleProzent: 70,
              statuswerte: [],
              datenquellen: ['Formular'],
              pipeline: ['Eingang', 'Prüfung'],
              routing: [{ bedingung: 'Fallback', ziel: 'Postfach', fallback: true }],
              routingStatus: 'geplant',
              logikHinweise: [],
              verbindung: 'nicht_verbunden',
            },
          }
        : p,
    ),
    wissen: [{ id: 'w1', typ: 'prompt', titel: 'Prompt', inhalt: 'Text', thema: 'Prompting', quelle: 'https://example.org', schlagworte: ['x'], datum: null, projektIds: ['seed-projekt-ki-skills'], kursId: null, kursAufgabeIds: [], ...meta }],
    aktivitaeten: [{ id: 'a1', zeitpunkt: zeit, art: 'angelegt', bezug: { sammlung: 'kontakte', id: 'k1', titel: 'Kim Muster' }, zusammenfassung: 'Kontakt „Kim Muster“ angelegt' }],
  }
}

const SEITEN = [
  '/',
  '/projekte',
  '/projekte/seed-projekt-ki-skills',
  '/automationen',
  '/weiterbildung',
  '/pikartz-ai',
  '/aufgaben',
  '/aufgaben?ansicht=termine',
  '/kalender?datum=2026-10-07',
  '/wissen',
  '/wissen/w1',
  '/kalender?ansicht=woche&datum=2026-10-07',
  '/kalender?ansicht=liste&datum=2026-10-01',
  '/kontakte',
  '/kontakte/k1',
  '/kontakte/unternehmen',
  '/kontakte/unternehmen/u1',
  '/kontakte/leads',
  '/bewerbungen',
  '/bewerbungen/zielrollen',
  '/bewerbungen/b1',
  '/bewerbungen?ansicht=pipeline',
  '/kontakte/leads/l1',
  '/kontakte/vorlagen',
  '/einstellungen',
  '/gibt-es-nicht',
]

describe('Barrierefreiheit (axe-core)', () => {
  it.each(SEITEN)('%s ohne Verstöße – mit Beispieldaten', async (pfad) => {
    const { container } = renderApp(pfad, { daten: beispieldaten() })
    expect(await pruefe(container)).toEqual([])
  })

  it.each(['/', '/projekte', '/kontakte', '/bewerbungen', '/kontakte/leads'])('%s ohne Verstöße – im Leerzustand', async (pfad) => {
    const { container } = renderApp(pfad)
    expect(await pruefe(container)).toEqual([])
  })

  it('Formulardialoge ohne Verstöße', async () => {
    const { container } = renderApp('/projekte', { daten: beispieldaten() })
    fireEvent.click(screen.getByRole('button', { name: 'Projekt anlegen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' })) // Fehlerzustand anzeigen
    expect(await pruefe(container)).toEqual([])
  })

  it('Suche und Schnellerfassung ohne Verstöße', async () => {
    const { container } = renderApp('/kontakte/k1', { daten: beispieldaten() })
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.change(within(screen.getByRole('dialog', { name: 'Suchen' })).getByRole('combobox'), { target: { value: 'kim' } })
    expect(await pruefe(container.ownerDocument.body)).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Dialog schließen' }))
    fireEvent.click(screen.getAllByRole('button', { name: /Neu anlegen/, hidden: true })[0]!)
    expect(await pruefe(container.ownerDocument.body)).toEqual([])
  })

  it('E-Mail-Dialog ohne Verstöße', async () => {
    const { container } = renderApp('/kontakte/k1', { daten: beispieldaten() })
    fireEvent.click(screen.getByRole('button', { name: 'E-Mail schreiben' }))
    fireEvent.change(screen.getByLabelText(/^Vorlage/), { target: { value: 'vorlage-erstkontakt' } })
    expect(await pruefe(container.ownerDocument.body)).toEqual([])
  })

  it('Wiederherstellen-Seite ohne Verstöße', async () => {
    const { TresorGate } = await import('../app/TresorGate.tsx')
    const { render } = await import('@testing-library/react')
    const { verschluesseln, schluesselAbleiten } = await import('../data/krypto.ts')
    const { createFakeStorage } = await import('./fakes.ts')
    const { STORAGE_KEY } = await import('../data/storage.ts')
    const basis = createFakeStorage({ [STORAGE_KEY]: JSON.stringify(await verschluesseln(await schluesselAbleiten('x'.repeat(12), undefined, 1000), '{}')) })
    window.history.replaceState(null, '', '/wiederherstellen#schluessel=' + encodeURIComponent('C'.repeat(43) + '='))
    const { container } = render(<TresorGate basis={basis} iterationen={1000}>{() => null}</TresorGate>)
    expect(await pruefe(container)).toEqual([])
    window.history.replaceState(null, '', '/')
  })

  it('Fehlerseite bei defekten Daten ohne Verstöße', async () => {
    const { createFakeStorage } = await import('./fakes.ts')
    const { STORAGE_KEY } = await import('../data/storage.ts')
    const { container } = renderApp('/', { storage: createFakeStorage({ [STORAGE_KEY]: '{kaputt' }) })
    expect(await pruefe(container)).toEqual([])
  })
})
