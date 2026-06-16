import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { HttpContext } from '@adonisjs/core/http'
import type { NotificationManager } from '../../notification_manager.ts'
import type { InboxQuery } from './api_handler.ts'
import {
  buildFilter,
  deleteNotification,
  getCsrfToken,
  getInbox,
  getMetrics,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  DashboardApiError,
} from './api_handler.ts'

const spaHtmlPath = fileURLToPath(new URL('./spa/dist/index.html', import.meta.url))

function sendJson(response: HttpContext['response'], data: unknown): unknown {
  response.header('Cache-Control', 'no-store')
  response.type('application/json')
  return response.json(data)
}

function sendApiError(response: HttpContext['response'], error: DashboardApiError): unknown {
  response.status(error.status).json({ error: error.message })
  return response
}

function parseInboxQuery(query: Record<string, unknown>): InboxQuery {
  return {
    page: query.page !== undefined ? Number.parseInt(String(query.page)) : undefined,
    perPage: query.perPage !== undefined ? Number.parseInt(String(query.perPage)) : undefined,
    unreadOnly: query.unreadOnly === 'true',
  }
}

function deriveBasePath(url: string): string {
  const [path] = url.split('?')
  // Strip known dashboard resource suffixes. The /notifications/...
  // actions are exposed under /api/notifications/... so they are already
  // handled by the /api/.* branch; matching /notifications/<word> here
  // would incorrectly strip the consumer's mount prefix (e.g. /notifications/dashboard).
  const match = path.match(/^(.*)(\/inbox\/[^/]+\/[^/]+|\/api\/.*)$/)
  const base = match?.[1] ?? path
  return base.replace(/\/$/, '') || '/'
}

export async function apiMetricsHandler(
  { response }: HttpContext,
  notifications: NotificationManager
): Promise<unknown> {
  try {
    const metrics = await getMetrics(notifications, buildFilter({}))
    return sendJson(response, metrics)
  } catch (error) {
    if (error instanceof DashboardApiError) return sendApiError(response, error)
    throw error
  }
}

export async function apiInboxHandler(
  { request, response }: HttpContext,
  notifications: NotificationManager,
  notifiableType: string,
  notifiableId: string | number
): Promise<unknown> {
  try {
    const result = await getInbox(
      notifications,
      notifiableType,
      notifiableId,
      parseInboxQuery(request.qs())
    )
    return sendJson(response, result)
  } catch (error) {
    if (error instanceof DashboardApiError) return sendApiError(response, error)
    throw error
  }
}

export async function apiCsrfHandler({ request, response }: HttpContext): Promise<unknown> {
  return sendJson(response, getCsrfToken(request as unknown as { csrfToken?(): string }))
}

export async function apiMarkAsReadHandler(
  { response }: HttpContext,
  notifications: NotificationManager,
  id: string
): Promise<unknown> {
  try {
    const notification = await markAsRead(notifications, id)
    return sendJson(response, notification)
  } catch (error) {
    if (error instanceof DashboardApiError) return sendApiError(response, error)
    throw error
  }
}

export async function apiMarkAsUnreadHandler(
  { response }: HttpContext,
  notifications: NotificationManager,
  id: string
): Promise<unknown> {
  try {
    const notification = await markAsUnread(notifications, id)
    return sendJson(response, notification)
  } catch (error) {
    if (error instanceof DashboardApiError) return sendApiError(response, error)
    throw error
  }
}

export async function apiMarkAllAsReadHandler(
  { request, response }: HttpContext,
  notifications: NotificationManager
): Promise<unknown> {
  try {
    const body = request.all()
    const notifiableType = String(body.notifiableType ?? body.notifiable_type ?? '')
    const notifiableId = String(body.notifiableId ?? body.notifiable_id ?? '')
    const result = await markAllAsRead(notifications, notifiableType, notifiableId)
    return sendJson(response, result)
  } catch (error) {
    if (error instanceof DashboardApiError) return sendApiError(response, error)
    throw error
  }
}

export async function apiDeleteNotificationHandler(
  { response }: HttpContext,
  notifications: NotificationManager,
  id: string
): Promise<unknown> {
  try {
    const result = await deleteNotification(notifications, id)
    return sendJson(response, result)
  } catch (error) {
    if (error instanceof DashboardApiError) return sendApiError(response, error)
    throw error
  }
}

export async function serveDashboardShell(
  { request, response }: HttpContext,
  notifications: NotificationManager
): Promise<void> {
  const basePath = deriveBasePath(request.url())
  const csrfToken = getCsrfToken(request as unknown as { csrfToken?(): string }).csrfToken

  const metrics = await getMetrics(notifications, {})
  const initialData: { metrics: unknown; inbox: unknown } = { metrics, inbox: null }

  const inboxMatch = request.url().match(/\/inbox\/([^/]+)\/([^/?]+)/)
  if (inboxMatch) {
    try {
      initialData.inbox = await getInbox(
        notifications,
        inboxMatch[1]!,
        inboxMatch[2]!,
        parseInboxQuery(request.qs())
      )
    } catch {
      initialData.inbox = null
    }
  }

  const serialized = JSON.stringify(initialData).replace(/</g, '\\u003c')
  const spaHtml = await readFile(spaHtmlPath, 'utf8')
  const html = spaHtml.replace(
    /<head\b[^>]*>/i,
    (match) =>
      `${match}\n  <meta name="csrf-token" content="${csrfToken ?? ''}">\n  <script>window.__DASHBOARD_BASE_PATH__ = ${JSON.stringify(basePath)}; window.__DASHBOARD_INITIAL_DATA__ = ${serialized};</script>`
  )

  response.header('Cache-Control', 'no-store')
  response.type('text/html').send(html)
}
