import { useState } from 'react'
import { Avatar, Button, Checkbox, Field, Input, Modal, NumberInput, Select } from '../ui'
import { BallChip } from './ScoreStrip'
import { cn } from '../../lib/utils'
import type { CompleteInput } from '../../pages/scorer/useScorer'
import type { LastBall, MatchState, PlayerLite } from '../../lib/types'

const noop = () => undefined

/** Blocking picker (cannot be dismissed): used when the match cannot continue without a choice. */
export function PlayerPicker({ title, hint, players, blocking, busy, onPick, onClose, footer }: {
  title: string; hint?: string; players: PlayerLite[]; blocking?: boolean; busy?: boolean
  onPick: (p: PlayerLite) => void; onClose?: () => void; footer?: React.ReactNode
}) {
  return (
    <Modal open onClose={blocking ? noop : onClose ?? noop} title={title} size="md" footer={footer}>
      {hint && <p className="mb-3 text-sm text-slate-600">{hint}</p>}
      {players.length === 0 && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No one is available. Check the playing XI or end the innings.</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {players.map((p) => (
          <li key={p.id}>
            <button type="button" disabled={busy} onClick={() => onPick(p)}
              className="flex w-full items-center gap-3 rounded-lg border border-slate-300 bg-white p-2 text-left font-semibold hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">
              <Avatar name={p.name} src={p.photoUrl} size={32} /><span className="truncate">{p.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

const QUICK_REASONS = ['Mis-click', 'Wrong runs', 'Wrong batter', 'Wrong extras']

export function ReasonModal({ title, intro, confirmLabel, danger, onConfirm, onClose, children }: {
  title: string; intro?: React.ReactNode; confirmLabel: string; danger?: boolean
  onConfirm: (reason: string) => void; onClose: () => void; children?: React.ReactNode
}) {
  const [reason, setReason] = useState('Mis-click')
  const ok = reason.trim().length >= 3
  return (
    <Modal open onClose={onClose} title={title} size="md" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} disabled={!ok} onClick={() => onConfirm(reason.trim())}>{confirmLabel}</Button>
    </>}>
      <div className="flex flex-col gap-3">
        {intro}
        {children}
        <div className="flex flex-wrap gap-2" aria-label="Quick reasons">
          {QUICK_REASONS.map((q) => (
            <button key={q} type="button" aria-pressed={reason === q} onClick={() => setReason(q)}
              className={cn('rounded-full border px-3 py-1.5 text-sm font-semibold', reason === q ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white')}>{q}</button>
          ))}
        </div>
        <Field label="Reason (kept in the audit log)" hint="At least 3 characters.">
          {(id) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
      </div>
    </Modal>
  )
}

export function UndoModal({ lastBall, onConfirm, onClose }: { lastBall: LastBall | null; onConfirm: (reason: string) => void; onClose: () => void }) {
  return (
    <ReasonModal title="Undo last ball" confirmLabel="Undo ball" danger onConfirm={onConfirm} onClose={onClose}
      intro={lastBall && (
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <BallChip label={lastBall.label} kind={lastBall.kind} big />
          <p className="text-sm text-slate-600">This ball will be removed and the batters, bowler and score restored exactly as before. Repeat to go back further.</p>
        </div>
      )} />
  )
}

export function PenaltyModal({ onConfirm, onClose }: { onConfirm: (runs: number, reason: string) => void; onClose: () => void }) {
  const [runs, setRuns] = useState(5)
  const [reason, setReason] = useState('')
  const ok = runs !== 0 && Math.abs(runs) <= 25
  return (
    <Modal open onClose={onClose} title="Penalty runs" size="sm" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button disabled={!ok} onClick={() => onConfirm(runs, reason.trim() || 'Penalty runs')}>Apply</Button>
    </>}>
      <div className="flex flex-col gap-3">
        <Field label="Runs (negative corrects a mistake)" hint="Between -25 and 25, not 0.">
          {(id) => <Input id={id} type="number" min={-25} max={25} value={runs} onChange={(e) => setRuns(Number(e.target.value))} />}
        </Field>
        <Field label="Reason">{(id) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Ball hit the helmet" />}</Field>
      </div>
    </Modal>
  )
}

export function RetireModal({ state, onConfirm, onClose }: { state: MatchState; onConfirm: (playerId: string, newBatterId: string | null, reason: string) => void; onClose: () => void }) {
  const inn = state.innings!
  const [who, setWho] = useState(inn.striker?.playerId ?? '')
  const [incoming, setIncoming] = useState('')
  const [reason, setReason] = useState('Injury')
  return (
    <Modal open onClose={onClose} title="Retire batter" size="md" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button disabled={!who} onClick={() => onConfirm(who, incoming || null, reason.trim() || 'Retired hurt')}>Retire</Button>
    </>}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-600">Retired hurt is not a wicket. The batter may return later.</p>
        <Field label="Batter retiring">
          {(id) => <Select id={id} value={who} onChange={(e) => setWho(e.target.value)}>
            {inn.striker && <option value={inn.striker.playerId}>{inn.striker.name} (striker)</option>}
            {inn.nonStriker && <option value={inn.nonStriker.playerId}>{inn.nonStriker.name} (non-striker)</option>}
          </Select>}
        </Field>
        <Field label="Incoming batter">
          {(id) => <Select id={id} value={incoming} onChange={(e) => setIncoming(e.target.value)}>
            <option value="">Choose later</option>
            {state.actions.availableBatters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>}
        </Field>
        <Field label="Reason">{(id) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      </div>
    </Modal>
  )
}

export function OversLostModal({ current, max, onConfirm, onClose }: { current: number; max: number; onConfirm: (n: number) => void; onClose: () => void }) {
  const [n, setN] = useState(current)
  return (
    <Modal open onClose={onClose} title="Overs lost today" size="sm" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button disabled={n < 0 || n > max} onClick={() => onConfirm(n)}>Save</Button>
    </>}>
      <Field label="Overs lost to rain / bad light today" hint={`0 to ${max}. Reduces “overs left today”.`}>
        {(id) => <NumberInput id={id} max={max} value={n} onValueChange={setN} />}
      </Field>
    </Modal>
  )
}

export function CompleteMatchModal({ state, onConfirm, onClose }: { state: MatchState; onConfirm: (c: CompleteInput) => void; onClose: () => void }) {
  const [type, setType] = useState<CompleteInput['resultType']>('Win')
  const [winner, setWinner] = useState('')
  const [text, setText] = useState('')
  const [sure, setSure] = useState(false)
  const needsWinner = type === 'Win'
  const ok = sure && (!needsWinner || !!winner)
  return (
    <Modal open onClose={onClose} title="Complete match" size="md" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant={type === 'Abandoned' ? 'danger' : 'primary'} disabled={!ok} onClick={() => onConfirm({ resultType: type, winnerTeamId: needsWinner ? winner : null, resultText: text.trim() || null })}>
        {type === 'Abandoned' ? 'Abandon match' : 'Complete match'}
      </Button>
    </>}>
      <div className="flex flex-col gap-3">
        <Field label="Result">
          {(id) => <Select id={id} value={type} onChange={(e) => setType(e.target.value as CompleteInput['resultType'])}>
            <option value="Win">Win</option><option value="Tie">Tie</option><option value="Draw">Draw</option>
            <option value="NoResult">No result</option><option value="Abandoned">Abandoned</option>
          </Select>}
        </Field>
        {needsWinner && (
          <Field label="Winner">
            {(id) => <Select id={id} value={winner} onChange={(e) => setWinner(e.target.value)}>
              <option value="">Select…</option>
              <option value={state.homeTeam.id}>{state.homeTeam.name}</option>
              <option value={state.awayTeam.id}>{state.awayTeam.name}</option>
            </Select>}
          </Field>
        )}
        <Field label="Result text (optional)" hint="Leave empty to generate, e.g. “India won”.">{(id) => <Input id={id} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
        <Checkbox checked={sure} onChange={(e) => setSure(e.target.checked)} label="I understand this ends the match and any live innings." />
      </div>
    </Modal>
  )
}

const SHORTCUTS: [string, string][] = [
  ['0 – 6', 'Runs off the bat (4 and 6 are boundaries)'], ['W', 'Wicket'], ['D', 'Wide'], ['N', 'No-ball'], ['B', 'Bye'],
  ['L', 'Leg-bye'], ['S', 'Swap strike'], ['Ctrl + Z', 'Undo last ball'], ['Esc', 'Close a dialog'],
]
export function CheatSheet({ onClose }: { onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Keyboard shortcuts" size="sm" footer={<Button onClick={onClose}>Done</Button>}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {SHORTCUTS.map(([k, d]) => (
          <div key={k} className="contents"><dt><kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold">{k}</kbd></dt><dd className="text-slate-700">{d}</dd></div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-slate-500">Shortcuts are off while a dialog is open or you are typing in a field.</p>
    </Modal>
  )
}

