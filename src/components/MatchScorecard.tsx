import { useState, type ReactNode } from 'react'
import type { InningsScorecard, MatchState } from '../lib/types'
import { batterName, economyTone, fowPosition, howOut, inningsLabel, inningsNewestFirst, rate, runShare, statusLine, strikeRateTone, type Tone } from '../lib/scorecard'
import { cn, ordinal } from '../lib/utils'

// Column layouts shared by the header row and every data row so the numbers line up.
const BAT_COLS = 'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_3.25rem_3rem_2.75rem_2.75rem_4.5rem] items-center gap-x-2'
const BOWL_COLS = 'grid grid-cols-[minmax(0,1fr)_repeat(6,3rem)_4.5rem] items-center gap-x-2'
const HEAD = 'bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500'

const TONES: Record<Tone, string> = { good: 'bg-emerald-100 text-emerald-800', ok: 'bg-slate-100 text-slate-700', poor: 'bg-rose-100 text-rose-700' }

function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn('justify-self-end rounded-md px-1.5 py-0.5 text-sm font-semibold tabular-nums', TONES[tone])}>{children}</span>
}
function Num({ children, bold }: { children: ReactNode; bold?: boolean }) {
  return <span className={cn('text-right tabular-nums', bold && 'text-lg font-bold text-slate-900')}>{children}</span>
}
function Section({ title }: { title: string }) {
  return <h3 className="px-5 pb-2 pt-5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{title}</h3>
}

// Team colour pushed dark enough that white text always reads (a yellow team still gets a legible header).
function heroBackground(color: string | null): string {
  const c = color ?? '#0f6b4f'
  return `linear-gradient(135deg, color-mix(in srgb, ${c} 68%, #0b1220), color-mix(in srgb, ${c} 28%, #0b1220))`
}

function Batting({ card }: { card: InningsScorecard }) {
  const top = Math.max(0, ...card.batting.map((b) => b.runs))
  const color = card.battingTeam.primaryColor ?? '#0f6b4f'
  return (
    <>
      <div className={cn(BAT_COLS, HEAD, 'px-5 py-2.5')}>
        <span>Batter</span><span /><Num>R</Num><Num>B</Num><Num>4s</Num><Num>6s</Num><Num>SR</Num>
      </div>
      {card.batting.map((b) => {
        const batting = b.status === 'batting'
        return (
          <div key={b.playerId} data-testid="batter-row" className={cn(BAT_COLS, 'border-b border-slate-100 px-5 py-3', batting && 'bg-emerald-50/70')}>
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-semibold text-slate-900">
                {batting && <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />}
                <span className="truncate">{batterName(b)}</span>
              </span>
              <span aria-hidden className="mt-1.5 block h-1 rounded-full bg-slate-100">
                <span className="block h-1 rounded-full" style={{ width: `${runShare(b.runs, top)}%`, background: color }} />
              </span>
            </span>
            <span className={cn('truncate text-sm', batting ? 'font-semibold text-emerald-700' : 'text-slate-500')}>{howOut(b)}</span>
            <Num bold>{b.runs}</Num><Num>{b.balls}</Num><Num>{b.fours}</Num><Num>{b.sixes}</Num>
            <Chip tone={strikeRateTone(b.strikeRate)}>{rate(b.strikeRate)}</Chip>
          </div>
        )
      })}
    </>
  )
}

function Bowling({ card }: { card: InningsScorecard }) {
  return (
    <>
      <div className={cn(BOWL_COLS, HEAD, 'px-5 py-2.5')}>
        <span>Bowler</span><Num>O</Num><Num>M</Num><Num>R</Num><Num>W</Num><Num>NB</Num><Num>WD</Num><Num>ECO</Num>
      </div>
      {card.bowling.map((b) => (
        <div key={b.playerId} data-testid="bowler-row" className={cn(BOWL_COLS, 'border-b border-slate-100 px-5 py-3')}>
          <span className="truncate font-semibold text-slate-900">{b.name}</span>
          <Num>{b.overs}</Num><Num>{b.maidens}</Num><Num>{b.runs}</Num>
          <span className={cn('justify-self-end rounded-full px-2 py-0.5 text-sm font-bold tabular-nums', b.wickets > 0 ? 'bg-slate-900 text-white' : 'text-slate-400')}>{b.wickets}</span>
          <Num>{b.noBalls}</Num><Num>{b.wides}</Num>
          <Chip tone={economyTone(b.economy)}>{rate(b.economy)}</Chip>
        </div>
      ))}
    </>
  )
}

