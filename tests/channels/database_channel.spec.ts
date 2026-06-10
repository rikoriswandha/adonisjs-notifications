import { test } from '@japa/runner'
import { DatabaseChannel } from '../../src/channels/database_channel.ts'
import { MemoryNotificationRepository } from '../../src/repositories/memory_notification_repository.ts'
import { Notification } from '../../src/notification.ts'
import type { DeliveryContext } from '../../src/contracts/delivery.ts'
import type { DatabaseMessageData } from '../../src/contracts/messages.ts'

class TestNotification extends Notification {
  via(_notifiable: unknown): string[] {
    return ['database']
  }

  toDatabase(_notifiable: unknown): DatabaseMessageData {
    return {
      message: 'Test notification',
      orderId: 123,
    }
  }
}

test.group('DatabaseChannel', () => {
  test('stores notification via repository', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const channel = new DatabaseChannel(repo)

    const notification = new TestNotification()
    const context: DeliveryContext<DatabaseMessageData> = {
      notification,
      notifiable: {
        id: '1',
        type: 'User',
        routes: new Map(),
        original: {},
      },
      channel: 'database',
      message: {
        message: 'Test notification',
        orderId: 123,
      },
    }

    const result = await channel.send(context)

    assert.isTrue(result.success)
    assert.equal(result.status, 'sent')
    assert.exists(result.providerMessageId)
    assert.exists(result.metadata?.notificationId)

    // Verify notification was stored
    const stored = await repo.findById(result.providerMessageId!)
    assert.exists(stored)
    assert.equal(stored!.type, 'TestNotification')
    assert.equal(stored!.notifiableType, 'User')
    assert.equal(stored!.notifiableId, '1')
    assert.deepEqual(stored!.data, { message: 'Test notification', orderId: 123 })
  })

  test('returns success with notificationId', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const channel = new DatabaseChannel(repo)

    const notification = new TestNotification()
    const context: DeliveryContext<DatabaseMessageData> = {
      notification,
      notifiable: {
        id: '42',
        type: 'Organization',
        routes: new Map(),
        original: {},
      },
      channel: 'database',
      message: { data: 'test' },
    }

    const result = await channel.send(context)

    assert.isTrue(result.success)
    assert.equal(result.status, 'sent')
    assert.exists(result.providerMessageId)
    assert.equal(result.providerMessageId, result.metadata?.notificationId)
    assert.exists(result.metadata?.storedAt)
  })

  test('handles metadata in message', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const channel = new DatabaseChannel(repo)

    const notification = new TestNotification()
    const context: DeliveryContext<DatabaseMessageData> = {
      notification,
      notifiable: {
        id: '1',
        type: 'User',
        routes: new Map(),
        original: {},
      },
      channel: 'database',
      message: {
        message: 'Test',
        metadata: { category: 'orders', priority: 'high' },
      },
    }

    const result = await channel.send(context)

    assert.isTrue(result.success)

    const stored = await repo.findById(result.providerMessageId!)
    assert.deepEqual(stored!.metadata, { category: 'orders', priority: 'high' })
  })

  test('requiresRoute is false', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const channel = new DatabaseChannel(repo)

    assert.isFalse(channel.requiresRoute)
  })

  test('resolvesOwnMessage is false', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const channel = new DatabaseChannel(repo)

    assert.isFalse(channel.resolvesOwnMessage)
  })

  test('channel name is database', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const channel = new DatabaseChannel(repo)

    assert.equal(channel.name, 'database')
  })

  test('handles repository errors gracefully', async ({ assert }) => {
    // Create a mock repository that throws
    const failingRepo = {
      store: async () => {
        throw new Error('Database connection failed')
      },
      findById: async () => null,
      listFor: async () => [],
      markAsRead: async () => {},
      markAsUnread: async () => {},
      markAllAsRead: async () => {},
      markAsSeen: async () => {},
      delete: async () => {},
      unreadCount: async () => 0,
      storeDelivery: async () => ({
        id: '',
        notificationId: null,
        notificationType: '',
        notifiableType: '',
        notifiableId: '',
        channel: '',
        status: 'pending' as const,
        attempts: 0,
        dedupeKey: '',
        providerMessageId: null,
        error: null,
        availableAt: null,
        sentAt: null,
        failedAt: null,
        createdAt: new Date(),
        updatedAt: null,
      }),
      updateDeliveryStatus: async () => {},
      findDeliveryByDedupeKey: async () => null,
      findFailedForRetry: async () => [],
      prune: async () => 0,
      pruneDeliveries: async () => 0,
      getInboxMetrics: async () => ({
        total: 0,
        unread: 0,
        read: 0,
        unseen: 0,
        byType: {},
      }),
      getDeliveryMetrics: async () => ({
        total: 0,
        byStatus: { pending: 0, sent: 0, failed: 0, skipped: 0 },
        byChannel: {},
        byType: {},
        byChannelAndStatus: {},
        averageAttempts: 0,
        failureRate: 0,
      }),
    }

    const channel = new DatabaseChannel(failingRepo)

    const notification = new TestNotification()
    const context: DeliveryContext<DatabaseMessageData> = {
      notification,
      notifiable: {
        id: '1',
        type: 'User',
        routes: new Map(),
        original: {},
      },
      channel: 'database',
      message: { test: 'data' },
    }

    const result = await channel.send(context)

    assert.isFalse(result.success)
    assert.equal(result.status, 'failed')
    assert.exists(result.error)
    assert.equal(result.error!.message, 'Database connection failed')
  })

  test('works with numeric notifiable ID', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const channel = new DatabaseChannel(repo)

    const notification = new TestNotification()
    const context: DeliveryContext<DatabaseMessageData> = {
      notification,
      notifiable: {
        id: 42,
        type: 'User',
        routes: new Map(),
        original: {},
      },
      channel: 'database',
      message: { data: 'test' },
    }

    const result = await channel.send(context)

    assert.isTrue(result.success)

    const stored = await repo.findById(result.providerMessageId!)
    assert.equal(stored!.notifiableId, 42)
  })

  test('extracts notification type from class name', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const channel = new DatabaseChannel(repo)

    const notification = new TestNotification()
    const context: DeliveryContext<DatabaseMessageData> = {
      notification,
      notifiable: {
        id: '1',
        type: 'User',
        routes: new Map(),
        original: {},
      },
      channel: 'database',
      message: {},
    }

    const result = await channel.send(context)

    assert.isTrue(result.success)

    const stored = await repo.findById(result.providerMessageId!)
    assert.equal(stored!.type, 'TestNotification')
  })
})
