import type { DeliveryMetricsFilter, NotificationMetrics } from '../../contracts/metrics.ts'
import type { DatabaseNotificationRow, NotificationRepository } from '../../contracts/repository.ts'
import type { NotificationManager } from '../../notification_manager.ts'

/**
 * Errors thrown by the dashboard API carry an HTTP status so the transport
 * adapter can render the right response code.
 */
export class DashboardApiError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message)
    this.name = 'DashboardApiError'
  }
}

/**
 * Build a filter object from query params.
 */
export function buildFilter(query: Record<string, unknown>): DeliveryMetricsFilter {
  const filter: DeliveryMetricsFilter = {}

  if (query.channel) filter.channel = String(query.channel)
  if (query.notificationType) filter.notificationType = String(query.notificationType)
  if (query.status) filter.status = String(query.status) as DeliveryMetricsFilter['status']

  if (query.from) {
    const fromDate = new Date(String(query.from))
    if (Number.isNaN(fromDate.getTime())) {
      throw new DashboardApiError(`Invalid "from" date: ${query.from}`, 400)
    }
    filter.from = fromDate
  }

  if (query.to) {
    const toDate = new Date(String(query.to))
    if (Number.isNaN(toDate.getTime())) {
      throw new DashboardApiError(`Invalid "to" date: ${query.to}`, 400)
    }
    filter.to = toDate
  }

  return filter
}

function requireRepository(manager: NotificationManager): NotificationRepository {
  const repository = manager.getRepository()
  if (!repository) {
    throw new DashboardApiError('Notification repository is not configured.', 400)
  }
  return repository
}

export interface InboxQuery {
  page?: number
  perPage?: number
  unreadOnly?: boolean
}

export interface InboxResult {
  notifications: DatabaseNotificationRow[]
  total: number
  unreadCount: number
  page: number
  perPage: number
}

/**
 * Get the global metrics snapshot.
 */
export async function getMetrics(
  manager: NotificationManager,
  filter: DeliveryMetricsFilter
): Promise<NotificationMetrics> {
  return manager.getMetrics({ filter })
}

/**
 * Get a paginated inbox for a single notifiable.
 */
export async function getInbox(
  manager: NotificationManager,
  notifiableType: string,
  notifiableId: string | number,
  query: InboxQuery
): Promise<InboxResult> {
  const repository = requireRepository(manager)

  const perPage = Math.min(Number.parseInt(String(query.perPage)) || 25, 100)
  const page = Math.max(1, Number.parseInt(String(query.page)) || 1)
  const offset = (page - 1) * perPage
  const unreadOnly = query.unreadOnly === true

  const [notifications, unreadCount, metrics] = await Promise.all([
    repository.listFor(notifiableType, notifiableId, { limit: perPage, offset, unreadOnly }),
    repository.unreadCount(notifiableType, notifiableId),
    manager.getMetrics({ notifiableType, notifiableId, filter: {} }),
  ])

  return {
    notifications,
    total: metrics.inbox?.total ?? 0,
    unreadCount,
    page,
    perPage,
  }
}

/**
 * Extract the CSRF token from an Adonis request.
 */
export function getCsrfToken(request: { csrfToken?(): string }): { csrfToken: string | undefined } {
  try {
    const token = request.csrfToken?.()
    return { csrfToken: typeof token === 'string' ? token : undefined }
  } catch {
    return { csrfToken: undefined }
  }
}

/**
 * Mark a notification as read and return the updated row.
 */
export async function markAsRead(
  manager: NotificationManager,
  id: string
): Promise<DatabaseNotificationRow> {
  const repository = requireRepository(manager)
  await repository.markAsRead(id)
  const notification = await repository.findById(id)
  if (!notification) {
    throw new DashboardApiError('Notification not found.', 404)
  }
  return notification
}

/**
 * Mark a notification as unread and return the updated row.
 */
export async function markAsUnread(
  manager: NotificationManager,
  id: string
): Promise<DatabaseNotificationRow> {
  const repository = requireRepository(manager)
  await repository.markAsUnread(id)
  const notification = await repository.findById(id)
  if (!notification) {
    throw new DashboardApiError('Notification not found.', 404)
  }
  return notification
}

/**
 * Mark every notification for a notifiable as read.
 */
export async function markAllAsRead(
  manager: NotificationManager,
  notifiableType: string,
  notifiableId: string | number
): Promise<{ ok: true }> {
  if (!notifiableType || !notifiableId) {
    throw new DashboardApiError('Missing notifiableType or notifiableId.', 400)
  }

  const repository = requireRepository(manager)
  await repository.markAllAsRead(notifiableType, notifiableId)
  return { ok: true as const }
}

/**
 * Delete a notification by ID.
 */
export async function deleteNotification(
  manager: NotificationManager,
  id: string
): Promise<{ ok: true }> {
  const repository = requireRepository(manager)
  const notification = await repository.findById(id)
  if (!notification) {
    throw new DashboardApiError('Notification not found.', 404)
  }

  await repository.delete(id)
  return { ok: true as const }
}
