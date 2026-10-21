import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme, type ThemeMode } from '../store/useTheme'

const OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'Auto', icon: Monitor },
]

/**
 * Light / dark / follow-the-device.
 * `segmented` is the three-way switch (for the menu); `icon` is a single button that steps through the modes (for a crowded header).
 * `onDark` tunes the colours for a dark surface such as the side menu.
 */
export default function ThemeToggle({ variant = 'icon', onDark = false, className }: { variant?: 'icon' | 'segmented'; onDark?: boolean; className?: string }) {
  const mode = useTheme((s) => s.mode)
  const setMode = useTheme((s) => s.setMode)
  const cycle = useTheme((s) => s.cycle)

  if (variant === 'segmented') {
    return (
      <div role="radiogroup" aria-label="Colour theme" className={cn('inline-flex rounded-lg p-0.5', onDark ? 'bg-white/10' : 'bg-slate-200', className)}>
        {OPTIONS.map(({ mode: m, label, icon: Icon }) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} title={`${label} theme`} onClick={() => setMode(m)}
            className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-brand',
              mode === m ? (onDark ? 'bg-white/20 text-white' : 'bg-white text-slate-900 shadow') : (onDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'))}>
            <Icon className="size-3.5" aria-hidden />{label}
          </button>
        ))}
      </div>
    )
  }

  const current = OPTIONS.find((o) => o.mode === mode)!
  const next = OPTIONS[(OPTIONS.indexOf(current) + 1) % OPTIONS.length]!
  const Icon = current.icon
  return (
    <button type="button" onClick={cycle} aria-label={`Theme: ${current.label}. Switch to ${next.label}`} title={`Theme: ${current.label} (tap for ${next.label})`}
      className={cn('inline-flex items-center justify-center rounded-lg border p-2 transition focus-visible:outline-2 focus-visible:outline-brand',
        onDark ? 'border-white/20 text-white hover:bg-white/10' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50', className)}>
      <Icon className="size-4" aria-hidden />
    </button>
  )
}
