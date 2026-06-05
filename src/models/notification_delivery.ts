import { type DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'
import type { DeliveryStatus } from '../contracts/delivery.ts'

/**
 * Lucid model for tracking notification delivery attempts.
 * Records the status, channel, and metadata of each delivery attempt.
 */
export default class NotificationDelivery extends BaseModel {
  /**
   * Table name can be overridden via config.
   */
  static table = 'notification_deliveries'

  /**
   * Primary key is a UUID.
   */
  @column({ isPrimary: true })
  declare id: string

  /**
   * Optional reference to the database notification (if stored).
   */
  @column()
  declare notificationId: string | null

  /**
   * Notification type (e.g., 'OrderShipped').
   */
  @column()
  declare notificationType: string

  /**
   * Polymorphic notifiable type.
   */
  @column()
  declare notifiableType: string

  /**
   * Polymorphic notifiable ID.
   */
  @column()
  declare notifiableId: string | number

  /**
   * Channel name (e.g., 'mail', 'database', 'sms').
   */
  @column()
  declare channel: string

  /**
   * Current delivery status.
   */
  @column()
  declare status: DeliveryStatus

  /**
   * Number of delivery attempts.
   */
  @column()
  declare attempts: number

  /**
   * Unique key for deduplication.
   */
  @column()
  declare dedupeKey: string

  /**
   * Provider-specific message ID (e.g., email message ID).
   */
  @column()
  declare providerMessageId: string | null

  /**
   * Error details if delivery failed.
   */
  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => {
      if (!value) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    },
  })
  declare error: Record<string, unknown> | null

  /**
   * Timestamp when delivery becomes available (for delayed delivery).
   */
  @column.dateTime()
  declare availableAt: DateTime | null

  /**
   * Timestamp when delivery was successfully sent.
   */
  @column.dateTime()
  declare sentAt: DateTime | null

  /**
   * Timestamp when delivery failed.
   */
  @column.dateTime()
  declare failedAt: DateTime | null

  /**
   * Creation timestamp.
   */
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  /**
   * Last update timestamp.
   */
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  /**
   * Generate UUID before creating a new record.
   */
  @beforeCreate()
  static generateId(delivery: NotificationDelivery) {
    if (!delivery.id) {
      delivery.id = randomUUID()
    }
  }
}
