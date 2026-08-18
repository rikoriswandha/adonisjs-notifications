import type { HttpContext } from '@adonisjs/core/http'

export type DashboardAuthorizationResource =
  | { action: 'viewMetrics' }
  | { action: 'viewInbox'; notifiableType: string; notifiableId: string }
  | { action: 'getCsrfToken' }
  | { action: 'markAsRead'; notificationId: string }
  | { action: 'markAsUnread'; notificationId: string }
  | { action: 'markAllAsRead'; notifiableType: string; notifiableId: string }
  | { action: 'deleteNotification'; notificationId: string }
  | {
      action: 'viewDashboard'
      notifiableType?: string
      notifiableId?: string
    }

export type DashboardAuthorizer = (
  ctx: HttpContext,
  resource: DashboardAuthorizationResource
) => boolean | Promise<boolean>

export interface NotificationDashboardOptions {
  /**
   * Authorize each dashboard request and its target resource.
   * Required for dashboard API routes to be registered in production.
   */
  authorize?: DashboardAuthorizer
}

/**
 * Production registration is fail-closed unless a per-request authorizer exists.
 */
export function shouldRegisterDashboardRoutes(
  inProduction: boolean,
  options: NotificationDashboardOptions
): boolean {
  return !inProduction || typeof options.authorize === 'function'
}

/**
 * Run the configured authorizer and render a consistent forbidden response.
 */
export async function authorizeDashboardRequest(
  ctx: HttpContext,
  resource: DashboardAuthorizationResource,
  authorize?: DashboardAuthorizer
): Promise<boolean> {
  if (!authorize || (await authorize(ctx, resource))) {
    return true
  }

  ctx.response.forbidden({ error: 'Forbidden' })
  return false
}
