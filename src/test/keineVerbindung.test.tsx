/// <reference types="node" />
import { render, screen } from '@testing-library/react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { CONTENT_SECURITY_POLICY, contentSecurityPolicy, GMAIL_ZIELE } from '../../csp.config.ts'
import { ExternerLink } from '../components/ui/ExternerLink.tsx'
import { istWebadresse } from '../domain/url.ts'

/** Belegt, dass die App keine Daten nach außen sendet und nichts von fremden Servern lädt. */
const quellen = execSync('git ls-files --cached --others --exclude-standard src', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx|css)$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.startsWith('src/test/'))

/** Einziges Modul mit fetch: Gmail nur lesend, nur mit Token */
const GMAIL_MODUL = 'src/data/gmail/gmail.ts'

describe('Keine Verbindung nach außen', () => {
  it('die Content-Security-Policy erlaubt keine fremden Server und keine Verbindungen', () => {
    const regeln = Object.fromEntries(CONTENT_SECURITY_POLICY.split('; ').map((r) => [r.split(' ')[0], r.split(' ').slice(1)]))
    expect(regeln['default-src']).toEqual(["'self'"])
    expect(regeln['script-src']).toEqual(["'self'"])
    expect(regeln['connect-src']).toEqual(["'none'"])
    expect(regeln['form-action']).toEqual(["'none'"])
    expect(CONTENT_SECURITY_POLICY).not.toMatch(/https?:|\*/)
  })

  it('der Build schreibt die Richtlinie in index.html, die Seite sendet keinen Referrer', () => {
    expect(readFileSync('vite.config.ts', 'utf8')).toMatch(/Content-Security-Policy[\s\S]*contentSecurityPolicy\(env\.VITE_SUPABASE_URL/)
    expect(readFileSync('index.html', 'utf8')).toContain('<meta name="referrer" content="no-referrer" />')
  })

  it('mit Supabase erlaubt die Richtlinie genau die eigene https-Adresse, sonst nichts', () => {
    const mit = contentSecurityPolicy('https://abcdefgh.supabase.co')
    expect(mit).toContain('connect-src https://abcdefgh.supabase.co;')
    expect(mit.match(/https:/g)).toHaveLength(1)
    expect(() => contentSecurityPolicy('http://abcdefgh.supabase.co')).toThrow()
    expect(() => contentSecurityPolicy('https://*.supabase.co')).toThrow()
  })

  it('mit Gmail kommen genau die Gmail-API und der Token-Widerruf hinzu', () => {
    expect(contentSecurityPolicy(undefined, { gmail: true })).toContain('connect-src https://gmail.googleapis.com https://oauth2.googleapis.com https://www.googleapis.com;')
    expect(contentSecurityPolicy(undefined, { gmail: false })).toContain("connect-src 'none';")
    expect(GMAIL_ZIELE).toEqual(['https://gmail.googleapis.com', 'https://oauth2.googleapis.com', 'https://www.googleapis.com'])
    expect(readFileSync('vite.config.ts', 'utf8')).toContain('{ gmail: Boolean(env.VITE_GOOGLE_CLIENT_ID) }')
  })

  it('nur das Supabase-Modul darf Netzwerkcode laden, und ohne Konfiguration ist es abgeschaltet', () => {
    const mitSupabase = quellen.filter((d) => /from '@supabase\//.test(readFileSync(d, 'utf8')))
    expect(mitSupabase).toEqual(['src/data/cloud/supabase.ts'])
    const modul = readFileSync('src/data/cloud/supabase.ts', 'utf8')
    expect(modul).toContain('konfiguriert: () => Boolean(URL_ && KEY)')
  })

  it('der Quellcode nutzt keine Netzwerkzugriffe und lädt nichts von fremden Adressen – außer dem Gmail-Modul', () => {
    expect(quellen.length).toBeGreaterThan(50)
    const funde = quellen.filter((d) => d !== GMAIL_MODUL).flatMap((datei) => {
      const text = readFileSync(datei, 'utf8')
      const treffer = [
        /\bfetch\s*\(/,
        /XMLHttpRequest/,
        /WebSocket/,
        /sendBeacon/,
        /EventSource/,
        /import\s*\(\s*['"]https?:/,
        /url\(\s*['"]?https?:/,
        /from\s+['"]https?:/,
      ].filter((m) => m.test(text))
      return treffer.map((m) => `${datei}: ${m}`)
    })
    expect(funde).toEqual([])
  })

  it('das Gmail-Modul spricht nur Google an, nur lesend und nie ohne Anmeldung', () => {
    const modul = readFileSync(GMAIL_MODUL, 'utf8')
    const adressen = [...modul.matchAll(/'(https:\/\/[^'/]+)/g)].map((m) => m[1])
    expect([...new Set(adressen)].sort()).toEqual([...GMAIL_ZIELE].sort())
    expect(modul).toContain('const t = aktuellerToken(Date.now(), scope)\n  if (!t) throw new NichtAngemeldet()')
    expect(modul).not.toMatch(/method: '(PUT|PATCH|DELETE)'/)
    expect(modul.match(/method: 'POST'/g)).toHaveLength(1) // nur der Widerruf
    const auth = readFileSync('src/data/gmail/googleAuth.ts', 'utf8')
    expect(auth).toContain("export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'")
    expect(auth).toContain("export const KALENDER_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'")
    expect(auth).toContain('export const GOOGLE_SCOPES = [GMAIL_SCOPE, KALENDER_SCOPE]')
  })

  it('externe Links öffnen ohne Referrer und ohne Opener; andere Schemata sind kein Link', () => {
    render(
      <>
        <ExternerLink href="https://example.org">Seite</ExternerLink>
        <ExternerLink href="javascript:alert(1)">Gefährlich</ExternerLink>
      </>,
    )
    const link = screen.getByRole('link', { name: 'Seite' })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(screen.queryByRole('link', { name: 'Gefährlich' })).toBeNull()
    expect(istWebadresse('data:text/html,x')).toBe(false)
  })

  it('kein Link im Quellcode öffnet einen neuen Tab ohne die Schutzkomponente', () => {
    const ohneSchutz = quellen.filter((d) => d.endsWith('.tsx') && !d.endsWith('ExternerLink.tsx') && /target="_blank"/.test(readFileSync(d, 'utf8')))
    expect(ohneSchutz).toEqual([])
  })
})
