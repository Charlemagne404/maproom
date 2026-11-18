import { createContext, useContext } from 'react'
export interface FreePlaySetupState {
  setup: boolean
  format: string | null
  settingsTarget: HTMLDivElement | null
  onExperienceReady?: () => void
}

export const FreePlaySetupContext = createContext<FreePlaySetupState>({
  setup: false,
  format: null,
  settingsTarget: null,
})

export function useFreePlayFormat(): string | null {
  return useContext(FreePlaySetupContext).format
}
