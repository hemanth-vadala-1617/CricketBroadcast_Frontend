import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { toast } from '../../store/useToast'
import { ADMIN, useAuthStore } from '../../store/useAuthStore'

export const useIsAdmin = () => useAuthStore((s) => s.hasRole(...ADMIN))

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export interface DeleteFlow {
  target: { id: string; name: string } | null
  pending: boolean
  ask: (id: string, name: string) => void
  cancel: () => void
  confirm: () => void
}

/** One delete flow for every admin list. `describe` turns the server reply into the toast text
 *  (teams/players return { deactivated } because used records are deactivated, not removed). */
export function useDeleteFlow(path: string, invalidate: readonly (readonly string[])[], noun: string): DeleteFlow {
  const qc = useQueryClient()
  const [target, setTarget] = useState<DeleteFlow['target']>(null)
  const [pending, setPending] = useState(false)
  return {
    target, pending,
    ask: (id, name) => setTarget({ id, name }),
    cancel: () => setTarget(null),
    confirm: () => {
      if (!target) return
      setPending(true)
      api.del<{ deactivated?: boolean } | undefined>(`${path}/${target.id}`)
        .then((res) => {
          if (res?.deactivated === true) toast.info(`${target.name} is used in match history, so it was deactivated instead of removed.`)
          else toast.success(`${noun} “${target.name}” removed.`)
          for (const k of invalidate) void qc.invalidateQueries({ queryKey: k })
          setTarget(null)
        })
        .catch((e: unknown) => { toast.error(errorMessage(e)); setTarget(null) })
        .finally(() => setPending(false))
    },
  }
}

/** Parses a number input; blank or invalid becomes 0. */
export const toInt = (v: string): number => (v === '' ? 0 : Math.trunc(Number(v)) || 0)

