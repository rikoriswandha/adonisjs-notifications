import { test } from '@japa/runner'
import { NotificationManager } from '../src/notification_manager.ts'
import { Notification } from '../src/notification.ts'
import { MemoryNotificationRepository } from '../src/repositories/memory_notification_repository.ts'
import type { NotificationConfig } from '../src/contracts/config.ts'
import type { NotificationChannel } from '../src/contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../src/contracts/delivery.ts'
import type { NotificationEmitter, NotificationEventPayload } from '../src/contracts/events.ts'
import {
  NOTIFICATION_SENT,
  NOTIFICATION_FAILED,
  NOTIFICATION_SKIPPED,
} from '../src/contracts/events.ts'

class MockChannel implements NotificationChannel {
  name = 'mock'
  resolvesOwnMessage = true
  requiresRoute = false
  calls: DeliveryContext[] = []
  failCount = 0
  attemptCount = 0
  async send(context: DeliveryContext): Promise<DeliveryResult> {
    this.attemptCount++
    if (this.attemptCount <= this.failCount) {
      throw new Error(`Attempt ${this.attemptCount} failed`)
    }
    this.calls.push(context)
    return { success: true, status: 'sent', providerMessageId: 'msg-123' }
  }
}

class MockEmitter implements NotificationEmitter {
  events: Array<{ event: string; payload: NotificationEventPayload }> = []

  emit(event: string, payload: NotificationEventPayload): void {
    this.events.push({ event, payload })
  }
}

class TestNotification extends Notification {
  via() {
    return ['mail']
  }

  toMail() {
    return { subject: 'Test', body: 'Hello' }
  }
}

function createConfig(
  channels: Record<string, () => NotificationChannel | Promise<NotificationChannel>>,
  overrides?: Partial<NotificationConfig['delivery']>
): NotificationConfig {
  return {
    channels,
    queue: { enabled: false, defaultQueue: 'notifications' },
    routing: { mail: ['email'] },
    database: {
      table: 'notifications',
      deliveriesTable: 'notification_deliveries',
      idStrategy: 'uuid',
    },
    delivery: {
      recordAttempts: overrides?.recordAttempts ?? true,
      failFast: overrides?.failFast ?? false,
      retry: overrides?.retry ?? { attempts: 3, backoff: [10, 20, 30] },
    },
    serialization: { notificationAliases: {}, notifiableAliases: {} },
    preferences: { quietHours: { enabled: false, bypassPriorities: [] } },
  }
}

const notifiable = {
  original: { id: '1', email: 'test@example.com' },
  type: 'User',
  id: '1',
  routes: new Map<string, unknown>(),
}

test.group('Delivery Tracking - successful delivery', () => {
  test('creates sent delivery record on success', async ({ assert }) => {
    const channel = new MockChannel()
    const repo = new MemoryNotificationRepository()
    const config = createConfig({ mail: () => channel })
    const manager = new NotificationManager(config)
    manager.setRepository(repo)

    const notification = new TestNotification()
    await manager.sendNow(notifiable, notification)

    const deliveries = repo.getAllDeliveries()
    assert.lengthOf(deliveries, 1)
    assert.equal(deliveries[0].status, 'sent')
    assert.equal(deliveries[0].attempts, 1)
    assert.equal(deliveries[0].providerMessageId, 'msg-123')
    assert.exists(deliveries[0].sentAt)
  })

  test('events include deliveryId when tracking is enabled', async ({ assert }) => {
    const channel = new MockChannel()
    const repo = new MemoryNotificationRepository()
    const emitter = new MockEmitter()
    const config = createConfig({ mail: () => channel })
    const manager = new NotificationManager(config, emitter)
    manager.setRepository(repo)

    const notification = new TestNotification()
    await manager.sendNow(notifiable, notification)

    const deliveries = repo.getAllDeliveries()
    assert.lengthOf(deliveries, 1)

    const sentEvent = emitter.events.find((e) => e.event === NOTIFICATION_SENT)
    assert.exists(sentEvent)
    assert.equal(sentEvent!.payload.deliveryId, deliveries[0].id)
  })
})

test.group('Delivery Tracking - failed delivery', () => {
  test('creates failed delivery record with structured error', async ({ assert }) => {
    const channel = new MockChannel()
    channel.failCount = Infinity
    const repo = new MemoryNotificationRepository()
    const config = createConfig({ mail: () => channel })
    const manager = new NotificationManager(config)
    manager.setRepository(repo)

    const notification = new TestNotification()
    try {
      await manager.sendNow(notifiable, notification)
      assert.fail('Expected sendNow to throw')
    } catch {
      // Expected
    }

    const deliveries = repo.getAllDeliveries()
    assert.lengthOf(deliveries, 1)
    assert.equal(deliveries[0].status, 'failed')
    assert.equal(deliveries[0].attempts, 3)
    assert.exists(deliveries[0].error)
    assert.equal(deliveries[0].error?.message, 'Attempt 3 failed')
    assert.equal(deliveries[0].error?.attempt, 3)
    assert.exists(deliveries[0].failedAt)
  })

  test('emit FAILED event includes deliveryId', async ({ assert }) => {
    const channel = new MockChannel()
    channel.failCount = Infinity
    const repo = new MemoryNotificationRepository()
    const emitter = new MockEmitter()
    const config = createConfig({ mail: () => channel })
    const manager = new NotificationManager(config, emitter)
    manager.setRepository(repo)
    const notification = new TestNotification()
    try {
      await manager.sendNow(notifiable, notification)
      assert.fail('Expected sendNow to throw')
    } catch {
      // Expected
    }
    const deliveries = repo.getAllDeliveries()
    assert.lengthOf(deliveries, 1)
    const failedEvent = emitter.events.find((e) => e.event === NOTIFICATION_FAILED)
    assert.exists(failedEvent)
    assert.equal(failedEvent!.payload.deliveryId, deliveries[0].id)
  })
})

