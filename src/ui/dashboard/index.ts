import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import type { DeliveryMetricsFilter } from '../../contracts/metrics.ts'
import { createDashboardHtml } from './html.ts'

/**
 * Register notification dashboard routes.
 *
 * SECURITY NOTE: These routes expose delivery metadata. In production,
 * wrap this group with authentication or IP-allowlist middleware.
 */
export function notificationDashboardRoutes() {
  return router.group(() => {
    // JSON metrics endpoint with short-lived cache
    router.get('metrics.json', async ({ request, response }) => {
      const notifications = await app.container.make('notification.manager')
      const filter = buildFilter(request.all())
      const metrics = await notifications.getMetrics({ filter })
      response.header('Cache-Control', 'public, max-age=5')
      return response.json(metrics)
    })

    // HTML dashboard endpoint
    router.get('/', async ({ request, response }) => {
      const notifications = await app.container.make('notification.manager')
      const filter = buildFilter(request.all())
      const metrics = await notifications.getMetrics({ filter })
      const html = createDashboardHtml(metrics, {
        title: 'Notification Metrics',
        filterQuery: Object.entries(request.qs()).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&'),
      })
      response.header('Cache-Control', 'no-store')
      return response.type('text/html').send(html)
    })

    // Per-notifiable inbox view
    router.get('inbox/:notifiableType/:notifiableId', async ({ params, request, response }) => {
      const notifications = await app.container.make('notification.manager')
      const { notifiableType, notifiableId } = params
      const filter = buildFilter(request.all())
      const metrics = await notifications.getMetrics({
        notifiableType,
        notifiableId,
        filter,
      })
      const basePath = request.url().replace(/\/inbox\/.*$/, '') || ''
      const html = createDashboardHtml(metrics, {
        title: `Inbox Metrics — ${notifiableType} ${notifiableId}`,
        basePath,
        filterQuery: Object.entries(request.qs()).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&'),
      })
      response.header('Cache-Control', 'no-store')
      return response.type('text/html').send(html)
    })
  })
}

/**
 * Build a filter object from query params.
 * Returns a 400 response if date params are invalid.
 */
function buildFilter(query: Record<string, unknown>): DeliveryMetricsFilter {
  const filter: DeliveryMetricsFilter = {}

  if (query.channel) filter.channel = String(query.channel)
  if (query.notificationType) filter.notificationType = String(query.notificationType)
  if (query.status) filter.status = String(query.status) as DeliveryMetricsFilter['status']

  if (query.from) {
    const fromDate = new Date(String(query.from))
    if (isNaN(fromDate.getTime())) {
      throw new ValidationError(`Invalid "from" date: ${query.from}`)
    }
    filter.from = fromDate
  }

  if (query.to) {
    const toDate = new Date(String(query.to))
    if (isNaN(toDate.getTime())) {
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
