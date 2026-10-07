import { useEffect, useState } from 'react'

/** Aktuelles Gerätedatum; aktualisiert sich jede Minute (z. B. über Mitternacht). */
export function useNow(intervallMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervallMs)
    return () => window.clearInterval(timer)
  }, [intervallMs])
  return now
}
