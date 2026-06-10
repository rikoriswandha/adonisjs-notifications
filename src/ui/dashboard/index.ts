import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import {
  handleDashboardIndex,
  handleInboxPage,
  handleInboxList,
  handleMarkAsRead,
  handleMarkAsUnread,
  handleMarkAllAsRead,
  handleDeleteNotification,
} from './handlers.ts'

/**
 * Register notification dashboard routes.
 *
 * SECURITY NOTE: These routes expose delivery metadata. In production,
 * wrap this group with authentication or IP-allowlist middleware.
 */
export function notificationDashboardRoutes() {
  return router.group(() => {
    // JSON metrics endpoint with short-lived cache
    router.get('metrics.json', async ({ response }) => {
      const notifications = await app.container.make('notification.manager')
      const metrics = await notifications.getMetrics({ filter: {} })
      response.header('Cache-Control', 'public, max-age=5')
      return response.json(metrics)
    })

    // HTML dashboard endpoint
    router.get('/', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return handleDashboardIndex(ctx, notifications)
    })

    // Per-notifiable inbox view
    router.get('inbox/:notifiableType/:notifiableId', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return handleInboxPage(ctx, notifications, ctx.params.notifiableType, ctx.params.notifiableId)
    })

    // HTMX partial: notification list for inbox
    router.get('inbox/:notifiableType/:notifiableId/list', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return handleInboxList(ctx, notifications, ctx.params.notifiableType, ctx.params.notifiableId)
    })

    // Mark single notification as read
    router.patch('notifications/:id/read', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return handleMarkAsRead(ctx, notifications, ctx.params.id)
    })

    // Mark single notification as unread
    router.patch('notifications/:id/unread', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return handleMarkAsUnread(ctx, notifications, ctx.params.id)
    })

    // Mark all notifications as read for a notifiable
    router.patch('notifications/mark-all-read', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return handleMarkAllAsRead(ctx, notifications)
    })

    // Delete a single notification
    router.delete('notifications/:id', async (ctx) => {
      const notifications = await app.container.make('notification.manager')
      return handleDeleteNotification(ctx, notifications, ctx.params.id)
    })
  })
}
