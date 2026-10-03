import type { ReactNode } from 'react'
import type { Squad, SquadMember } from '../lib/types'
import { Avatar } from './ui'

const ROLE: Record<string, string> = { Batter: 'Batter', Bowler: 'Bowler', AllRounder: 'All-rounder', WicketKeeper: 'WK-Batter' }
const roleOf = (p: SquadMember) => ROLE[p.role ?? ''] ?? p.role ?? ''
const mark = (m: SquadMember) => [m.isCaptain && 'C', m.isWicketKeeper && 'WK'].filter(Boolean).join(' ') || undefined

function Person({ name, photoUrl, sub, mark }: { name: string; photoUrl: string | null; sub: string; mark?: string }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <Avatar name={name} src={photoUrl} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900" title={name}>{name}{mark && <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">{mark}</span>}</p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
    </li>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <h4 className="border-y border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-slate-600">{title} <span className="text-slate-400">({count})</span></h4>
      {count === 0 ? <p className="px-3 py-3 text-xs text-slate-400">None named.</p> : <ul className="divide-y divide-slate-100">{children}</ul>}
    </section>
  )
}

// A team's sheet for one match: playing XI in batting order, then the bench, then the support staff.
export function TeamSheet({ teamName, squad }: { teamName: string; squad: Squad | undefined }) {
  const players = squad?.players ?? []
  const xi = players.filter((p) => p.isPlayingXI)
  const bench = players.filter((p) => !p.isPlayingXI)
  const staff = squad?.staff ?? []
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white" data-testid="team-sheet">
      <h3 className="truncate px-3 py-2 text-base font-bold text-slate-900">{teamName}</h3>
      <Section title="Playing XI" count={xi.length}>{xi.map((p) => <Person key={p.playerId} name={p.name} photoUrl={p.photoUrl} sub={roleOf(p)} mark={mark(p)} />)}</Section>
      <Section title="Bench" count={bench.length}>{bench.map((p) => <Person key={p.playerId} name={p.name} photoUrl={p.photoUrl} sub={roleOf(p)} />)}</Section>
      <Section title="Support staff" count={staff.length}>{staff.map((s, i) => <Person key={i} name={s.name} photoUrl={null} sub={s.role} />)}</Section>
    </div>
  )
}
