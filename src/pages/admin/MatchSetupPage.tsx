import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowUp, Lock, Plus, Shield, Trash2, Crown } from 'lucide-react'
import { Avatar, Badge, Button, Card, Checkbox, ErrorState, Field, Input, Select, Spinner } from '../../components/ui'
import { api, errorMessage } from '../../lib/api'
import type { MatchState, MatchSummary, Squad } from '../../lib/types'
import { keys, useMatch, usePlayers } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { cn } from '../../lib/utils'
import { useDebounced } from './adminHooks'
import { MAX_XI, addPlayer, fromSquad, move, removePlayer, setCaptain, setKeeper, toInput, toggleXI, validateSquad, xiCount, type SquadRow } from './squad'

interface PanelProps {
  matchId: string
  team: { id: string; name: string }
  otherTeamName: string
  rows: SquadRow[]
  setRows: (r: SquadRow[]) => void
  otherIds: Set<string>
  readOnly: boolean
  onSaved: (s: MatchState) => void
}

function TeamPanel({ matchId, team, otherTeamName, rows, setRows, otherIds, readOnly, onSaved }: PanelProps) {
  const [search, setSearch] = useState('')
  const [onlyTeam, setOnlyTeam] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const players = usePlayers({ teamId: onlyTeam ? team.id : '', search: useDebounced(search) })
  const check = validateSquad(rows)
  const inRows = new Set(rows.map((r) => r.playerId))
  const candidates = (players.data ?? []).filter((p) => !inRows.has(p.id))
  const xi = xiCount(rows)

  async function save() {
    if (check.errors.length > 0) return setError(check.errors[0]!)
    setError(null); setSaving(true)
    try {
      onSaved(await api.put<MatchState>(`/api/matches/${matchId}/squad`, { teamId: team.id, players: toInput(rows) }))
      toast.success(`${team.name} squad saved.`)
    } catch (e) { setError(errorMessage(e)) } finally { setSaving(false) }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">{team.name}</h2>
        <Badge tone={xi === MAX_XI ? 'green' : 'amber'}>XI {xi}/{MAX_XI}</Badge>
      </div>

      {rows.length === 0 ? <p className="mb-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No players yet. Add them from the list below.</p> : (
        <ol className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {rows.map((r, i) => {
            const xiIndex = rows.filter((x, j) => x.isPlayingXI && j <= i).length
            return (
              <li key={r.playerId} className={cn('flex flex-wrap items-center gap-2 px-3 py-2', !r.isPlayingXI && 'bg-slate-50')}>
                <span className="w-6 text-center text-xs font-bold text-slate-400">{r.isPlayingXI ? xiIndex : 'SUB'}</span>
                <Avatar name={r.name} src={r.photoUrl} size={28} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{r.name}</span>
                {!readOnly && (
                  <div className="flex items-center gap-1">
                    <Checkbox label="XI" checked={r.isPlayingXI} disabled={!r.isPlayingXI && xi >= MAX_XI} onChange={() => setRows(toggleXI(rows, r.playerId))} />
                    <Button size="sm" variant={r.isCaptain ? 'primary' : 'ghost'} disabled={!r.isPlayingXI} aria-pressed={r.isCaptain} aria-label={`Captain: ${r.name}`} title="Captain" onClick={() => setRows(setCaptain(rows, r.playerId))}><Crown className="size-4" /></Button>
                    <Button size="sm" variant={r.isWicketKeeper ? 'primary' : 'ghost'} disabled={!r.isPlayingXI} aria-pressed={r.isWicketKeeper} aria-label={`Wicket-keeper: ${r.name}`} title="Wicket-keeper" onClick={() => setRows(setKeeper(rows, r.playerId))}><Shield className="size-4" /></Button>
                    <Button size="sm" variant="ghost" disabled={!r.isPlayingXI || xiIndex === 1} aria-label={`Move ${r.name} up the batting order`} onClick={() => setRows(move(rows, r.playerId, -1))}><ArrowUp className="size-4" /></Button>
                    <Button size="sm" variant="ghost" disabled={!r.isPlayingXI || xiIndex === xi} aria-label={`Move ${r.name} down the batting order`} onClick={() => setRows(move(rows, r.playerId, 1))}><ArrowDown className="size-4" /></Button>
                    <Button size="sm" variant="ghost" aria-label={`Remove ${r.name}`} onClick={() => setRows(removePlayer(rows, r.playerId))}><Trash2 className="size-4 text-red-600" /></Button>
                  </div>
                )}
                {readOnly && <span className="text-xs text-slate-500">{[r.isCaptain && 'Captain', r.isWicketKeeper && 'Keeper'].filter(Boolean).join(' · ')}</span>}
              </li>
            )
          })}
        </ol>
      )}

      {!readOnly && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <Input aria-label="Search players to add" type="search" placeholder="Search players to add…" className="min-w-48 flex-1" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Checkbox label={`Only ${team.name} players`} checked={onlyTeam} onChange={(e) => setOnlyTeam(e.target.checked)} />
          </div>
          <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
            {players.isLoading ? <Spinner /> : players.error ? <ErrorState message={errorMessage(players.error)} onRetry={() => void players.refetch()} />
              : candidates.length === 0 ? <p className="p-3 text-sm text-slate-500">{onlyTeam ? 'No more players for this team. Untick the box to search everyone.' : 'No matching players.'}</p>
                : candidates.map((p) => {
                  const taken = otherIds.has(p.id)
                  return (
                    <div key={p.id} className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-0">
                      <Avatar name={p.displayName} src={p.photoUrl} size={24} />
                      <span className="flex-1 truncate text-sm">{p.displayName}<span className="ml-2 text-xs text-slate-400">{p.currentTeamName ?? ''}</span></span>
                      {taken ? <span className="text-xs text-amber-700">In {otherTeamName} squad</span>
                        : <Button size="sm" variant="secondary" aria-label={`Add ${p.displayName}`} onClick={() => setRows(addPlayer(rows, { playerId: p.id, name: p.displayName, photoUrl: p.photoUrl }))}><Plus className="size-4" aria-hidden />Add</Button>}
                    </div>
                  )
                })}
          </div>
          {check.errors.length > 0 && rows.length > 0 && <p role="alert" className="mb-2 text-sm text-red-600">{check.errors[0]}</p>}
          {check.warnings.length > 0 && check.errors.length === 0 && <p className="mb-2 text-xs text-amber-700">{check.warnings.join(' ')}</p>}
          {error && <p role="alert" className="mb-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button loading={saving} disabled={check.errors.length > 0} onClick={() => void save()}>Save {team.name} squad</Button>
        </>
      )}
    </Card>
  )
}

