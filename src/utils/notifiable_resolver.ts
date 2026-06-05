import type { Notifiable, NormalizedNotifiable } from '../contracts/notifiable.ts'

/**
 * Normalize a single recipient into a consistent shape.
 * Handles: Notifiable interface, plain objects, already-normalized objects.
 */
export function normalizeRecipient(notifiable: unknown): NormalizedNotifiable {
  // Already normalized
  if (
    typeof notifiable === 'object' &&
    notifiable !== null &&
    'id' in notifiable &&
    'type' in notifiable &&
    'routes' in notifiable &&
    'original' in notifiable
  ) {
    return notifiable as NormalizedNotifiable
  }

  // Notifiable interface
  if (typeof notifiable === 'object' && notifiable !== null) {
    const obj = notifiable as Notifiable & Record<string, unknown>
    const id = obj.getNotificationId?.() ?? (obj.id as string | number) ?? 0
    const type = obj.getNotificationType?.() ?? obj.constructor.name
    const routes = new Map<string, unknown>()

    // Pre-populate routes from routeNotificationFor if available
    if (typeof obj.routeNotificationFor === 'function') {
      routes.set('__resolver__', obj.routeNotificationFor.bind(obj))
    }

    return { id, type, routes, original: notifiable }
  }

  // Fallback for primitives or unexpected values
  return {
    id: 0,
    type: 'unknown',
    routes: new Map(),
    original: notifiable,
  }
}

/**
 * Normalize one or many recipients into an array.
 */
export function normalizeRecipients(notifiable: unknown | unknown[]): NormalizedNotifiable[] {
  if (Array.isArray(notifiable)) {
    return notifiable.map(normalizeRecipient)
  }
  return [normalizeRecipient(notifiable)]
}
