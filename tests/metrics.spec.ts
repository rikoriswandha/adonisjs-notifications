import { test } from '@japa/runner'
import { NotificationManager } from '../src/notification_manager.ts'
import { MemoryNotificationRepository } from '../src/repositories/memory_notification_repository.ts'
import type { NotificationConfig } from '../src/contracts/config.ts'
import type { DeliveryStatus } from '../src/contracts/delivery.ts'
import { createDashboardHtml } from '../src/ui/dashboard/html.ts'

function createConfig(): NotificationConfig {
  return {
    channels: {},
    queue: { enabled: false, defaultQueue: 'notifications' },
    routing: {},
    database: {
      table: 'notifications',
      deliveriesTable: 'notification_deliveries',
      idStrategy: 'uuid',
    },
    delivery: {
      recordAttempts: true,
      failFast: false,
      retry: { attempts: 3, backoff: [10, 20, 30] },
    },
    serialization: { notificationAliases: {}, notifiableAliases: {} },
    preferences: { quietHours: { enabled: false, bypassPriorities: [] } },
  }
}

test.group('Metrics - getMetrics with no repository', () => {
  test('returns zero-value structure without throwing', async ({ assert }) => {
    const manager = new NotificationManager(createConfig())
    const metrics = await manager.getMetrics()

    assert.isNull(metrics.inbox)
    assert.equal(metrics.deliveries.total, 0)
    assert.deepEqual(metrics.deliveries.byStatus, {
      pending: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    })
    assert.deepEqual(metrics.deliveries.byChannel, {})
    assert.deepEqual(metrics.deliveries.byType, {})
    assert.deepEqual(metrics.deliveries.byChannelAndStatus, {})
    assert.equal(metrics.deliveries.averageAttempts, 0)
    assert.equal(metrics.deliveries.failureRate, 0)
    assert.isString(metrics.computedAt)
    assert.doesNotThrow(() => new Date(metrics.computedAt))
  })
})

test.group('Metrics - inbox metrics', () => {
  test('counts total, unread, read, unseen and byType', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const manager = new NotificationManager(createConfig())
    manager.setRepository(repo)

    // Seed notifications
    const n1 = await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      data: {},
    })
    const n2 = await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      data: {},
    })
    await repo.store({
      type: 'OtherNotification',
      notifiableType: 'User',
      notifiableId: 1,
      data: {},
    })
    // Different notifiable — should be excluded
    await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 2,
      data: {},
    })

    // Mark one as read and seen
    await repo.markAsRead(n1.id)
    await repo.markAsSeen(n1.id)
    // Mark another as seen but unread
    await repo.markAsSeen(n2.id)

    const metrics = await manager.getMetrics({ notifiableType: 'User', notifiableId: 1 })

    assert.isNotNull(metrics.inbox)
    assert.equal(metrics.inbox!.total, 3)
    assert.equal(metrics.inbox!.unread, 2)
    assert.equal(metrics.inbox!.read, 1)
    assert.equal(metrics.inbox!.unseen, 1)
    assert.deepEqual(metrics.inbox!.byType, {
      TestNotification: 2,
      OtherNotification: 1,
    })
  })
})

test.group('Metrics - delivery metrics', () => {
  test('aggregates by status, channel, type and pivot', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const manager = new NotificationManager(createConfig())
    manager.setRepository(repo)
    // Seed deliveries
    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'd1',
      attempts: 1,
    })
    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'mail',
      status: 'failed',
      dedupeKey: 'd2',
      attempts: 3,
    })
    await repo.storeDelivery({
      notificationType: 'OtherNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'database',
      status: 'sent',
      dedupeKey: 'd3',
      attempts: 1,
    })
    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 2,
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'd4',
      attempts: 0,
    })
    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'mail',
      status: 'skipped',
      dedupeKey: 'd5',
      attempts: 0,
    })

    const metrics = await manager.getMetrics()

    assert.equal(metrics.deliveries.total, 5)
    assert.equal(metrics.deliveries.byStatus.sent, 2)
    assert.equal(metrics.deliveries.byStatus.failed, 1)
    assert.equal(metrics.deliveries.byStatus.pending, 1)
    assert.equal(metrics.deliveries.byStatus.skipped, 1)

    assert.equal(metrics.deliveries.byChannel.mail, 4)
    assert.equal(metrics.deliveries.byChannel.database, 1)

    assert.equal(metrics.deliveries.byType.TestNotification, 4)
    assert.equal(metrics.deliveries.byType.OtherNotification, 1)

    assert.deepEqual(metrics.deliveries.byChannelAndStatus.mail, {
      pending: 1,
      sent: 1,
      failed: 1,
      skipped: 1,
    })
    assert.deepEqual(metrics.deliveries.byChannelAndStatus.database, {
      pending: 0,
      sent: 1,
      failed: 0,
      skipped: 0,
    })

    // averageAttempts = (1 + 3 + 1 + 0 + 0) / 5 = 1.0
    assert.equal(metrics.deliveries.averageAttempts, 1)
    // failureRate = 1 / 5 = 0.2
    assert.equal(metrics.deliveries.failureRate, 0.2)
  })
})

