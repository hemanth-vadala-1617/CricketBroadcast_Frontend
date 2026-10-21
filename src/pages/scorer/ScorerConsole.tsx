import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Keyboard, Maximize2, Minimize2, Radio, Volume2 } from 'lucide-react'
import { playSiren } from '../../lib/sound'
import { useLiveMatch } from '../../hooks/useLiveMatch'
import ConnectionBanner from '../../components/ConnectionBanner'
import { Button, Card, ConfirmDialog, Field, Input, Modal, Spinner, StatusBadge } from '../../components/ui'
import { cn } from '../../lib/utils'
import ScoreStrip from '../../components/scorer/ScoreStrip'
import ScoringPad from '../../components/scorer/ScoringPad'
import WicketModal from '../../components/scorer/WicketModal'
import PreInnings from '../../components/scorer/PreInnings'
import { AbsentHurtModal, CheatSheet, CompleteMatchModal, OversLostModal, PenaltyModal, PlayerPicker, RetireModal, ReviseModal, UndoModal } from '../../components/scorer/Dialogs'
import { useScorer } from './useScorer'
import { LineupToggle } from '../../components/scorer/LineupAirToggle'
import SixMeterPad from '../../components/scorer/SixMeterPad'
import ThemeToggle from '../../components/ThemeToggle'
import NextPlayerPanel from '../../components/scorer/NextPlayerPanel'
import PowerSurgeCard from '../../components/scorer/PowerSurgeCard'
import BreaksCard from '../../components/scorer/BreaksCard'
import type { PadAction } from './buildRequest'

type Dlg = null | 'wicket' | 'editWicket' | 'edit' | 'undo' | 'retire' | 'penalty' | 'endInnings' | 'declare' | 'complete'
  | 'oversLost' | 'cheat' | 'changeBowler' | 'cancelInnings' | 'session' | 'absent' | 'revise'

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </Card>
  )
}

