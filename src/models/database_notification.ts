import { type DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'node:crypto'

/**
 * Lucid model for database notifications.
 * Stores notification data for persistent inbox functionality.
 */
export default class DatabaseNotification extends BaseModel {
  /**
   * Table name can be overridden via config.
   */
  static table = 'notifications'

  /**
   * Primary key is a UUID.
   */
  @column({ isPrimary: true })
  declare id: string

  /**
   * Notification type (e.g., 'OrderShipped', 'InvoicePaid').
   */
  @column()
  declare type: string

  /**
   * Polymorphic notifiable type (e.g., 'User', 'Organization').
   */
  @column()
  declare notifiableType: string

  /**
   * Polymorphic notifiable ID.
   */
  @column()
  declare notifiableId: string | number

  /**
   * JSON payload containing notification-specific data.
   */
  @column({
    prepare: (value: Record<string, unknown>) => JSON.stringify(value),
    consume: (value: string | Record<string, unknown>) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare data: Record<string, unknown>

  /**
   * Optional metadata (category, priority, tags, etc.).
   */
  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
    consume: (value: string | Record<string, unknown> | null) => {
      if (!value) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    },
  })
  declare metadata: Record<string, unknown> | null

  /**
   * Timestamp when notification was marked as read.
   */
  @column.dateTime()
  declare readAt: DateTime | null

  /**
   * Timestamp when notification was marked as seen.
   */
  @column.dateTime()
  declare seenAt: DateTime | null

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
  static generateId(notification: DatabaseNotification) {
    if (!notification.id) {
      notification.id = randomUUID()
    }
  }
}
