import type { DeliveryStatus } from './delivery.ts'
import type { InboxMetrics, DeliveryMetrics, DeliveryMetricsFilter } from './metrics.ts'

/**
 * Attributes for creating a new database notification.
 */
export interface DatabaseNotificationAttributes {
  id?: string
  type: string
  notifiableType: string
  notifiableId: string | number
  data: Record<string, unknown>
  metadata?: Record<string, unknown> | null
}

/**
 * Row representation of a database notification.
 */
export interface DatabaseNotificationRow {
  id: string
  type: string
  notifiableType: string
  notifiableId: string | number
  data: Record<string, unknown>
  metadata: Record<string, unknown> | null
  readAt: Date | null
  seenAt: Date | null
  createdAt: Date
  updatedAt: Date | null
}

/**
 * Attributes for creating a delivery attempt record.
 */
export interface DeliveryAttemptAttributes {
  id?: string
  notificationId?: string | null
  notificationType: string
  notifiableType: string
  notifiableId: string | number
  channel: string
  status: DeliveryStatus
  attempts?: number
  dedupeKey: string
  providerMessageId?: string | null
  error?: Record<string, unknown> | null
  availableAt?: Date | null
}

/**
 * Row representation of a delivery attempt.
 */
export interface DeliveryAttemptRow {
  id: string
  notificationId: string | null
  notificationType: string
  notifiableType: string
  notifiableId: string | number
  channel: string
  status: DeliveryStatus
  attempts: number
  dedupeKey: string
  providerMessageId: string | null
  error: Record<string, unknown> | null
  availableAt: Date | null
  sentAt: Date | null
  failedAt: Date | null
  createdAt: Date
  updatedAt: Date | null
}

/**
 * Options for querying failed deliveries for retry.
 */
export interface RetryOptions {
  channel?: string
  limit?: number
}
/**
 * Summary result of a retry operation.
 */
export interface RetryResult {
  retried: number
  skipped: number
  errors: { deliveryId: string; error: unknown }[]
}
/**
 * Options for listing notifications.
 */
export interface ListOptions {
  limit?: number
  offset?: number
  unreadOnly?: boolean
  orderBy?: 'created_at' | 'updated_at'
  orderDirection?: 'asc' | 'desc'
}

/**
 * Repository contract for notification persistence.
 * Abstracts database operations to support both Lucid-backed
 * and in-memory implementations.
 */
export interface NotificationRepository {
  // Inbox operations
  store(notification: DatabaseNotificationAttributes): Promise<DatabaseNotificationRow>
  findById(id: string): Promise<DatabaseNotificationRow | null>
  listFor(
    notifiableType: string,
    notifiableId: string | number,
    options?: ListOptions
  ): Promise<DatabaseNotificationRow[]>

  // Read/Seen state
  markAsRead(id: string): Promise<void>
  markAsUnread(id: string): Promise<void>
  markAllAsRead(notifiableType: string, notifiableId: string | number): Promise<void>
  markAsSeen(id: string): Promise<void>
  unreadCount(notifiableType: string, notifiableId: string | number): Promise<number>
  // Delivery operations
  storeDelivery(delivery: DeliveryAttemptAttributes): Promise<DeliveryAttemptRow>
  updateDeliveryStatus(
    id: string,
    status: DeliveryStatus,
    data?: Partial<DeliveryAttemptRow>
  ): Promise<void>
  findDeliveryByDedupeKey(key: string): Promise<DeliveryAttemptRow | null>
  findFailedForRetry(options?: RetryOptions): Promise<DeliveryAttemptRow[]>

  // Cleanup
  prune(olderThan: Date): Promise<number>
  pruneDeliveries(olderThan: Date): Promise<number>

  // Metrics
  getInboxMetrics(notifiableType: string, notifiableId: string | number): Promise<InboxMetrics>

  getDeliveryMetrics(filter?: DeliveryMetricsFilter): Promise<DeliveryMetrics>
}
