/// <reference types="node" />
import { render, screen } from '@testing-library/react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { CONTENT_SECURITY_POLICY } from '../../csp.config.ts'
import { ExternerLink } from '../components/ui/ExternerLink.tsx'
import { istWebadresse } from '../domain/url.ts'

/** Belegt, dass die App keine Daten nach außen sendet und nichts von fremden Servern lädt. */
const quellen = execSync('git ls-files --cached --others --exclude-standard src', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx|css)$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.startsWith('src/test/'))

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
    expect(readFileSync('vite.config.ts', 'utf8')).toMatch(/Content-Security-Policy[\s\S]*CONTENT_SECURITY_POLICY/)
    expect(readFileSync('index.html', 'utf8')).toContain('<meta name="referrer" content="no-referrer" />')
  })

  it('der Quellcode nutzt keine Netzwerkzugriffe und lädt nichts von fremden Adressen', () => {
    expect(quellen.length).toBeGreaterThan(50)
    const funde = quellen.flatMap((datei) => {
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
