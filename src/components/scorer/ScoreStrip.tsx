import { Badge, Avatar, Card, TeamBadge } from '../ui'
import { cn } from '../../lib/utils'
import type { BallKind, Batter, MatchState } from '../../lib/types'

const chipClass: Record<BallKind, string> = {
  Dot: 'bg-slate-200 text-slate-700',
  Runs: 'bg-blue-600 text-white',
  Four: 'bg-emerald-600 text-white',
  Six: 'bg-purple-600 text-white',
  Wicket: 'bg-red-600 text-white',
  Wide: 'bg-amber-500 text-white',
  NoBall: 'bg-amber-500 text-white',
  Bye: 'bg-teal-600 text-white',
  LegBye: 'bg-teal-600 text-white',
}

export function BallChip({ label, kind, big }: { label: string; kind: BallKind; big?: boolean }) {
  return (
    <span aria-label={`${kind} ${label}`} className={cn('inline-grid place-items-center rounded-full font-bold', big ? 'size-16 text-2xl' : 'min-w-9 px-1 h-9 text-sm', chipClass[kind])}>
      {kind === 'Dot' ? '•' : label}
    </span>
  )
}

function BatterRow({ b }: { b: Batter | null }) {
  if (!b) return <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-400">Waiting for batter…</div>
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border p-2', b.onStrike ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200')}>
      <Avatar name={b.name} src={b.photoUrl} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{b.name}{b.onStrike && <span aria-label="on strike" className="ml-1 text-emerald-600"> ●</span>}</p>
        <p className="text-xs text-slate-500">4s {b.fours} · 6s {b.sixes} · SR {b.strikeRate.toFixed(1)}</p>
      </div>
      <p className="font-mono text-xl font-bold tabular-nums">{b.runs}<span className="text-sm font-medium text-slate-500"> ({b.balls})</span></p>
    </div>
  )
}

export default function ScoreStrip({ state }: { state: MatchState }) {
  const inn = state.innings
  if (!inn) return null
  const over = state.timeline.at(-1)
  const need = inn.runsRequired !== null && inn.target !== null
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TeamBadge team={inn.battingTeam} size={44} />
          <div>
            <p className="text-sm font-semibold text-slate-500">{inn.battingTeam.name} · {inn.inningsNumber === 1 ? '1st' : inn.inningsNumber === 2 ? '2nd' : `${inn.inningsNumber}th`} innings{inn.isFollowOn ? ' (follow-on)' : ''}</p>
            <p className="font-mono text-4xl font-bold tabular-nums text-slate-900">{inn.runs}<span className="text-slate-400">/</span>{inn.wickets} <span className="text-lg font-semibold text-slate-500">({inn.overs} ov)</span></p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Match flags">
          {inn.freeHit && <Badge tone="red" className="animate-pulse">FREE HIT</Badge>}
          {inn.powerplay && <Badge tone="purple">Powerplay</Badge>}
          {inn.newBallDue && <Badge tone="amber">New ball due</Badge>}
          {inn.status === 'Completed' && <Badge tone="gray">Innings over</Badge>}
        </div>
        {state.lastBall && (
          <div className="flex items-center gap-2" aria-label="Last ball">
            <span className="text-xs font-semibold uppercase text-slate-500">Last ball</span>
            <BallChip label={state.lastBall.label} kind={state.lastBall.kind} big />
          </div>
        )}
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
        <div><dt className="inline text-slate-500">CRR </dt><dd className="inline font-semibold">{inn.currentRunRate.toFixed(2)}</dd></div>
        <div><dt className="inline text-slate-500">P'ship </dt><dd className="inline font-semibold">{inn.partnership.runs} ({inn.partnership.balls})</dd></div>
        <div><dt className="inline text-slate-500">Extras </dt><dd className="inline font-semibold">{inn.extras}</dd></div>
        {need && <div><dt className="inline text-slate-500">Target </dt><dd className="inline font-semibold">{inn.target}</dd></div>}
        {need && inn.ballsRemaining !== null && <div><dt className="inline text-slate-500">Need </dt><dd className="inline font-semibold">{inn.runsRequired} off {inn.ballsRemaining}{inn.requiredRunRate !== null ? ` · RRR ${inn.requiredRunRate.toFixed(2)}` : ''}</dd></div>}
        {inn.leadText && <div className="font-semibold text-slate-800">{inn.leadText}</div>}
        {state.testClock && <div className="font-semibold text-slate-800">Day {state.testClock.day} : Session {state.testClock.session} · {state.testClock.oversLeftToday} overs left today</div>}
      </dl>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <BatterRow b={inn.striker} />
        <BatterRow b={inn.nonStriker} />
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
          {inn.bowler ? (
            <>
              <Avatar name={inn.bowler.name} src={inn.bowler.photoUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{inn.bowler.name}</p>
                <p className="text-xs text-slate-500">Mdns {inn.bowler.maidens} · Econ {inn.bowler.economy.toFixed(2)}</p>
              </div>
              <p className="font-mono text-xl font-bold tabular-nums">{inn.bowler.wickets}-{inn.bowler.runs}<span className="text-sm font-medium text-slate-500"> ({inn.bowler.overs})</span></p>
            </>
          ) : <p className="text-sm text-slate-400">No bowler selected</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="This over">
        <span className="text-xs font-semibold uppercase text-slate-500">{over ? `Over ${over.overNumber}` : 'This over'}</span>
        {over?.balls.length ? over.balls.map((c, i) => <BallChip key={i} label={c.label} kind={c.kind} />) : <span className="text-sm text-slate-400">No balls yet</span>}
        {over && <span className="ml-1 text-sm font-semibold text-slate-600">= {over.runs}</span>}
      </div>
    </Card>
  )
}

