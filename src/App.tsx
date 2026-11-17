import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppDataProvider } from './app/AppData'
import { Shell } from './components/Shell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DailyPage } from './pages/DailyPage'
import { ExplorePage } from './pages/ExplorePage'
import { GamePage } from './pages/GamePage'
import { StatisticsPage } from './pages/StatisticsPage'
import { SettingsPage } from './pages/SettingsPage'
import { InformationPage } from './pages/InformationPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <AppDataProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<DailyPage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="games/:gameId" element={<GamePage />} />
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
