import type { DeliveryMetricsFilter } from '../../contracts/metrics.ts'
import type { DatabaseNotificationRow } from '../../contracts/repository.ts'
import type { NotificationManager } from '../../notification_manager.ts'
import type { HttpContext } from '@adonisjs/core/http'
import {
  createDashboardHtml,
  createMetricsFragmentHtml,
  createInboxPageHtml,
  createInboxListHtml,
  createNotificationRowHtml,
} from './html.ts'

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
      throw new ValidationError(`Invalid "from" date: ${query.from}`)
    }
    filter.from = fromDate
  }

  if (query.to) {
    const toDate = new Date(String(query.to))
    if (Number.isNaN(toDate.getTime())) {
      throw new ValidationError(`Invalid "to" date: ${query.to}`)
    }
    filter.to = toDate
  }

  return filter
}

class ValidationError extends Error {
  public status = 400
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Build URL-encoded query string from request query params.
 */
export function buildFilterQuery(requestQs: Record<string, unknown>): string {
  return Object.entries(requestQs)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

/**
 * Extract notifiable type/id from a notification row or fall back to query params.
 */
export function extractNotifiable(
  notification: DatabaseNotificationRow,
  query: Record<string, unknown>
): { notifiableType: string; notifiableId: string } {
  return {
    notifiableType: notification.notifiableType || String(query.notifiableType || ''),
    notifiableId: String(notification.notifiableId) || String(query.notifiableId || ''),
  }
}

/**
 * HTMX out-of-band toast fragment for action feedback.
 */
export function toastOob(message: string): string {
  return `<div hx-swap-oob="innerHTML:#toast-container"><div class="toast toast-success">${message}</div></div>`
}

function extractCsrf(request: HttpContext['request']): string | undefined {
  try {
    const token = (request as unknown as { csrfToken(): string }).csrfToken()
    return typeof token === 'string' ? token : undefined
  } catch {
    return undefined
  }
}

export async function handleMetricsJson(
  _ctx: HttpContext,
  notifications: NotificationManager
): Promise<unknown> {
  const filter = buildFilter({})
  const metrics = await notifications.getMetrics({ filter })
  return metrics
}

export async function handleDashboardIndex(
  { request, response }: HttpContext,
  notifications: NotificationManager
): Promise<void> {
  const filter = buildFilter(request.all())
  const metrics = await notifications.getMetrics({ filter })
  const csrfToken = extractCsrf(request)
  const url = request.url()
  const basePath = url.includes('?') ? url.split('?')[0] : url

  if (request.header('HX-Request') === 'true') {
    const html = createMetricsFragmentHtml(metrics, {
      filterQuery: buildFilterQuery(request.qs()),
      basePath,
    })
    response.header('Cache-Control', 'no-store')
    response.type('text/html').send(html)
    return
  }

  const html = createDashboardHtml(metrics, {
    title: 'Notification Metrics',
    filterQuery: buildFilterQuery(request.qs()),
    csrfToken,
    basePath,
  })
  response.header('Cache-Control', 'no-store')
  response.type('text/html').send(html)
}

export async function handleInboxPage(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  notifiableType: string,
  notifiableId: string | number
): Promise<void> {
  const repository = notifications.getRepository()
  if (!repository) {
    response.status(400).send('Notification repository is not configured.')
    return
  }

  const query = request.qs()
  const perPage = Math.min(Number.parseInt(String(query.perPage)) || 25, 100)
  const currentPage = Math.max(1, Number.parseInt(String(query.page)) || 1)
  const offset = (currentPage - 1) * perPage
  const unreadOnly = query.unreadOnly === 'true'

  const [notificationList, unreadCount, metrics] = await Promise.all([
    repository.listFor(notifiableType, notifiableId, { limit: perPage, offset, unreadOnly }),
    repository.unreadCount(notifiableType, notifiableId),
    notifications.getMetrics({
      notifiableType,
      notifiableId,
      filter: buildFilter(request.all()),
    }),
  ])

  const csrfToken = extractCsrf(request)
  const total = metrics.inbox?.total ?? 0
  const basePath = request.url().replace(/\/inbox\/.*$/, '') || ''

  const html = createInboxPageHtml({
    metrics,
    notifications: notificationList,
    notifiableType,
    notifiableId,
    total,
    unreadCount,
    currentPage,
    perPage,
    unreadOnly,
    basePath,
    csrfToken,
  })
  response.header('Cache-Control', 'no-store')
  response.type('text/html').send(html)
}

export async function handleInboxList(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  notifiableType: string,
  notifiableId: string | number
): Promise<void> {
  const repository = notifications.getRepository()
  if (!repository) {
    response.status(400).send('Notification repository is not configured.')
    return
  }

  const query = request.qs()
  const perPage = Math.min(Number.parseInt(String(query.perPage)) || 25, 100)
  const currentPage = Math.max(1, Number.parseInt(String(query.page)) || 1)
  const offset = (currentPage - 1) * perPage
  const unreadOnly = query.unreadOnly === 'true'

  const [notificationList, metrics] = await Promise.all([
    repository.listFor(notifiableType, notifiableId, { limit: perPage, offset, unreadOnly }),
    notifications.getMetrics({ notifiableType, notifiableId }),
  ])

  const total = metrics.inbox?.total ?? 0
  const basePath = request.url().replace(/\/inbox\/.*$/, '') || ''

  const html = createInboxListHtml({
    notifications: notificationList,
    notifiableType,
    notifiableId,
    total,
    currentPage,
    perPage,
    unreadOnly,
    basePath,
  })
  response.header('Cache-Control', 'no-store')
  response.type('text/html').send(html)
}

export async function handleMarkAsRead(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  id: string
): Promise<void> {
  const repository = notifications.getRepository()
  if (!repository) {
    response.status(400).send('Notification repository is not configured.')
    return
  }

  await repository.markAsRead(id)
  const notification = await repository.findById(id)
  if (!notification) {
    response.status(404).send('Notification not found.')
    return
  }

  if (request.header('HX-Request') === 'true') {
    const rowHtml = createNotificationRowHtml(notification)
    const toast = toastOob('Marked as read')
    response.type('text/html').send(`${rowHtml}\n${toast}`)
    return
  }

  const { notifiableType, notifiableId } = extractNotifiable(notification, request.qs())
  response.redirect(`/inbox/${notifiableType}/${notifiableId}`)
}

export async function handleMarkAsUnread(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  id: string
): Promise<void> {
  const repository = notifications.getRepository()
  if (!repository) {
    response.status(400).send('Notification repository is not configured.')
    return
  }

  await repository.markAsUnread(id)
  const notification = await repository.findById(id)
  if (!notification) {
    response.status(404).send('Notification not found.')
    return
  }

  if (request.header('HX-Request') === 'true') {
    const rowHtml = createNotificationRowHtml(notification)
    const toast = toastOob('Marked as unread')
    response.type('text/html').send(`${rowHtml}\n${toast}`)
    return
  }

  const { notifiableType, notifiableId } = extractNotifiable(notification, request.qs())
  response.redirect(`/inbox/${notifiableType}/${notifiableId}`)
}

export async function handleMarkAllAsRead(
  { request, response }: HttpContext,
  notifications: NotificationManager
): Promise<void> {
  const repository = notifications.getRepository()
  if (!repository) {
    response.status(400).send('Notification repository is not configured.')
    return
  }

  const body = request.all()
  const notifiableType = String(body.notifiableType ?? body.notifiable_type ?? '')
  const notifiableId = String(body.notifiableId ?? body.notifiable_id ?? '')

  if (!notifiableType || !notifiableId) {
    response.status(400).send('Missing notifiableType or notifiableId.')
    return
  }

  await repository.markAllAsRead(notifiableType, notifiableId)
  response.redirect(`/inbox/${notifiableType}/${notifiableId}`)
}

export async function handleDeleteNotification(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  id: string
): Promise<void> {
  const repository = notifications.getRepository()
  if (!repository) {
    response.status(400).send('Notification repository is not configured.')
    return
  }

  const notification = await repository.findById(id)
  if (!notification) {
    response.status(404).send('Notification not found.')
    return
  }

  await repository.delete(id)

  if (request.header('HX-Request') === 'true') {
    const toast = toastOob('Deleted')
    response.type('text/html').send(toast)
    return
  }

  const { notifiableType, notifiableId } = extractNotifiable(notification, request.qs())
  response.redirect(`/inbox/${notifiableType}/${notifiableId}`)
}
