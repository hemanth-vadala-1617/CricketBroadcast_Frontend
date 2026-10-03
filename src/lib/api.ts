import { API_URL } from './utils'
import type { AuthResponse } from './types'
import { useAuthStore } from '../store/useAuthStore'

export class ApiError extends Error {
  readonly status: number
  readonly title?: string
  constructor(status: number, message: string, title?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.title = title
  }
}

interface ProblemDetails { title?: string; detail?: string; errors?: Record<string, string[]> }

async function toError(res: Response): Promise<ApiError> {
  let body: ProblemDetails | null = null
  try { body = (await res.json()) as ProblemDetails } catch { /* empty body */ }
  const validation = body?.errors ? Object.values(body.errors).flat().join(' ') : ''
  const message = body?.detail || validation || body?.title ||
    (res.status === 429 ? 'Too many requests. Wait a moment and try again.' : `Request failed (${res.status})`)
  return new ApiError(res.status, message, body?.title)
}

let refreshing: Promise<boolean> | null = null

/** Single-flight refresh: concurrent 401s share one refresh call. */
async function refreshSession(): Promise<boolean> {
  const { token, refreshToken, setSession, logout } = useAuthStore.getState()
  if (!token || !refreshToken) return false
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, refreshToken }),
      })
      if (!res.ok) { logout(); return false }
      setSession((await res.json()) as AuthResponse)
      return true
    } catch { return false } finally { refreshing = null }
  })()
  return refreshing
}

async function send(method: string, path: string, body: unknown, retry: boolean): Promise<Response> {
  const { token } = useAuthStore.getState()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }

  const res = await fetch(`${API_URL}${path}`, { method, headers, body: payload })
  if (res.status === 401 && retry && token && (await refreshSession())) return send(method, path, body, false)
  if (res.status === 401 && token) useAuthStore.getState().logout()
  return res
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await send(method, path, body, true)
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that the API is running.')
  }
  if (!res.ok) throw await toError(res)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
  /** Uploads an image and returns its server path ("/uploads/...") */
  upload: async (file: File): Promise<string> => {
    const form = new FormData()
    form.append('file', file)
    const r = await request<{ url: string }>('POST', '/api/media', form)
    return r.url
  },
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.'
}