export default function ScorerConsole() {
  const { matchId = '' } = useParams()
  const { state, status, apply } = useLiveMatch(matchId)
  const sc = useScorer(matchId, apply)
  const [dlg, setDlg] = useState<Dlg>(null)
  const [preview, setPreview] = useState(true)
  const [editReason, setEditReason] = useState('')
  const stage = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === stage.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const toggleFull = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void stage.current?.requestFullscreen?.() }

  const close = useCallback(() => setDlg(null), [])
  const openWicket = useCallback(() => setDlg('wicket'), [])
  const openUndo = useCallback(() => setDlg('undo'), [])
  const swap = useCallback(() => { void sc.swapStrike() }, [sc])

  if (!state) {
    return <div className="grid min-h-full place-items-center bg-slate-100"><Spinner label={status === 'notfound' ? 'Match not found. Open it from the Matches list.' : status === 'offline' ? 'Cannot reach the server. Check the API is running and the address in the URL. Retrying…' : 'Loading match…'} /></div>
  }

  const a = state.actions
  const inn = state.innings
  const inProgress = inn?.status === 'InProgress'
  const paused = state.status === 'RainDelay' || state.status === 'Paused'
  // After a wicket / an over the scorer is asked who is next, in the side panel and only when ready (no pop-up, nothing goes on air meanwhile).
  const needBatter = inProgress && a.awaitingNewBatter
  const needBowler = inProgress && !a.awaitingNewBatter && a.awaitingNewBowler
  const padDisabled = sc.busy || !a.canScoreBall
  const finished = state.status === 'Completed' || state.status === 'Abandoned'

  const doScore = async (action: PadAction) => { await sc.score(action) }
  const submitWicket = async (action: Extract<PadAction, { kind: 'wicket' }>) => { if ((await sc.score(action)) === 'ok') close() }
  const submitEdit = async (action: PadAction) => { if ((await sc.editLast(action, editReason.trim())) === 'ok') close() }
  const submitEditWicket = async (action: Extract<PadAction, { kind: 'wicket' }>) => { if ((await sc.editLast(action, editReason.trim())) === 'ok') close() }
  const run = (p: Promise<unknown>, after: () => void = close) => { void p.then(after) }

  return (
    <div className="min-h-full bg-slate-100">
      <header className="z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-3 py-2 shadow-sm sm:sticky sm:top-0 sm:px-4">
        {/* on a phone the title gets the whole first line and the buttons wrap onto the next one */}
        <div className="flex min-w-0 basis-full items-center gap-2 sm:basis-0 sm:flex-1">
          <Link to={`/admin/matches/${matchId}`} aria-label="Back to match" className="rounded p-1 text-slate-500 hover:bg-slate-100"><ArrowLeft className="size-5" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">{state.title}</h1>
            <p className="truncate text-xs text-slate-500">{state.tournamentName} · {state.venueName}</p>
          </div>
        </div>
        <StatusBadge status={state.status} />
        <Link to={`/producer/${matchId}`} aria-label="Producer console" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Radio className="size-4" /><span className="hidden sm:inline">Producer</span></Link>
        <Button size="sm" variant="secondary" aria-label="Preview" aria-pressed={preview} onClick={() => setPreview((p) => !p)}>{preview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}<span className="hidden sm:inline">Preview</span></Button>
        <Button size="sm" variant="secondary" aria-label="Test siren sound" title="Play the no-ball siren to check your volume" onClick={playSiren}><Volume2 className="size-4" /></Button>
        <ThemeToggle />
        <Button size="sm" variant="secondary" aria-label="Keyboard shortcuts" onClick={() => setDlg('cheat')}><Keyboard className="size-4" /></Button>
        {/* a full-width bar inside the (sticky) header, so it stays in view while scoring */}
        <ConnectionBanner status={status} />
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr]">
        {/* who is next: first on a phone (right under the header), top of the side panel on a wide screen */}
        {(needBatter || needBowler) && (
          <div className="lg:col-start-2 lg:row-start-1">
            {needBatter
              ? <NextPlayerPanel kind="batter" players={a.availableBatters} returning={a.retiredHurtIds} busy={sc.busy} onPick={(p) => void sc.newBatter(p.id)}
                  footer={a.availableBatters.length === 0 ? <Button variant="danger" onClick={() => setDlg('endInnings')}>End innings</Button> : undefined} />
              : <NextPlayerPanel kind="bowler" players={a.eligibleBowlers} busy={sc.busy} onPick={(p) => void sc.newBowler(p.id)} />}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {finished && (
            <div role="status" className="rounded-xl bg-purple-700 p-4 text-center text-lg font-bold text-white">{state.resultText ?? state.status}</div>
          )}
          {paused && (
            <div role="status" className="flex items-center justify-between gap-3 rounded-xl bg-amber-500 p-4 font-bold text-white">
              <span>{state.break?.label ?? (state.status === 'RainDelay' ? 'Rain delay' : 'Match paused')}. Scoring is locked.</span>
              <Button variant="secondary" loading={sc.busy} onClick={() => void sc.resume()}>Resume play</Button>
            </div>
          )}

          {/* The TV scoreboard exactly as OBS will show it; it updates on every ball you score. */}
          {preview && (
            <Card className="overflow-hidden">
              <div ref={stage} className="group relative aspect-video w-full bg-black [&:fullscreen]:aspect-auto [&:fullscreen]:h-screen">
                <iframe title="TV scoreboard preview" src={`/overlay/${matchId}?bg=1`} allow="autoplay; fullscreen" className="size-full border-0" />
                <button type="button" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'} title={full ? 'Exit full screen (Esc)' : 'Full screen'}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/70 px-3 py-1.5 text-sm font-semibold text-white opacity-80 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white">
                  {full ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}{full ? 'Exit' : 'Full screen'}
                </button>
              </div>
            </Card>
          )}

          {inn && <ScoreStrip state={state} />}

          {inProgress ? (
            <Card className="p-4">
              <ScoringPad disabled={padDisabled} freeHit={inn.freeHit} shortcuts={dlg === null}
                onAction={(x) => void doScore(x)} onWicket={openWicket} onSwap={swap} onUndo={openUndo} />
              {!a.canScoreBall && !paused && (a.awaitingNewBatter || a.awaitingNewBowler) && <p role="status" className="mt-3 text-sm font-semibold text-amber-700">Choose the {a.awaitingNewBatter ? 'incoming batter' : 'next bowler'} to continue.</p>}
            </Card>
          ) : (!finished || a.canStartSuperOver) && (
            <PreInnings state={state} busy={sc.busy} matchId={matchId}
              onStartMatch={() => void sc.startMatch()} onStart={(i) => void sc.startInnings(i)} onComplete={() => setDlg('complete')} />
          )}
        </div>

        <aside className={cn("flex flex-col gap-4 lg:col-start-2", (needBatter || needBowler) ? "lg:row-start-2" : "lg:row-start-1")} aria-label="Scorer actions">
          {inProgress && inn?.powerSurge && <PowerSurgeCard surge={inn.powerSurge} busy={sc.busy} onStart={() => void sc.powerSurge(true)} onCancel={() => void sc.powerSurge(false)} />}

          <BreaksCard isTest={state.isTest} current={state.break ?? (paused ? { kind: 'Other', label: state.status === 'RainDelay' ? 'Rain delay' : 'Match paused', plannedSeconds: 0, elapsedSeconds: 0 } : null)}
            canStart={state.status === 'Live' || state.status === 'InningsBreak'} busy={sc.busy}
            onStart={(k, m) => void sc.startBreak(k, m)} onResume={() => void sc.resume()} />

          <Group title="Correct">
            <Button variant="warning" disabled={sc.busy || !a.canUndo} onClick={openUndo}>Undo ball</Button>
            <Button variant="secondary" disabled={sc.busy || !a.canUndo || !state.lastBall} onClick={() => { setEditReason('Wrong runs'); setDlg('edit') }}>Edit last ball</Button>
            <Button variant="secondary" disabled={sc.busy || !inProgress || a.awaitingNewBatter || paused} onClick={swap}>Swap strike</Button>
            <Button variant="secondary" disabled={sc.busy || !inProgress || a.awaitingNewBatter} onClick={() => setDlg('retire')}>Retire batter</Button>
            <Button variant="secondary" disabled={sc.busy || !inProgress} onClick={() => setDlg('absent')}>Absent hurt</Button>
            <Button variant="secondary" disabled={sc.busy || !inProgress} onClick={() => setDlg('penalty')}>Penalty runs</Button>
            <Button variant="secondary" disabled={sc.busy || !inProgress || paused} onClick={() => void sc.deadBall()}>Dead ball</Button>
            {a.canReviseTarget && <Button variant="secondary" disabled={sc.busy || !inProgress} onClick={() => setDlg('revise')}>Revise overs / target</Button>}
            <Button variant="secondary" disabled={sc.busy || !inProgress || !inn?.bowler || a.awaitingNewBowler} onClick={() => setDlg('changeBowler')}>Change bowler</Button>
          </Group>

          {inProgress && state.lastBall?.kind === 'Six' && <SixMeterPad lastBall={state.lastBall} busy={sc.busy} onSet={(m) => void sc.sixDistance(m)} />}

          <Group title="Innings & match">
            <Button variant="secondary" disabled={sc.busy || !inProgress} onClick={() => setDlg('endInnings')}>End innings</Button>
            {a.canDeclare && <Button variant="secondary" disabled={sc.busy} onClick={() => setDlg('declare')}>Declare</Button>}
            <Button variant="secondary" disabled={sc.busy || !inProgress || state.lastBall !== null} onClick={() => setDlg('cancelInnings')}>Cancel innings start</Button>
            <Button variant="danger" disabled={sc.busy || !a.canComplete} onClick={() => setDlg('complete')}>Complete match</Button>
          </Group>

          {state.isTest && state.testClock && (
            <Group title={`Test clock · Day ${state.testClock.day} : Session ${state.testClock.session}`}>
              <p className="w-full text-sm text-slate-600">{state.testClock.oversLeftToday} overs left today{state.testClock.oversLostToday > 0 ? ` (${state.testClock.oversLostToday} lost)` : ''}</p>
              <Button variant="secondary" disabled={sc.busy} onClick={() => setDlg('session')}>Next session</Button>
              <Button variant="secondary" disabled={sc.busy} onClick={() => setDlg('oversLost')}>Overs lost today</Button>
            </Group>
          )}

          {state.scorecard.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Innings</h3>
              <ul className="space-y-1 text-sm">
                {state.scorecard.map((c) => (
                  <li key={c.inningsNumber} className="flex justify-between"><span>{c.battingTeam.shortName} · inns {c.inningsNumber}</span><span className="font-mono font-semibold">{c.runs}/{c.wickets} ({c.overs})</span></li>
                ))}
              </ul>
            </Card>
          )}

          {/* put a team's playing XI on air without leaving the scoring screen */}
          <LineupToggle state={state} onState={apply} />
        </aside>
      </div>

      {/* ---- dialogs ---- */}
      {dlg === 'wicket' && inn && <WicketModal state={state} serverError={sc.error} busy={sc.busy} onClose={close} onSubmit={(x) => void submitWicket(x)} />}
      {dlg === 'edit' && inn && (
        <Modal open onClose={close} title="Edit last ball" size="lg" footer={<Button variant="secondary" onClick={close}>Cancel</Button>}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">Press the correct result. The last ball is replaced (the old one is kept in the audit log).</p>
            <Field label="Reason" error={editReason.trim().length < 3 ? 'Give a reason (min 3 characters).' : undefined}>
              {(id) => <Input id={id} value={editReason} onChange={(e) => setEditReason(e.target.value)} />}
            </Field>
            <ScoringPad disabled={sc.busy || editReason.trim().length < 3} freeHit={false} shortcuts={false}
              onAction={(x) => void submitEdit(x)} onWicket={() => setDlg('editWicket')} />
          </div>
        </Modal>
      )}
      {dlg === 'editWicket' && inn && <WicketModal state={state} title="Replace last ball with a wicket" serverError={sc.error} busy={sc.busy} onClose={() => setDlg('edit')} onSubmit={(x) => void submitEditWicket(x)} />}
      {dlg === 'undo' && <UndoModal lastBall={state.lastBall} onClose={close} onConfirm={(r) => run(sc.undo(r))} />}
      {dlg === 'retire' && inn && <RetireModal state={state} onClose={close} onConfirm={(p, n, r) => run(sc.retire(p, n, r))} />}
      {dlg === 'penalty' && inn && <PenaltyModal battingName={inn.battingTeam.name} bowlingName={inn.bowlingTeam.name} onClose={close} onConfirm={(runs, r, toFielding) => run(sc.penalty(runs, r, toFielding))} />}
      {dlg === 'absent' && inn && (
        <AbsentHurtModal busy={sc.busy} onClose={close} onSet={(id, absent) => void sc.absentHurt(id, absent)}
          available={a.availableBatters.filter((p) => !(a.retiredHurtIds ?? []).includes(p.id))}
          absent={a.battingXI.filter((p) => (a.absentHurtIds ?? []).includes(p.id))} />
      )}
      {dlg === 'revise' && inn && (
        <ReviseModal oversNow={inn.oversLimit || state.oversPerInnings} maxOvers={100 /* the server checks it against the match rules */}
          hasTarget={inn.target !== null} targetNow={inn.target} onClose={close} onConfirm={(o, t, r) => run(sc.revise(o, t, r))} />
      )}
      {dlg === 'complete' && <CompleteMatchModal state={state} onClose={close} onConfirm={(c) => run(sc.complete(c))} />}
      {dlg === 'oversLost' && state.testClock && (
        <OversLostModal current={state.testClock.oversLostToday} max={90} onClose={close} onConfirm={(n) => run(sc.oversLost(n))} />
      )}
      {dlg === 'cheat' && <CheatSheet onClose={close} />}
      {dlg === 'changeBowler' && (
        <PlayerPicker title="Change bowler mid-over" hint="Use only if the bowler cannot finish the over (injury). The new bowler finishes the over." players={a.eligibleBowlers}
          busy={sc.busy} onClose={close} onPick={(p) => run(sc.newBowler(p.id, true))} />
      )}

      <ConfirmDialog open={dlg === 'endInnings'} title="End the innings?" confirmLabel="End innings" danger loading={sc.busy}
        message="This closes the current innings now (all out, time up, forfeit). It cannot be undone except by undoing the last ball."
        onClose={close} onConfirm={() => run(sc.endInnings(false))} />
      <ConfirmDialog open={dlg === 'declare'} title="Declare the innings?" confirmLabel="Declare" danger loading={sc.busy}
        message={`${inn?.battingTeam.name ?? 'The batting side'} declare at ${inn?.runs}/${inn?.wickets}.`}
        onClose={close} onConfirm={() => run(sc.endInnings(true))} />
      <ConfirmDialog open={dlg === 'cancelInnings'} title="Cancel this innings start?" confirmLabel="Cancel innings start" danger loading={sc.busy}
        message="No ball has been scored. The innings is removed so you can start it again with different openers."
        onClose={close} onConfirm={() => run(sc.cancelInnings())} />
      <ConfirmDialog open={dlg === 'session'} title="Move to the next session?" confirmLabel="Next session" loading={sc.busy}
        message={state.testClock ? `Currently Day ${state.testClock.day}, Session ${state.testClock.session}. After the last session the next day starts and lost overs reset.` : ''}
        onClose={close} onConfirm={() => run(sc.advanceSession())} />
    </div>
  )
}

