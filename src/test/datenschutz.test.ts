/// <reference types="node" />
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { StartDaten } from '../data/seed.ts'

/**
 * Wächter: Persönliche Begriffe aus der lokalen Datei `src/data/seed.privat.ts` dürfen in keiner
 * versionierten Datei stehen. Die Begriffe selbst stehen nur in der lokalen Datei, nie hier.
 * Ohne lokale Datei (z. B. auf einem anderen Rechner) wird der Test übersprungen.
 */
const privat = Object.values(
  import.meta.glob<{ STARTDATEN: StartDaten; PRIVATE_BEGRIFFE?: string[] }>('../data/seed.privat.ts', { eager: true }),
)[0]

function privateBegriffe(): string[] {
  if (!privat) return []
  const { STARTDATEN: start, PRIVATE_BEGRIFFE: extra = [] } = privat
  return [
    ...extra,
    ...start.projekte.map((q) => q.projekt.titel),
    ...start.kurse.flatMap((k) => [k.titel, k.anbieter, k.codePraefix]),
    ...start.zielrollen,
  ].filter((b) => b.trim().length >= 4)
}

function versionierteDateien(): string[] {
  const ausgabe = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  return ausgabe
    .split('\n')
    .filter((f) => f && !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf)$/i.test(f))
}

describe('Datenschutz im Repository', () => {
  it.runIf(privat)('enthält keine persönlichen Begriffe in versionierten Dateien', () => {
    const begriffe = privateBegriffe().map((b) => b.toLowerCase())
    const funde: string[] = []
    for (const datei of versionierteDateien()) {
      let inhalt: string
      try {
        inhalt = readFileSync(datei, 'utf8').toLowerCase()
      } catch {
        continue // gelöscht, aber noch im Index
      }
      begriffe.forEach((b, i) => {
        if (inhalt.includes(b)) funde.push(`${datei}: Begriff Nr. ${i + 1}`)
      })
    }
    expect(funde).toEqual([])
  })

  it('die lokale Datei ist von Git ausgeschlossen', () => {
    expect(execSync('git check-ignore src/data/seed.privat.ts', { encoding: 'utf8' }).trim()).toBe('src/data/seed.privat.ts')
  })
})
