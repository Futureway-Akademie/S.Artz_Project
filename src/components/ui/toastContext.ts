import { createContext, useContext } from 'react'

export interface ToastValue {
  /** Kurze Bestätigung, z. B. „Projekt gespeichert“ */
  zeige: (text: string) => void
}

export const ToastContext = createContext<ToastValue>({ zeige: () => {} })

export function useToast(): ToastValue {
  return useContext(ToastContext)
}
