/** Kopiert Text und meldet das Ergebnis; ohne Berechtigung bleibt der Hinweis zum Markieren. */
export async function inZwischenablage(text: string, zeige: (t: string) => void, erfolg = 'In die Zwischenablage kopiert') {
  try {
    await navigator.clipboard.writeText(text)
    zeige(erfolg)
  } catch {
    zeige('Kopieren nicht möglich – bitte von Hand markieren')
  }
}
