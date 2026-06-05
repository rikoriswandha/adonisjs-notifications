import type { NotificationChannel } from '../contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../contracts/delivery.ts'
import type { DatabaseMessageData } from '../contracts/messages.ts'
import type { NotificationRepository } from '../contracts/repository.ts'

/**
 * Database channel implementation.
 * Stores notifications in a database for persistent inbox functionality.
 * Requires @adonisjs/lucid peer dependency.
 */
export class DatabaseChannel implements NotificationChannel<DatabaseMessageData, string> {
  name = 'database'
  requiresRoute = false
  resolvesOwnMessage = false

  constructor(private repository: NotificationRepository) {}

  /**
   * Send a notification by storing it in the database.
   */
  async send(context: DeliveryContext<DatabaseMessageData>): Promise<DeliveryResult<string>> {
    try {
      const { notification, notifiable, message } = context

      // Extract notification type from class name
      const notificationType = notification.constructor.name

      // Store the notification in the database
      const stored = await this.repository.store({
        type: notificationType,
        notifiableType: notifiable.type,
        notifiableId: notifiable.id,
        data: message,
        metadata: (message.metadata as Record<string, unknown> | undefined) ?? null,
      })

      return {
        success: true,
        status: 'sent',
        providerMessageId: stored.id,
        metadata: {
          notificationId: stored.id,
          storedAt: stored.createdAt.toISOString(),
        },
      }
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }
}
