import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import {
  apiCsrfHandler,
  apiDeleteNotificationHandler,
  apiInboxHandler,
  apiMarkAllAsReadHandler,
  apiMarkAsReadHandler,
  apiMarkAsUnreadHandler,
  apiMetricsHandler,
  serveDashboardShell,
} from './route_handlers.ts'

/**
 * Register notification dashboard routes.
 *
 * SECURITY NOTE: These routes expose delivery metadata. In production,
 * wrap this group with authentication or IP-allowlist middleware.
 */
export function notificationDashboardRoutes() {
  return router.group(() => {
    // JSON API: metrics snapshot
    router.get('api/metrics', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return apiMetricsHandler(ctx, notifications)
    })

    // JSON API: paginated inbox
    router.get('api/inbox/:notifiableType/:notifiableId', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return apiInboxHandler(ctx, notifications, ctx.params.notifiableType, ctx.params.notifiableId)
    })

    // JSON API: CSRF token
    router.get('api/csrf', async (ctx) => apiCsrfHandler(ctx))

    // JSON API: mark as read
    router.patch('api/notifications/:id/read', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return apiMarkAsReadHandler(ctx, notifications, ctx.params.id)
    })

    // JSON API: mark as unread
    router.patch('api/notifications/:id/unread', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return apiMarkAsUnreadHandler(ctx, notifications, ctx.params.id)
    })

    // JSON API: mark all as read
    router.patch('api/notifications/mark-all-read', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return apiMarkAllAsReadHandler(ctx, notifications)
    })

    // JSON API: delete notification
    router.delete('api/notifications/:id', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return apiDeleteNotificationHandler(ctx, notifications, ctx.params.id)
    })

    // SPA shell (development only by default)
    if (!app.inProduction) {
      router.get('/', async (ctx) => {
        const notifications = await app.container.make('notification.manager')
        return serveDashboardShell(ctx, notifications)
      })
      router.get('(.*)', async (ctx) => {
        const notifications = await app.container.make('notification.manager')
        return serveDashboardShell(ctx, notifications)
      })
    }
  })
}
