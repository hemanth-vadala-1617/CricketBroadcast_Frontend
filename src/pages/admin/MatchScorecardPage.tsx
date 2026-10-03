import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Radio, SlidersHorizontal } from 'lucide-react'
import { useLiveMatch } from '../../hooks/useLiveMatch'
import { Badge, Spinner, StatusBadge } from '../../components/ui'
import MatchScorecard from '../../components/MatchScorecard'
import { SCORING, useAuthStore } from '../../store/useAuthStore'
import { publicUrl } from '../../lib/overlayUrl'

// Admin view of a match's scorecard, laid out like a live scorecard page and updated live over the socket.
export default function MatchScorecardPage() {
  const { matchId } = useParams()
  const { state, status } = useLiveMatch(matchId)
  const canScore = useAuthStore((s) => s.hasRole(...SCORING))

  if (!matchId) return null
  if (!state) {
    return (
      <div>
        <Link to="/admin/matches" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft className="size-4" aria-hidden />Matches</Link>
        <Spinner label={status === 'notfound' ? 'Match not found. Open it from the Matches list.' : 'Loading scorecard…'} />
      </div>
    )
  }

  const link = 'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand hover:bg-emerald-50'
  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/matches" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft className="size-4" aria-hidden />Matches</Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{state.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <StatusBadge status={state.status} />{`${state.tournamentName} · ${state.venueName}`}
            <Badge tone={status === 'live' ? 'green' : 'amber'}>{status === 'live' ? 'Live updates' : `Socket ${status}`}</Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {canScore && <Link to={`/scorer/${matchId}`} className={link}><Radio className="size-4" aria-hidden />Score</Link>}
          <Link to={`/admin/matches/${matchId}`} className={link}><SlidersHorizontal className="size-4" aria-hidden />Match page</Link>
          <a href={publicUrl(matchId)} target="_blank" rel="noreferrer" className={link}><ExternalLink className="size-4" aria-hidden />Public page</a>
        </div>
      </div>
      <MatchScorecard state={state} />
    </div>
  )
}
