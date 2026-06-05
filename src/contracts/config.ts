import type { NotificationChannel } from './channels.ts'
import type { NotificationPreferenceResolver } from './notifiable.ts'

export interface NotificationQueueConfig {
  enabled: boolean
  connection?: string
  defaultQueue: string
}

export interface NotificationChannelFactory {
  (): NotificationChannel
}

export interface NotificationRoutingConfig {
  [channel: string]: string[]
}

export interface NotificationDatabaseConfig {
  table: string
  deliveriesTable: string
  idStrategy: 'uuid' | 'nanoid' | 'auto-increment'
}

export interface NotificationDeliveryConfig {
  recordAttempts: boolean
  failFast: boolean
  retry: {
    attempts: number
    backoff: number[]
  }
}

export interface NotificationSerializationConfig {
  notificationAliases: Record<string, string>
  notifiableAliases: Record<string, string>
}

export interface NotificationPreferencesConfig {
  resolver?: NotificationPreferenceResolver
  quietHours: {
    enabled: boolean
    bypassPriorities: string[]
  }
}

export interface NotificationConfig {
  channels: Record<string, NotificationChannelFactory>
  queue: NotificationQueueConfig
  routing: NotificationRoutingConfig
  database: NotificationDatabaseConfig
  delivery: NotificationDeliveryConfig
  serialization: NotificationSerializationConfig
  preferences: NotificationPreferencesConfig
}
