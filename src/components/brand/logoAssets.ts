/** Unveränderte Dateien aus public/brand/ mit ihren Originalmaßen. */
export const LOGO_ASSETS = {
  bildmarke: { file: 'Pikartz-Logo.png', width: 1500, height: 1500 },
  wortmarke: { file: 'PIKARTZ - in Text - Liberation Sans Bold.png', width: 1230, height: 233 },
} as const

export type LogoVariant = keyof typeof LOGO_ASSETS

export function logoSrc(variant: LogoVariant): string {
  return `${import.meta.env.BASE_URL}brand/${encodeURIComponent(LOGO_ASSETS[variant].file)}`
}
