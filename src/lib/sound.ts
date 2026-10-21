// Sound effects for the overlay, made with the Web Audio API (no audio files to host or load).
// OBS browser sources may play audio freely. In a normal browser tab the sound starts after the first click or key press on the page.
// Add ?sound=0 to the overlay URL to silence it (the scorer console's own preview does this, so it never doubles the stream's sound).

let ctx: AudioContext | null = null

export function soundEnabled(search: string = typeof location === 'undefined' ? '' : location.search): boolean {
  return new URLSearchParams(search).get('sound') !== '0'
}

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  if (!Ctor) return null
  try { ctx = new Ctor() } catch { ctx = null }
  return ctx
}

export const SIREN_SECONDS = 1.5
export const SIREN_HZ = 880

/** Browsers keep audio locked until the page has had a click or key press. This listens for that and unlocks it. */
export function watchAudioLock(onChange: (locked: boolean) => void): () => void {
  const ac = context()
  if (!ac || !soundEnabled()) { onChange(false); return () => {} }
  const report = () => onChange(ac.state === 'suspended')
  const unlock = () => { void ac.resume().then(report, report) }
  ac.addEventListener?.('statechange', report)
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  report()
  return () => {
    ac.removeEventListener?.('statechange', report)
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
}

/** The no-ball siren: one steady tone (no sweep) with a short fade in and out. Safe to call anywhere (it does nothing without audio support). */
export function playSiren(): void {
  if (!soundEnabled()) return
  const ac = context()
  if (!ac) return
  try {
    if (ac.state === 'suspended') void ac.resume()
    const t0 = ac.currentTime + 0.02
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(SIREN_HZ, t0)          // one pitch, held for the whole sound
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.linearRampToValueAtTime(0.25, t0 + 0.06)
    gain.gain.setValueAtTime(0.25, t0 + SIREN_SECONDS - 0.2)
    gain.gain.linearRampToValueAtTime(0.0001, t0 + SIREN_SECONDS)
    osc.connect(gain).connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + SIREN_SECONDS + 0.05)
  } catch { /* sound is a nicety: never break the graphics over it */ }
}
