/** Nur http(s)-Adressen gelten als Link; alles andere (z. B. „javascript:“ aus einem Import) nicht. */
export function istWebadresse(url: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(url.trim())
}
