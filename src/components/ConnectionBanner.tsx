import { Loader2, WifiOff } from 'lucide-react'
import type { LiveStatus } from '../lib/liveMatch'
import { cn } from '../lib/utils'

/**
 * Says plainly when the live connection to the server is down. It is separate from the match's own LIVE badge (which says the MATCH is
 * in progress), so the two can no longer be read as one confusing "LIVE / Offline" pair. Nothing is shown while all is well.
 */
export default function ConnectionBanner({ status, className }: { status: LiveStatus; className?: string }) {
  if (status !== 'reconnecting' && status !== 'offline') return null
  const offline = status === 'offline'
  return (
    <div role="alert" data-testid="connection-banner" data-status={status}
      className={cn('flex basis-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white', offline ? 'bg-red-600' : 'bg-amber-500', className)}>
      {offline ? <WifiOff className="size-5 shrink-0" aria-hidden /> : <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />}
      <span className="min-w-0">
        {offline
          ? 'No connection to the server. Balls you score may not be saved and the TV overlay will not update. Trying again automatically; wait until this goes away.'
          : 'Connection lost. Reconnecting… the screen and the TV overlay may be a few seconds behind.'}
      </span>
    </div>
  )
}
