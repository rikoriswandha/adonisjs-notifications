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
import type { InboxMetrics, DeliveryMetrics, DeliveryMetricsFilter } from '../contracts/metrics.ts'

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
   * Find failed deliveries eligible for retry, ordered by failedAt ascending.
   */
  async findFailedForRetry(
    options?: import('../contracts/repository.ts').RetryOptions
  ): Promise<DeliveryAttemptRow[]> {
    const Model = await this.getDeliveryModel()
    const query = Model.query().where('status', 'failed').orderBy('failed_at', 'asc')
    if (options?.channel) {
      query.where('channel', options.channel)
    }
    if (options?.limit) {
      query.limit(options.limit)
    }
    const records = await query
    return records.map((r: any) => this.serializeDelivery(r))
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
   * Delete a notification by ID.
   */
  async delete(id: string): Promise<void> {
    const Model = await this.getNotificationModel()
    const record = await Model.find(id)
    if (record) {
      await record.delete()
    }
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
   * Get inbox metrics for a notifiable.
   */
  async getInboxMetrics(
    notifiableType: string,
    notifiableId: string | number
  ): Promise<InboxMetrics> {
    const Model = await this.getNotificationModel()
    const baseQuery = Model.query()
      .where('notifiable_type', notifiableType)
      .where('notifiable_id', notifiableId)

    const totalResult = await baseQuery.clone().count('* as total').first()
    const total = totalResult?.$extras?.total ?? 0

    const unreadResult = await baseQuery.clone().whereNull('read_at').count('* as total').first()
    const unread = unreadResult?.$extras?.total ?? 0

    const unseenResult = await baseQuery.clone().whereNull('seen_at').count('* as total').first()
    const unseen = unseenResult?.$extras?.total ?? 0

    const typeRows = await baseQuery.clone().select('type').count('* as cnt').groupBy('type')

    const byType: Record<string, number> = {}
    for (const row of typeRows) {
      byType[row.type] = row.$extras.cnt ?? 0
    }

    return { total, unread, read: total - unread, unseen, byType }
  }

  /**
   * Get delivery metrics, optionally filtered.
   */
  async getDeliveryMetrics(filter?: DeliveryMetricsFilter): Promise<DeliveryMetrics> {
    const Model = await this.getDeliveryModel()
    let query = Model.query()

    if (filter?.notifiableType) {
      query = query.where('notifiable_type', filter.notifiableType)
    }
    if (filter?.notifiableId !== undefined) {
      query = query.where('notifiable_id', filter.notifiableId)
    }
    if (filter?.channel) {
      query = query.where('channel', filter.channel)
    }
    if (filter?.notificationType) {
      query = query.where('notification_type', filter.notificationType)
    }
    if (filter?.status) {
      query = query.where('status', filter.status)
    }
    if (filter?.from) {
      query = query.where('created_at', '>=', DateTime.fromJSDate(filter.from).toSQL())
    }
    if (filter?.to) {
      query = query.where('created_at', '<=', DateTime.fromJSDate(filter.to).toSQL())
    }

    const totalResult = await query.clone().count('* as total').first()
    const total = totalResult?.$extras?.total ?? 0

    const statusRows = await query.clone().select('status').count('* as cnt').groupBy('status')
    const byStatus: Record<DeliveryStatus, number> = { pending: 0, sent: 0, failed: 0, skipped: 0 }
    for (const row of statusRows) {
      byStatus[row.status as DeliveryStatus] = row.$extras.cnt ?? 0
    }

    const channelRows = await query.clone().select('channel').count('* as cnt').groupBy('channel')
    const byChannel: Record<string, number> = {}
    for (const row of channelRows) {
      byChannel[row.channel] = row.$extras.cnt ?? 0
    }

    const typeRows = await query
      .clone()
      .select('notification_type')
      .count('* as cnt')
      .groupBy('notification_type')
    const byType: Record<string, number> = {}
    for (const row of typeRows) {
      byType[row.notificationType] = row.$extras.cnt ?? 0
    }

    const pivotRows = await query
      .clone()
      .select('channel', 'status')
      .count('* as cnt')
      .groupBy('channel', 'status')
    const byChannelAndStatus: Record<string, Record<DeliveryStatus, number>> = {}
    for (const row of pivotRows) {
      if (!byChannelAndStatus[row.channel]) {
        byChannelAndStatus[row.channel] = { pending: 0, sent: 0, failed: 0, skipped: 0 }
      }
      byChannelAndStatus[row.channel][row.status as DeliveryStatus] = row.$extras.cnt ?? 0
    }

    const avgResult = await query.clone().avg('attempts as avg').first()
    const averageAttempts = avgResult?.$extras?.avg ? Number(avgResult.$extras.avg) : 0

    const failureRate = total > 0 ? byStatus.failed / total : 0

    return { total, byStatus, byChannel, byType, byChannelAndStatus, averageAttempts, failureRate }
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
