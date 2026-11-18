import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AppDataProvider } from './app/AppData'
import { Shell } from './components/Shell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { getGame } from './games/catalog'
import { DailyPage } from './pages/DailyPage'
import { ExplorePage } from './pages/ExplorePage'
import { StatisticsPage } from './pages/StatisticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { InformationPage } from './pages/InformationPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteMetadata } from './seo/RouteMetadata'

export default function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <RouteMetadata />
        <ErrorBoundary>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<DailyPage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="games/:gameId" element={<GameRoute />} />
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="about" element={<InformationPage page="about" />} />
              <Route path="data" element={<InformationPage page="data" />} />
              <Route path="privacy" element={<InformationPage page="privacy" />} />
              <Route path="404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AppDataProvider>
  )
}

function GameRoute() {
  const { gameId } = useParams()
  return getGame(gameId) ? null : <NotFoundPage />
}
