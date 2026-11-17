import type { UserSettings } from './geography/types'

export type ThemePreference = UserSettings['theme']

export function applyThemePreference(preference: ThemePreference): void {
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = preference === 'system' ? (isSystemDark ? 'dark' : 'light') : preference
  const root = document.documentElement
  root.dataset.themePreference = preference
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#292521' : '#f5eee5')
}
