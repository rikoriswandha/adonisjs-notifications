import { test } from '@japa/runner'
import { NotificationManager } from '../src/notification_manager.ts'
import { NotificationRouter } from '../src/notification_router.ts'
import { Notification } from '../src/notification.ts'
import type { NotificationConfig } from '../src/contracts/config.ts'
import type { NotificationChannel } from '../src/contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../src/contracts/delivery.ts'
import type { NotificationEmitter, NotificationEventPayload } from '../src/contracts/events.ts'
import {
  NOTIFICATION_SENDING,
  NOTIFICATION_SENT,
  NOTIFICATION_FAILED,
  NOTIFICATION_SKIPPED,
} from '../src/contracts/events.ts'
import { E_NOTIFICATION_CHANNEL_MISSING } from '../src/exceptions/main.ts'

// Mock channel implementation
class MockChannel implements NotificationChannel {
  name = 'mock'
  calls: DeliveryContext[] = []
  shouldFail = false

  async send(context: DeliveryContext): Promise<DeliveryResult> {
    if (this.shouldFail) {
      throw new Error('Channel delivery failed')
    }
    this.calls.push(context)
    return {
      success: true,
      status: 'sent',
      providerMessageId: 'msg-123',
    }
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
    return ['mail']
  }

  toMail() {
    return { subject: 'Test', body: 'Hello' }
  }
}

class MultiChannelNotification extends Notification {
  via() {
    return ['mail', 'database']
  }

  toMail() {
    return { subject: 'Multi', body: 'Multi-channel' }
  }

  toDatabase() {
    return { type: 'notification', data: 'test' }
  }
}

class ConditionalNotification extends Notification {
  via() {
    return ['mail']
  }

  toMail() {
    return { subject: 'Conditional', body: 'Maybe' }
  }

  shouldSend(notifiable: any, _channel: string) {
    return notifiable.shouldReceive !== false
  }
}

// Helper to create minimal config
function createConfig(
  channels: Record<string, () => NotificationChannel | Promise<NotificationChannel>>
): NotificationConfig {
  return {
    channels,
    queue: { enabled: false, defaultQueue: 'notifications' },
    routing: { mail: ['email'], database: ['id'] },
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

test.group('NotificationManager - Channel Resolution', () => {
  test('resolves configured channel', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({
      mail: () => mockChannel,
    })
    const manager = new NotificationManager(config)

    const channel = await manager.resolveChannel('mail')

    assert.equal(channel, mockChannel)
  })

  test('throws E_NOTIFICATION_CHANNEL_MISSING for unknown channel', async ({ assert }) => {
    const config = createConfig({
      mail: () => new MockChannel(),
    })
    const manager = new NotificationManager(config)

    try {
      await manager.resolveChannel('sms')
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, E_NOTIFICATION_CHANNEL_MISSING)
      assert.match(error.message, /sms/)
    }
  })

  test('caches resolved channel', async ({ assert }) => {
    let callCount = 0
    const config = createConfig({
      mail: () => {
        callCount++
        return new MockChannel()
      },
    })
    const manager = new NotificationManager(config)

    await manager.resolveChannel('mail')
    await manager.resolveChannel('mail')
    await manager.resolveChannel('mail')

    assert.equal(callCount, 1)
  })
})

test.group('NotificationManager - send', () => {
  test('sends notification to single recipient', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({
      mail: () => mockChannel,
    })
    const manager = new NotificationManager(config)
    const notification = new TestNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.lengthOf(mockChannel.calls, 1)
    assert.equal(mockChannel.calls[0].notification, notification)
    assert.deepEqual(mockChannel.calls[0].message, { subject: 'Test', body: 'Hello' })
  })

  test('sends notification to multiple recipients', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({
      mail: () => mockChannel,
    })
    const manager = new NotificationManager(config)
    const notification = new TestNotification()
    const notifiables = [
      { id: 1, email: 'user1@example.com' },
      { id: 2, email: 'user2@example.com' },
      { id: 3, email: 'user3@example.com' },
    ]

    await manager.send(notifiables, notification)

    assert.lengthOf(mockChannel.calls, 3)
  })

  test('sends through multiple channels', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const dbChannel = new MockChannel()
    const config = createConfig({
      mail: () => mailChannel,
      database: () => dbChannel,
    })
    const manager = new NotificationManager(config)
    const notification = new MultiChannelNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.lengthOf(mailChannel.calls, 1)
    assert.lengthOf(dbChannel.calls, 1)
  })

  test('skips channel when shouldSend returns false', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({
      mail: () => mockChannel,
    })
    const manager = new NotificationManager(config)
    const notification = new ConditionalNotification()
    const notifiable = { id: 1, email: 'user@example.com', shouldReceive: false }

    await manager.send(notifiable, notification)

    assert.lengthOf(mockChannel.calls, 0)
  })
})

