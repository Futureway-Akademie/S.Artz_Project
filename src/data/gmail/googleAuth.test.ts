import { aktuellerToken, anmeldeUrl, anmeldungStarten, GMAIL_SCOPE, rueckkehrAuswerten, rueckkehrVerarbeiten, STATE_KEY, tokenSetzen } from './googleAuth.ts'
import { alsRohMail, gmailDienst, NichtAngemeldet } from './gmail.ts'

const jetzt = Date.UTC(2026, 9, 7, 9)
const hash = (extra: Record<string, string>) => `#${new URLSearchParams({ state: 'abc', scope: GMAIL_SCOPE, expires_in: '3599', access_token: 'tok', token_type: 'Bearer', ...extra }).toString()}`

describe('Google-Anmeldung (nur lesen)', () => {
  afterEach(() => tokenSetzen(null))

  it('baut die Anmeldeadresse nur mit Leseberechtigung und Rücksprung zur App', () => {
    const url = new URL(anmeldeUrl('client-1', 'http://localhost:5173/', 'abc'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: 'client-1', redirect_uri: 'http://localhost:5173/', response_type: 'token', scope: GMAIL_SCOPE, state: 'abc' })
  })

  it('merkt sich einen zufälligen State und leitet weiter', () => {
    const assign = vi.fn()
    const speicher = { setItem: vi.fn() }
    anmeldungStarten({ origin: 'http://localhost:5173', assign }, speicher, 'client-1')
    const state = speicher.setItem.mock.calls[0]![1] as string
    expect(speicher.setItem).toHaveBeenCalledWith(STATE_KEY, expect.stringMatching(/^[0-9a-f]{48}$/))
    expect(new URL(assign.mock.calls[0]![0] as string).searchParams.get('state')).toBe(state)
    expect(() => anmeldungStarten({ origin: 'x', assign }, speicher, undefined)).toThrow()
  })

  it('wertet den Rücksprung aus und prüft State und Berechtigung', () => {
    expect(rueckkehrAuswerten('', 'abc', jetzt)).toBeNull()
    expect(rueckkehrAuswerten('#wiederherstellen=x', 'abc', jetzt)).toBeNull()
    expect(rueckkehrAuswerten(hash({}), 'abc', jetzt)).toEqual({ art: 'verbunden', token: { wert: 'tok', gueltigBis: jetzt + 3539_000 } })
    expect(rueckkehrAuswerten(hash({}), 'anders', jetzt)).toMatchObject({ art: 'fehler' })
    expect(rueckkehrAuswerten(hash({}), null, jetzt)).toMatchObject({ art: 'fehler' })
    expect(rueckkehrAuswerten(hash({ scope: 'email' }), 'abc', jetzt)).toMatchObject({ art: 'fehler', grund: expect.stringContaining('nicht erteilt') })
    expect(rueckkehrAuswerten('#error=access_denied&state=abc', 'abc', jetzt)).toEqual({ art: 'fehler', grund: 'Du hast den Zugriff bei Google abgelehnt.' })
  })

  it('übernimmt den Token nur in den Arbeitsspeicher und entfernt ihn aus der Adresse', () => {
    const speicher = new Map([[STATE_KEY, 'abc']])
    const storage = { getItem: (k: string) => speicher.get(k) ?? null, removeItem: (k: string) => speicher.delete(k) } as unknown as Storage
    const replaceState = vi.fn()
    rueckkehrVerarbeiten({ hash: hash({}), pathname: '/', search: '' } as Location, { replaceState } as unknown as History, storage, jetzt)
    expect(replaceState).toHaveBeenCalledWith(null, '', '/')
    expect(speicher.has(STATE_KEY)).toBe(false)
    expect(aktuellerToken(jetzt)).toBe('tok')
    expect(aktuellerToken(jetzt + 3600_000)).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('sendet ohne Anmeldung nichts', async () => {
    const f = vi.spyOn(globalThis, 'fetch')
    await expect(gmailDienst.suchen('from:x', 5)).rejects.toBeInstanceOf(NichtAngemeldet)
    await gmailDienst.trennen()
    expect(f).not.toHaveBeenCalled()
    f.mockRestore()
  })

  it('fragt mit Token nur Kopfzeilen ab und widerruft beim Trennen', async () => {
    tokenSetzen({ wert: 'tok', gueltigBis: Date.now() + 60_000 })
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'm1', threadId: 't1', internalDate: String(jetzt), snippet: 'Danke &amp; bis bald', labelIds: ['INBOX'], payload: { headers: [{ name: 'From', value: 'Kim <kim@example.org>' }, { name: 'Subject', value: 'Ihre Bewerbung' }, { name: 'To', value: 'ich@example.org, b@example.org' }] } })))
    const mail = await gmailDienst.holen('m1')
    const [url, init] = f.mock.calls[0]!
    expect(String(url)).toMatch(/^https:\/\/gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages\/m1\?format=metadata&metadataHeaders=From/)
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', headers: { Authorization: 'Bearer tok' } })
    expect(mail).toEqual({ id: 'm1', threadId: 't1', zeitpunkt: new Date(jetzt).toISOString(), von: 'Kim <kim@example.org>', an: ['ich@example.org', 'b@example.org'], betreff: 'Ihre Bewerbung', auszug: 'Danke & bis bald', labels: ['INBOX'] })

    await gmailDienst.trennen()
    expect(String(f.mock.calls[1]![0])).toBe('https://oauth2.googleapis.com/revoke')
    expect(aktuellerToken()).toBeNull()
    f.mockRestore()
  })

  it('vergisst den Token, wenn Google ihn nicht mehr annimmt', async () => {
    tokenSetzen({ wert: 'tok', gueltigBis: Date.now() + 60_000 })
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }))
    await expect(gmailDienst.profil()).rejects.toBeInstanceOf(NichtAngemeldet)
    expect(aktuellerToken()).toBeNull()
    f.mockRestore()
  })

  it('übernimmt Auszüge als reinen Text', () => {
    expect(alsRohMail({ id: 'x', threadId: 'y', snippet: '&lt;b&gt;fett&lt;/b&gt; &#39;x&#39;' }).auszug).toBe("<b>fett</b> 'x'")
  })
})
