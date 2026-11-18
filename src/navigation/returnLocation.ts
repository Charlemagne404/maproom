export interface ReturnDestination {
  path: string
  label: string
}

export function getReturnDestination(state: unknown, fallback = '/explore'): ReturnDestination {
  const from = state && typeof state === 'object' && 'from' in state ? state.from : undefined
  const path = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
    ? from
    : fallback
  const pathname = path.split(/[?#]/, 1)[0]
  const label = pathname === '/'
    ? 'Back to Daily'
    : pathname === '/explore'
      ? 'Back to Explore'
      : 'All games'
  return { path, label }
}
