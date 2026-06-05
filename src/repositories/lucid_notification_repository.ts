import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type {
  NotificationRepository,
  DatabaseNotificationAttributes,
  DatabaseNotificationRow,
  DeliveryAttemptAttributes,
  DeliveryAttemptRow,
  ListOptions,
} from '../contracts/repository.ts'
import type { DeliveryStatus } from '../contracts/delivery.ts'

/**
 * Lucid-backed implementation of NotificationRepository.
 * Uses @adonisjs/lucid models for database persistence.
 */
export class LucidNotificationRepository implements NotificationRepository {
  private notificationModel: any = null
  private deliveryModel: any = null

  /**
   * Lazy-load the DatabaseNotification model.
   */
  private async getNotificationModel() {
    if (!this.notificationModel) {
      const { default: DatabaseNotification } = await import('../models/database_notification.ts')
      this.notificationModel = DatabaseNotification
    }
    return this.notificationModel
  }

  /**
   * Lazy-load the NotificationDelivery model.
   */
  private async getDeliveryModel() {
    if (!this.deliveryModel) {
      const { default: NotificationDelivery } = await import('../models/notification_delivery.ts')
      this.deliveryModel = NotificationDelivery
    }
    return this.deliveryModel
  }

  /**
   * Store a new notification in the database.
   */
  async store(notification: DatabaseNotificationAttributes): Promise<DatabaseNotificationRow> {
    const Model = await this.getNotificationModel()

    const record = await Model.create({
      id: notification.id || randomUUID(),
      type: notification.type,
      notifiableType: notification.notifiableType,
      notifiableId: notification.notifiableId,
      data: notification.data,
      metadata: notification.metadata ?? null,
    })

    return this.serializeNotification(record)
  }

  /**
   * Find a notification by ID.
   */
  async findById(id: string): Promise<DatabaseNotificationRow | null> {
    const Model = await this.getNotificationModel()
    const record = await Model.find(id)
    return record ? this.serializeNotification(record) : null
  }