test.group('Metrics - delivery filter scoping', () => {
  test('filters by channel', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const manager = new NotificationManager(createConfig())
    manager.setRepository(repo)

    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'd1',
      attempts: 1,
    })
    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'database',
      status: 'sent',
      dedupeKey: 'd2',
      attempts: 1,
    })

    const metrics = await manager.getMetrics({ filter: { channel: 'mail' } })
    assert.equal(metrics.deliveries.total, 1)
    assert.equal(metrics.deliveries.byChannel.mail, 1)
    assert.isUndefined(metrics.deliveries.byChannel.database)
  })

  test('filters by status', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const manager = new NotificationManager(createConfig())
    manager.setRepository(repo)

    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'd1',
      attempts: 1,
    })
    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'mail',
      status: 'failed',
      dedupeKey: 'd2',
      attempts: 1,
    })

    const metrics = await manager.getMetrics({ filter: { status: 'failed' as DeliveryStatus } })
    assert.equal(metrics.deliveries.total, 1)
    assert.equal(metrics.deliveries.byStatus.failed, 1)
    assert.equal(metrics.deliveries.byStatus.sent, 0)
  })

  test('filters by date range', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const manager = new NotificationManager(createConfig())
    manager.setRepository(repo)

    const oldDate = new Date('2024-01-01')
    const newDate = new Date('2024-06-01')

    // Inject with custom createdAt by updating after store
    const d1 = await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'd1',
      attempts: 1,
    })
    const d2 = await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'd2',
      attempts: 1,
    })

    // Hack createdAt directly (acceptable for tests)
    const deliveries = repo.getAllDeliveries()
    const r1 = deliveries.find((d) => d.id === d1.id)!
    const r2 = deliveries.find((d) => d.id === d2.id)!
    r1.createdAt = oldDate
    r2.createdAt = newDate

    const metrics = await manager.getMetrics({
      filter: { from: new Date('2024-03-01'), to: new Date('2024-12-31') },
    })
    assert.equal(metrics.deliveries.total, 1)
    assert.equal(Object.keys(metrics.deliveries.byChannel).length, 1)
  })

  test('filters by notifiableType and notifiableId', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const manager = new NotificationManager(createConfig())
    manager.setRepository(repo)

    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 1,
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'd1',
      attempts: 1,
    })
    await repo.storeDelivery({
      notificationType: 'TestNotification',
      notifiableType: 'User',
      notifiableId: 2,
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'd2',
      attempts: 1,
    })

    const metrics = await manager.getMetrics({
      filter: { notifiableType: 'User', notifiableId: 1 },
    })
    assert.equal(metrics.deliveries.total, 1)
  })
})

test.group('Metrics - createDashboardHtml', () => {
  test('returns HTML with metrics headings and values', ({ assert }) => {
    const metrics = {
      inbox: null,
      deliveries: {
        total: 10,
        byStatus: { pending: 1, sent: 7, failed: 2, skipped: 0 },
        byChannel: { mail: 8, database: 2 },
        byType: { TestNotification: 10 },
        byChannelAndStatus: {
          mail: { pending: 1, sent: 6, failed: 1, skipped: 0 },
          database: { pending: 0, sent: 1, failed: 1, skipped: 0 },
        },
        averageAttempts: 1.2,
        failureRate: 0.2,
      },
      computedAt: new Date().toISOString(),
    }

    const html = createDashboardHtml(metrics, { title: 'Test Dashboard' })

    assert.include(html, '<!doctype html>')
    assert.include(html, 'Test Dashboard')
    assert.include(html, '10') // total deliveries
    assert.include(html, '7') // sent
    assert.include(html, '2') // failed
    assert.include(html, '1') // pending
    assert.include(html, 'mail')
    assert.include(html, 'database')
    assert.include(html, 'TestNotification')
  })

  test('renders inbox section when present', ({ assert }) => {
    const metrics = {
      inbox: {
        total: 5,
        unread: 2,
        read: 3,
        unseen: 1,
        byType: { TestNotification: 3, OtherNotification: 2 },
      },
      deliveries: {
        total: 0,
        byStatus: { pending: 0, sent: 0, failed: 0, skipped: 0 },
        byChannel: {},
        byType: {},
        byChannelAndStatus: {},
        averageAttempts: 0,
        failureRate: 0,
      },
      computedAt: new Date().toISOString(),
    }

    const html = createDashboardHtml(metrics)

    assert.include(html, 'Inbox Metrics')
    assert.include(html, 'Total')
    assert.include(html, 'Unread')
    assert.include(html, 'Read')
    assert.include(html, 'Unseen')
    assert.include(html, 'TestNotification')
    assert.include(html, 'OtherNotification')
  })
})
