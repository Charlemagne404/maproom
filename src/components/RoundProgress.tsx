export function RoundProgress({ current, total, label }: { current: number; total: number; label: string }) {
  const safeTotal = Math.max(1, total)
  const value = Math.max(0, Math.min(safeTotal, current))
  const segmentCount = Math.min(10, safeTotal)
  const completedSegments = Math.ceil(value / safeTotal * segmentCount)
  return (
    <div
      className="round-progress"
      role="progressbar"
      aria-label={`${label} progress`}
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${safeTotal} ${label}`}
      aria-live="polite"
      aria-atomic="true"
    >
      {Array.from({ length: segmentCount }, (_, index) => <span
        key={index}
        className={`round-progress-segment${index < completedSegments ? ' is-filled' : ''}${index === completedSegments - 1 ? ' is-current' : ''}`}
        aria-hidden="true"
      />)}
    </div>
  )
}
