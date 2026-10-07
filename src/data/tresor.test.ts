import { createFakeStorage } from '../test/fakes.ts'
import { alsUmschlag, entschluesseln, schluesselAbleiten } from './krypto.ts'
import { STORAGE_KEY } from './storage.ts'
import { ladeSperreMinuten, speichereSperreMinuten, VerschluesselterSpeicher } from './tresor.ts'

const ITER = 1000

describe('Verschlüsselter Speicher', () => {
  it('liefert Klartext nur aus dem Arbeitsspeicher und schreibt nur verschlüsselt', async () => {
    const basis = createFakeStorage()
    const speicher = new VerschluesselterSpeicher(basis, await schluesselAbleiten('passwort-123', undefined, ITER), null)
    speicher.setItem(STORAGE_KEY, '{"a":1}')
    speicher.setItem(STORAGE_KEY, '{"a":2}')
    expect(speicher.getItem(STORAGE_KEY)).toBe('{"a":2}')
    await speicher.fertig()
    const roh = basis.map.get(STORAGE_KEY)!
    expect(roh).not.toContain('"a"')
    expect((await entschluesseln('passwort-123', alsUmschlag(roh)!)).klartext).toBe('{"a":2}')
  })

  it('verschlüsselt nach einem Passwortwechsel mit neuem Schlüssel', async () => {
    const basis = createFakeStorage()
    const speicher = new VerschluesselterSpeicher(basis, await schluesselAbleiten('passwort-alt', undefined, ITER), '{"a":1}')
    await speicher.schluesselWechseln(await schluesselAbleiten('passwort-neu', undefined, ITER))
    const umschlag = alsUmschlag(basis.map.get(STORAGE_KEY)!)!
    expect((await entschluesseln('passwort-neu', umschlag)).klartext).toBe('{"a":1}')
    await expect(entschluesseln('passwort-alt', umschlag)).rejects.toThrow()
  })

  it('übernimmt Änderungen aus einem anderen Tab und löscht', async () => {
    const basis = createFakeStorage()
    const schluessel = await schluesselAbleiten('passwort-123', undefined, ITER)
    const andererBasis = createFakeStorage()
    const andererTab = new VerschluesselterSpeicher(andererBasis, schluessel, null)
    andererTab.setItem(STORAGE_KEY, '{"neu":true}')
    await andererTab.fertig()
    const speicher = new VerschluesselterSpeicher(basis, schluessel, '{"alt":true}')
    await speicher.vonAussenAktualisieren(andererBasis.map.get(STORAGE_KEY)!)
    expect(speicher.getItem(STORAGE_KEY)).toBe('{"neu":true}')
    speicher.removeItem(STORAGE_KEY)
    expect(speicher.getItem(STORAGE_KEY)).toBeNull()
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
