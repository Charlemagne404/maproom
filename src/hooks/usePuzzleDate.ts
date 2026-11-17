import { useEffect, useState } from 'react'
import { dateInTimeZone } from '../puzzles/engine'

export function usePuzzleDate(timeZone: string): string | null {
  const [date, setDate] = useState<string | null>(null)

  useEffect(() => {
    const update = () => setDate(dateInTimeZone(new Date(), timeZone))
    update()
    const timer = window.setInterval(update, 30_000)
    return () => window.clearInterval(timer)
  }, [timeZone])

  return date
}

export function formatPuzzleDate(date: string, timeZone: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(Date.UTC(year, month - 1, day, 12))
}
