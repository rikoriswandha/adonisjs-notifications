import type { Notification } from '../notification.ts'
import type { NormalizedNotifiable } from './notifiable.ts'
import type { DeliveryResult } from './delivery.ts'

/**
 * Event names emitted during the notification lifecycle.
 */
export const NOTIFICATION_SENDING = 'notification:sending'
export const NOTIFICATION_SENT = 'notification:sent'
export const NOTIFICATION_FAILED = 'notification:failed'
export const NOTIFICATION_SKIPPED = 'notification:skipped'
export const NOTIFICATION_QUEUED = 'notification:queued'

/**
 * Payload attached to every notification lifecycle event.
 */
export interface NotificationEventPayload {
  notification: Notification
  notifiable: NormalizedNotifiable
  channel: string
  notificationId?: string
  deliveryId?: string
  result?: DeliveryResult
  error?: Error
  metadata: Record<string, unknown>
}

/**
 * Framework-agnostic emitter interface.
 * The provider wires the real AdonisJS emitter at boot time.
 */
export interface NotificationEmitter {
  emit(event: string, payload: NotificationEventPayload): void
}
