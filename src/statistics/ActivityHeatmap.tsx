import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { shiftDate, summarizeActivityWindow } from './summary'

interface ActivityHeatmapProps {
  activity: Map<string, number>
  today: string
}

interface CalendarDay {
  date: string
  count: number
}

export function ActivityHeatmap({ activity, today }: ActivityHeatmapProps) {
  const weeks = useMemo(() => buildWeeks(activity, today), [activity, today])
  const [selectedDate, setSelectedDate] = useState(today)
  const cellRefs = useRef(new Map<string, HTMLButtonElement>())
  const selectedCount = activity.get(selectedDate) ?? 0
  const selectedLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${selectedDate}T12:00:00Z`))
  const { completed: total } = summarizeActivityWindow(activity, today)

  function focusDate(date: string) {
    if (date > today || !cellRefs.current.has(date)) return
    setSelectedDate(date)
    requestAnimationFrame(() => cellRefs.current.get(date)?.focus())
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: string) {
    const movement: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }
    const offset = movement[event.key]
    if (offset === undefined) return
    event.preventDefault()
    focusDate(shiftDate(date, offset))
  }

  return (
    <div className="activity-heatmap">
      <div className="activity-calendar-scroll" tabIndex={0} role="region" aria-label="Scrollable activity calendar">
        <div className="activity-calendar" role="group" aria-label="Completed games by day over the past year. Weeks start on Sunday.">
          <div className="activity-weekday-spacer" aria-hidden="true" />
          {weeks.map((week, weekIndex) => <div className="activity-week" key={weekIndex}>
            <span className="activity-month-label">{week.monthLabel}</span>
            <div className="activity-week-days">
              {week.days.map((day, weekday) => day ? (
                <button
                  key={day.date}
                  ref={(element) => { if (element) cellRefs.current.set(day.date, element); else cellRefs.current.delete(day.date) }}
                  className={`activity-cell activity-level-${intensity(day.count)}${day.date === selectedDate ? ' is-selected' : ''}`}
                  type="button"
                  aria-label={`${day.date}: ${day.count} ${day.count === 1 ? 'puzzle' : 'puzzles'} completed`}
                  aria-pressed={day.date === selectedDate}
                  title={`${day.date} · ${day.count} ${day.count === 1 ? 'puzzle' : 'puzzles'} completed`}
                  tabIndex={day.date === selectedDate ? 0 : -1}
                  onClick={() => setSelectedDate(day.date)}
                  onKeyDown={(event) => handleKeyDown(event, day.date)}
                  data-weekday={weekday}
                />
              ) : <span key={`empty-${weekday}`} className="activity-cell activity-cell-empty" aria-hidden="true" />)}
            </div>
          </div>)}
          <div className="activity-weekday-labels" aria-hidden="true">
            <span />
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
          </div>
        </div>
      </div>
      <div className="activity-calendar-footer">
        <p className="activity-day-detail" aria-live="polite"><strong>{selectedLabel}</strong><span>{selectedCount} {selectedCount === 1 ? 'puzzle' : 'puzzles'} completed</span></p>
        <div className="activity-legend" aria-label="Activity scale">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => <span aria-hidden="true" key={level} className={`activity-cell activity-level-${level}`} />)}
          <span>More</span>
        </div>
        <span className="activity-total">{total.toLocaleString()} completed in the past year</span>
      </div>
    </div>
  )
}

interface CalendarWeek {
  monthLabel: string
  days: Array<CalendarDay | null>
}

function buildWeeks(activity: Map<string, number>, today: string): CalendarWeek[] {
  let start = shiftDate(today, -363)
  const startWeekday = new Date(`${start}T12:00:00Z`).getUTCDay()
  start = shiftDate(start, -startWeekday)
  const weeks: CalendarWeek[] = []
  let week: CalendarWeek = { monthLabel: '', days: Array(7).fill(null) }
  let dayIndex = 0
  for (let date = start; date <= today; date = shiftDate(date, 1)) {
    if (dayIndex === 7) {
      weeks.push(week)
      week = { monthLabel: '', days: Array(7).fill(null) }
      dayIndex = 0
    }
    const [year, month, day] = date.split('-').map(Number)
    if (day === 1 || date === start) {
      week.monthLabel = new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day, 12)))
    }
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    week.days[weekday] = { date, count: activity.get(date) ?? 0 }
    dayIndex = weekday + 1
    if (dayIndex === 7 && date < today) {
      weeks.push(week)
      week = { monthLabel: '', days: Array(7).fill(null) }
      dayIndex = 0
    }
  }
  if (week.days.some(Boolean)) weeks.push(week)
  return weeks
}

function intensity(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}
