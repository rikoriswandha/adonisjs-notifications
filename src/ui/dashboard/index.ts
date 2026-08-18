import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import {
  authorizeDashboardRequest,
  shouldRegisterDashboardRoutes,
  type DashboardAuthorizationResource,
  type DashboardAuthorizer,
  type NotificationDashboardOptions,
} from './authorization.ts'
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
 * In production, routes are registered only when an `authorize` callback is
 * supplied. The callback runs for every request and receives the target
 * notifiable or notification ID for object-level authorization.
 */
export function notificationDashboardRoutes(options: NotificationDashboardOptions = {}) {
  if (!shouldRegisterDashboardRoutes(app.inProduction, options)) {
    return router.group(() => {})
  }

  const authorized = (
    ctx: Parameters<DashboardAuthorizer>[0],
    resource: DashboardAuthorizationResource
  ) => authorizeDashboardRequest(ctx, resource, options.authorize)

  return router.group(() => {
    // JSON API: metrics snapshot
    router.get('api/metrics', async (ctx) => {
      if (!(await authorized(ctx, { action: 'viewMetrics' }))) return
      const notifications = await app.container.make('notification.manager')
      return apiMetricsHandler(ctx, notifications)
    })

    // JSON API: paginated inbox
    router.get('api/inbox/:notifiableType/:notifiableId', async (ctx) => {
      if (
        !(await authorized(ctx, {
          action: 'viewInbox',
          notifiableType: ctx.params.notifiableType,
          notifiableId: ctx.params.notifiableId,
        }))
      )
        return
      const notifications = await app.container.make('notification.manager')
      return apiInboxHandler(ctx, notifications, ctx.params.notifiableType, ctx.params.notifiableId)
    })

    // JSON API: CSRF token
    router.get('api/csrf', async (ctx) => {
      if (!(await authorized(ctx, { action: 'getCsrfToken' }))) return
      return apiCsrfHandler(ctx)
    })

    // JSON API: mark as read
    router.patch('api/notifications/:id/read', async (ctx) => {
      if (!(await authorized(ctx, { action: 'markAsRead', notificationId: ctx.params.id }))) return
      const notifications = await app.container.make('notification.manager')
      return apiMarkAsReadHandler(ctx, notifications, ctx.params.id)
    })

    // JSON API: mark as unread
    router.patch('api/notifications/:id/unread', async (ctx) => {
      if (!(await authorized(ctx, { action: 'markAsUnread', notificationId: ctx.params.id })))
        return
      const notifications = await app.container.make('notification.manager')
      return apiMarkAsUnreadHandler(ctx, notifications, ctx.params.id)
    })

    // JSON API: mark all as read
    router.patch('api/notifications/mark-all-read', async (ctx) => {
      const body = ctx.request.all()
      const notifiableType = String(body.notifiableType ?? body.notifiable_type ?? '')
      const notifiableId = String(body.notifiableId ?? body.notifiable_id ?? '')
      if (!(await authorized(ctx, { action: 'markAllAsRead', notifiableType, notifiableId })))
        return
      const notifications = await app.container.make('notification.manager')
      return apiMarkAllAsReadHandler(ctx, notifications)
    })

    // JSON API: delete notification
    router.delete('api/notifications/:id', async (ctx) => {
      if (!(await authorized(ctx, { action: 'deleteNotification', notificationId: ctx.params.id })))
        return
      const notifications = await app.container.make('notification.manager')
      return apiDeleteNotificationHandler(ctx, notifications, ctx.params.id)
    })

    // SPA shell (development only by default)
    if (!app.inProduction) {
      router.get('/', async (ctx) => {
        if (!(await authorized(ctx, { action: 'viewDashboard' }))) return
        const notifications = await app.container.make('notification.manager')
        return serveDashboardShell(ctx, notifications)
      })
      router.get('(.*)', async (ctx) => {
        const inboxMatch = ctx.request.url().match(/\/inbox\/([^/]+)\/([^/?]+)/)
        if (
          !(await authorized(ctx, {
            action: 'viewDashboard',
            notifiableType: inboxMatch?.[1],
            notifiableId: inboxMatch?.[2],
          }))
        )
          return
        const notifications = await app.container.make('notification.manager')
        return serveDashboardShell(ctx, notifications)
      })
    }
  })
}

export type {
  DashboardAuthorizationResource,
  DashboardAuthorizer,
  NotificationDashboardOptions,
} from './authorization.ts'
