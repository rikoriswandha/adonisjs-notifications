import type { NotificationChannel } from './channels.ts'
import type { NotificationPreferenceResolver } from './notifiable.ts'

/**
 * Configuration for queue-based notification delivery.
 * When enabled, notifications are dispatched via @adonisjs/queue.
 */
export interface NotificationQueueConfig {
  enabled: boolean
  connection?: string
  defaultQueue: string
}

/**
 * Factory function that produces a notification channel.
 * May return synchronously or via dynamic import for lazy loading.
 */
export interface NotificationChannelFactory {
  (): NotificationChannel | Promise<NotificationChannel>
}

/**
 * Route resolution field mapping.
 * Maps channel names to notifiable model field/method names.
 */
export interface NotificationRoutingConfig {
  [channel: string]: string[]
}

/**
 * Configuration for database-backed notification inbox and delivery tracking.
 */
export interface NotificationDatabaseConfig {
  table: string
  deliveriesTable: string
  idStrategy: 'uuid' | 'nanoid' | 'auto-increment'
}

/**
 * Delivery attempt configuration including retry and recording behavior.
 */
export interface NotificationDeliveryConfig {
  recordAttempts: boolean
  failFast: boolean
  retry: {
    attempts: number
    backoff: number[]
  }
}

/**
 * Serialization aliases for queue-safe notification/notifiable encoding.
 */
export interface NotificationSerializationConfig {
  notificationAliases: Record<string, string>
  notifiableAliases: Record<string, string>
}

/**
 * Preference and quiet-hours configuration for recipient-level filtering.
 */
export interface NotificationPreferencesConfig {
  resolver?: NotificationPreferenceResolver
  quietHours: {
    enabled: boolean
    bypassPriorities: string[]
  }
}

/**
 * Top-level notification configuration consumed by the provider.
 * Only `channels` is required; all other sections have sensible defaults.
 */
export interface NotificationConfig {
  channels: Record<string, NotificationChannelFactory>
  queue: NotificationQueueConfig
  routing: NotificationRoutingConfig
  database: NotificationDatabaseConfig
  delivery: NotificationDeliveryConfig
  serialization: NotificationSerializationConfig
  preferences: NotificationPreferencesConfig
}
