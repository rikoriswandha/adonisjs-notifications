import { test } from '@japa/runner'
import { NotificationManager } from '../src/notification_manager.ts'
import { Notification } from '../src/notification.ts'
import type { NotificationConfig } from '../src/contracts/config.ts'
import type { NotificationChannel } from '../src/contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../src/contracts/delivery.ts'
import type { NotificationEmitter, NotificationEventPayload } from '../src/contracts/events.ts'
import type {
  NotificationPreferences,
  NotificationPreferenceResolver,
} from '../src/contracts/notifiable.ts'
import { NOTIFICATION_SKIPPED } from '../src/contracts/events.ts'

// Mock channel implementation
class MockChannel implements NotificationChannel {
  name = 'mock'
  calls: DeliveryContext[] = []

  async send(context: DeliveryContext): Promise<DeliveryResult> {
    this.calls.push(context)
    return { success: true, status: 'sent', providerMessageId: 'msg-123' }
  }
}

// Mock emitter implementation
class MockEmitter implements NotificationEmitter {
  events: Array<{ event: string; payload: NotificationEventPayload }> = []

  emit(event: string, payload: NotificationEventPayload): void {
    this.events.push({ event, payload })
  }
}

// Test notification classes
class TestNotification extends Notification {
  via() {
    return ['mail', 'sms']
  }
  toMail() {
    return { subject: 'Test' }
  }
  toSms() {
    return { body: 'SMS test' }
  }
}

class CategorizedNotification extends Notification {
  declare category: string
  declare priority: string | undefined

  constructor(category: string, priority?: string) {
    super()
    this.category = category
    this.priority = priority
  }

  via() {
    return ['mail']
  }

  toMail() {
    return { subject: 'Test', body: 'Body' }
  }
}

// Helper to create config with custom preferences
function createConfig(
  channels: Record<string, () => NotificationChannel>,
  preferencesConfig: Partial<NotificationConfig['preferences']> = {},
  quietHours: NotificationConfig['preferences']['quietHours'] = {
    enabled: false,
    bypassPriorities: [],
  }
): NotificationConfig {
  return {
    channels,
    queue: { enabled: false, defaultQueue: 'notifications' },
    routing: { mail: ['email'], sms: ['phone'] },
    database: {
      table: 'notifications',
      deliveriesTable: 'notification_deliveries',
      idStrategy: 'uuid',
    },
    delivery: {
      recordAttempts: true,
      failFast: false,
      retry: { attempts: 3, backoff: [30, 300, 900] },
    },
    serialization: { notificationAliases: {}, notifiableAliases: {} },
    preferences: {
      quietHours,
      ...preferencesConfig,
    } as NotificationConfig['preferences'],
  }
}

// Helper to create a resolver from preferences
function createResolver(prefs: NotificationPreferences): NotificationPreferenceResolver {
  return {
    resolve: async () => prefs,
  }
}

function mockDateTo(time: string): { mockNow: Date; restore: () => void } {
  const originalDate = globalThis.Date
  const mockNow = new originalDate(time)

  const MockDate = Object.setPrototypeOf(
    class extends Date {
      constructor(...args: [string | number, ...number[]]) {
        if (args.length === 0) {
          super(mockNow)
        } else {
          // @ts-expect-error Date constructor overloads are complex
          super(...args)
        }
      }
    },
    originalDate
  ) as any
  MockDate.now = () => mockNow.getTime()
  MockDate.parse = originalDate.parse.bind(originalDate)
  MockDate.UTC = originalDate.UTC.bind(originalDate)
  globalThis.Date = MockDate

  return {
    mockNow,
    restore: () => {
      globalThis.Date = originalDate
    },
  }
}

