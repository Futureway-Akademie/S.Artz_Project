import { createFakeCloud } from '../../test/fakeCloud.ts'
import { createFakeStorage } from '../../test/fakes.ts'
import { STORAGE_KEY } from '../storage.ts'
import { tresorAnlegen, tresorVerschluesseln, type Tresorschluessel } from '../tresorKrypto.ts'
import { abgleichen, hierBehalten, ladeSyncMeta, lokalGeaendert, serverUebernehmen, vomServerHolen } from './sync.ts'

const ITER = 1000

async function geraet(schluessel: Tresorschluessel, klartext: string) {
  const basis = createFakeStorage({ [STORAGE_KEY]: JSON.stringify(await tresorVerschluesseln(schluessel, klartext)) })
  return basis
}

describe('Verschlüsselte Synchronisierung', () => {
  it('lädt beim ersten Abgleich nur den verschlüsselten Umschlag hoch', async () => {
    const cloud = createFakeCloud({ nutzer: { id: 'u', email: 'ich@example.org' } })
    const schluessel = await tresorAnlegen('passwort-123', ITER)
    const basis = await geraet(schluessel, '{"geheim":"Kim Muster"}')
    expect(await abgleichen(cloud.dienst, basis, schluessel)).toEqual({ art: 'hochgeladen', revision: 1 })
    expect(cloud.uploads).toHaveLength(1)
    expect(cloud.uploads[0]).not.toContain('Kim')
    expect(JSON.parse(cloud.uploads[0]!).format).toBe('pikartz-verschluesselt')
    expect(ladeSyncMeta(basis)).toMatchObject({ revision: 1, lokalGeaendert: false })
    expect(await abgleichen(cloud.dienst, basis, schluessel)).toEqual({ art: 'aktuell' })
  })

  it('verweigert den Upload von Klartext', async () => {
    const cloud = createFakeCloud()
    const basis = createFakeStorage({ [STORAGE_KEY]: '{"klartext":true}' })
    await expect(abgleichen(cloud.dienst, basis, await tresorAnlegen('passwort-123', ITER))).rejects.toThrow(/Nur verschlüsselte Daten/)
    expect(cloud.uploads).toEqual([])
  })

  it('überträgt Änderungen zwischen zwei Geräten mit demselben Tresor', async () => {
    const cloud = createFakeCloud()
    const schluessel = await tresorAnlegen('passwort-123', ITER)
    const a = await geraet(schluessel, '{"stand":1}')
    await abgleichen(cloud.dienst, a, schluessel)

    // Gerät B holt den Stand (neues Gerät) und entsperrt mit demselben Passwort → gleicher Datenschlüssel
    const b = createFakeStorage()
    expect(await vomServerHolen(cloud.dienst, b)).toBe(true)
    expect(ladeSyncMeta(b)).toMatchObject({ revision: 1, lokalGeaendert: false })

    // A ändert und lädt hoch, B übernimmt
    a.setItem(STORAGE_KEY, JSON.stringify(await tresorVerschluesseln(schluessel, '{"stand":2}')))
    lokalGeaendert(a)
    expect(await abgleichen(cloud.dienst, a, schluessel)).toEqual({ art: 'hochgeladen', revision: 2 })
    const ergebnis = await abgleichen(cloud.dienst, b, schluessel)
    expect(ergebnis).toMatchObject({ art: 'uebernommen', klartext: '{"stand":2}' })
    expect(ladeSyncMeta(b).revision).toBe(2)
  })

  it('meldet einen Konflikt, wenn beide Seiten geändert haben, und löst ihn auf Wunsch', async () => {
    const cloud = createFakeCloud()
    const schluessel = await tresorAnlegen('passwort-123', ITER)
    const a = await geraet(schluessel, '{"a":0}')
    await abgleichen(cloud.dienst, a, schluessel)
    const b = createFakeStorage()
    await vomServerHolen(cloud.dienst, b)

    a.setItem(STORAGE_KEY, JSON.stringify(await tresorVerschluesseln(schluessel, '{"a":1}')))
    lokalGeaendert(a)
    await abgleichen(cloud.dienst, a, schluessel)
    b.setItem(STORAGE_KEY, JSON.stringify(await tresorVerschluesseln(schluessel, '{"b":1}')))
    lokalGeaendert(b)

    const konflikt = await abgleichen(cloud.dienst, b, schluessel)
    expect(konflikt.art).toBe('konflikt')
    if (konflikt.art !== 'konflikt') return
    expect(await serverUebernehmen(b, konflikt.server, schluessel)).toMatchObject({ art: 'uebernommen', klartext: '{"a":1}' })

    b.setItem(STORAGE_KEY, JSON.stringify(await tresorVerschluesseln(schluessel, '{"b":2}')))
    lokalGeaendert(b)
    a.setItem(STORAGE_KEY, JSON.stringify(await tresorVerschluesseln(schluessel, '{"a":2}')))
    lokalGeaendert(a)
    await abgleichen(cloud.dienst, a, schluessel)
    const zweiter = await abgleichen(cloud.dienst, b, schluessel)
    if (zweiter.art !== 'konflikt') throw new Error('Konflikt erwartet')
    expect(await hierBehalten(cloud.dienst, b, zweiter.server)).toMatchObject({ art: 'hochgeladen' })
  })

  it('erkennt einen fremden Tresor auf dem Server', async () => {
    const cloud = createFakeCloud()
    const fremd = await tresorAnlegen('anderes-pw-123', ITER)
    await abgleichen(cloud.dienst, await geraet(fremd, '{"fremd":true}'), fremd)
    const eigen = await tresorAnlegen('passwort-123', ITER)
    const basis = await geraet(eigen, '{"eigen":true}')
    const r = await abgleichen(cloud.dienst, basis, eigen)
    expect(r.art).toBe('konflikt') // lokal ungesynct geändert → Sascha entscheidet
    if (r.art !== 'konflikt') return
    expect((await serverUebernehmen(basis, r.server, eigen)).art).toBe('fremd')
  })
})
