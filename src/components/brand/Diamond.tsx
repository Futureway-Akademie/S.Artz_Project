interface DiamondProps {
  size?: number
  className?: string
}

/** Diamantmotiv als Linienzeichnung. Nur sparsam einsetzen (Cockpit- und PIKARTZ.AI-Kopf). */
export function Diamond({ size = 24, className }: DiamondProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3 4 12l8 9 8-9-8-9Z" />
      <path d="M4 12h16M8.5 12 12 3l3.5 9L12 21l-3.5-9Z" />
    </svg>
  )
}
