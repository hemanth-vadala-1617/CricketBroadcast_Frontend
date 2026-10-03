import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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
const MatchSetupPage = lazy(() => import('./pages/admin/MatchSetupPage'))
const TeamsPage = lazy(() => import('./pages/admin/TeamsPage'))
const PlayersPage = lazy(() => import('./pages/admin/PlayersPage'))
const VenuesPage = lazy(() => import('./pages/admin/VenuesPage'))
const TournamentsPage = lazy(() => import('./pages/admin/TournamentsPage'))
const RulesPage = lazy(() => import('./pages/admin/RulesPage'))
const ThemesPage = lazy(() => import('./pages/admin/ThemesPage'))

export default function App() {
  return (
    <BrowserRouter>
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
