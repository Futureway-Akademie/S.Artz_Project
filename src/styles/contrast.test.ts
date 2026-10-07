import tokensCss from './tokens.css?raw'
import { contrastRatio, parseColorTokens } from './contrast.ts'

const t = parseColorTokens(tokensCss)

function color(name: string): string {
  const value = t[name]
  if (!value) throw new Error(`Token --${name} fehlt`)
  return value
}

describe('Design-Tokens', () => {
  it('enthalten die Markenfarben unverändert', () => {
    expect(color('color-blue')).toBe('#2f5cff')
    expect(color('color-dark')).toBe('#0a0a0b')
    expect(color('color-gray')).toBe('#4e525c')
  })

  it('berechnet Kontraste korrekt', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })
})

// [Vordergrund, Hintergrund, Mindestkontrast, Verwendung]
const pairs: Array<[string, string, number, string]> = [
  // Fließtext (4,5:1)
  ['color-dark', 'color-white', 4.5, 'Text auf Weiß'],
  ['color-dark', 'color-surface', 4.5, 'Text auf Arbeitsfläche'],
  ['color-gray', 'color-white', 4.5, 'gedämpfter Text auf Weiß'],
  ['color-gray', 'color-surface', 4.5, 'gedämpfter Text auf Arbeitsfläche'],
  ['color-white', 'color-dark', 4.5, 'Text auf Dunkel'],
  ['color-gray-on-dark', 'color-dark', 4.5, 'gedämpfter Text auf Dunkel'],
  ['color-gray-on-dark', 'color-dark-raised', 4.5, 'gedämpfter Text auf dunkler Fläche'],
  ['color-blue', 'color-white', 4.5, 'Blau als Text auf Weiß'],
  ['color-blue-strong', 'color-white', 4.5, 'Links auf Weiß'],
  ['color-blue-strong', 'color-surface', 4.5, 'Links auf Arbeitsfläche'],
  ['color-white', 'color-blue', 4.5, 'Primär-Button'],
  ['color-white', 'color-blue-strong', 4.5, 'Primär-Button (Hover)'],
  ['color-white', 'color-danger', 4.5, 'Gefahr-Button'],
  ['color-white', 'color-danger-strong', 4.5, 'Gefahr-Button (Hover)'],
  ['color-blue-strong', 'color-blue-soft', 4.5, 'Badge Blau'],
  ['color-success', 'color-success-soft', 4.5, 'Badge Erfolg'],
  ['color-warning', 'color-warning-soft', 4.5, 'Badge Warnung'],
  ['color-danger', 'color-danger-soft', 4.5, 'Badge Gefahr'],
  ['color-danger', 'color-white', 4.5, 'Fehlertext'],
  ['color-gray', 'color-surface', 4.5, 'Badge Neutral'],
  // Große Schrift und Bedienelemente (3:1)
  ['color-blue', 'color-dark', 3, 'Blau auf Dunkel (nur groß / Bedienelement)'],
  ['color-border-strong', 'color-white', 3, 'Rahmen von Eingabefeldern'],
  ['color-blue', 'color-surface', 3, 'Fokusring auf Arbeitsfläche'],
]

describe('Kontrast (WCAG AA)', () => {
  it.each(pairs)('%s auf %s ≥ %s:1 (%s)', (fg, bg, min) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(min)
  })
})
