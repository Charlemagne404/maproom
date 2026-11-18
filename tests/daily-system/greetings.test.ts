import { describe, expect, it } from 'vitest'
import { getDailyGreeting, getDailyGreetingCount } from '../../src/daily/greetings'
import { DAILY_SCHEDULE_EPOCH } from '../../src/daily/schedule'

describe('date-seeded Daily greetings', () => {
  it('offers a varied, stable pool across a full year', () => {
    const epoch = Date.parse(`${DAILY_SCHEDULE_EPOCH}T12:00:00.000Z`)
    const greetings = Array.from({ length: 3650 }, (_, index) => {
      const date = new Date(epoch + index * 86_400_000).toISOString().slice(0, 10)
      expect(getDailyGreeting(date)).toBe(getDailyGreeting(date))
      return getDailyGreeting(date)
    })

    expect(getDailyGreetingCount()).toBe(28)
    expect(new Set(greetings).size).toBe(getDailyGreetingCount())
  })
})
