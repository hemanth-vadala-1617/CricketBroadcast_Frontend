import type { ReactNode } from 'react'
import type { PlayerLite } from '../../lib/types'
import { Avatar, Card } from '../ui'
import { cn } from '../../lib/utils'

/**
 * "Select batter" / "Select bowler" as a card in the side panel, NOT a pop-up. After a wicket or an over the scorer is asked who is next,
 * but nothing covers the screen and nothing goes on air until a name is tapped, so there is time to talk about the wicket or the over first.
 */
export default function NextPlayerPanel({ kind, players, busy, onPick, footer, returning = [] }: {
  kind: 'batter' | 'bowler'; players: PlayerLite[]; busy: boolean; onPick: (p: PlayerLite) => void; footer?: ReactNode
  /** batters who retired hurt earlier and may walk back in: tagged so the scorer can tell them from the ones yet to bat */
  returning?: string[]
}) {
  const batter = kind === 'batter'
  return (
    <Card className="border-amber-300 bg-amber-50 p-4" data-testid={`select-${kind}`}>
      <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-900">{batter ? 'Select batter' : 'Select bowler'}</h3>
      <p className="mb-3 text-xs text-amber-900/80">
        {batter
          ? 'A wicket fell. Choose who comes in when you are ready. Nothing changes on screen until you tap a name.'
          : 'The over is complete. Choose the next bowler when you are ready. The last bowler, and anyone who has used their quota, are not listed.'}
      </p>
      {players.length === 0 && <p role="alert" className="rounded-lg bg-white p-3 text-sm text-amber-800">No one is available. Check the playing XI or end the innings.</p>}
      <ul className={cn('grid gap-2', players.length > 6 && 'max-h-80 overflow-y-auto pr-1')}>
        {players.map((p) => (
          <li key={p.id}>
            <button type="button" disabled={busy} onClick={() => onPick(p)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-300 bg-white p-2 text-left text-sm font-semibold text-slate-900 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">
              <Avatar name={p.name} src={p.photoUrl} size={32} /><span className="min-w-0 flex-1 truncate">{p.name}</span>
              {batter && returning.includes(p.id) && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Retired hurt · returns</span>}
            </button>
          </li>
        ))}
      </ul>
      {footer && <div className="mt-3">{footer}</div>}
    </Card>
  )
}
