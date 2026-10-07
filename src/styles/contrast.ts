// WCAG-2.x-Kontrast für Hex-Farben (#rrggbb).

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) throw new Error(`Ungültige Farbe: ${hex}`)
  const [r, g, b] = match.slice(1).map((part) => channel(parseInt(part, 16))) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

/** Liest alle `--color-*: #hex`-Tokens aus einem CSS-Text. */
export function parseColorTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const match of css.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    tokens[match[1]!] = match[2]!.toLowerCase()
  }
  return tokens
}
