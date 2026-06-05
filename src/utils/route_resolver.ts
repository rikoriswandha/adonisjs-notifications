import type { Notification } from '../notification.ts'
import type { NormalizedNotifiable } from '../contracts/notifiable.ts'
import type { NotificationRoutingConfig } from '../contracts/config.ts'
import { E_NOTIFICATION_ROUTE_MISSING } from '../exceptions/main.ts'

/**
 * Convert channel name to PascalCase.
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Resolve the route/address for a notification channel.
 * Follows the ordered fallback chain:
 * 1. notification.routeNotificationFor(channel, notifiable)
 * 2. notifiable.routeNotificationFor{PascalCase}()
 * 3. notifiable.routeNotificationFor(channel)
 * 4. Config routing field mapping
 * 5. Throw E_NOTIFICATION_ROUTE_MISSING
 */
export function resolveRoute(
  notification: Notification,
  notifiable: NormalizedNotifiable,
  channel: string,
  routingConfig: NotificationRoutingConfig
): unknown {
  // 1. Notification-level override
  if (typeof notification.routeNotificationFor === 'function') {
    const route = notification.routeNotificationFor(channel, notifiable.original)
    if (route !== undefined && route !== null) {
      return route
    }
  }

  // 2. Notifiable PascalCase method (e.g., routeNotificationForMail)
  const pascalMethod = `routeNotificationFor${toPascalCase(channel)}`
  if (
    notifiable.original &&
    typeof notifiable.original === 'object' &&
    pascalMethod in notifiable.original
  ) {
    const method = (notifiable.original as Record<string, unknown>)[pascalMethod]
    if (typeof method === 'function') {
      const route = (method as Function).call(notifiable.original)
      if (route !== undefined && route !== null) {
        return route
      }
    }
  }

  // 3. Generic routeNotificationFor(channel)
  if (notifiable.routes.has('__resolver__')) {
    const resolver = notifiable.routes.get('__resolver__') as Function
    const route = resolver(channel)
    if (route !== undefined && route !== null) {
      return route
    }
  }

  // 4. Config routing field mapping
  const fields = routingConfig[channel]
  if (fields && fields.length > 0 && notifiable.original && typeof notifiable.original === 'object') {
    for (const field of fields) {
      const value = (notifiable.original as Record<string, unknown>)[field]
      if (value !== undefined && value !== null) {
        return value
      }
    }
  }

  // 5. Throw with context
  throw new E_NOTIFICATION_ROUTE_MISSING([
    channel,
    notifiable.type,
    notification.constructor.name,
  ])
}
