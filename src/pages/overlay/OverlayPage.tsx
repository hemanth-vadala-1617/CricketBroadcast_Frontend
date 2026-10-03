import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { BroadcastOverlay } from '../../components/overlay/BroadcastOverlay'
import { useLiveMatch } from '../../hooks/useLiveMatch'

/** /overlay/:matchId : the OBS Browser Source. No login, no chrome, transparent. */
export default function OverlayPage() {
  const { matchId } = useParams()
  const [params] = useSearchParams()
  const { state, status } = useLiveMatch(matchId)
  const debug = params.get('debug') === '1'

  useEffect(() => {
    const html = document.documentElement
    html.classList.add('overlay-mode')
    return () => html.classList.remove('overlay-mode')
  }, [])

  // While the first state loads (or after a bad id) draw nothing: OBS then shows the video untouched.
  // After that, a dropped socket keeps showing the last state instead of blanking the broadcast.
  return (
    <>
      {state && <BroadcastOverlay state={state} showBackground={params.get('bg') === '1'} />}
      {debug && (
        <div style={{ position: 'fixed', left: 6, bottom: 6, zIndex: 10, padding: '2px 8px', borderRadius: 6, background: '#000a', color: status === 'live' ? '#4ade80' : '#fbbf24', font: '12px monospace' }}>
          {`${status} v${state?.version ?? '-'}`}
        </div>
      )}
    </>
  )
}
