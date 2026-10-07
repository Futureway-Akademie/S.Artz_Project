import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { Dialog } from './Dialog.tsx'

interface ConfirmDialogProps {
  offen: boolean
  titel: string
  children: ReactNode
  bestaetigenLabel: string
  gefahr?: boolean
  onBestaetigen: () => void
  onAbbrechen: () => void
}

/** Rückfrage vor folgenreichen Aktionen wie Löschen oder Zurücksetzen. */
export function ConfirmDialog({ offen, titel, children, bestaetigenLabel, gefahr = false, onBestaetigen, onAbbrechen }: ConfirmDialogProps) {
  return (
    <Dialog
      offen={offen}
      titel={titel}
      onSchliessen={onAbbrechen}
      breite="sm"
      aktionen={
        <>
          <Button variant="secondary" onClick={onAbbrechen}>
            Abbrechen
          </Button>
          <Button variant={gefahr ? 'danger' : 'primary'} onClick={onBestaetigen}>
            {bestaetigenLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
