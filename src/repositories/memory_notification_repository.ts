import { randomUUID } from 'node:crypto'
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
 * In-memory implementation of NotificationRepository.
 * For testing only - does not persist data.
 */
export class MemoryNotificationRepository implements NotificationRepository {
  private notifications: Map<string, DatabaseNotificationRow> = new Map()
  private deliveries: Map<string, DeliveryAttemptRow> = new Map()

  /**
   * Store a new notification in memory.
   */
  async store(notification: DatabaseNotificationAttributes): Promise<DatabaseNotificationRow> {
    const id = notification.id || randomUUID()
    const now = new Date()

    const row: DatabaseNotificationRow = {
      id,
      type: notification.type,
      notifiableType: notification.notifiableType,
      notifiableId: notification.notifiableId,
      data: notification.data,
      metadata: notification.metadata ?? null,
      readAt: null,
      seenAt: null,
      createdAt: now,
      updatedAt: now,
    }

    this.notifications.set(id, row)
    return row
  }

  /**
   * Find a notification by ID.
   */
  async findById(id: string): Promise<DatabaseNotificationRow | null> {
    return this.notifications.get(id) ?? null
  }

  /**
   * List notifications for a notifiable entity.
   */
  async listFor(
    notifiableType: string,
    notifiableId: string | number,
    options?: ListOptions
  ): Promise<DatabaseNotificationRow[]> {
    let results = Array.from(this.notifications.values()).filter(
      (n) => n.notifiableType === notifiableType && n.notifiableId === notifiableId
    )

    // Filter unread only
    if (options?.unreadOnly) {
      results = results.filter((n) => n.readAt === null)
    }

    // Sort by createdAt (default descending)
    const orderDirection = options?.orderDirection ?? 'desc'
    results.sort((a, b) => {
      const timeA = a.createdAt.getTime()
      const timeB = b.createdAt.getTime()
      return orderDirection === 'asc' ? timeA - timeB : timeB - timeA
    })

    // Apply pagination
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? 50
    return results.slice(offset, offset + limit)
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(id: string): Promise<void> {
    const notification = this.notifications.get(id)
    if (notification) {
      notification.readAt = new Date()
      notification.updatedAt = new Date()
    }
  }

  /**
   * Mark a notification as unread.
   */
  async markAsUnread(id: string): Promise<void> {
    const notification = this.notifications.get(id)
    if (notification) {
      notification.readAt = null
      notification.updatedAt = new Date()
    }
  }

  /**
   * Mark all notifications for a notifiable as read.
   */
  async markAllAsRead(notifiableType: string, notifiableId: string | number): Promise<void> {
    const now = new Date()
    for (const notification of this.notifications.values()) {
      if (
        notification.notifiableType === notifiableType &&
        notification.notifiableId === notifiableId &&
        notification.readAt === null
      ) {
        notification.readAt = now
        notification.updatedAt = now
      }
    }
  }

  /**
   * Mark a notification as seen.
   */
  async markAsSeen(id: string): Promise<void> {
    const notification = this.notifications.get(id)
    if (notification) {
      notification.seenAt = new Date()
      notification.updatedAt = new Date()
    }
  }

  /**
   * Count unread notifications for a notifiable.
   */
  async unreadCount(notifiableType: string, notifiableId: string | number): Promise<number> {
    let count = 0
    for (const notification of this.notifications.values()) {
      if (
        notification.notifiableType === notifiableType &&
        notification.notifiableId === notifiableId &&
        notification.readAt === null
      ) {
        count++
      }
    }
    return count
  }

  /**
   * Store a delivery attempt record.
   */
  async storeDelivery(delivery: DeliveryAttemptAttributes): Promise<DeliveryAttemptRow> {
    const id = delivery.id || randomUUID()
    const now = new Date()

    const row: DeliveryAttemptRow = {
      id,
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
      availableAt: delivery.availableAt ?? null,
      sentAt: delivery.status === 'sent' ? now : null,
      failedAt: delivery.status === 'failed' ? now : null,
      createdAt: now,
      updatedAt: now,
    }

    this.deliveries.set(id, row)
    return row
  }

  /**
   * Update delivery status.
   */
  async updateDeliveryStatus(
    id: string,
    status: DeliveryStatus,
    data?: Partial<DeliveryAttemptRow>
  ): Promise<void> {
    const delivery = this.deliveries.get(id)
    if (!delivery) return

    const now = new Date()
    delivery.status = status
    delivery.updatedAt = now

    if (status === 'sent') {
      delivery.sentAt = now
    } else if (status === 'failed') {
      delivery.failedAt = now
    }

    if (data) {
      Object.assign(delivery, data, { updatedAt: now })
    }
  }

  /**
   * Find a delivery by dedupe key.
   */
  async findDeliveryByDedupeKey(key: string): Promise<DeliveryAttemptRow | null> {
    for (const delivery of this.deliveries.values()) {
      if (delivery.dedupeKey === key) {
        return delivery
      }
    }
    return null
  }

  /**
   * Prune old notifications.
   */
  async prune(olderThan: Date): Promise<number> {
    const threshold = olderThan.getTime()
    let count = 0

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.createdAt.getTime() < threshold) {
        this.notifications.delete(id)
        count++
      }
    }

    return count
  }

  /**
   * Prune old delivery records.
   */
  async pruneDeliveries(olderThan: Date): Promise<number> {
    const threshold = olderThan.getTime()
    let count = 0

    for (const [id, delivery] of this.deliveries.entries()) {
      if (delivery.createdAt.getTime() < threshold) {
        this.deliveries.delete(id)
        count++
      }
    }

    return count
  }

  /**
   * Clear all data (useful for test cleanup).
   */
  clear(): void {
    this.notifications.clear()
    this.deliveries.clear()
  }

  /**
   * Get all notifications (useful for assertions in tests).
   */
  getAllNotifications(): DatabaseNotificationRow[] {
    return Array.from(this.notifications.values())
  }

  /**
   * Get all deliveries (useful for assertions in tests).
   */
  getAllDeliveries(): DeliveryAttemptRow[] {
    return Array.from(this.deliveries.values())
  }
}
