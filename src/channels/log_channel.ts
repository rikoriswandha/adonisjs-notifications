import type { NotificationChannel } from '../contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../contracts/delivery.ts'

/**
 * Log channel implementation.
 * Writes notifications to console/logger for development and debugging.
 */
export class LogChannel implements NotificationChannel<any, void> {
  name = 'log'

  async send(context: DeliveryContext<any>): Promise<DeliveryResult<void>> {
    console.log(`[Notification] ${context.notification.constructor.name}`, {
      channel: context.channel,
      message: context.message,
    })
    return { success: true, status: 'sent' }
  }
}
