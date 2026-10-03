import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useLiveMatch } from '../../hooks/useLiveMatch'
import type { BallChip, MatchState } from '../../lib/types'
import { chipColors } from '../../components/overlay/chipColors'
import { Avatar, Badge, Card, Spinner, StatusBadge, TeamBadge } from '../../components/ui'
import ScorecardView from './ScorecardView'

function Chip({ chip }: { chip: BallChip }) {
  const c = chipColors[chip.kind]
  const label = chip.kind === 'Dot' ? '•' : chip.label
  return (
    <span title={chip.kind} className="inline-grid size-8 place-items-center rounded-full border-2 text-xs font-bold" style={{ background: chip.kind === 'Dot' ? '#334155' : c.bg, color: chip.kind === 'Dot' ? '#fff' : c.fg, borderColor: c.border }}>{label}</span>
  )
}

function WinBar({ state }: { state: MatchState }) {
  const { home, draw, away } = state.winProbability
  if (home + draw + away === 0) return null
  return (
    <div className="mt-4" role="img" aria-label={`Win probability ${state.homeTeam.shortName} ${home}%, draw ${draw}%, ${state.awayTeam.shortName} ${away}%`}>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-700">
        <div style={{ width: `${home}%`, background: state.homeTeam.primaryColor ?? '#38bdf8' }} />
        <div style={{ width: `${draw}%`, background: '#facc15' }} />
        <div style={{ width: `${away}%`, background: state.awayTeam.primaryColor ?? '#f472b6' }} />
      </div>
      <div className="mt-1 flex justify-between text-xs font-semibold text-slate-300">
        <span>{`${state.homeTeam.shortName} ${home}%`}</span>{state.isTest && <span>{`Draw ${draw}%`}</span>}<span>{`${state.awayTeam.shortName} ${away}%`}</span>
      </div>
    </div>
  )
}

function Summary({ state }: { state: MatchState }) {
  const inn = state.innings
  if (!inn) return <Card className="p-6 text-center text-slate-600">{state.tossText ?? 'The match has not started yet.'}</Card>
  const current = state.timeline[state.timeline.length - 1]
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">At the crease</h3>
        {[inn.striker, inn.nonStriker].map((b) => b && (
          <div key={b.playerId} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
            <div className="flex min-w-0 items-center gap-2"><Avatar name={b.name} src={b.photoUrl} /><span className="truncate font-semibold">{b.name}{b.onStrike && <span aria-label="on strike" className="ml-1 text-emerald-600">*</span>}</span></div>
            <div className="text-right text-sm"><span className="font-bold">{b.runs}</span> <span className="text-slate-500">({b.balls}) • 4s {b.fours} • 6s {b.sixes} • SR {b.strikeRate.toFixed(2)}</span></div>
          </div>
        ))}
        {inn.bowler && (
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <div className="flex min-w-0 items-center gap-2"><Avatar name={inn.bowler.name} src={inn.bowler.photoUrl} /><span className="truncate font-semibold">{inn.bowler.name}</span></div>
            <div className="text-right text-sm"><span className="font-bold">{`${inn.bowler.wickets}-${inn.bowler.runs}`}</span> <span className="text-slate-500">({inn.bowler.overs}) • Econ {inn.bowler.economy.toFixed(2)}</span></div>
          </div>
        )}
      </Card>
      <Card className="p-4">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">This over</h3>
        {current ? <div className="flex flex-wrap items-center gap-1.5">{current.balls.map((b, i) => <Chip key={i} chip={b} />)}<span className="ml-2 text-sm font-bold">{`= ${current.runs}`}</span></div> : <p className="text-sm text-slate-500">Waiting for the first ball.</p>}
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-xs text-slate-500">Run rate</dt><dd className="font-bold">{inn.currentRunRate.toFixed(2)}</dd></div>
          <div><dt className="text-xs text-slate-500">Partnership</dt><dd className="font-bold">{`${inn.partnership.runs} (${inn.partnership.balls})`}</dd></div>
          {inn.target !== null && <div><dt className="text-xs text-slate-500">Target</dt><dd className="font-bold">{inn.target}</dd></div>}
          {inn.requiredRunRate !== null && <div><dt className="text-xs text-slate-500">Required rate</dt><dd className="font-bold">{inn.requiredRunRate.toFixed(2)}</dd></div>}
          {state.testClock && <div><dt className="text-xs text-slate-500">Day / session</dt><dd className="font-bold">{`Day ${state.testClock.day} • Session ${state.testClock.session}`}</dd></div>}
          {state.testClock && <div><dt className="text-xs text-slate-500">Overs left today</dt><dd className="font-bold">{state.testClock.oversLeftToday}</dd></div>}
        </dl>
      </Card>
    </div>
  )
}

export default function PublicMatch() {
  const { matchId } = useParams()
  const { state, status } = useLiveMatch(matchId)
  const [tab, setTab] = useState<'summary' | 'scorecard'>('summary')

  if (!state) return <div className="p-10"><Spinner label="Loading match…" /></div>
  const inn = state.innings
  const finished = state.status === 'Completed' || state.status === 'Abandoned'

  return (
    <div className="min-h-full bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-5">
          <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-400">
            <Link to="/" className="inline-flex items-center gap-1 hover:text-white"><ArrowLeft className="size-3.5" aria-hidden />All matches</Link>
            <span className="flex items-center gap-2"><StatusBadge status={state.status} />{status !== 'live' && <Badge tone="amber">{status === 'reconnecting' ? 'Reconnecting…' : 'Offline'}</Badge>}</span>
          </div>
          <p className="text-sm text-slate-300">{`${state.tournamentName} • ${state.venueName}`}</p>
          {inn ? (
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-3"><TeamBadge team={inn.battingTeam} size={48} />
                <div><div className="font-bold">{inn.battingTeam.name}</div>
                  <div className="font-display text-5xl font-bold leading-none" aria-label="Score">{`${inn.runs}-${inn.wickets}`}<span className="ml-3 text-2xl text-emerald-300">{`(${inn.overs})`}</span></div></div>
              </div>
              <div className="text-right text-sm text-slate-300">
                {state.previousInnings.map((p) => <div key={p.inningsNumber}>{`${p.teamShortName} ${p.text}`}</div>)}
                {inn.leadText && <div className="mt-1 font-semibold text-amber-300">{inn.leadText}</div>}
                {inn.freeHit && <Badge tone="amber" className="mt-1">FREE HIT</Badge>}
              </div>
            </div>
          ) : <h1 className="mt-2 text-2xl font-bold">{state.title}</h1>}
          {finished && state.resultText && <p role="status" className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 font-bold">{state.resultText}</p>}
          <WinBar state={state} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div role="tablist" aria-label="Match view" className="mb-4 flex gap-2">
          {(['summary', 'scorecard'] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${tab === t ? 'bg-brand text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{t}</button>
          ))}
        </div>
        {tab === 'summary' ? <Summary state={state} /> : (
          <div className="flex flex-col gap-4">
            {state.scorecard.length === 0 && <Card className="p-6 text-center text-slate-600">No innings yet.</Card>}
            {[...state.scorecard].reverse().map((c) => <ScorecardView key={c.inningsNumber} card={c} />)}
          </div>
        )}
      </main>
    </div>
  )
}

