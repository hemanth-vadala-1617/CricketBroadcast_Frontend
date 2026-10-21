import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { applyTheme, useTheme } from './store/useTheme'
import AppShell from './layouts/AppShell'
import RequireAuth from './components/RequireAuth'
import { Spinner, Toaster } from './components/ui'
import { ADMIN, GRAPHICS, SCORING, STAFF } from './store/useAuthStore'
import NotFound from './pages/NotFound'
import { RouteBoundary } from './components/ErrorBoundary'

// Every screen is lazy: the OBS overlay must not download the admin app, and vice versa.
const Login = lazy(() => import('./pages/Login'))
const PublicHome = lazy(() => import('./pages/public/PublicHome'))
const PublicMatch = lazy(() => import('./pages/public/PublicMatch'))
const OverlayPage = lazy(() => import('./pages/overlay/OverlayPage'))
const ScorerConsole = lazy(() => import('./pages/scorer/ScorerConsole'))
const ProducerConsole = lazy(() => import('./pages/producer/ProducerConsole'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const MatchesPage = lazy(() => import('./pages/admin/MatchesPage'))
const MatchHub = lazy(() => import('./pages/admin/MatchHub'))
const MatchScorecardPage = lazy(() => import('./pages/admin/MatchScorecardPage'))
const MatchSetupPage = lazy(() => import('./pages/admin/MatchSetupPage'))
const TeamsPage = lazy(() => import('./pages/admin/TeamsPage'))
const PlayersPage = lazy(() => import('./pages/admin/PlayersPage'))
const VenuesPage = lazy(() => import('./pages/admin/VenuesPage'))
const TournamentsPage = lazy(() => import('./pages/admin/TournamentsPage'))
const RulesPage = lazy(() => import('./pages/admin/RulesPage'))
const ThemesPage = lazy(() => import('./pages/admin/ThemesPage'))

/** Keeps <html class="dark"> in step with the chosen theme, the device setting (for "Auto") and the page (the OBS overlay is never dark). */
function ThemeApplier() {
  const mode = useTheme((s) => s.mode)
  const { pathname } = useLocation()
  useEffect(() => {
    applyTheme(mode, pathname)
    if (mode !== 'system' || typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system', pathname)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [mode, pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeApplier />
      <RouteBoundary>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PublicHome />} />
          <Route path="/match/:matchId" element={<PublicMatch />} />
          <Route path="/overlay/:matchId" element={<OverlayPage />} />

          <Route path="/scorer/:matchId" element={<RequireAuth roles={SCORING}><ScorerConsole /></RequireAuth>} />
          <Route path="/producer/:matchId" element={<RequireAuth roles={GRAPHICS}><ProducerConsole /></RequireAuth>} />

          <Route path="/admin" element={<RequireAuth roles={STAFF}><AppShell /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="matches" element={<MatchesPage />} />
            <Route path="matches/:matchId" element={<MatchHub />} />
            <Route path="matches/:matchId/scorecard" element={<MatchScorecardPage />} />
            <Route path="matches/:matchId/setup" element={<RequireAuth roles={SCORING}><MatchSetupPage /></RequireAuth>} />
            <Route path="teams" element={<TeamsPage />} />
            <Route path="players" element={<PlayersPage />} />
            <Route path="venues" element={<VenuesPage />} />
            <Route path="tournaments" element={<TournamentsPage />} />
            <Route path="rules" element={<RequireAuth roles={ADMIN}><RulesPage /></RequireAuth>} />
            <Route path="themes" element={<RequireAuth roles={ADMIN}><ThemesPage /></RequireAuth>} />
          </Route>

          <Route path="/scorer" element={<Navigate to="/admin/matches" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </RouteBoundary>
      <Toaster />
    </BrowserRouter>
  )
}
