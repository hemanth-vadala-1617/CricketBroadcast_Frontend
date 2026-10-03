import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, EmptyState, ErrorState, PageHeader, Spinner, StatusBadge, TeamBadge } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import { overlayUrl } from '../../lib/overlayUrl'
import { formatDateTime } from '../../lib/utils'
import type { MatchStatus, MatchSummary } from '../../lib/types'
import { useMatches, usePlayers, useTeams, useTournaments } from '../../hooks/queries'

function Stat({ label, value, to }: { label: string; value: number | undefined; to: string }) {
  return (
    <Link to={to} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value ?? '…'}</div>
    </Link>
  )
}

function MatchRow({ m, actions }: { m: MatchSummary; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
      <div className="flex items-center gap-3">
        <TeamBadge team={{ name: m.homeTeamName, shortName: m.homeShortName, logoUrl: null, primaryColor: null }} size={28} />
        <TeamBadge team={{ name: m.awayTeamName, shortName: m.awayShortName, logoUrl: null, primaryColor: null }} size={28} />
        <div>
          <Link to={`/admin/matches/${m.id}`} className="font-semibold text-slate-900 hover:underline">{m.homeTeamName} vs {m.awayTeamName}</Link>
          <div className="text-xs text-slate-500">{m.tournamentName} · {m.scheduledStart ? formatDateTime(m.scheduledStart) : m.venueName}</div>
          {m.resultText && <div className="text-xs font-semibold text-purple-700">{m.resultText}</div>}
        </div>
      </div>
      <div className="flex items-center gap-2">{actions}<StatusBadge status={m.status as MatchStatus} /></div>
    </div>
  )
}

const quick = 'rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-emerald-50'

function Section({ title, query, empty, children }: { title: string; query: { isLoading: boolean; error: unknown; refetch: () => unknown; data: MatchSummary[] | undefined }; empty: string; children: (rows: MatchSummary[]) => ReactNode }) {
  const rows = query.data ?? []
  return (
    <Card>
      <h2 className="border-b border-slate-200 px-4 py-3 font-bold text-slate-900">{title}</h2>
      {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        : rows.length === 0 ? <EmptyState title={empty} /> : children(rows)}
    </Card>
  )
}

export default function Dashboard() {
  const teams = useTeams()
  const players = usePlayers()
  const tournaments = useTournaments()
  const all = useMatches()
  const live = useMatches({ status: 'live' })
  const upcoming = useMatches({ status: 'Scheduled' })
  const completed = useMatches({ status: 'Completed' })

  return (
    <>
      <PageHeader title="Dashboard" subtitle="What is on air, what is next, and what just finished." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tournaments" value={tournaments.data?.length} to="/admin/tournaments" />
        <Stat label="Teams" value={teams.data?.length} to="/admin/teams" />
        <Stat label="Players" value={players.data?.length} to="/admin/players" />
        <Stat label="Matches" value={all.data?.length} to="/admin/matches" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Section title="Live now" query={live} empty="No match is live right now.">
            {(rows) => rows.map((m) => (
              <MatchRow key={m.id} m={m} actions={<>
                <Link className={quick} to={`/scorer/${m.id}`}>Score</Link>
                <Link className={quick} to={`/producer/${m.id}`}>Producer</Link>
                <a className={quick} href={overlayUrl(m.id)} target="_blank" rel="noreferrer">Overlay</a>
                <Link className={quick} to={`/match/${m.id}`}>Public</Link>
              </>} />
            ))}
          </Section>
        </div>
        <Section title="Upcoming" query={upcoming} empty="Nothing scheduled.">
          {(rows) => rows.slice(0, 6).map((m) => <MatchRow key={m.id} m={m} actions={<Link className={quick} to={`/admin/matches/${m.id}/setup`}>Set up</Link>} />)}
        </Section>
        <Section title="Recently completed" query={completed} empty="No completed matches yet.">
          {(rows) => rows.slice(0, 6).map((m) => <MatchRow key={m.id} m={m} />)}
        </Section>
      </div>
    </>
  )
}
