import { test } from '@japa/runner'
import { NotificationManager } from '../src/notification_manager.ts'
import type { QueueDispatcher, QueuePayload } from '../src/notification_manager.ts'
import { Notification } from '../src/notification.ts'
import type { NotificationConfig } from '../src/contracts/config.ts'
import type { NotificationChannel } from '../src/contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../src/contracts/delivery.ts'
import type { NotificationEmitter, NotificationEventPayload } from '../src/contracts/events.ts'
import { NOTIFICATION_QUEUED } from '../src/contracts/events.ts'

// Mock channel
class MockChannel implements NotificationChannel {
  name = 'mock'
  calls: DeliveryContext[] = []

  async send(context: DeliveryContext): Promise<DeliveryResult> {
    this.calls.push(context)
    return { success: true, status: 'sent', providerMessageId: 'msg-123' }
  }
}

// Mock emitter
class MockEmitter implements NotificationEmitter {
  events: Array<{ event: string; payload: NotificationEventPayload }> = []

  emit(event: string, payload: NotificationEventPayload): void {
    this.events.push({ event, payload })
  }
}

// Test notifications
class QueuedNotification extends Notification {
  shouldQueue = true as const
  via() {
    return ['mail']
  }
  toMail() {
    return { subject: 'Queued', body: 'Hello' }
  }
}

class DelayedNotification extends Notification {
  shouldQueue = true as const
  via() {
    return ['mail']
  }
  toMail() {
    return { subject: 'Delayed', body: 'Hello' }
  }
  delay() {
    return 5000
  }
}

class CustomQueueNotification extends Notification {
  shouldQueue = true as const
  queue = 'high-priority'
  via() {
    return ['mail']
  }
  toMail() {
    return { subject: 'Custom', body: 'Hello' }
  }
}

class ExplicitNoQueueNotification extends Notification {
  shouldQueue = false as const
  via() {
    return ['mail']
  }
  toMail() {
    return { subject: 'NoQueue', body: 'Hello' }
  }
}

// Mock dispatcher
function createMockDispatcher(): { dispatcher: QueueDispatcher; payloads: QueuePayload[] } {
  const payloads: QueuePayload[] = []
  const dispatcher: QueueDispatcher = {
    async dispatch(payload: QueuePayload) {
      payloads.push(payload)
    },
  }
  return { dispatcher, payloads }
}

// Config helpers
function createConfig(
  channels: Record<string, () => NotificationChannel | Promise<NotificationChannel>>,
  queueEnabled = false
): NotificationConfig {
  return {
    channels,
    queue: { enabled: queueEnabled, defaultQueue: 'notifications' },
    routing: { mail: ['email'] },
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
    preferences: { quietHours: { enabled: false, bypassPriorities: [] } },
  }
}

test.group('NotificationManager - Queue Dispatch', () => {
  test('send() with shouldQueue=true + queue enabled + dispatcher → dispatches to queue', async ({
    assert,
  }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel }, true)
    const manager = new NotificationManager(config)
    const { dispatcher, payloads } = createMockDispatcher()
    manager.setQueueDispatcher(dispatcher)

    const notification = new QueuedNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.lengthOf(payloads, 1)
    assert.equal(payloads[0].notificationType, 'QueuedNotification')
    assert.equal(payloads[0].channel, 'mail')
    assert.equal(payloads[0].notifiableType, 'Object')
    assert.equal(payloads[0].notifiableId, 1)
    assert.exists(payloads[0].dedupeKey)
    assert.lengthOf(mockChannel.calls, 0)
  })

  test('send() with shouldQueue=false → delivers immediately', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel }, true)
    const manager = new NotificationManager(config)
    const { dispatcher, payloads } = createMockDispatcher()
    manager.setQueueDispatcher(dispatcher)

    const notification = new ExplicitNoQueueNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.lengthOf(payloads, 0)
    assert.lengthOf(mockChannel.calls, 1)
  })

  test('send() with queue config disabled → delivers immediately even if shouldQueue=true', async ({
    assert,
  }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel }, false)
    const manager = new NotificationManager(config)
    const { dispatcher, payloads } = createMockDispatcher()
    manager.setQueueDispatcher(dispatcher)

    const notification = new QueuedNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.lengthOf(payloads, 0)
    assert.lengthOf(mockChannel.calls, 1)
  })

  test('send() with queue enabled but no dispatcher → delivers immediately', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel }, true)
    const manager = new NotificationManager(config)
    // No queue dispatcher set

    const notification = new QueuedNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.lengthOf(mockChannel.calls, 1)
  })

  test('sendNow() always delivers immediately regardless of shouldQueue', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel }, true)
    const manager = new NotificationManager(config)
    const { dispatcher, payloads } = createMockDispatcher()
    manager.setQueueDispatcher(dispatcher)

    const notification = new QueuedNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.sendNow(notifiable, notification)

    assert.lengthOf(payloads, 0)
    assert.lengthOf(mockChannel.calls, 1)
  })

  test('queued dispatch includes correct payload shape', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel }, true)
    const manager = new NotificationManager(config)
    const { dispatcher, payloads } = createMockDispatcher()
    manager.setQueueDispatcher(dispatcher)

    const notification = new QueuedNotification()
    const notifiable = { id: 42, email: 'test@example.com' }

    await manager.send(notifiable, notification)

    const payload = payloads[0]
    assert.exists(payload.notificationType)
    assert.exists(payload.notificationData)
    assert.exists(payload.notifiableType)
    assert.exists(payload.notifiableId)
    assert.exists(payload.channel)
    assert.exists(payload.dedupeKey)
  })

  test('delay() method is honored when dispatching to queue', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel }, true)
    const manager = new NotificationManager(config)
    const { dispatcher, payloads } = createMockDispatcher()
    manager.setQueueDispatcher(dispatcher)

    const notification = new DelayedNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.equal(payloads[0].delay, 5000)
  })

  test('queue name from notification overrides config default', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel }, true)
    const manager = new NotificationManager(config)
    const { dispatcher, payloads } = createMockDispatcher()
    manager.setQueueDispatcher(dispatcher)

    const notification = new CustomQueueNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.equal(payloads[0].queue, 'high-priority')
  })

  test('NOTIFICATION_QUEUED event is emitted', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const emitter = new MockEmitter()
    const config = createConfig({ mail: () => mockChannel }, true)
    const manager = new NotificationManager(config, emitter)
    const { dispatcher } = createMockDispatcher()
    manager.setQueueDispatcher(dispatcher)

    const notification = new QueuedNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    const queuedEvent = emitter.events.find((e) => e.event === NOTIFICATION_QUEUED)
    assert.exists(queuedEvent)
    assert.equal(queuedEvent!.payload.notification.constructor.name, 'QueuedNotification')
    assert.equal(queuedEvent!.payload.channel, 'mail')
    assert.exists(queuedEvent!.payload.metadata.dedupeKey)
  })

  test('dedupe key is unique per send call', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel }, true)
    const manager = new NotificationManager(config)
    const { dispatcher, payloads } = createMockDispatcher()
    manager.setQueueDispatcher(dispatcher)

    const notifiable1 = { id: 1, email: 'a@example.com' }
    const notifiable2 = { id: 2, email: 'b@example.com' }

    await manager.send(notifiable1, new QueuedNotification())
    await manager.send(notifiable2, new QueuedNotification())

    assert.notEqual(payloads[0].dedupeKey, payloads[1].dedupeKey)
  })
})
