import { LoadingState } from '../../components/Kit'
import type { GameMode } from '../../geography/types'
import { useAppData } from '../../app/useAppData'
import { useGameSession } from '../session'
import { HistoricalGeographyLegacyGame } from './HistoricalGeographyGame'
import { HistoricalAtlasGame } from './HistoricalAtlasGame'

export function HistoricalGeographyEntry({ mode, date, seed }: { mode: GameMode; date: string; seed: string }) {
  const { ready } = useAppData()
  const session = useGameSession('historical-geography', mode, date, seed)

  if (!ready) return <div className="game-body historical-geography-game"><LoadingState label="Restoring your saved map…" /></div>
  if (isLegacyHistoricalProgress(session.progress)) {
    return <HistoricalGeographyLegacyGame mode={mode} seed={seed} session={session} />
  }
  return <HistoricalAtlasGame mode={mode} seed={seed} session={session} />
}

function isLegacyHistoricalProgress(progress: Record<string, unknown> | null): boolean {
  return progress?.version === 1
}
