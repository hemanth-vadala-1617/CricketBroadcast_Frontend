import type { InningsScorecard, MatchState } from '../../lib/types'

const cell = { padding: '2px 8px', whiteSpace: 'nowrap' } as const
const num = { ...cell, textAlign: 'right' } as const

function Column({ card, accent }: { card: InningsScorecard; accent: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, fontSize: 21 }}>
      <div className="font-display" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `3px solid ${accent}`, paddingBottom: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{`${card.inningsNumber}. ${card.battingTeam.name}`}</span>
        <span style={{ fontSize: 40, fontWeight: 700, color: accent }}>{`${card.runs}-${card.wickets} (${card.overs})`}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {card.batting.map((b) => (
            <tr key={b.playerId} style={{ opacity: b.status === 'out' ? 0.85 : 1 }}>
              <td style={{ ...cell, maxWidth: 330, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <span style={{ fontWeight: 700 }}>{b.name}</span>
                <span style={{ opacity: 0.65, marginLeft: 8, fontSize: 17 }}>{b.status === 'out' ? b.dismissalText : b.status}</span>
              </td>
              <td style={{ ...num, fontWeight: 700 }}>{b.runs}</td>
              <td style={num}>{b.balls}</td>
              <td style={num}>{b.fours}</td>
              <td style={num}>{b.sixes}</td>
              <td style={num}>{b.strikeRate.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ ...cell, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
        <span>{`Extras ${card.extrasText}`}</span><span style={{ fontWeight: 700 }}>{card.extras}</span>
      </div>
      {card.yetToBat.length > 0 && <div style={{ ...cell, whiteSpace: 'normal', opacity: 0.75, fontSize: 17 }}>{`Yet to bat: ${card.yetToBat.join(', ')}`}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, borderTop: '1px solid rgba(255,255,255,.3)' }}>
        <thead>
          <tr style={{ opacity: 0.7, fontSize: 16 }}>
            <th style={{ ...cell, textAlign: 'left' }}>BOWLING</th><th style={num}>O</th><th style={num}>M</th><th style={num}>R</th><th style={num}>W</th><th style={num}>ECON</th>
          </tr>
        </thead>
        <tbody>
          {card.bowling.map((b) => (
            <tr key={b.playerId}>
              <td style={{ ...cell, fontWeight: 700 }}>{b.name}</td>
              <td style={num}>{b.overs}</td><td style={num}>{b.maidens}</td><td style={num}>{b.runs}</td>
              <td style={{ ...num, fontWeight: 700 }}>{b.wickets}</td><td style={num}>{b.economy.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {card.fallOfWickets.length > 0 && (
        <div style={{ ...cell, whiteSpace: 'normal', marginTop: 6, fontSize: 16, opacity: 0.8 }}>
          {`FoW: ${card.fallOfWickets.map((f) => `${f.wicketNumber}-${f.score} (${f.batterName}, ${f.overs} ov)`).join(', ')}`}
        </div>
      )}
    </div>
  )
}

/** Full-screen scorecard: the latest two innings side by side. */
export function FullScorecardPanel({ state }: { state: MatchState }) {
  const cards = state.scorecard.slice(-2)
  return (
    <div data-testid="full-scorecard" style={{ position: 'absolute', left: 60, right: 60, top: 40, bottom: 40, borderRadius: 24, background: 'rgba(6,10,18,.95)', border: `4px solid ${state.theme.accentColor}`, color: '#fff', padding: '24px 36px', overflow: 'hidden' }}>
      <div className="font-display" style={{ fontSize: 30, letterSpacing: 4, color: state.theme.accentColor, marginBottom: 12 }}>{`${state.title.toUpperCase()}  •  SCORECARD`}</div>
      <div style={{ display: 'flex', gap: 48 }}>
        {cards.length === 0 ? <div className="font-display" style={{ fontSize: 40 }}>No innings yet</div> : cards.map((c) => <Column key={c.inningsNumber} card={c} accent={state.theme.accentColor} />)}
      </div>
    </div>
  )
}
