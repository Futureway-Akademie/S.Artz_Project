import { alsUmschlag, entschluesseln, entschluesselnMit, FalschesPasswort, pruefePasswort, schluesselAbleiten, verschluesseln } from './krypto.ts'

const ITER = 1000 // in Tests klein, im Browser 600 000

describe('Verschlüsselung', () => {
  it('verschlüsselt und entschlüsselt mit dem richtigen Passwort', async () => {
    const schluessel = await schluesselAbleiten('richtig-langes-passwort', undefined, ITER)
    const umschlag = await verschluesseln(schluessel, '{"name":"Kim Muster"}')
    expect(JSON.stringify(umschlag)).not.toContain('Kim')
    expect(umschlag.kdf).toMatchObject({ name: 'PBKDF2', hash: 'SHA-256', iterationen: ITER })
    const { klartext } = await entschluesseln('richtig-langes-passwort', umschlag)
    expect(klartext).toBe('{"name":"Kim Muster"}')
  })

  it('lehnt ein falsches Passwort und manipulierte Daten ab', async () => {
    const schluessel = await schluesselAbleiten('richtig-langes-passwort', undefined, ITER)
    const umschlag = await verschluesseln(schluessel, 'geheim')
    await expect(entschluesseln('falsches-passwort', umschlag)).rejects.toBeInstanceOf(FalschesPasswort)
    const daten = atob(umschlag.daten)
    const verfaelscht = { ...umschlag, daten: btoa(String.fromCharCode(daten.charCodeAt(0) ^ 1) + daten.slice(1)) }
    await expect(entschluesselnMit(schluessel, verfaelscht)).rejects.toBeInstanceOf(FalschesPasswort)
  })

  it('verwendet für jeden Speichervorgang ein neues IV und je Passwort ein neues Salt', async () => {
    const a = await schluesselAbleiten('richtig-langes-passwort', undefined, ITER)
    const b = await schluesselAbleiten('richtig-langes-passwort', undefined, ITER)
    const u1 = await verschluesseln(a, 'x')
    const u2 = await verschluesseln(a, 'x')
    expect(u1.iv).not.toBe(u2.iv)
    expect(u1.daten).not.toBe(u2.daten)
    expect((await verschluesseln(b, 'x')).kdf.salt).not.toBe(u1.kdf.salt)
  })

  it('erkennt verschlüsselte Daten und Klartext', async () => {
    const umschlag = await verschluesseln(await schluesselAbleiten('richtig-langes-passwort', undefined, ITER), 'x')
    expect(alsUmschlag(JSON.stringify(umschlag))).toEqual(umschlag)
    expect(alsUmschlag('{"schemaVersion":2}')).toBeNull()
    expect(alsUmschlag('kein json')).toBeNull()
  })

  it('prüft Länge und Wiederholung des Passworts', () => {
    expect(pruefePasswort('kurz', 'kurz')).toMatch(/mindestens 10/)
    expect(pruefePasswort('lang-genug-1', 'lang-genug-2')).toMatch(/stimmen nicht/)
    expect(pruefePasswort('lang-genug-1', 'lang-genug-1')).toBeNull()
  })
})
