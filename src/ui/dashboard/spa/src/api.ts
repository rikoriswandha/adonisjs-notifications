export interface DashboardMetrics {
  inbox: {
    total: number
    unread: number
    read: number
    unseen: number
    byType: Record<string, number>
  } | null
  deliveries: {
    total: number
    byStatus: Record<string, number>
    byChannel: Record<string, number>
    byType: Record<string, number>
    byChannelAndStatus: Record<string, Record<string, number>>
    averageAttempts: number
    failureRate: number
  }
  computedAt: string
}

export interface InboxResult {
  notifications: Array<{
    id: string
    type: string
    notifiableType: string
    notifiableId: string | number
    data: unknown
    readAt: string | null
    seenAt: string | null
    createdAt: string
    updatedAt: string
  }>
  total: number
  unreadCount: number
  page: number
  perPage: number
}

function basePath(): string {
  const raw = window.__DASHBOARD_BASE_PATH__ ?? ''
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

function apiUrl(path: string): string {
  return `${basePath()}${path}`
}

function csrfToken(): string | undefined {
  const meta = document.querySelector('meta[name="csrf-token"]')
  if (meta?.getAttribute('content')) return meta.getAttribute('content') ?? undefined
  return undefined
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = csrfToken()
  if (token) {
    headers.set('x-csrf-token', token)
  }

  const response = await fetch(apiUrl(path), { ...options, headers })
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) message = payload.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export function getMetrics(): Promise<DashboardMetrics> {
  return request<DashboardMetrics>('/api/metrics')
}

export function getInbox(
  notifiableType: string,
  notifiableId: string | number,
  query: { page?: number; perPage?: number; unreadOnly?: boolean }
): Promise<InboxResult> {
  const params = new URLSearchParams()
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.perPage !== undefined) params.set('perPage', String(query.perPage))
  if (query.unreadOnly) params.set('unreadOnly', 'true')
  const qs = params.toString()
  return request<InboxResult>(`/api/inbox/${encodeURIComponent(notifiableType)}/${encodeURIComponent(String(notifiableId))}${qs ? `?${qs}` : ''}`)
}

export function getCsrf(): Promise<{ csrfToken: string | undefined }> {
  return request<{ csrfToken: string | undefined }>('/api/csrf')
}

export function markAsRead(id: string): Promise<unknown> {
  return request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' })
}

export function markAsUnread(id: string): Promise<unknown> {
  return request(`/api/notifications/${encodeURIComponent(id)}/unread`, { method: 'PATCH' })
}

export function markAllAsRead(notifiableType: string, notifiableId: string | number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/notifications/mark-all-read', {
    method: 'PATCH',
    body: JSON.stringify({ notifiableType, notifiableId }),
  })
}

export function deleteNotification(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
