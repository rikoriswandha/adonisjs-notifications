import type { NotificationConfig } from './contracts/config.ts'
import { E_NOTIFICATION_CONFIG_INVALID } from './exceptions/main.ts'

/**
 * Deep partial helper for config input — makes all nested properties optional.
 * Arrays are preserved as-is to avoid making elements optional.
 * Channels remain required via intersection in defineConfig's signature.
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<unknown>
    ? T[P]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P]
}

/**
 * Input type for defineConfig: channels required, everything else deeply optional.
 */
type NotificationConfigInput = DeepPartial<Omit<NotificationConfig, 'channels'>> &
  Pick<NotificationConfig, 'channels'>

const DEFAULTS: Omit<NotificationConfig, 'channels'> = {
  queue: {
    enabled: false,
    defaultQueue: 'notifications',
  },
  routing: {
    mail: ['email'],
  },
  database: {
    table: 'notifications',
    deliveriesTable: 'notification_deliveries',
    idStrategy: 'uuid',
  },
  delivery: {
    recordAttempts: true,
    failFast: false,
    retry: {
      attempts: 3,
      backoff: [30, 300, 900],
    },
  },
  serialization: {
    notificationAliases: {},
    notifiableAliases: {},
  },
  preferences: {
    quietHours: {
      enabled: false,
      bypassPriorities: ['critical'],
    },
  },
}

/**
 * Validate a notification config and throw on invalid state.
 * Can be used independently of defineConfig to validate pre-merged configs.
 */
export function resolveConfig(config: NotificationConfig): NotificationConfig {
  if (!config.channels || Object.keys(config.channels).length === 0) {
    throw new E_NOTIFICATION_CONFIG_INVALID([
      'At least one notification channel must be configured',
    ])
  }
  return config
}

/**
 * Define notification configuration with type-safety.
 * Requires `channels`; all other sections are optional with sensible defaults.
 *
 * @example
 * ```ts
 * export default defineConfig({
 *   channels: {
 *     mail: channels.mail(),
 *     database: channels.database(),
 *   },
 * })
 * ```
 */
export function defineConfig(config: NotificationConfigInput): NotificationConfig {
  const merged: NotificationConfig = {
    channels: config.channels,
    queue: { ...DEFAULTS.queue, ...config.queue },
    routing: Object.fromEntries(
      Object.entries({ ...DEFAULTS.routing, ...config.routing }).filter(([, v]) => v !== undefined)
    ) as NotificationConfig['routing'],
    database: { ...DEFAULTS.database, ...config.database },
    delivery: {
      ...DEFAULTS.delivery,
      ...config.delivery,
      retry: {
        ...DEFAULTS.delivery.retry,
        ...config.delivery?.retry,
      },
    },
    serialization: {
      ...DEFAULTS.serialization,
      ...config.serialization,
    } as NotificationConfig['serialization'],
    preferences: {
      ...DEFAULTS.preferences,
      ...config.preferences,
      quietHours: {
        ...DEFAULTS.preferences.quietHours,
        ...config.preferences?.quietHours,
      },
    },
  }
  return resolveConfig(merged)
}
