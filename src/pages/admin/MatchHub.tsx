import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Copy, Circle } from 'lucide-react'
import { Badge, Button, Card, ErrorState, Spinner, StatusBadge, TeamBadge } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import { overlayUrl, publicUrl } from '../../lib/overlayUrl'
import { useLiveMatch } from '../../hooks/useLiveMatch'
import { useMatch } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { cn } from '../../lib/utils'
import type { MatchState } from '../../lib/types'

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center gap-3">
        <span className={cn('grid size-7 place-items-center rounded-full text-sm font-bold', done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700')}>
          {done ? <Check className="size-4" aria-label="Done" /> : n}
        </span>
        <h2 className="font-bold text-slate-900">{title}</h2>
      </div>
      <div className="pl-10 text-sm text-slate-600">{children}</div>
    </Card>
  )
}

function LinkButton({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">{children}</Link>
}

function Flag({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <li className="flex items-center gap-2">{ok ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <Circle className="size-3.5 text-slate-300" aria-hidden />}<span className={ok ? 'text-slate-800' : ''}>{children}</span></li>
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('Could not copy. Select the address and press Ctrl+C.') }
  }
  return (
    <div className="flex items-center gap-2">
      <input readOnly aria-label="Overlay address" value={value} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800" />
      <Button size="sm" variant="secondary" onClick={() => void copy()}><Copy className="size-4" aria-hidden />{copied ? 'Copied' : 'Copy'}</Button>
    </div>
  )
}

function liveLine(s: MatchState): string | null {
  if (!s.innings) return null
  const i = s.innings
  return `${i.battingTeam.shortName} ${i.runs}/${i.wickets} (${i.overs})`
}

export default function MatchHub() {
  const { matchId } = useParams()
  const match = useMatch(matchId)
  const { state, status } = useLiveMatch(matchId)

  if (match.isLoading) return <Spinner />
  if (match.error || !match.data) return <ErrorState message={match.error ? errorMessage(match.error) : 'Match not found.'} onRetry={() => void match.refetch()} />
  const m = match.data
  const a = state?.actions
  const started = state ? !['Scheduled', 'TossCompleted'].includes(state.status) : m.status !== 'Scheduled' && m.status !== 'TossCompleted'
  const line = state ? liveLine(state) : null

  return (
    <>
      <Link to="/admin/matches" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="size-4" aria-hidden />All matches</Link>
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TeamBadge team={{ name: m.homeTeamName, shortName: m.homeShortName, logoUrl: state?.homeTeam.logoUrl ?? null, primaryColor: state?.homeTeam.primaryColor ?? null }} size={52} />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{m.homeTeamName} vs {m.awayTeamName}</h1>
              <p className="text-sm text-slate-500">{m.tournamentName} · {m.venueName} · {m.matchFormat}</p>
            </div>
            <TeamBadge team={{ name: m.awayTeamName, shortName: m.awayShortName, logoUrl: state?.awayTeam.logoUrl ?? null, primaryColor: state?.awayTeam.primaryColor ?? null }} size={52} />
          </div>
          <div className="text-right">
            <StatusBadge status={state?.status ?? m.status} />
            {line && <p className="mt-2 font-display text-2xl font-semibold text-slate-900">{line}</p>}
            {(state?.resultText ?? m.resultText) && <p className="mt-1 text-sm font-semibold text-purple-700">{state?.resultText ?? m.resultText}</p>}
            <p className="mt-1 text-xs text-slate-400">Live feed: {status === 'live' ? 'connected' : status === 'idle' ? '—' : status}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Step n={1} title="Squads & toss" done={started || m.status === 'TossCompleted'}>
          <ul className="mb-3 space-y-1">
            <Flag ok={m.squadSize >= 4}>Playing XIs picked ({m.squadSize} players)</Flag>
            <Flag ok={!!m.tossWinnerTeamId}>Toss recorded{m.tossDecision ? ` (chose to ${m.tossDecision.toLowerCase()})` : ''}</Flag>
            <Flag ok={started}>Match started</Flag>
          </ul>
          {a && !started && <p className="mb-3 text-xs">{a.canRecordToss ? 'Squads are ready: you can record the toss.' : a.canStartMatch ? 'Toss done: start the match.' : 'Pick both playing XIs first.'}</p>}
          <LinkButton to={`/admin/matches/${m.id}/setup`}>{started ? 'View squads' : 'Set up squads & toss'}</LinkButton>
        </Step>

        <Step n={2} title="Score the match" done={m.status === 'Completed'}>
          <p className="mb-3">Ball-by-ball scoring console for the scorer. {started ? '' : 'Available once the match has started.'}</p>
          {a?.awaitingNewBatter && <Badge tone="amber" className="mb-3">New batter needed</Badge>}
          {a?.awaitingNewBowler && <Badge tone="amber" className="mb-3">New bowler needed</Badge>}
          <div><LinkButton to={`/scorer/${m.id}`}>Open scorer console</LinkButton></div>
        </Step>

        <Step n={3} title="Producer console">
          <p className="mb-3">Show and hide graphics, trigger banners, set the win probability.</p>
          <LinkButton to={`/producer/${m.id}`}>Open producer console</LinkButton>
        </Step>

        <Step n={4} title="OBS overlay">
          <CopyField value={overlayUrl(m.id)} />
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs">
            <li>In OBS add a <strong>Browser</strong> source and paste this address.</li>
            <li>Set <strong>Width 1920</strong> and <strong>Height 1080</strong>. Leave Custom CSS empty.</li>
            <li>Untick “Shutdown source when not visible”. “Refresh browser when scene becomes active” may stay off.</li>
            <li>Place your video underneath. The overlay background is transparent.</li>
          </ol>
          <a href={overlayUrl(m.id)} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-brand hover:underline">Open the overlay in a new tab</a>
        </Step>

        <Step n={5} title="Public page">
          <p className="mb-2">Viewers can follow the score here.</p>
          <CopyField value={publicUrl(m.id)} />
          <Link to={`/match/${m.id}`} className="mt-3 inline-block text-xs font-semibold text-brand hover:underline">Open the public page</Link>
        </Step>
      </div>
    </>
  )
}
