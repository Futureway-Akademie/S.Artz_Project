/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { CONTENT_SECURITY_POLICY } from '../../csp.config.ts'

/** Installierbar als App und offline startbar – ohne fremde Verbindungen. */
describe('PWA', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
    name: string
    start_url: string
    display: string
    lang: string
    icons: Array<{ src: string; sizes: string; purpose?: string }>
  }

  it('hat ein vollständiges Manifest mit vorhandenen Icons', () => {
    expect(manifest).toMatchObject({ name: 'PIKARTZ.AI Arbeitscockpit', start_url: '/', display: 'standalone', lang: 'de' })
    expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)
    for (const icon of manifest.icons) expect(existsSync(`public${icon.src}`)).toBe(true)
    const html = readFileSync('index.html', 'utf8')
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />')
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />')
  })

  it('der Service Worker speichert nur eigene Dateien und lässt fremde Anfragen unberührt', () => {
    const sw = readFileSync('public/sw.js', 'utf8')
    expect(sw).toContain("if (anfrage.method !== 'GET' || url.origin !== self.location.origin) return")
    expect(sw).not.toMatch(/https?:\/\//)
    expect(sw).not.toMatch(/localStorage|indexedDB/)
  })

  it('die CSP erlaubt nur den eigenen Service Worker und das eigene Manifest', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("worker-src 'self'")
    expect(CONTENT_SECURITY_POLICY).toContain("manifest-src 'self'")
    expect(readFileSync('src/main.tsx', 'utf8')).toContain("if (import.meta.env.PROD && 'serviceWorker' in navigator)")
  })
})