test.group('NotificationManager - Event Emission', () => {
  test('emits sending and sent events', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const emitter = new MockEmitter()
    const config = createConfig({
      mail: () => mockChannel,
    })
    const manager = new NotificationManager(config, emitter)
    const notification = new TestNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.lengthOf(emitter.events, 2)
    assert.equal(emitter.events[0].event, NOTIFICATION_SENDING)
    assert.equal(emitter.events[1].event, NOTIFICATION_SENT)
    assert.equal(emitter.events[1].payload.result?.status, 'sent')
  })

  test('emits failed event on channel error', async ({ assert }) => {
    const mockChannel = new MockChannel()
    mockChannel.shouldFail = true
    const emitter = new MockEmitter()
    const config = createConfig({
      mail: () => mockChannel,
    })
    const manager = new NotificationManager(config, emitter)
    const notification = new TestNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    try {
      await manager.send(notifiable, notification)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.lengthOf(emitter.events, 2)
      assert.equal(emitter.events[0].event, NOTIFICATION_SENDING)
      assert.equal(emitter.events[1].event, NOTIFICATION_FAILED)
      assert.exists(emitter.events[1].payload.error)
    }
  })

  test('emits skipped event when shouldSend returns false', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const emitter = new MockEmitter()
    const config = createConfig({
      mail: () => mockChannel,
    })
    const manager = new NotificationManager(config, emitter)
    const notification = new ConditionalNotification()
    const notifiable = { id: 1, email: 'user@example.com', shouldReceive: false }

    await manager.send(notifiable, notification)

    assert.lengthOf(emitter.events, 1)
    assert.equal(emitter.events[0].event, NOTIFICATION_SKIPPED)
  })

  test('works without emitter', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({
      mail: () => mockChannel,
    })
    const manager = new NotificationManager(config)
    const notification = new TestNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.send(notifiable, notification)

    assert.lengthOf(mockChannel.calls, 1)
  })
})

test.group('NotificationManager - sendNow', () => {
  test('delivers immediately bypassing queue', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({ mail: () => mockChannel })
    const manager = new NotificationManager(config)
    const notification = new TestNotification()
    const notifiable = { id: 1, email: 'user@example.com' }

    await manager.sendNow(notifiable, notification)

    assert.lengthOf(mockChannel.calls, 1)
  })
})

test.group('NotificationManager - route', () => {
  test('returns NotificationRouter instance', ({ assert }) => {
    const config = createConfig({
      mail: () => new MockChannel(),
    })
    const manager = new NotificationManager(config)

    const router = manager.route('mail', 'test@example.com')

    assert.instanceOf(router, NotificationRouter)
  })

  test('router can chain multiple routes', ({ assert }) => {
    const config = createConfig({
      mail: () => new MockChannel(),
      database: () => new MockChannel(),
    })
    const manager = new NotificationManager(config)

    const router = manager.route('mail', 'test@example.com').route('database', 'db-route')

    assert.instanceOf(router, NotificationRouter)
  })
})

test.group('NotificationRouter', () => {
  test('sends notification through configured routes', async ({ assert }) => {
    const mockChannel = new MockChannel()
    const config = createConfig({
      mail: () => mockChannel,
    })
    const manager = new NotificationManager(config)
    const notification = new TestNotification()

    const router = manager.route('mail', 'router@example.com')
    await router.notify(notification)

    assert.lengthOf(mockChannel.calls, 1)
  })

  test('handles multiple routes', async ({ assert }) => {
    const mailChannel = new MockChannel()
    const dbChannel = new MockChannel()
    const config = createConfig({
      mail: () => mailChannel,
      database: () => dbChannel,
    })
    const manager = new NotificationManager(config)

    class RouterTestNotification extends Notification {
      via() {
        return ['mail', 'database']
      }
      toMail() {
        return { subject: 'Router Test' }
      }
      toDatabase() {
        return { data: 'test' }
      }
    }

    const notification = new RouterTestNotification()
    const router = manager.route('mail', 'router@example.com').route('database', 'db-route')

    await router.notify(notification)

    assert.lengthOf(mailChannel.calls, 1)
    assert.lengthOf(dbChannel.calls, 1)
  })
})
