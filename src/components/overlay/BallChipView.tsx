import type { BallChip } from '../../lib/types'
import { chipColors } from './chipColors'

export function BallChipView({ chip, size = 44 }: { chip: BallChip; size?: number }) {
  const c = chipColors[chip.kind]
  const label = chip.kind === 'Dot' ? '•' : chip.label
  const fontSize = label.length > 3 ? size * 0.3 : label.length > 2 ? size * 0.38 : size * 0.52
  return (
    <span
      data-kind={chip.kind}
      className="font-display"
      style={{ width: size, height: size, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', background: c.bg, color: c.fg, border: `3px solid ${c.border}`, boxSizing: 'border-box', fontSize, fontWeight: 700, lineHeight: 1 }}
    >
      {label}
    </span>
  )
}

