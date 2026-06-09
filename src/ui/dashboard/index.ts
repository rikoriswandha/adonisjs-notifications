import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import type { DeliveryMetricsFilter } from '../../contracts/metrics.ts'
import { createDashboardHtml } from './html.ts'

export function notificationDashboardRoutes() {
  return router.group(() => {
    router.get('metrics.json', async ({ request, response }) => {
      const notifications = await app.container.make('notification.manager')
      const filter = buildFilter(request.all())
      const metrics = await notifications.getMetrics({ filter })
      return response.json(metrics)
    })

    router.get('/', async ({ request, response }) => {
      const notifications = await app.container.make('notification.manager')
      const filter = buildFilter(request.all())
      const metrics = await notifications.getMetrics({ filter })
      const html = createDashboardHtml(metrics, { title: 'Notification Metrics' })
      return response.type('text/html').send(html)
    })

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
      })
      return response.type('text/html').send(html)
    })
  })
}

function buildFilter(query: Record<string, unknown>): DeliveryMetricsFilter {
  const filter: DeliveryMetricsFilter = {}

  if (query.channel) filter.channel = String(query.channel)
  if (query.notificationType) filter.notificationType = String(query.notificationType)
  if (query.status) filter.status = String(query.status) as DeliveryMetricsFilter['status']
  if (query.from) filter.from = new Date(String(query.from))
  if (query.to) filter.to = new Date(String(query.to))

  return filter
}