function Toss({ match, state, onChanged }: { match: MatchSummary; state: MatchState; onChanged: (s: MatchState) => void }) {
  const [winner, setWinner] = useState('')
  const [decision, setDecision] = useState<'Bat' | 'Bowl'>('Bat')
  const [busy, setBusy] = useState<'toss' | 'start' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const a = state.actions

  async function run(kind: 'toss' | 'start') {
    setBusy(kind); setError(null)
    try {
      const next = kind === 'toss'
        ? await api.post<MatchState>(`/api/matches/${match.id}/toss`, { tossWinnerTeamId: winner, tossDecision: decision })
        : await api.post<MatchState>(`/api/matches/${match.id}/start`)
      onChanged(next)
      toast.success(kind === 'toss' ? 'Toss recorded.' : 'Match started. Good luck!')
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(null) }
  }

  const started = !['Scheduled', 'TossCompleted'].includes(state.status)
  return (
    <Card className="p-5">
      <h2 className="mb-1 text-lg font-bold text-slate-900">Toss & start</h2>
      {state.tossText && <p className="mb-3 text-sm font-semibold text-emerald-700">{state.tossText}</p>}
      {!state.tossText && !a.canRecordToss && <p className="mb-3 text-sm text-slate-500">Save a playing XI (at least 2 players) for both teams to unlock the toss.</p>}
      {a.canRecordToss && (
        <div className="mb-3 grid gap-4 sm:grid-cols-2">
          <Field label="Toss won by">
            {(id) => (
              <Select id={id} value={winner} onChange={(e) => setWinner(e.target.value)}>
                <option value="">Choose…</option>
                <option value={match.homeTeamId}>{match.homeTeamName}</option>
                <option value={match.awayTeamId}>{match.awayTeamName}</option>
              </Select>
            )}
          </Field>
          <Field label="Chose to">
            {(id) => <Select id={id} value={decision} onChange={(e) => setDecision(e.target.value as 'Bat' | 'Bowl')}><option value="Bat">Bat</option><option value="Bowl">Bowl</option></Select>}
          </Field>
          <div><Button loading={busy === 'toss'} disabled={!winner} onClick={() => void run('toss')}>Record toss</Button></div>
        </div>
      )}
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {a.canStartMatch && <Button variant="success" size="lg" loading={busy === 'start'} onClick={() => void run('start')}>Start match</Button>}
      {started && (
        <Link to={`/scorer/${match.id}`} className="mt-1 inline-flex items-center rounded-xl bg-brand px-6 py-3 text-base font-bold text-white hover:bg-brand-dark">Open scorer console</Link>
      )}
    </Card>
  )
}

