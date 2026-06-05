import type { Notification } from '../notification.ts'
import { E_NOTIFICATION_SERIALIZATION_FAILED } from '../exceptions/main.ts'
import type { NormalizedNotifiable } from '../contracts/notifiable.ts'

/**
 * Serialize a notification instance for queue dispatch.
 * Tier 1 (default): extract all enumerable own properties.
 * Tier 2 (override): if notification has a serialize() method, use it.
 */
export function serializeNotification(notification: Notification): Record<string, unknown> {
  if (typeof (notification as any).serialize === 'function') {
    return (notification as any).serialize()
  }

  const data: Record<string, unknown> = {}
  for (const key of Object.keys(notification)) {
    data[key] = (notification as any)[key]
  }
  return data
}

/**
 * Deserialize a notification from queue payload data.
 * Uses aliases map for lookup. Supports static deserialize() override.
 */
export function deserializeNotification<T extends Notification>(
  type: string,
  data: Record<string, unknown>,
  aliases: Record<string, string>
): T {
  const className = aliases[type] ?? type

  try {
    const NotificationClass = getNotificationClass(className)

    if (typeof (NotificationClass as any).deserialize === 'function') {
      return (NotificationClass as any).deserialize(data) as T
    }

    const instance = new (NotificationClass as new () => T)()
    Object.assign(instance, data)
    return instance
  } catch (error) {
    throw new E_NOTIFICATION_SERIALIZATION_FAILED([className])
  }
}

/**
 * Serialize a notifiable to type + identity for queue dispatch.
 */
export function serializeNotifiable(notifiable: NormalizedNotifiable): {
  type: string
  id: string | number
} {
  return {
    type: notifiable.type,
    id: notifiable.id,
  }
}

/**
 * Generate a unique instance identifier for each notification send.
 */
export function generateInstanceId(): string {
  return crypto.randomUUID()
}

/**
 * Resolve a notification class by name.
 * Falls back to dynamic require/import — caller must ensure class is registered.
 */
function getNotificationClass(className: string): new () => Notification {
  // In a real app, classes would be registered at boot time.
  // We use a map populated by imports in the provider/initializer.
  const registry = (globalThis as any).__adonisjs_notification_registry as
    | Record<string, new () => Notification>
    | undefined

  if (registry && registry[className]) {
    return registry[className]
  }

  throw new E_NOTIFICATION_SERIALIZATION_FAILED([className])
}

/**
 * Register a notification class for deserialization lookup.
 */
export function registerNotificationClass(name: string, cls: new () => Notification): void {
  const registry = ((globalThis as any).__adonisjs_notification_registry ??= {})
  registry[name] = cls
}
