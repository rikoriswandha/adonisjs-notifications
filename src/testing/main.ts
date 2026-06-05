import type { NotificationConfig } from '../contracts/config.ts'
import type { NotificationChannel } from '../contracts/channels.ts'
import { NotificationManager } from '../notification_manager.ts'

export { FakeNotificationManager } from './fake_notification_manager.ts'
export { FakeNotificationRouter } from './fake_notification_router.ts'
export type {
  RecordedNotification,
  NotificationFakeAssertions,
  FakeOptions,
} from '../contracts/testing.ts'

export interface CreateTestNotificationsOptions {
  config?: Partial<NotificationConfig>
  channels?: Record<string, NotificationChannel>
}

export async function createTestNotifications(
  options?: CreateTestNotificationsOptions
): Promise<NotificationManager> {
  const config: NotificationConfig = {
    channels: {},
    queue: { enabled: false, defaultQueue: 'default' },
    routing: {},
    database: {
      table: 'notifications',
      deliveriesTable: 'notification_deliveries',
      idStrategy: 'uuid',
    },
    delivery: { recordAttempts: false, failFast: true, retry: { attempts: 1, backoff: [] } },
    serialization: { notificationAliases: {}, notifiableAliases: {} },
    preferences: { quietHours: { enabled: false, bypassPriorities: [] } },
    ...options?.config,
  }

  const manager = new NotificationManager(config)

  if (options?.channels) {
    for (const [name, channel] of Object.entries(options.channels)) {
      ;(manager as any).channels.set(name, channel)
    }
  }

  return manager
}
