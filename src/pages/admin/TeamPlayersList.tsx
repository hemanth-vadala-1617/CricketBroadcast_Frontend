import { ChevronRight } from 'lucide-react'
import { Avatar, ErrorState, Spinner } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { Player } from '../../lib/types'
import { usePlayers } from '../../hooks/queries'
import { roleName } from './viewInfo'

/** The players of one team, for the team's view dialog. Tapping a player opens his own view. */
export default function TeamPlayersList({ teamId, onOpen }: { teamId: string; onOpen: (p: Player) => void }) {
  const players = usePlayers({ teamId })
  const list = players.data ?? []
  return (
    <section aria-label="Players of this team" data-testid="team-players">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Players{players.data ? ` (${list.length})` : ''}</h4>
      {players.isLoading ? <Spinner />
        : players.error ? <ErrorState message={errorMessage(players.error)} onRetry={() => void players.refetch()} />
          : list.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No players in this team yet. Add them on the Players page.</p>
            : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {list.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => onOpen(p)} className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand">
                      <Avatar name={p.displayName} src={p.photoUrl} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900" title={p.displayName}>{p.displayName}</span>
                        <span className="block truncate text-xs text-slate-500">{[roleName(p.playerRole), p.battingStyle].filter(Boolean).join(' · ')}</span>
                      </span>
                      {p.jerseyNumber > 0 && <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">#{p.jerseyNumber}</span>}
                      <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
    </section>
  )
}
