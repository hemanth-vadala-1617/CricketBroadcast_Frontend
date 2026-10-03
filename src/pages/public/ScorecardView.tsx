import type { InningsScorecard } from '../../lib/types'
import { Card, Table, Td, Th, TeamBadge } from '../../components/ui'

/** Full scorecard of one innings, rendered verbatim from the server projection. */
export default function ScorecardView({ card }: { card: InningsScorecard }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-3 font-bold"><TeamBadge team={card.battingTeam} size={28} />{`${card.inningsNumber}. ${card.battingTeam.name}`}</div>
        <div className="font-display text-xl font-bold">{`${card.runs}-${card.wickets} (${card.overs} ov)`}</div>
      </div>

      <Table head={<tr><Th>Batter</Th><Th className="text-right">R</Th><Th className="text-right">B</Th><Th className="text-right">4s</Th><Th className="text-right">6s</Th><Th className="text-right">SR</Th></tr>}>
        {card.batting.map((b) => (
          <tr key={b.playerId}>
            <Td>
              <div className="font-semibold text-slate-900">{b.name}{b.status === 'batting' && <span className="ml-1 text-emerald-600" aria-label="batting">*</span>}</div>
              <div className="text-xs text-slate-500">{b.status === 'out' ? b.dismissalText : b.status}</div>
            </Td>
            <Td className="text-right font-bold">{b.runs}</Td><Td className="text-right">{b.balls}</Td>
            <Td className="text-right">{b.fours}</Td><Td className="text-right">{b.sixes}</Td><Td className="text-right">{b.strikeRate.toFixed(2)}</Td>
          </tr>
        ))}
      </Table>
      <div className="flex justify-between border-t border-slate-200 px-4 py-2 text-sm"><span>{`Extras ${card.extrasText}`}</span><span className="font-semibold">{card.extras}</span></div>
      <div className="flex justify-between border-t border-slate-200 px-4 py-2 text-sm font-bold"><span>Total</span><span>{`${card.runs}-${card.wickets} (${card.overs} ov)`}</span></div>
      {card.yetToBat.length > 0 && <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">{`Yet to bat: ${card.yetToBat.join(', ')}`}</p>}

      <Table head={<tr><Th>Bowler</Th><Th className="text-right">O</Th><Th className="text-right">M</Th><Th className="text-right">R</Th><Th className="text-right">W</Th><Th className="text-right">Econ</Th></tr>}>
        {card.bowling.map((b) => (
          <tr key={b.playerId}>
            <Td className="font-semibold text-slate-900">{b.name}</Td>
            <Td className="text-right">{b.overs}</Td><Td className="text-right">{b.maidens}</Td><Td className="text-right">{b.runs}</Td>
            <Td className="text-right font-bold">{b.wickets}</Td><Td className="text-right">{b.economy.toFixed(2)}</Td>
          </tr>
        ))}
      </Table>
      {card.fallOfWickets.length > 0 && (
        <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          <span className="font-semibold">Fall of wickets: </span>
          {card.fallOfWickets.map((f) => `${f.wicketNumber}-${f.score} (${f.batterName}, ${f.overs} ov)`).join(', ')}
        </p>
      )}
    </Card>
  )
}
