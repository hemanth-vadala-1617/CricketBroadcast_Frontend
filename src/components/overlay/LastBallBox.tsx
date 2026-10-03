import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { LastBall, MatchState } from '../../lib/types'
import { ballStyle, reelDigits, sparkVectors } from './lastBallStyle'

export const HIGHLIGHT_MS = 5000
const LINE = 96            // px: height of one digit line in the box
const SPARKS = sparkVectors()

// Centre box of the scorebug: the result of the last ball.
// For FOUR, SIX, OUT, NO BALL and WIDE the full-screen burst plays first; `delayMs` (the burst's length) holds the box on the
// previous result until the burst is gone, then the box switches to the new ball and plays its own motion (see lastBallStyle).
// Other balls update at once. After ~5 s the box settles to dark with a quiet coloured border, so the event stays recognisable.
export function LastBallBox({ state, delayMs = 0 }: { state: MatchState; delayMs?: number }) {
  const ball = state.lastBall
  const seen = useRef<string | null>(ball?.ballId ?? null)
  const [shown, setShown] = useState<LastBall | null>(ball)     // what the box displays right now
  const [highlight, setHighlight] = useState(false)

  useEffect(() => {
    const id = ball?.ballId ?? null
    if (id === seen.current) return
    seen.current = id
    if (!ball) { setShown(null); setHighlight(false); return }

    let settle: ReturnType<typeof setTimeout> | undefined
    const play = () => {
      setShown(ball)
      setHighlight(true)
      settle = setTimeout(() => setHighlight(false), HIGHLIGHT_MS)
    }
    const waitForBurst = delayMs > 0 && ballStyle(ball.kind) !== null
    if (waitForBurst) setHighlight(false)
    const start = waitForBurst ? setTimeout(play, delayMs) : undefined
    if (!waitForBurst) play()
    return () => { clearTimeout(start); clearTimeout(settle) }
    // only a NEW ball restarts this; later state versions for the same ball must not
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ball?.ballId])

  const style = ballStyle(shown?.kind)
  const live = highlight && !!style          // highlighted right now
  const settled = !highlight && !!style      // highlight over, border remains
  const label = shown ? shown.label : '–'
  const reel = live && style.flair === 'foil' ? reelDigits(label) : null

  const box: CSSProperties = {
    position: 'relative', width: 320, height: 118, borderRadius: 16, margin: '0 12px', display: 'grid', placeItems: 'center',
    boxSizing: 'border-box', transition: 'background .3s, box-shadow .3s, border-color .3s',
    background: live ? style.bg : '#05070b',
    border: `4px solid ${live ? style.border : settled ? `${style.border}b3` : 'rgba(255,255,255,.18)'}`,
    boxShadow: live ? `0 0 0 3px ${style.glow}55, 0 0 34px 6px ${style.glow}88` : settled ? `0 0 14px 1px ${style.glow}55` : 'none',
  }

  const text: CSSProperties = {
    position: 'relative', fontSize: label.length > 3 ? 64 : LINE, fontWeight: 700, lineHeight: 1, color: live ? style.fg : '#fde047',
    textShadow: live ? '0 4px 0 rgba(0,0,0,.35)' : 'none', animation: live && !reel ? style.intro : undefined,
  }
  if (live && style.flair === 'ring') text.textShadow = '0 0 22px #4ade80'
  if (live && style.flair === 'glitch') text.textShadow = '3px 0 #22d3ee, -3px 0 #f472b6'

  return (
    <div data-testid="last-ball" data-highlight={live ? 'true' : 'false'} data-flair={live ? style.flair : 'none'} data-kind={shown?.kind ?? 'none'} data-settled={settled ? 'true' : 'false'} style={box}>
      {live && style.flair === 'ring' && (
        <>
          <span aria-hidden data-testid="gleam" style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden', pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', top: -10, bottom: -10, left: 0, width: 46, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)', animation: 'lb-gleam 1.1s ease-in-out .5s 3 both' }} />
          </span>
          <span aria-hidden data-testid="ring" style={{ position: 'absolute', inset: -4, borderRadius: 16, border: `4px solid ${style.glow}`, pointerEvents: 'none', animation: 'lb-ring 1s ease-out 3 both' }} />
        </>
      )}

      {live && style.flair === 'march' && (
        <span aria-hidden data-testid="stripes" style={{ position: 'absolute', inset: 0, borderRadius: 12, pointerEvents: 'none', background: 'repeating-linear-gradient(135deg, rgba(251,191,36,.38) 0 14px, transparent 14px 28px)', backgroundSize: '39.6px 39.6px', animation: 'lb-march .8s linear infinite' }} />
      )}

      {live && style.flair === 'glitch' && (
        <span aria-hidden data-testid="scanlines" style={{ position: 'absolute', inset: 0, borderRadius: 12, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.35) 0 2px, transparent 2px 4px)', animation: 'lb-scan .9s steps(3) 4' }} />
      )}

      {live && style.flair === 'foil' && SPARKS.map((s, i) => (
        <span key={i} aria-hidden data-testid="spark" style={{
          position: 'absolute', left: '50%', top: '50%', width: i % 2 === 0 ? 9 : 6, height: i % 2 === 0 ? 9 : 6, margin: -4, borderRadius: '50%',
          background: i % 3 === 0 ? '#ffffff' : '#fde047', boxShadow: '0 0 8px 2px #facc15', pointerEvents: 'none',
          ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px`, animation: `lb-spark 1s ease-out ${0.55 + (i % 3) * 0.08}s 2 both`,
        }} />
      ))}

      {reel ? (
        // odometer: a column of 0..N slides up inside a one-line window and lands on the result
        <span data-testid="reel" className="font-display" style={{ display: 'block', height: LINE, overflow: 'hidden', fontSize: LINE, fontWeight: 700, lineHeight: `${LINE}px` }}>
          <span key={shown?.ballId} style={{ display: 'flex', flexDirection: 'column', ['--dist' as string]: `${(reel.length - 1) * LINE}px`, animation: style!.intro }}>
            {reel.map((d, i) => (
              <span key={d} style={{ height: LINE, ...(i === reel.length - 1 ? { backgroundImage: 'linear-gradient(100deg, #fde047 25%, #ffffff 48%, #fde047 72%)', backgroundSize: '260% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', animation: 'lb-foil 1.2s linear 1s infinite' } : { color: '#fde047' }) }}>{d}</span>
            ))}
          </span>
        </span>
      ) : (
        <span key={live ? shown?.ballId : 'settled'} className="font-display" style={text}>{label}</span>
      )}
    </div>
  )
}