  /**
   * List notifications for a notifiable entity.
   */
  async listFor(
    notifiableType: string,
    notifiableId: string | number,
    options?: ListOptions
  ): Promise<DatabaseNotificationRow[]> {
    const Model = await this.getNotificationModel()

    const query = Model.query()
      .where('notifiable_type', notifiableType)
      .where('notifiable_id', notifiableId)

    if (options?.unreadOnly) {
      query.whereNull('read_at')
    }

    const orderBy = options?.orderBy ?? 'created_at'
    const orderDirection = options?.orderDirection ?? 'desc'
    query.orderBy(orderBy, orderDirection)

    if (options?.limit) {
      query.limit(options.limit)
    }

    if (options?.offset) {
      query.offset(options.offset)
    }

    const records = await query
    return records.map((r: any) => this.serializeNotification(r))
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(id: string): Promise<void> {
    const Model = await this.getNotificationModel()
    await Model.query().where('id', id).update({ read_at: DateTime.now().toSQL() })
  }

  /**
   * Mark a notification as unread.
   */
  async markAsUnread(id: string): Promise<void> {
    const Model = await this.getNotificationModel()
    await Model.query().where('id', id).update({ read_at: null })
  }

  /**
   * Mark all notifications for a notifiable as read.
   */
  async markAllAsRead(notifiableType: string, notifiableId: string | number): Promise<void> {
    const Model = await this.getNotificationModel()
    await Model.query()
      .where('notifiable_type', notifiableType)
      .where('notifiable_id', notifiableId)
      .whereNull('read_at')
      .update({ read_at: DateTime.now().toSQL() })
  }

  /**
   * Mark a notification as seen.
   */
  async markAsSeen(id: string): Promise<void> {
    const Model = await this.getNotificationModel()
    await Model.query().where('id', id).update({ seen_at: DateTime.now().toSQL() })
  }

  /**
   * Count unread notifications for a notifiable.
   */
  async unreadCount(notifiableType: string, notifiableId: string | number): Promise<number> {
    const Model = await this.getNotificationModel()
    const result = await Model.query()
      .where('notifiable_type', notifiableType)
      .where('notifiable_id', notifiableId)
      .whereNull('read_at')
      .count('* as total')
      .first()

    return result?.$extras?.total ?? 0
  }

  /**
   * Store a delivery attempt record.
   */
  async storeDelivery(delivery: DeliveryAttemptAttributes): Promise<DeliveryAttemptRow> {
    const Model = await this.getDeliveryModel()

    const now = DateTime.now()
    const record = await Model.create({
      id: delivery.id || randomUUID(),
      notificationId: delivery.notificationId ?? null,
      notificationType: delivery.notificationType,
      notifiableType: delivery.notifiableType,
      notifiableId: delivery.notifiableId,
      channel: delivery.channel,
      status: delivery.status,
      attempts: delivery.attempts ?? 1,
      dedupeKey: delivery.dedupeKey,
      providerMessageId: delivery.providerMessageId ?? null,
      error: delivery.error ?? null,
      availableAt: delivery.availableAt ? DateTime.fromJSDate(delivery.availableAt) : null,
      sentAt: delivery.status === 'sent' ? now : null,
      failedAt: delivery.status === 'failed' ? now : null,
    })

    return this.serializeDelivery(record)
  }

  /**
   * Update delivery status.
   */
  async updateDeliveryStatus(
    id: string,
    status: DeliveryStatus,
    data?: Partial<DeliveryAttemptRow>
  ): Promise<void> {
    const Model = await this.getDeliveryModel()
    const now = DateTime.now()

    const updateData: Record<string, any> = {
      status,
      updated_at: now.toSQL(),
    }

    if (status === 'sent') {
      updateData.sent_at = now.toSQL()
    } else if (status === 'failed') {
      updateData.failed_at = now.toSQL()
    }

    if (data) {
      if (data.providerMessageId !== undefined) {
        updateData.provider_message_id = data.providerMessageId
      }
      if (data.error !== undefined) {
        updateData.error = data.error
      }
      if (data.attempts !== undefined) {
        updateData.attempts = data.attempts
      }
    }

    await Model.query().where('id', id).update(updateData)
  }

  /**
   * Find a delivery by dedupe key.
   */
  async findDeliveryByDedupeKey(key: string): Promise<DeliveryAttemptRow | null> {
    const Model = await this.getDeliveryModel()
    const record = await Model.findBy('dedupe_key', key)
    return record ? this.serializeDelivery(record) : null
  }

  /**
   * Prune old notifications.
   */
  async prune(olderThan: Date): Promise<number> {
    const Model = await this.getNotificationModel()
    const threshold = DateTime.fromJSDate(olderThan)

    const result = await Model.query().where('created_at', '<', threshold.toSQL()).delete()

    return Array.isArray(result) ? result.length : 0
  }

  /**
   * Prune old delivery records.
   */
  async pruneDeliveries(olderThan: Date): Promise<number> {
    const Model = await this.getDeliveryModel()
    const threshold = DateTime.fromJSDate(olderThan)

    const result = await Model.query().where('created_at', '<', threshold.toSQL()).delete()

    return Array.isArray(result) ? result.length : 0
  }

  /**
   * Serialize a Lucid notification model to a plain row.
   */
  private serializeNotification(record: any): DatabaseNotificationRow {
    return {
      id: record.id,
      type: record.type,
      notifiableType: record.notifiableType,
      notifiableId: record.notifiableId,
      data: record.data,
      metadata: record.metadata,
      readAt: record.readAt?.toJSDate() ?? null,
      seenAt: record.seenAt?.toJSDate() ?? null,
      createdAt: record.createdAt.toJSDate(),
      updatedAt: record.updatedAt?.toJSDate() ?? null,
    }
  }

  /**
   * Serialize a Lucid delivery model to a plain row.
   */
  private serializeDelivery(record: any): DeliveryAttemptRow {
    return {
      id: record.id,
      notificationId: record.notificationId,
      notificationType: record.notificationType,
      notifiableType: record.notifiableType,
      notifiableId: record.notifiableId,
      channel: record.channel,
      status: record.status,
      attempts: record.attempts,
      dedupeKey: record.dedupeKey,
      providerMessageId: record.providerMessageId,
      error: record.error,
      availableAt: record.availableAt?.toJSDate() ?? null,
      sentAt: record.sentAt?.toJSDate() ?? null,
      failedAt: record.failedAt?.toJSDate() ?? null,
      createdAt: record.createdAt.toJSDate(),
      updatedAt: record.updatedAt?.toJSDate() ?? null,
    }
  }
}
