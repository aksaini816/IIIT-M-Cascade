const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''
let responseCsrfToken: string | undefined

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const csrfToken = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] ?? responseCsrfToken
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (csrfToken) headers.set('x-csrf-token', decodeURIComponent(csrfToken))

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'include' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? `Request failed with status ${response.status}`)
  }
  if (response.status === 204) return undefined as T
  const result = await response.json() as T & { csrfToken?: string }
  if (result && typeof result === 'object' && typeof result.csrfToken === 'string') responseCsrfToken = result.csrfToken
  return result
}
