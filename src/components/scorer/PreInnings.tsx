import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, Field, Select, TeamBadge } from '../ui'
import type { MatchState } from '../../lib/types'
import type { InningsStartInput } from '../../pages/scorer/useScorer'

export default function PreInnings({ state, busy, matchId, onStartMatch, onStart, onComplete }: {
  state: MatchState; busy: boolean; matchId: string
  onStartMatch: () => void; onStart: (i: InningsStartInput) => void; onComplete: () => void
}) {
  const a = state.actions
  const defaultBat = a.nextBattingTeamId ?? state.homeTeam.id
  const [batTeam, setBatTeam] = useState<string>('')
  const [striker, setStriker] = useState('')
  const [nonStriker, setNonStriker] = useState('')
  const [bowler, setBowler] = useState('')

  if (state.status === 'Scheduled' || state.status === 'TossCompleted') {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-bold text-slate-900">Match not started</h2>
        {state.status === 'Scheduled' ? (
          <>
            <p className="mt-1 text-sm text-slate-600">The toss has not been recorded yet. Set the playing XIs, then record the toss.</p>
            <Link to={`/admin/matches/${matchId}/setup`} className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Open match setup</Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">{state.tossText}. Ready to go live?</p>
            <Button className="mt-3" size="lg" loading={busy} disabled={!a.canStartMatch} onClick={onStartMatch}>Start match</Button>
          </>
        )}
      </Card>
    )
  }

  if (!a.canStartInnings) {
    if (a.inningsOver && state.status !== 'Completed') {
      return (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">All innings are done</h2>
          <p className="mt-1 text-sm text-slate-600">Record the result to close the match.</p>
          <Button className="mt-3" onClick={onComplete}>Complete match</Button>
        </Card>
      )
    }
    return null
  }

  const chosen = batTeam || defaultBat
  const swapped = chosen !== defaultBat      // the lists in state.actions are for the default batting side
  const battingXI = swapped ? a.fieldingXI : a.battingXI
  const fieldingXI = swapped ? a.battingXI : a.fieldingXI
  const teams = [state.homeTeam, state.awayTeam]
  const batting = teams.find((t) => t.id === chosen) ?? teams[0]!
  const ready = striker && nonStriker && striker !== nonStriker && bowler
  const innNo = state.scorecard.length + 1

  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold text-slate-900">Start innings {innNo}</h2>
      <p className="mt-1 text-sm text-slate-600">{state.tossText}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={a.followOnAvailable ? 'Batting side (the leading side may enforce the follow-on)' : 'Batting side'}>
          {(id) => (
            <div className="flex items-center gap-3">
              <TeamBadge team={batting} size={36} />
              <Select id={id} value={chosen} disabled={!a.followOnAvailable}
                onChange={(e) => { setBatTeam(e.target.value); setStriker(''); setNonStriker(''); setBowler('') }}>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}{t.id === defaultBat ? '' : ' (follow-on)'}</option>)}
              </Select>
            </div>
          )}
        </Field>
        <span />
        <Field label="Striker">{(id) => <Select id={id} value={striker} onChange={(e) => setStriker(e.target.value)}><option value="">Select…</option>{battingXI.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}</Field>
        <Field label="Non-striker" error={striker && striker === nonStriker ? 'Must be a different player.' : undefined}>
          {(id) => <Select id={id} value={nonStriker} onChange={(e) => setNonStriker(e.target.value)}><option value="">Select…</option>{battingXI.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}
        </Field>
        <Field label="Opening bowler">{(id) => <Select id={id} value={bowler} onChange={(e) => setBowler(e.target.value)}><option value="">Select…</option>{fieldingXI.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>}</Field>
      </div>
      <Button className="mt-5" size="lg" disabled={!ready} loading={busy}
        onClick={() => onStart({ battingTeamId: chosen, strikerId: striker, nonStrikerId: nonStriker, bowlerId: bowler })}>Start innings</Button>
    </Card>
  )
}
