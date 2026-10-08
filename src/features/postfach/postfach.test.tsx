import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { reducer } from '../../data/reducer.ts'
import type { MailDienst, RohMail } from '../../data/gmail/gmail.ts'
import { tokenSetzen } from '../../data/gmail/googleAuth.ts'
import { abfragen, abrufZiele, adresseAus, bewerbungVorschlag, domainAusWebsite, kontaktAusMail, mailZuordnen, nameAus } from '../../domain/selectors/postfach.ts'
import { selectVerknuepft } from '../../domain/selectors/verknuepft.ts'
import type { AppData, Bewerbung, Kontakt, Mail } from '../../domain/types.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { createMeta } from '../../test/fakes.ts'
import { renderApp } from '../../test/renderApp.tsx'
import { mailsAbrufen } from './abruf.ts'

const zeit = '2026-10-01T10:00:00.000Z'
const m = { erstelltAm: zeit, geaendertAm: zeit }
const now = new Date(2026, 9, 7, 9, 0)

const kontakt = (id: string, extra: Partial<Kontakt>): Kontakt => ({
  id,
  name: id,
  rolle: '',
  unternehmenId: null,
  email: '',
  telefon: '',
  linkedinUrl: '',
  kontext: 'jobsuche',
  herkunft: '',
  notiz: '',
  projektIds: [],
  naechsteAktion: null,
  rechtsgrundlage: null,
  zweck: '',
  schlagworte: [],
  ...m,
  ...extra,
})

const bewerbung = (id: string, extra: Partial<Bewerbung>): Bewerbung => ({
  id,
  stelle: id,
  unternehmenId: null,
  zielrolleId: null,
  kontaktId: null,
  status: 'beworben',
  quelle: '',
  beworbenAm: null,
  link: '',
  naechsterSchritt: '',
  notiz: '',
  wiedervorlageAm: null,
  ...m,
  ...extra,
})

function daten(): AppData {
  return {
    ...beispielSeed(now),
    unternehmen: [
      { id: 'u1', name: 'Acme GmbH', branche: '', website: 'https://www.acme.de/karriere', notiz: '', schlagworte: [], ...m },
      { id: 'u2', name: 'Freemail', branche: '', website: 'gmail.com', notiz: '', schlagworte: [], ...m },
    ],
    kontakte: [kontakt('k1', { name: 'Kim Muster', email: 'Kim@Acme.de', unternehmenId: 'u1' }), kontakt('k2', { name: 'Ohne Mail' })],
    bewerbungen: [bewerbung('alt', { unternehmenId: 'u1', status: 'absage', geaendertAm: '2026-10-05T10:00:00.000Z' }), bewerbung('KI-Trainer', { unternehmenId: 'u1', kontaktId: 'k1' })],
  }
}

const roh = (id: string, extra: Partial<RohMail> = {}): RohMail => ({
  id,
  threadId: `t-${id}`,
  zeitpunkt: '2026-10-06T08:30:00.000Z',
  von: 'Kim Muster <kim@acme.de>',
  an: ['ich@example.org'],
  betreff: 'Einladung zum Gespräch',
  auszug: 'Wir laden Sie herzlich ein …',
  labels: ['INBOX'],
  ...extra,
})

function fakeDienst(mails: RohMail[]): MailDienst {
  return {
    konfiguriert: true,
    profil: vi.fn().mockResolvedValue('ich@example.org'),
    suchen: vi.fn().mockResolvedValue(mails.map((x) => x.id)),
    holen: vi.fn().mockImplementation(async (id: string) => mails.find((x) => x.id === id)!),
    trennen: vi.fn(),
  }
}

