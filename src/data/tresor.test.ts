import { createFakeStorage } from '../test/fakes.ts'
import { schluesselAbleiten, verschluesseln } from './krypto.ts'
import { STORAGE_KEY } from './storage.ts'
import { ladeSperreMinuten, speichereSperreMinuten, VerschluesselterSpeicher } from './tresor.ts'
import {
  alsTresor,
  mitWiederherstellungOeffnen,
  passwortSetzen,
  tresorAnlegen,
  tresorOeffnen,
  wiederherstellungEinrichten,
  wiederherstellungEntfernen,
  type TresorUmschlag,
} from './tresorKrypto.ts'
import { geheimnisAusLink, wiederherstellungsLink, wiederherstellungsMail } from './wiederherstellung.ts'

const ITER = 1000
const gespeichert = (basis: ReturnType<typeof createFakeStorage>) => alsTresor(basis.map.get(STORAGE_KEY)!) as TresorUmschlag

describe('Tresor mit Datenschlüssel (Version 2)', () => {
  it('öffnet mit dem Passwort und lehnt falsche ab', async () => {
    const basis = createFakeStorage()
    const speicher = new VerschluesselterSpeicher(basis, await tresorAnlegen('passwort-123', ITER), null)
    speicher.setItem(STORAGE_KEY, '{"a":1}')
    speicher.setItem(STORAGE_KEY, '{"a":2}')
    expect(speicher.getItem(STORAGE_KEY)).toBe('{"a":2}')
    await speicher.fertig()
    expect(basis.map.get(STORAGE_KEY)).not.toContain('"a"')
    expect(gespeichert(basis).version).toBe(2)
    expect((await tresorOeffnen('passwort-123', gespeichert(basis))).klartext).toBe('{"a":2}')
    await expect(tresorOeffnen('falsch-falsch', gespeichert(basis))).rejects.toThrow()
  })

  it('stellt einen Umschlag der Version 1 beim Öffnen um', async () => {
    const v1 = await verschluesseln(await schluesselAbleiten('altes-passwort', undefined, ITER), '{"alt":true}')
    const { klartext, schluessel } = await tresorOeffnen('altes-passwort', v1)
    expect(klartext).toBe('{"alt":true}')
    const basis = createFakeStorage()
    const speicher = new VerschluesselterSpeicher(basis, schluessel, klartext)
    speicher.setItem(STORAGE_KEY, klartext)
    await speicher.fertig()
    expect(gespeichert(basis).version).toBe(2)
    expect((await tresorOeffnen('altes-passwort', gespeichert(basis))).klartext).toBe('{"alt":true}')
  })

  it('ändert das Passwort, ohne die Daten neu zu verschlüsseln, und behält die Wiederherstellung', async () => {
    const basis = createFakeStorage()
    const { schluessel, geheimnis } = await wiederherstellungEinrichten(await tresorAnlegen('passwort-alt', ITER), 'ich@example.org')
    const speicher = new VerschluesselterSpeicher(basis, schluessel, '{"a":1}')
    await speicher.schluesselWechseln(await passwortSetzen(schluessel, 'passwort-neu'))
    const u = gespeichert(basis)
    expect((await tresorOeffnen('passwort-neu', u)).klartext).toBe('{"a":1}')
    await expect(tresorOeffnen('passwort-alt', u)).rejects.toThrow()
    expect((await mitWiederherstellungOeffnen(geheimnis, u)).klartext).toBe('{"a":1}')
  })

  it('stellt mit dem Wiederherstellungsschlüssel ein neues Passwort ein; ein neuer Schlüssel macht den alten ungültig', async () => {
    const basis = createFakeStorage()
    const erst = await wiederherstellungEinrichten(await tresorAnlegen('vergessen-123', ITER), 'ich@example.org')
    const speicher = new VerschluesselterSpeicher(basis, erst.schluessel, '{"wichtig":true}')
    speicher.setItem(STORAGE_KEY, '{"wichtig":true}')
    await speicher.fertig()
    expect(gespeichert(basis).wiederherstellung?.email).toBe('ich@example.org')

    const geoeffnet = await mitWiederherstellungOeffnen(erst.geheimnis, gespeichert(basis))
    expect(geoeffnet.klartext).toBe('{"wichtig":true}')
    await expect(mitWiederherstellungOeffnen('A'.repeat(43) + '=', gespeichert(basis))).rejects.toThrow()

    const zweit = await wiederherstellungEinrichten(speicher.aktuellerSchluessel(), 'ich@example.org')
    await speicher.schluesselWechseln(zweit.schluessel)
    await expect(mitWiederherstellungOeffnen(erst.geheimnis, gespeichert(basis))).rejects.toThrow()
    await speicher.schluesselWechseln(wiederherstellungEntfernen(speicher.aktuellerSchluessel()))
    expect(gespeichert(basis).wiederherstellung).toBeNull()
  })

  it('übernimmt Änderungen aus einem anderen Tab samt neuem Passwort', async () => {
    const schluessel = await tresorAnlegen('passwort-123', ITER)
    const andererBasis = createFakeStorage()
    const andererTab = new VerschluesselterSpeicher(andererBasis, schluessel, null)
    andererTab.setItem(STORAGE_KEY, '{"neu":true}')
    await andererTab.schluesselWechseln(await passwortSetzen(schluessel, 'anderes-pw-123'))
    const speicher = new VerschluesselterSpeicher(createFakeStorage(), schluessel, '{"alt":true}')
    await speicher.vonAussenAktualisieren(andererBasis.map.get(STORAGE_KEY)!)
    expect(speicher.getItem(STORAGE_KEY)).toBe('{"neu":true}')
    expect(speicher.aktuellerSchluessel().kopf.passwortSchluessel).toEqual(gespeichert(andererBasis).passwortSchluessel)
  })

  it('merkt sich die Sperrzeit, ungültige Werte fallen auf 15 Minuten zurück', () => {
    const basis = createFakeStorage()
    expect(ladeSperreMinuten(basis)).toBe(15)
    speichereSperreMinuten(basis, 5)
    expect(ladeSperreMinuten(basis)).toBe(5)
    basis.setItem(`${STORAGE_KEY}:sicherheit`, '{"sperreMinuten":7}')
    expect(ladeSperreMinuten(basis)).toBe(15)
  })
})

describe('Wiederherstellungslink', () => {
  it('trägt den Schlüssel nur im Fragment, das kein Browser an einen Server schickt', () => {
    const geheimnis = 'q83v+abc/DEF' + 'x'.repeat(32) + '='
    const link = wiederherstellungsLink('http://localhost:5173', geheimnis)
    const url = new URL(link)
    expect(url.pathname).toBe('/wiederherstellen')
    expect(url.search).toBe('')
    expect(link.split('#')[0]).not.toContain(geheimnis)
    expect(geheimnisAusLink(url.hash)).toBe(geheimnis)
    expect(geheimnisAusLink('#schluessel=kurz')).toBeNull()
  })

  it('erstellt eine Mail an sich selbst mit dem Link', () => {
    const mail = wiederherstellungsMail('ich@example.org', 'http://localhost:5173/wiederherstellen#schluessel=abc')
    expect(mail.startsWith('mailto:ich@example.org?subject=Wiederherstellung%20PIKARTZ.AI%20Arbeitscockpit&body=')).toBe(true)
    expect(decodeURIComponent(mail)).toContain('http://localhost:5173/wiederherstellen#schluessel=abc')
  })
})