test.group('Preferences - Channel Filtering', () => {
  test('disabled channel is skipped with event', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const smsChannel = new MockChannel()
    const emitter = new MockEmitter()

    const resolver = createResolver({ disabledChannels: ['sms'] })
    const config = createConfig({ mail: () => mailChannel, sms: () => smsChannel }, { resolver })
    const manager = new NotificationManager(config, emitter)

    await manager.send({ id: 1, email: 'user@example.com', phone: '+123' }, new TestNotification())

    assert.lengthOf(mailChannel.calls, 1)
    assert.lengthOf(smsChannel.calls, 0)

    const skippedEvent = emitter.events.find((e) => e.event === NOTIFICATION_SKIPPED)
    assert.exists(skippedEvent)
    assert.equal(skippedEvent!.payload.channel, 'sms')
    assert.equal(skippedEvent!.payload.metadata.reason, 'channel_disabled_by_preferences')
  })

  test('enabledChannels whitelist: only listed channels pass', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const smsChannel = new MockChannel()

    const resolver = createResolver({ enabledChannels: ['mail'] })
    const config = createConfig({ mail: () => mailChannel, sms: () => smsChannel }, { resolver })
    const manager = new NotificationManager(config)

    await manager.send({ id: 1, email: 'user@example.com', phone: '+123' }, new TestNotification())

    assert.lengthOf(mailChannel.calls, 1)
    assert.lengthOf(smsChannel.calls, 0)
  })

  test('no resolver: all channels pass', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const smsChannel = new MockChannel()
    const config = createConfig({ mail: () => mailChannel, sms: () => smsChannel })
    const manager = new NotificationManager(config)

    await manager.send({ id: 1, email: 'user@example.com', phone: '+123' }, new TestNotification())

    assert.lengthOf(mailChannel.calls, 1)
    assert.lengthOf(smsChannel.calls, 1)
  })
})

test.group('Preferences - Category Filtering', () => {
  test('disabled category skips all channels', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const smsChannel = new MockChannel()
    const emitter = new MockEmitter()

    const resolver = createResolver({ disabledCategories: ['promotional'] })
    const config = createConfig({ mail: () => mailChannel, sms: () => smsChannel }, { resolver })
    const manager = new NotificationManager(config, emitter)

    const notification = new CategorizedNotification('promotional')
    await manager.send({ id: 1, email: 'user@example.com' }, notification)

    assert.lengthOf(mailChannel.calls, 0)
    assert.lengthOf(smsChannel.calls, 0)

    const skippedEvents = emitter.events.filter(
      (e) =>
        e.event === NOTIFICATION_SKIPPED &&
        e.payload.metadata.reason === 'category_disabled_by_preferences'
    )
    assert.lengthOf(skippedEvents, 1)
  })

  test('non-matching category: channels pass through', async ({ assert }) => {
    const mailChannel = new MockChannel()

    const resolver = createResolver({ disabledCategories: ['promotional'] })
    const config = createConfig({ mail: () => mailChannel }, { resolver })
    const manager = new NotificationManager(config)

    const notification = new CategorizedNotification('transactional')
    await manager.send({ id: 1, email: 'user@example.com' }, notification)

    assert.lengthOf(mailChannel.calls, 1)
  })
})

