import type { Batter, MatchState } from '../../lib/types'

/** How long the "new batter" card stays on screen. */
export const NEW_BATTER_MS = 7000

/** The bottom card switches to the new batter this long after his introduction starts (the introduction carries on a while longer). */
export const NEW_BATTER_SWAP_MS = 1500

export type Slot = 'striker' | 'nonStriker'

/** The batters at the crease in the last state we looked at, for the innings we were looking at. */
export interface BatterWatch { inningsId: string; present: Batter[]; slots: Record<string, Slot> }

/** The batter who has just left, frozen as he left, to stay on his bottom card until the new batter's introduction is over. */
export interface HeldBatter { slot: Slot; batter: Batter; label: string; detail: string }

export interface Arrival { batter: Batter; slot: Slot; held: HeldBatter | null }

export interface Detection { watch: BatterWatch | null; arrival: Arrival | null; departure: HeldBatter | null }

// What the held card says: "OUT" and how, or why he left (retired hurt...).
function heldFor(state: MatchState, left: Batter, slot: Slot): HeldBatter {
  const inn = state.innings!
  const line = state.scorecard.find((c) => c.inningsNumber === inn.inningsNumber)?.batting.find((b) => b.playerId === left.playerId)
  const batter = line ? { ...left, runs: line.runs, balls: line.balls, fours: line.fours, sixes: line.sixes, strikeRate: line.strikeRate ?? left.strikeRate } : left
  const out = !line || line.status === 'out'
  return { slot, batter, label: out ? 'OUT' : line!.status.toUpperCase(), detail: out ? (line?.dismissalText ?? '') : '' }
}

/**
 * Works out which batter has just walked in. `watch` is who was at the crease last time; the first look at an innings only
 * records who is there (the openers, or a page reload), it never announces them. Comparing with who was there last time
 * (rather than everyone seen so far) means a wicket that is undone and scored again still gets its introduction.
 */
export function detectArrival(watch: BatterWatch | null, state: MatchState): Detection {
  const inn = state.innings
  if (!inn) return { watch: null, arrival: null, departure: null }
  const present = [inn.striker, inn.nonStriker].filter((b): b is Batter => !!b)
  const slots: Record<string, Slot> = {}
  if (inn.striker) slots[inn.striker.playerId] = 'striker'
  if (inn.nonStriker) slots[inn.nonStriker.playerId] = 'nonStriker'
  const next: BatterWatch = { inningsId: inn.inningsId, present, slots }
  if (!watch || watch.inningsId !== inn.inningsId || watch.present.length === 0) return { watch: next, arrival: null, departure: null }

  const before = new Set(watch.present.map((b) => b.playerId))
  // A batter who already has runs or balls is coming back (retired, returned), not making an entrance.
  const fresh = present.filter((b) => !before.has(b.playerId) && b.balls === 0 && b.runs === 0)
  const nowIds = new Set(present.map((b) => b.playerId))
  const left = watch.present.find((b) => !nowIds.has(b.playerId))
  const batter = fresh.at(-1)
  if (!batter) {
    // Someone left and nobody has come in yet (waiting for the scorer to pick the next batter): keep him on his card.
    return { watch: next, arrival: null, departure: left ? heldFor(state, left, watch.slots[left.playerId] ?? 'striker') : null }
  }
  const slot: Slot = inn.striker?.playerId === batter.playerId ? 'striker' : 'nonStriker'
  return { watch: next, arrival: { batter, slot, held: left ? heldFor(state, left, watch.slots[left.playerId] ?? slot) : null }, departure: null }
}