// Where each wicket fell, drawn along the innings: early collapses and a long stand are visible at a glance.
function FallOfWickets({ card }: { card: InningsScorecard }) {
  return (
    <div data-testid="fall-of-wickets" className="px-5 pb-5">
      <div data-testid="fow-track" className="relative mx-2 mb-3 mt-6 h-1.5 rounded-full bg-slate-200">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: '100%', background: card.battingTeam.primaryColor ?? '#0f6b4f', opacity: 0.25 }} />
        {card.fallOfWickets.map((f) => (
          <span key={f.wicketNumber} title={`${f.batterName}: ${f.score}-${f.wicketNumber} (${f.overs} ov)`}
            className="absolute top-1/2 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-white"
            style={{ left: `${fowPosition(f.score, card.runs)}%` }}>{f.wicketNumber}</span>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{card.fallOfWickets.map((f) => `${f.score}-${f.wicketNumber} (${f.batterName}, ${f.overs} ov)`).join(', ')}</p>
    </div>
  )
}

// Scorecard in the style of the overlay: team-coloured header, run-share bars, colour-coded rates, wicket timeline.
export default function MatchScorecard({ state }: { state: MatchState }) {
  const cards = inningsNewestFirst(state.scorecard)
  const [picked, setPicked] = useState<number | null>(null)
  const active = cards.find((c) => c.inningsNumber === picked) ?? cards[0]
  const status = statusLine(state)

  if (!active) {
    return (
      <div data-testid="scorecard-empty" className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {status && <p className="mb-2 font-semibold text-rose-700">{status}</p>}
        <p className="font-semibold text-slate-700">The scorecard appears once the first ball is bowled.</p>
        <p className="mt-1 text-sm text-slate-500">{`${state.homeTeam.name} vs ${state.awayTeam.name} · ${state.venueName}`}</p>
      </div>
    )
  }

  return (
    <section aria-label="Scorecard" className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div data-testid="innings-header" style={{ background: heroBackground(active.battingTeam.primaryColor) }} className="px-5 pb-5 pt-5 text-white">
        {status && (
          <p data-testid="status-line" className="mb-4 inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-sm font-semibold text-amber-200">
            <span aria-hidden className="size-2 rounded-full bg-amber-300" />{status}
          </p>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">{`${ordinal(active.inningsNumber)} innings`}</p>
            <h2 className="font-display text-3xl font-bold uppercase tracking-wide">{active.battingTeam.name}</h2>
          </div>
          <div className="font-display leading-none"><b className="text-5xl">{`${active.runs}-${active.wickets}`}</b><span className="ml-2 text-2xl font-semibold text-white/75">{` (${active.overs} Ov)`}</span></div>
        </div>
      </div>

      <div role="tablist" aria-label="Innings" className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
        {cards.map((c) => {
          const on = c.inningsNumber === active.inningsNumber
          return (
            <button key={c.inningsNumber} type="button" role="tab" aria-selected={on} onClick={() => setPicked(c.inningsNumber)}
              className={cn('inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition', on ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-white')}>
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: c.battingTeam.primaryColor ?? '#94a3b8' }} />
              {inningsLabel(c)}
            </button>
          )
        })}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <Batting card={active} />

          <div className="grid grid-cols-2 gap-3 px-5 py-4">
            <div data-testid="extras-row" className="rounded-xl bg-slate-50 px-4 py-3">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">Extras</span>
              <span className="text-slate-700"><b className="text-lg text-slate-900">{active.extras}</b>{' '}{active.extrasText}</span>
            </div>
            <div data-testid="total-row" className="rounded-xl bg-slate-900 px-4 py-3 text-white">
              <span className="block text-xs font-bold uppercase tracking-wide text-white/50">Total</span>
              <span className="text-white/80"><b className="text-lg text-white">{`${active.runs}-${active.wickets}`}</b>{` (${active.overs} Overs, RR: ${rate(active.runRate)})`}</span>
            </div>
          </div>

          {active.yetToBat.length > 0 && (
            <div data-testid="yet-to-bat" className="px-5 pb-4">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Yet to bat</span>
              <ul className="flex flex-wrap gap-2">
                {active.yetToBat.map((n) => <li key={n} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{n}</li>)}
              </ul>
            </div>
          )}

          <Bowling card={active} />
          {active.fallOfWickets.length > 0 && (
            <>
              <Section title="Fall of wickets" />
              <FallOfWickets card={active} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
