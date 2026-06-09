import type { DeliveryStatus } from './delivery.ts'

/** Filter scope for delivery metrics queries. All fields optional. */
export interface DeliveryMetricsFilter {
  notifiableType?: string
  notifiableId?: string | number
  channel?: string
  notificationType?: string
  status?: DeliveryStatus
  from?: Date
  to?: Date
}

/** Inbox metrics for a single notifiable entity. */
export interface InboxMetrics {
  total: number
  unread: number
  read: number
  unseen: number
  byType: Record<string, number>
}

/** Delivery metrics aggregated across the system or scoped by filter. */
export interface DeliveryMetrics {
  total: number
  byStatus: Record<DeliveryStatus, number>
  byChannel: Record<string, number>
  byType: Record<string, number>
  byChannelAndStatus: Record<string, Record<DeliveryStatus, number>>
  averageAttempts: number
  failureRate: number
}

/** Combined metrics snapshot. */
export interface NotificationMetrics {
  inbox: InboxMetrics | null // null when not scoped to a notifiable
  deliveries: DeliveryMetrics
  computedAt: string // ISO 8601
}
