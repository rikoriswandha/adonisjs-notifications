import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import type { BaseModel } from '@adonisjs/lucid/orm'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { Notification } from '../notification.ts'
import type { NotificationManager } from '../notification_manager.ts'

/**
 * Interface for models that use the Notifies mixin.
 */
export interface NotifiesRow {
  /**
   * Send a notification through the notification manager.
   */
  notify(notification: Notification): Promise<void>

  /**
   * Send a notification immediately (no queue).
   */
  notifyNow(notification: Notification): Promise<void>

  /**
   * Get a query builder for all notifications belonging to this notifiable.
   */
  notifications(): Promise<{ query(): ModelQueryBuilderContract<any, any> }>

  /**
   * Get a query builder for unread notifications belonging to this notifiable.
   */
  unreadNotifications(): Promise<{ query(): ModelQueryBuilderContract<any, any> }>

  /**
   * Mark all unread notifications as read.
   */
  markNotificationsAsRead(): Promise<void>

  /**
   * Count unread notifications for this notifiable.
   */
  unreadNotificationsCount(): Promise<number>
}

/**
 * Type for a class that has been mixed with Notifies.
 */
export type NotifiesClass<Model extends NormalizeConstructor<typeof BaseModel>> = Model & {
  new (...args: any[]): NotifiesRow
}

/**
 * Factory function that returns a mixin to add notification methods
 * to any Lucid BaseModel.
 *
 * @example
 * ```ts
 * import { compose } from '@adonisjs/core/helpers'
 * import { BaseModel, column } from '@adonisjs/lucid/orm'
 * import { Notifies } from 'adonisjs-notifications/mixins'
 *
 * export default class User extends compose(BaseModel, Notifies()) {
 *   @column({ isPrimary: true })
 *   declare id: number
 * }
 * ```
 */
export function Notifies() {
  return function <Model extends NormalizeConstructor<typeof BaseModel>>(
    superclass: Model
  ): NotifiesClass<Model> {
    class NotifiableModel extends superclass implements NotifiesRow {
      /**
       * Send a notification through the notification manager.
       */
      async notify(notification: Notification): Promise<void> {
        const manager = await getNotificationManager()
        await manager.send(this, notification)
      }

      /**
       * Send a notification immediately (no queue).
       */
      async notifyNow(notification: Notification): Promise<void> {
        const manager = await getNotificationManager()
        await manager.sendNow(this, notification)
      }

      /**
       * Get a query builder for all notifications belonging to this notifiable.
       */
      async notifications(): Promise<{ query(): ModelQueryBuilderContract<any, any> }> {
        const model = await getDatabaseNotificationModel()
        return {
          query: () => buildNotificationsQuery(model, this, false),
        }
      }

      /**
       * Get a query builder for unread notifications belonging to this notifiable.
       */
      async unreadNotifications(): Promise<{ query(): ModelQueryBuilderContract<any, any> }> {
        const model = await getDatabaseNotificationModel()
        return {
          query: () => buildNotificationsQuery(model, this, true),
        }
      }

      /**
       * Mark all unread notifications as read.
       */
      async markNotificationsAsRead(): Promise<void> {
        const model = await getDatabaseNotificationModel()
        const { notifiableType, notifiableId } = getNotifiableInfo(this)

        await model
          .query()
          .where('notifiable_type', notifiableType)
          .where('notifiable_id', notifiableId)
          .whereNull('read_at')
          .update({ read_at: new Date() })
      }

      /**
       * Count unread notifications for this notifiable.
       */
      async unreadNotificationsCount(): Promise<number> {
        const model = await getDatabaseNotificationModel()
        const { notifiableType, notifiableId } = getNotifiableInfo(this)

        const result = await model
          .query()
          .where('notifiable_type', notifiableType)
          .where('notifiable_id', notifiableId)
          .whereNull('read_at')
          .count('* as total')

        return Number(result[0].$extras.total)
      }
    }

    return NotifiableModel
  }
}

/**
 * Lazy-resolved notification manager from the service container.
 * Deferred until app boot to avoid circular imports.
 */
async function getNotificationManager(): Promise<NotificationManager> {
  const { default: notifications } = await import('adonisjs-notifications/services/main')
  return notifications
}

/**
 * Lazy-resolved DatabaseNotification model.
 */
async function getDatabaseNotificationModel() {
  const { default: DatabaseNotification } = await import('../models/database_notification.ts')
  return DatabaseNotification
}

/**
 * Build a query for notifications filtered by a notifiable instance.
 */
function buildNotificationsQuery(
  model: any,
  notifiableInstance: any,
  unreadOnly: boolean
): ModelQueryBuilderContract<any, any> {
  const { notifiableType, notifiableId } = getNotifiableInfo(notifiableInstance)

  let query = model
    .query()
    .where('notifiable_type', notifiableType)
    .where('notifiable_id', notifiableId)
    .orderBy('created_at', 'desc')

  if (unreadOnly) {
    query = query.whereNull('read_at')
  }

  return query
}

/**
 * Extract notifiable type and id from a model instance.
 */
function getNotifiableInfo(instance: any): {
  notifiableType: string
  notifiableId: string | number
} {
  const ctor = instance.constructor as typeof BaseModel
  const notifiableType = ctor.table ?? ctor.name
  const notifiableId = instance.$primaryKeyValue as number | string

  if (notifiableId === undefined || notifiableId === null) {
    throw new Error(`Cannot query notifications: ${ctor.name} does not have a primary key value.`)
  }

  return { notifiableType, notifiableId }
}
