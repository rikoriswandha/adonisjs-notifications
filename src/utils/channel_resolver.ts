import type { Notification } from '../notification.ts'
import { E_NOTIFICATION_MESSAGE_MISSING } from '../exceptions/main.ts'

/**
 * Convert channel name to PascalCase.
 * e.g., "mail" → "Mail", "database" → "Database"
 */
function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Resolve the message payload from a notification for a specific channel.
 * Calls to{PascalCase}(channel) on the notification.
 */
export function resolveChannelMessage(
  notification: Notification,
  notifiable: unknown,
  channel: string
): unknown {
  const methodName = `to${toPascalCase(channel)}`
  const method = (notification as unknown as Record<string, unknown>)[methodName]

  if (typeof method !== 'function') {
    throw new E_NOTIFICATION_MESSAGE_MISSING([
      notification.constructor.name,
      toPascalCase(channel),
      channel,
    ])
  }

  return (method as Function).call(notification, notifiable)
}
