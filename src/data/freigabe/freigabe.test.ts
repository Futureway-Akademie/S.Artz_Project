import type { Profil } from '../../domain/bereiche.ts'
import { beispielSeed } from '../../test/beispielStart.ts'
import { createFakeCloud, neuerGeteilterZustand } from '../../test/fakeCloud.ts'
import { ausschnitt } from './ausschnitt.ts'
import { bereichTeilen, eigenesSchluesselpaar, erhalteneBereiche, freigabenAktualisieren } from './freigabe.ts'
import { alsEmpfaengerEntpacken, bereichsschluesselErzeugen, fuerEmpfaengerVerpacken, inhaltEntschluesseln, inhaltVerschluesseln, schluesselpaarErzeugen } from './freigabeKrypto.ts'

const now = new Date(2026, 9, 8, 9, 0)
const profil = (userId: string, istAdmin = false): Profil => ({ userId, email: `${userId}@example.org`, anzeigename: '', rolleId: null, istAdmin, gesperrt: false, bereicheAn: [], bereicheAus: [] })
const tresorschluessel = () => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])

function welt() {
  const geteilt = neuerGeteilterZustand()
  const profile = [profil('admin', true), profil('kim'), profil('tom')]
  const cloud = (id: string) => createFakeCloud({ nutzer: { id, email: `${id}@example.org` }, profile, geteilt })
  return { geteilt, admin: cloud('admin'), kim: cloud('kim'), tom: cloud('tom') }
}

describe('Geteilte Bereiche', () => {
  it('Kryptografie: nur der Empfänger öffnet den Bereichsschlüssel', async () => {
    const kim = await schluesselpaarErzeugen()
    const tom = await schluesselpaarErzeugen()
    const k = await bereichsschluesselErzeugen()
    const umschlag = await inhaltVerschluesseln(k, { geheim: 'Projektplan' })
    expect(JSON.stringify(umschlag)).not.toContain('Projektplan')
    const fuerKim = await fuerEmpfaengerVerpacken(k, kim.oeffentlich)
    expect(await inhaltEntschluesseln(await alsEmpfaengerEntpacken(fuerKim, kim.privat), umschlag)).toEqual({ geheim: 'Projektplan' })
    await expect(alsEmpfaengerEntpacken(fuerKim, tom.privat)).rejects.toThrow()
  })

  it('Ausschnitte enthalten keine Personenbezüge und keine Ablageorte von Zugangsdaten', () => {
    const d = beispielSeed(now)
    const daten = {
      ...d,
      aufgaben: [{ id: 'a1', titel: 'A', notiz: '', erledigt: false, erledigtAm: null, faelligAm: null, bezug: { art: 'kontakt' as const, id: 'k1' }, fokus: false, erstelltAm: now.toISOString(), geaendertAm: now.toISOString() }],
    }
    expect(ausschnitt(daten, 'aufgaben', now).aufgaben[0]!.bezug).toEqual({ art: 'ohne', id: null })
    expect(ausschnitt(daten, 'projekte', now).projekte.length).toBe(d.projekte.length)
    expect(ausschnitt(daten, 'wissen', now).projekte).toEqual([])
  })

  it('teilt, aktualisiert und entzieht – Entzogene können neue Stände nicht mehr lesen', async () => {
    const w = welt()
    const kimPrivat = await eigenesSchluesselpaar(w.kim.dienst, await tresorschluessel())
    const tomPrivat = await eigenesSchluesselpaar(w.tom.dienst, await tresorschluessel())
    const daten = beispielSeed(now)

    // Kim wird freigegeben; ein Nutzer ohne Schlüssel wird gemeldet
    expect(await bereichTeilen(w.admin.dienst, daten, 'projekte', ['kim', 'unbekannt'], now)).toEqual({ geteiltMit: ['kim'], ohneSchluessel: ['unbekannt'] })
    const kimSieht = await erhalteneBereiche(w.kim.dienst, kimPrivat)
    expect(kimSieht.map((b) => b.ausschnitt.bereich)).toEqual(['projekte'])
    expect(kimSieht[0]!.ausschnitt.projekte.map((p) => p.titel)).toContain('KI-Skills')
    expect(await erhalteneBereiche(w.tom.dienst, tomPrivat)).toEqual([])

    // Supabase sieht nur Chiffretext
    expect(JSON.stringify([...w.geteilt.freigaben.values()])).not.toContain('KI-Skills')

    // Tom kommt dazu, Kim wird entzogen; altes Wissen hilft Kim nicht
    const alterUmschlag = [...w.geteilt.freigaben.values()][0]!.umschlag
    const kimsAlterSchluessel = await alsEmpfaengerEntpacken(w.geteilt.freigabeSchluessel.find((s) => s.empfaengerId === 'kim')!.verpackt, kimPrivat)
    await bereichTeilen(w.admin.dienst, { ...daten, projekte: [...daten.projekte, { ...daten.projekte[0]!, id: 'neu', titel: 'Neues Projekt' }] }, 'projekte', ['tom'], now)
    expect(await erhalteneBereiche(w.kim.dienst, kimPrivat)).toEqual([])
    const neuerUmschlag = [...w.geteilt.freigaben.values()][0]!.umschlag
    expect(neuerUmschlag).not.toEqual(alterUmschlag)
    await expect(inhaltEntschluesseln(kimsAlterSchluessel, neuerUmschlag)).rejects.toThrow()
    expect((await erhalteneBereiche(w.tom.dienst, tomPrivat))[0]!.ausschnitt.projekte.map((p) => p.titel)).toContain('Neues Projekt')

    // Aktualisieren übernimmt neue Daten für bestehende Empfänger
    expect(await freigabenAktualisieren(w.admin.dienst, { ...daten, projekte: [] }, now)).toBe(1)
    expect((await erhalteneBereiche(w.tom.dienst, tomPrivat))[0]!.ausschnitt.projekte).toEqual([])

    // Beenden
    await bereichTeilen(w.admin.dienst, daten, 'projekte', [], now)
    expect(await erhalteneBereiche(w.tom.dienst, tomPrivat)).toEqual([])
  })

  it('nur der Admin darf teilen; das Schlüsselpaar wird wiederverwendet', async () => {
    const w = welt()
    await expect(bereichTeilen(w.kim.dienst, beispielSeed(now), 'wissen', ['tom'], now)).resolves.toMatchObject({ ohneSchluessel: ['tom'] })
    const t = await tresorschluessel()
    await eigenesSchluesselpaar(w.tom.dienst, t)
    await expect(bereichTeilen(w.kim.dienst, beispielSeed(now), 'wissen', ['tom'], now)).rejects.toThrow(/Berechtigung/)
    const erstes = w.geteilt.schluessel.get('tom')!.oeffentlich
    await eigenesSchluesselpaar(w.tom.dienst, t)
    expect(w.geteilt.schluessel.get('tom')!.oeffentlich).toEqual(erstes)
  })
})