describe('Postfach: Abruf und Zuordnung', () => {
  it('liest Adressen, Namen und Domains', () => {
    expect(adresseAus('"Kim Muster" <Kim@Acme.de>')).toBe('kim@acme.de')
    expect(nameAus('"Kim Muster" <kim@acme.de>')).toBe('Kim Muster')
    expect(nameAus('hr@acme.de')).toBe('hr')
    expect(domainAusWebsite('https://www.acme.de/karriere')).toBe('acme.de')
    expect(domainAusWebsite('acme.de')).toBe('acme.de')
  })

  it('sucht nur nach Kontaktadressen und Unternehmensdomains – ohne Freemail-Anbieter', () => {
    const ziele = abrufZiele(daten())
    expect(ziele).toEqual({ adressen: ['kim@acme.de'], domains: ['acme.de'] })
    expect(abfragen(ziele, '2026-07-09')).toEqual(['{from:kim@acme.de to:kim@acme.de cc:kim@acme.de from:acme.de to:acme.de cc:acme.de} after:2026/07/09'])
    expect(abfragen({ adressen: Array.from({ length: 31 }, (_, i) => `a${i}@x.de`), domains: [] }, '2026-07-09')).toHaveLength(3)
  })

  it('ordnet Eingang und Ausgang zu und verwirft Fremdes', () => {
    const d = daten()
    expect(mailZuordnen(d, roh('m1'), 'ich@example.org')).toMatchObject({ richtung: 'eingang', kontaktId: 'k1', unternehmenId: 'u1', bewerbungId: 'KI-Trainer', status: 'neu' })
    expect(mailZuordnen(d, roh('m2', { von: 'Ich <ich@example.org>', an: ['bewerbung@acme.de'], labels: ['SENT'] }), 'ich@example.org')).toMatchObject({
      richtung: 'ausgang',
      kontaktId: null,
      unternehmenId: 'u1',
    })
    expect(mailZuordnen(d, roh('m3', { von: 'Newsletter <news@shop.de>' }), 'ich@example.org')).toBeNull()
    expect(bewerbungVorschlag(d, null, 'u1')?.id).toBe('KI-Trainer')
  })

  it('ruft nur Unbekanntes ab und speichert nur Zuordenbares', async () => {
    const d = { ...daten(), mails: [{ ...mailZuordnen(daten(), roh('m1'), '')!, id: 'x', ...m }] }
    const dienst = fakeDienst([roh('m1'), roh('m2', { betreff: 'Rückfrage' }), roh('m3', { von: 'news@shop.de' })])
    const ergebnis = await mailsAbrufen(dienst, d, now)
    expect(dienst.holen).toHaveBeenCalledTimes(2)
    expect(ergebnis.mails.map((x) => x.gmailId)).toEqual(['m2'])
    expect(ergebnis.verworfen).toBe(1)
    expect(vi.mocked(dienst.suchen).mock.calls[0]![0]).toContain('after:2026/07/09')
  })

  it('übernimmt Abrufe gesammelt, ohne Doppelte, mit einer Aktivität ohne Inhalte', () => {
    const neu = mailZuordnen(daten(), roh('m1'), '')!
    let d = reducer(daten(), { type: 'mailsAbgerufen', mails: [neu, neu], abrufAm: zeit }, createMeta())
    d = reducer(d, { type: 'mailsAbgerufen', mails: [neu], abrufAm: zeit }, createMeta())
    expect(d.mails).toHaveLength(1)
    expect(d.einstellungen.letzterMailAbrufAm).toBe(zeit)
    expect(d.aktivitaeten.map((a) => a.zusammenfassung)).toEqual(['1 Mail aus Gmail abgerufen'])
  })

  it('übernimmt eine Mail in den Verlauf, legt bei Bedarf den Kontakt an und löscht den Mailinhalt', () => {
    let d = reducer(daten(), { type: 'mailsAbgerufen', mails: [mailZuordnen(daten(), roh('m2', { von: 'Personal <hr@acme.de>' }), '')!], abrufAm: zeit }, createMeta())
    const mail = d.mails[0]!
    expect(mail.kontaktId).toBeNull()
    const neuerKontakt = kontaktAusMail(d, mail)
    expect(neuerKontakt).toMatchObject({ name: 'Personal', email: 'hr@acme.de', unternehmenId: 'u1', kontext: 'jobsuche', rechtsgrundlage: 'vertrag', zweck: 'Bewerbung: KI-Trainer', herkunft: 'E-Mail (Gmail)' })
    d = reducer(d, { type: 'mailUebernehmen', mailId: mail.id, kontaktId: 'k-neu', bewerbungId: 'KI-Trainer', neuerKontakt }, createMeta())
    expect(d.kontakte.find((k) => k.id === 'k-neu')?.name).toBe('Personal')
    const verlauf = d.interaktionen.find((i) => i.kontaktId === 'k-neu')!
    expect(verlauf).toMatchObject({ art: 'email', datum: '2026-10-06', betreff: 'Einladung zum Gespräch', richtung: 'eingang', bewerbungId: 'KI-Trainer', text: 'Wir laden Sie herzlich ein …' })
    expect(d.mails[0]).toMatchObject({ status: 'uebernommen', interaktionId: verlauf.id, von: '', an: [], betreff: '', auszug: '' })
    // zweites Übernehmen ändert nichts
    expect(reducer(d, { type: 'mailUebernehmen', mailId: mail.id, kontaktId: 'k1', bewerbungId: null }, createMeta())).toBe(d)
  })

  it('löscht Mails mit dem Kontakt und zeigt neue Mails in der Gesamtsicht', () => {
    const d = reducer(daten(), { type: 'mailsAbgerufen', mails: [mailZuordnen(daten(), roh('m1'), '')!], abrufAm: zeit }, createMeta())
    expect(selectVerknuepft(d, { art: 'kontakt', id: 'k1' }, now).mails).toHaveLength(1)
    expect(selectVerknuepft(d, { art: 'unternehmen', id: 'u1' }, now).mails).toHaveLength(1)
    expect(selectVerknuepft(d, { art: 'bewerbung', id: 'KI-Trainer' }, now).mails).toHaveLength(1)
    const ohne = reducer(d, { type: 'loeschen', sammlung: 'kontakte', id: 'k1' }, createMeta())
    expect(ohne.mails).toEqual([])
    expect(JSON.stringify(ohne)).not.toContain('kim@acme.de')
  })

  describe('Bedienung', () => {
    afterEach(() => tokenSetzen(null))

    it('ohne Einrichtung: Hinweis statt Abruf', () => {
      renderApp('/postfach', { daten: daten(), mail: { ...fakeDienst([]), konfiguriert: false } })
      expect(screen.getByText('Gmail ist nicht eingerichtet')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Mails abrufen' })).toBeNull()
    })

    it('ruft ab, übernimmt eine Mail und zeigt sie im Verlauf des Kontakts', async () => {
      tokenSetzen({ wert: 'tok', gueltigBis: Date.now() + 3_600_000 })
      const { gespeichert } = renderApp('/postfach', { daten: daten(), mail: fakeDienst([roh('m1')]) })
      expect(screen.getByText(/1 Adresse und 1 Unternehmensdomain/)).toBeInTheDocument()
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Mails abrufen' }))
      })
      const karte = await screen.findByRole('article', { name: 'Einladung zum Gespräch' })
      expect(within(karte).getByLabelText('Kontakt')).toHaveValue('k1')
      expect(within(karte).getByLabelText('Bewerbung')).toHaveValue('KI-Trainer')
      fireEvent.click(within(karte).getByRole('button', { name: 'In den Verlauf übernehmen' }))
      expect(screen.getByText('Neue Mails (0)')).toBeInTheDocument()
      act(() => {
        window.dispatchEvent(new Event('pagehide'))
      })
      await waitFor(() => expect(gespeichert().interaktionen.some((i) => i.betreff === 'Einladung zum Gespräch' && i.kontaktId === 'k1')).toBe(true))
      expect((gespeichert().mails as Mail[])[0]!.status).toBe('uebernommen')
    })
  })
})