function SetupBody({ match, squads, initialState }: { match: MatchSummary; squads: Squad[]; initialState: MatchState }) {
  const qc = useQueryClient()
  const stateKey = [...keys.matches, 'state', match.id]
  const squadKey = [...keys.matches, 'squads', match.id]
  const state = useQuery({ queryKey: stateKey, queryFn: () => api.get<MatchState>(`/api/matches/${match.id}/state`), initialData: initialState }).data
  const initial = (teamId: string) => fromSquad(squads.find((s) => s.teamId === teamId)?.players ?? [])
  const [home, setHome] = useState<SquadRow[]>(() => initial(match.homeTeamId))
  const [away, setAway] = useState<SquadRow[]>(() => initial(match.awayTeamId))
  const locked = !['Scheduled', 'TossCompleted'].includes(state.status)

  function onState(s: MatchState) {
    qc.setQueryData(stateKey, s)
    void qc.invalidateQueries({ queryKey: squadKey })
    void qc.invalidateQueries({ queryKey: keys.matches })
  }

  return (
    <>
      {locked && (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Lock className="size-4" aria-hidden />The match has started, so the squads are locked.
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        <TeamPanel matchId={match.id} team={{ id: match.homeTeamId, name: match.homeTeamName }} otherTeamName={match.awayTeamName} rows={home} setRows={setHome} otherIds={new Set(away.map((r) => r.playerId))} readOnly={locked} onSaved={onState} />
        <TeamPanel matchId={match.id} team={{ id: match.awayTeamId, name: match.awayTeamName }} otherTeamName={match.homeTeamName} rows={away} setRows={setAway} otherIds={new Set(home.map((r) => r.playerId))} readOnly={locked} onSaved={onState} />
      </div>
      <div className="mt-4"><Toss match={match} state={state} onChanged={onState} /></div>
    </>
  )
}

export default function MatchSetupPage() {
  const { matchId } = useParams()
  const match = useMatch(matchId)
  const squads = useQuery({ queryKey: [...keys.matches, 'squads', matchId], queryFn: () => api.get<Squad[]>(`/api/matches/${matchId}/squads`), enabled: !!matchId })
  const state = useQuery({ queryKey: [...keys.matches, 'state', matchId], queryFn: () => api.get<MatchState>(`/api/matches/${matchId}/state`), enabled: !!matchId })

  const error = match.error ?? squads.error ?? state.error
  return (
    <>
      <Link to={`/admin/matches/${matchId}`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="size-4" aria-hidden />Back to match</Link>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">{match.data ? `${match.data.homeTeamName} vs ${match.data.awayTeamName}` : 'Match setup'}</h1>
      <p className="mb-6 text-sm text-slate-500">Pick the playing XI (up to {MAX_XI}) for each side, then record the toss and start the match.</p>
      {error ? <ErrorState message={errorMessage(error)} onRetry={() => { void match.refetch(); void squads.refetch(); void state.refetch() }} />
        : !match.data || !squads.data || !state.data ? <Spinner />
          : <SetupBody match={match.data} squads={squads.data} initialState={state.data} />}
    </>
  )
}
