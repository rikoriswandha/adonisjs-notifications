import type { DatabaseNotificationRow } from '../../contracts/repository.ts'
import type { NotificationManager } from '../../notification_manager.ts'
import type { HttpContext } from '@adonisjs/core/http'
import {
  buildFilter,
  deleteNotification,
  getCsrfToken,
  getInbox,
  getMetrics,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  type InboxQuery,
  DashboardApiError,
} from './api_handler.ts'
import {
  createDashboardHtml,
  createInboxPageHtml,
  createInboxListHtml,
  createMetricsFragmentHtml,
  createNotificationRowHtml,
} from './html.ts'

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
  return getCsrfToken(request as unknown as { csrfToken?(): string }).csrfToken
}

function parseInboxQuery(requestQs: Record<string, unknown>): InboxQuery {
  return {
    page: requestQs.page !== undefined ? Number.parseInt(String(requestQs.page)) : undefined,
    perPage:
      requestQs.perPage !== undefined ? Number.parseInt(String(requestQs.perPage)) : undefined,
    unreadOnly: requestQs.unreadOnly === 'true',
  }
}

export async function handleMetricsJson(
  _ctx: HttpContext,
  notifications: NotificationManager
): Promise<unknown> {
  const filter = buildFilter({})
  return getMetrics(notifications, filter)
}

export async function handleDashboardIndex(
  { request, response }: HttpContext,
  notifications: NotificationManager
): Promise<void> {
  const filter = buildFilter(request.all())
  const metrics = await getMetrics(notifications, filter)
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
  try {
    const query = parseInboxQuery(request.qs())
    const {
      notifications: notificationList,
      total,
      unreadCount,
    } = await getInbox(notifications, notifiableType, notifiableId, query)

    const metrics = await getMetrics(notifications, {
      notifiableType,
      notifiableId,
      ...buildFilter(request.all()),
    })

    const csrfToken = extractCsrf(request)
    const basePath = request.url().replace(/\/inbox\/.*$/, '') || ''

    const html = createInboxPageHtml({
      metrics,
      notifications: notificationList,
      notifiableType,
      notifiableId,
      total,
      unreadCount,
      currentPage: query.page ?? 1,
      perPage: query.perPage ?? 25,
      unreadOnly: query.unreadOnly ?? false,
      basePath,
      csrfToken,
    })
    response.header('Cache-Control', 'no-store')
    response.type('text/html').send(html)
  } catch (error) {
    if (error instanceof DashboardApiError) {
      response.status(error.status).send(error.message)
      return
    }
    throw error
  }
}

export async function handleInboxList(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  notifiableType: string,
  notifiableId: string | number
): Promise<void> {
  try {
    const query = parseInboxQuery(request.qs())
    const { notifications: notificationList, total } = await getInbox(
      notifications,
      notifiableType,
      notifiableId,
      query
    )

    const basePath = request.url().replace(/\/inbox\/.*$/, '') || ''

    const html = createInboxListHtml({
      notifications: notificationList,
      notifiableType,
      notifiableId,
      total,
      currentPage: query.page ?? 1,
      perPage: query.perPage ?? 25,
      unreadOnly: query.unreadOnly ?? false,
      basePath,
    })
    response.header('Cache-Control', 'no-store')
    response.type('text/html').send(html)
  } catch (error) {
    if (error instanceof DashboardApiError) {
      response.status(error.status).send(error.message)
      return
    }
    throw error
  }
}

export async function handleMarkAsRead(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  id: string
): Promise<void> {
  try {
    const notification = await markAsRead(notifications, id)

    if (request.header('HX-Request') === 'true') {
      const rowHtml = createNotificationRowHtml(notification)
      const toast = toastOob('Marked as read')
      response.type('text/html').send(`${rowHtml}\n${toast}`)
      return
    }

    const { notifiableType, notifiableId } = extractNotifiable(notification, request.qs())
    response.redirect(`/inbox/${notifiableType}/${notifiableId}`)
  } catch (error) {
    if (error instanceof DashboardApiError) {
      response.status(error.status).send(error.message)
      return
    }
    throw error
  }
}

export async function handleMarkAsUnread(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  id: string
): Promise<void> {
  try {
    const notification = await markAsUnread(notifications, id)

    if (request.header('HX-Request') === 'true') {
      const rowHtml = createNotificationRowHtml(notification)
      const toast = toastOob('Marked as unread')
      response.type('text/html').send(`${rowHtml}\n${toast}`)
      return
    }

    const { notifiableType, notifiableId } = extractNotifiable(notification, request.qs())
    response.redirect(`/inbox/${notifiableType}/${notifiableId}`)
  } catch (error) {
    if (error instanceof DashboardApiError) {
      response.status(error.status).send(error.message)
      return
    }
    throw error
  }
}

export async function handleMarkAllAsRead(
  { request, response }: HttpContext,
  notifications: NotificationManager
): Promise<void> {
  try {
    const body = request.all()
    const notifiableType = String(body.notifiableType ?? body.notifiable_type ?? '')
    const notifiableId = String(body.notifiableId ?? body.notifiable_id ?? '')

    await markAllAsRead(notifications, notifiableType, notifiableId)
    response.redirect(`/inbox/${notifiableType}/${notifiableId}`)
  } catch (error) {
    if (error instanceof DashboardApiError) {
      response.status(error.status).send(error.message)
      return
    }
    throw error
  }
}

export async function handleDeleteNotification(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  id: string
): Promise<void> {
  try {
    const repository = notifications.getRepository()
    const notification = await repository?.findById(id)

    await deleteNotification(notifications, id)

    if (request.header('HX-Request') === 'true') {
      const toast = toastOob('Deleted')
      response.type('text/html').send(toast)
      return
    }

    const { notifiableType, notifiableId } = extractNotifiable(
      notification ?? ({ notifiableType: '', notifiableId: '' } as DatabaseNotificationRow),
      request.qs()
    )
    response.redirect(`/inbox/${notifiableType}/${notifiableId}`)
  } catch (error) {
    if (error instanceof DashboardApiError) {
      response.status(error.status).send(error.message)
      return
    }
    throw error
  }
}
