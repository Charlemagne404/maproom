import { createContext, useContext } from 'react'
import type { GameFormat } from '../games/catalog'

export interface FreePlaySetupState {
  setup: boolean
  format: string | null
  formats: GameFormat[]
  onFormatChange: (format: string) => void
  onStart: () => void
}

export const FreePlaySetupContext = createContext<FreePlaySetupState>({
  setup: false,
  format: null,
  formats: [],
  onFormatChange: () => undefined,
  onStart: () => undefined,
})

export function useFreePlayFormat(): string | null {
  return useContext(FreePlaySetupContext).format
}
