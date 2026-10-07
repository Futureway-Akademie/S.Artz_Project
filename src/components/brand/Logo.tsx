import { useState } from 'react'
import styles from './Logo.module.css'
import { LOGO_ASSETS, logoSrc, type LogoVariant } from './logoAssets.ts'

interface LogoProps {
  variant?: LogoVariant
  /** Höhe in Pixeln; die Breite folgt dem Seitenverhältnis. */
  height?: number
  /** Leer lassen, wenn das Logo rein dekorativ ist. */
  alt?: string
}

/**
 * Zeigt ein Logo-Asset unverzerrt. Lädt es nicht, erscheint ein dezenter Platzhalter.
 * Die PNGs haben einen weißen Hintergrund und gehören nur auf helle Flächen.
 */
export function Logo({ variant = 'bildmarke', height = 48, alt = 'PIKARTZ' }: LogoProps) {
  const [failed, setFailed] = useState(false)
  const asset = LOGO_ASSETS[variant]
  const width = Math.round((height * asset.width) / asset.height)

  if (failed) {
    return (
      <span
        className={styles.placeholder}
        style={{ width, height }}
        role={alt ? 'img' : undefined}
        aria-label={alt ? `${alt} (Logo nicht verfügbar)` : undefined}
        aria-hidden={alt ? undefined : true}
        data-testid="logo-placeholder"
      >
        {height >= 32 && <span className={styles.placeholderText}>Logo</span>}
      </span>
    )
  }

  return (
    <img
      className={styles.logo}
      src={logoSrc(variant)}
      width={width}
      height={height}
      alt={alt}
      onError={() => setFailed(true)}
    />
  )
}
