import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Radio } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import { useAuthStore } from '../../store/useAuthStore'
import type { MatchSummary } from '../../lib/types'
import { Card, EmptyState, ErrorState, Spinner, StatusBadge, TeamBadge } from '../../components/ui'

function MatchCard({ m }: { m: MatchSummary }) {
  return (
    <Link to={`/match/${m.id}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
      <Card className="p-4 transition hover:border-brand hover:shadow-md">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="truncate">{m.tournamentName}</span><StatusBadge status={m.status} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2"><TeamBadge team={{ name: m.homeTeamName, shortName: m.homeShortName, logoUrl: null, primaryColor: null }} /><span className="truncate font-bold text-slate-900">{m.homeShortName}</span></div>
          <span className="text-xs font-semibold text-slate-400">vs</span>
          <div className="flex min-w-0 items-center gap-2"><span className="truncate font-bold text-slate-900">{m.awayShortName}</span><TeamBadge team={{ name: m.awayTeamName, shortName: m.awayShortName, logoUrl: null, primaryColor: null }} /></div>
        </div>
        <p className="mt-3 truncate text-sm text-slate-600">{m.resultText ?? `${m.venueName} • ${formatDateTime(m.scheduledStart)}`}</p>
      </Card>
    </Link>
  )
}

function Section({ title, status, empty }: { title: string; status: 'live' | 'completed'; empty: string }) {
  const q = useQuery({ queryKey: ['public-matches', status], queryFn: () => api.get<MatchSummary[]>(`/api/public/matches?status=${status}`), refetchInterval: status === 'live' ? 15_000 : false })
  return (
    <section aria-labelledby={`h-${status}`} className="mb-8">
      <h2 id={`h-${status}`} className="mb-3 text-lg font-bold text-slate-900">{title}</h2>
      {q.isPending && <Spinner />}
      {q.isError && <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />}
      {q.data && q.data.length === 0 && <Card><EmptyState title={empty} /></Card>}
      {q.data && q.data.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{q.data.map((m) => <MatchCard key={m.id} m={m} />)}</div>}
    </section>
  )
}

export default function PublicHome() {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="min-h-full bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-5">
          <div className="flex items-center gap-2"><Radio className="size-6 text-emerald-400" aria-hidden /><span className="font-display text-2xl font-semibold tracking-wide">CRICKET STREAM</span></div>
          <Link to={user ? '/admin' : '/login'} className="text-xs font-medium text-slate-400 hover:text-white">{user ? 'Open admin' : 'Staff sign in'}</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Section title="Live now" status="live" empty="No match is live right now." />
        <Section title="Recent results" status="completed" empty="No completed matches yet." />
      </main>
    </div>
  )
}