test.group('Preferences - Quiet Hours', () => {
  test('quiet hours block normal notification', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const emitter = new MockEmitter()
    const { restore } = mockDateTo('2024-01-15T23:00:00Z')

    const resolver = createResolver({
      quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' },
    })
    const config = createConfig(
      { mail: () => mailChannel },
      { resolver },
      { enabled: true, bypassPriorities: [] }
    )
    const manager = new NotificationManager(config, emitter)

    const notification = new CategorizedNotification('transactional', 'normal')
    await manager.send({ id: 1, email: 'user@example.com' }, notification)

    restore()

    assert.lengthOf(mailChannel.calls, 0)
    const skippedEvent = emitter.events.find((e) => e.event === NOTIFICATION_SKIPPED)
    assert.exists(skippedEvent)
    assert.equal(skippedEvent!.payload.metadata.reason, 'quiet_hours')
  })

  test('critical priority bypasses quiet hours', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const { restore } = mockDateTo('2024-01-15T23:00:00Z')

    const resolver = createResolver({
      quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' },
    })
    const config = createConfig(
      { mail: () => mailChannel },
      { resolver },
      { enabled: true, bypassPriorities: ['critical'] }
    )
    const manager = new NotificationManager(config)

    const notification = new CategorizedNotification('transactional', 'critical')
    await manager.send({ id: 1, email: 'user@example.com' }, notification)

    restore()

    assert.lengthOf(mailChannel.calls, 1)
  })

  test('quiet hours disabled at config level: no blocking', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const { restore } = mockDateTo('2024-01-15T23:00:00Z')

    const resolver = createResolver({
      quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' },
    })
    const config = createConfig(
      { mail: () => mailChannel },
      { resolver },
      { enabled: false, bypassPriorities: [] }
    )
    const manager = new NotificationManager(config)

    const notification = new CategorizedNotification('transactional', 'normal')
    await manager.send({ id: 1, email: 'user@example.com' }, notification)

    restore()

    assert.lengthOf(mailChannel.calls, 1)
  })
})

test.group('Preferences - sendNow', () => {
  test('channel filtering works in sendNow', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const smsChannel = new MockChannel()
    const emitter = new MockEmitter()

    const resolver = createResolver({ disabledChannels: ['sms'] })
    const config = createConfig({ mail: () => mailChannel, sms: () => smsChannel }, { resolver })
    const manager = new NotificationManager(config, emitter)

    await manager.sendNow(
      { id: 1, email: 'user@example.com', phone: '+123' },
      new TestNotification()
    )

    assert.lengthOf(mailChannel.calls, 1)
    assert.lengthOf(smsChannel.calls, 0)

    const skippedEvent = emitter.events.find((e) => e.event === NOTIFICATION_SKIPPED)
    assert.exists(skippedEvent)
    assert.equal(skippedEvent!.payload.channel, 'sms')
  })
})

test.group('Preferences - shouldSend still works', () => {
  test('shouldSend gate fires after preference filtering', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const emitter = new MockEmitter()

    const resolver = createResolver({ enabledChannels: ['mail'] })
    const config = createConfig({ mail: () => mailChannel }, { resolver })
    const manager = new NotificationManager(config, emitter)

    class GatedNotification extends Notification {
      via() {
        return ['mail']
      }
      toMail() {
        return { subject: 'Test' }
      }
      shouldSend() {
        return false
      }
    }

    await manager.send({ id: 1, email: 'user@example.com' }, new GatedNotification())

    assert.lengthOf(mailChannel.calls, 0)
    const skippedEvent = emitter.events.find((e) => e.event === NOTIFICATION_SKIPPED)
    assert.exists(skippedEvent)
    assert.equal(skippedEvent!.payload.metadata.reason, 'shouldSend returned false')
  })
})

test.group('Preferences - queue dispatch filtering', () => {
  test('disabled channel skipped before queue dispatch', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const emitter = new MockEmitter()

    const resolver = createResolver({ disabledChannels: ['sms'] })
    const config = createConfig(
      { mail: () => mailChannel, sms: () => new MockChannel() },
      { resolver }
    )
    // Enable queue
    config.queue.enabled = true

    const dispatched: any[] = []
    const manager = new NotificationManager(config, emitter)
    manager.setQueueDispatcher({
      dispatch: async (payload) => {
        dispatched.push(payload)
      },
    })

    await manager.send({ id: 1, email: 'user@example.com', phone: '+123' }, new TestNotification())

    assert.lengthOf(dispatched, 1)
    assert.equal(dispatched[0].channel, 'mail')

    const skippedEvent = emitter.events.find(
      (e) => e.event === NOTIFICATION_SKIPPED && e.payload.channel === 'sms'
    )
    assert.exists(skippedEvent)
  })
})