test.group('Delivery Tracking - deduplication', () => {
  test('duplicate dedupe key is skipped', async ({ assert }) => {
    const channel = new MockChannel()
    const repo = new MemoryNotificationRepository()
    const emitter = new MockEmitter()
    const config = createConfig({ mail: () => channel })
    const manager = new NotificationManager(config, emitter)
    manager.setRepository(repo)

    const notification = new TestNotification()
    await manager.sendNow(notifiable, notification)
    await manager.sendNow(notifiable, notification)

    const deliveries = repo.getAllDeliveries()
    assert.lengthOf(deliveries, 1)

    const skippedEvent = emitter.events.find((e) => e.event === NOTIFICATION_SKIPPED)
    assert.exists(skippedEvent)
    assert.equal(skippedEvent!.payload.deliveryId, deliveries[0].id)
  })
})

test.group('Delivery Tracking - retry with backoff', () => {
  test('retries on transient failure until success', async ({ assert }) => {
    const channel = new MockChannel()
    channel.failCount = 2
    const repo = new MemoryNotificationRepository()
    const config = createConfig({ mail: () => channel })
    const manager = new NotificationManager(config)
    manager.setRepository(repo)

    const notification = new TestNotification()
    await manager.sendNow(notifiable, notification)

    assert.equal(channel.attemptCount, 3)

    const deliveries = repo.getAllDeliveries()
    assert.lengthOf(deliveries, 1)
    assert.equal(deliveries[0].status, 'sent')
    assert.equal(deliveries[0].attempts, 3)
  })

  test('retry exhausted marks final failure', async ({ assert }) => {
    const channel = new MockChannel()
    channel.failCount = 10
    const repo = new MemoryNotificationRepository()
    const config = createConfig({ mail: () => channel })
    const manager = new NotificationManager(config)
    manager.setRepository(repo)

    const notification = new TestNotification()
    try {
      await manager.sendNow(notifiable, notification)
      assert.fail('Expected sendNow to throw')
    } catch {
      // Expected
    }

    assert.equal(channel.attemptCount, 3)

    const deliveries = repo.getAllDeliveries()
    assert.lengthOf(deliveries, 1)
    assert.equal(deliveries[0].status, 'failed')
    assert.equal(deliveries[0].attempts, 3)
  })
})

test.group('Delivery Tracking - retryFailedDeliveries', () => {
  test('retries failed deliveries and updates records', async ({ assert }) => {
    const channel = new MockChannel()
    const repo = new MemoryNotificationRepository()
    const config = createConfig({ mail: () => channel })
    const manager = new NotificationManager(config)
    manager.setRepository(repo)

    const failedDelivery = await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'failed',
      dedupeKey: 'test-dedupe-key',
      attempts: 3,
    })

    const result = await manager.retryFailedDeliveries()

    assert.equal(result.retried, 1)
    assert.equal(result.skipped, 0)
    assert.lengthOf(result.errors, 0)

    const allDeliveries = repo.getAllDeliveries()
    assert.isTrue(allDeliveries.some((d) => d.id === failedDelivery.id && d.status === 'failed'))

    const sentDeliveries = allDeliveries.filter((d) => d.status === 'sent')
    assert.lengthOf(sentDeliveries, 1)
  })

  test('returns empty result when no repository', async ({ assert }) => {
    const channel = new MockChannel()
    const config = createConfig({ mail: () => channel })
    const manager = new NotificationManager(config)

    const result = await manager.retryFailedDeliveries()
    assert.equal(result.retried, 0)
    assert.equal(result.skipped, 0)
    assert.lengthOf(result.errors, 0)
  })
})

test.group('Delivery Tracking - recordAttempts disabled', () => {
  test('skips all persistence when recordAttempts is false', async ({ assert }) => {
    const channel = new MockChannel()
    const repo = new MemoryNotificationRepository()
    const emitter = new MockEmitter()
    const config = createConfig({ mail: () => channel }, { recordAttempts: false })
    const manager = new NotificationManager(config, emitter)
    manager.setRepository(repo)

    const notification = new TestNotification()
    await manager.sendNow(notifiable, notification)

    assert.lengthOf(repo.getAllDeliveries(), 0)

    const sentEvent = emitter.events.find((e) => e.event === NOTIFICATION_SENT)
    assert.exists(sentEvent)
    assert.isUndefined(sentEvent!.payload.deliveryId)
  })
})
