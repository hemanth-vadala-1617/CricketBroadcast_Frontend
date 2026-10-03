import { assetUrl } from '../../lib/utils'
import type { MatchState } from '../../lib/types'

/** Festival / sponsor banner. Text -> a bar; image only -> a centred badge like "Happy Independence Day". */
export function BannerBar({ state }: { state: MatchState }) {
  const payload = state.graphics.Banner.payload
  const text = typeof payload?.text === 'string' ? payload.text : ''
  const image = assetUrl(typeof payload?.imageUrl === 'string' ? payload.imageUrl : null)
  if (!text && !image) return null

  if (!text && image) {
    return (
      <div data-testid="banner" style={{ position: 'absolute', left: '50%', top: 330, transform: 'translateX(-50%)' }}>
        <img src={image} alt="" style={{ width: 300, height: 300, objectFit: 'contain', borderRadius: '50%', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.5))' }} />
      </div>
    )
  }
  return (
    <div data-testid="banner" style={{ position: 'absolute', left: 40, right: 40, bottom: 360, height: 110, borderRadius: 18, background: `linear-gradient(90deg, ${state.theme.primaryColor}, ${state.theme.secondaryColor})`, border: `3px solid ${state.theme.accentColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, color: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,.5)' }}>
      {image && <img src={image} alt="" style={{ height: 90, objectFit: 'contain' }} />}
      <span className="font-display" style={{ fontSize: 62, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  )
}
