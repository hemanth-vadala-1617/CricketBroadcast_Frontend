import { useState } from 'react'
import { Eye, EyeOff, Users } from 'lucide-react'
import { api, errorMessage } from '../../lib/api'
import { cn } from '../../lib/utils'
import { toast } from '../../store/useToast'
import type { Lineup, MatchState } from '../../lib/types'
import { Card, TeamBadge } from '../ui'
import { BOTH } from '../overlay/lineup'
import { lineupCall, lineupOnAir } from './lineupAir'

// One toggle per team: tap to roll that team's playing XI out on the overlay, tap again to take it off.
// Tapping the other team switches straight over. The button shows what is on air, so there is no separate show/hide pair.
export function LineupToggle({ state, onState }: { state: MatchState; onState: (s: MatchState) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const onAir = lineupOnAir(state)
  const teams: Lineup[] = [state.lineups?.home, state.lineups?.away].filter((l): l is Lineup => !!l)
  // one row per team, then "both teams together" (only possible when each team has its XI)
  const rows = [
    ...teams.map((l) => ({
      id: l.team.id, label: l.team.name, team: l.team, empty: l.players.length === 0,
      note: l.players.length === 0 ? 'no XI yet' : `${l.players.length} players`, emptyHint: 'Pick this team\'s playing XI in Match setup first',
    })),
    ...(teams.length === 2 ? [{
      id: BOTH, label: 'Both teams', team: null, empty: teams.some((l) => l.players.length === 0),
      note: 'side by side', emptyHint: 'Both teams need a playing XI. Pick them in Match setup first',
    }] : []),
  ]

  async function tap(teamId: string) {
    setBusy(teamId)
    try {
      onState(await api.put<MatchState>(`/api/graphics/match/${state.matchId}/TeamLineup`, lineupCall(state, teamId)))
    } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) }
  }

  return (
    <Card className="p-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Player introduction</h3>
      <p className="mb-3 text-xs text-slate-500">Tap a team to roll out its playing XI, or both teams together. Tap again to hide.</p>
      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const on = onAir === r.id
          return (
            <button
              key={r.id} type="button" aria-pressed={on} disabled={r.empty || busy !== null} onClick={() => void tap(r.id)}
              title={r.empty ? r.emptyHint : undefined}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50',
                on ? 'border-emerald-600 bg-emerald-600 text-white shadow' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {r.team ? <TeamBadge team={r.team} size={26} /> : <Users className="size-6 shrink-0" aria-hidden />}
                <span className="truncate font-semibold">{r.label}</span>
                <span className={cn('text-xs', on ? 'text-emerald-100' : 'text-slate-500')}>{r.note}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold">
                {on ? <><Eye className="size-4" aria-hidden />ON AIR</> : <><EyeOff className="size-4 text-slate-400" aria-hidden />Off</>}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
