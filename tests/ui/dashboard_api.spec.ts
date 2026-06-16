import { test } from '@japa/runner'
import { NotificationManager } from '../../src/notification_manager.ts'
import { MemoryNotificationRepository } from '../../src/repositories/memory_notification_repository.ts'
import {
  buildFilter,
  deleteNotification,
  getCsrfToken,
  getInbox,
  getMetrics,
  markAllAsRead,
  markAsRead,
  markAsUnread,
  DashboardApiError,
} from '../../src/ui/dashboard/api_handler.ts'
import type { NotificationConfig } from '../../src/contracts/config.ts'

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
      retry: { attempts: 3, backoff: [30, 300, 900] },
    },
    serialization: { notificationAliases: {}, notifiableAliases: {} },
    preferences: { quietHours: { enabled: false, bypassPriorities: [] } },
  }
}

function createManager(repo: MemoryNotificationRepository) {
  const manager = new NotificationManager(createConfig())
  manager.setRepository(repo)
  return manager
}

test.group('Dashboard API handler', () => {
  test('getMetrics returns inbox, deliveries and computedAt', async ({ assert }) => {
    const manager = createManager(new MemoryNotificationRepository())
    const metrics = await getMetrics(manager, {})

    assert.properties(metrics, ['inbox', 'deliveries', 'computedAt'])
    assert.isNull(metrics.inbox)
    assert.equal(metrics.deliveries.total, 0)
    assert.isString(metrics.computedAt)
  })

  test('getInbox returns paginated notifications, total and unreadCount', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    await repo.store({ type: 'A', notifiableType: 'User', notifiableId: '1', data: {} })
    await repo.store({ type: 'B', notifiableType: 'User', notifiableId: '1', data: {} })
    const manager = createManager(repo)

    const result = await getInbox(manager, 'User', '1', { page: 1, perPage: 10, unreadOnly: false })

    assert.equal(result.total, 2)
    assert.equal(result.unreadCount, 2)
    assert.equal(result.notifications.length, 2)
    assert.equal(result.page, 1)
    assert.equal(result.perPage, 10)
  })

  test('getInbox applies unreadOnly filter', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const n1 = await repo.store({ type: 'A', notifiableType: 'User', notifiableId: '1', data: {} })
    await repo.store({ type: 'B', notifiableType: 'User', notifiableId: '1', data: {} })
    await repo.markAsRead(n1.id)
    const manager = createManager(repo)

    const result = await getInbox(manager, 'User', '1', { page: 1, perPage: 10, unreadOnly: true })

    assert.equal(result.notifications.length, 1)
    assert.equal(result.notifications[0].type, 'B')
  })

  test('getInbox throws 400 when repository is missing', async ({ assert }) => {
    const manager = new NotificationManager(createConfig())

    try {
      await getInbox(manager, 'User', '1', {})
      assert.fail('Expected error')
    } catch (error) {
      assert.instanceOf(error, DashboardApiError)
      assert.equal((error as DashboardApiError).status, 400)
    }
  })

  test('markAsRead updates readAt', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const n = await repo.store({ type: 'A', notifiableType: 'User', notifiableId: '1', data: {} })
    const manager = createManager(repo)

    const updated = await markAsRead(manager, n.id)

    assert.isNotNull(updated.readAt)
  })

  test('markAsRead throws 404 for unknown id', async ({ assert }) => {
    const manager = createManager(new MemoryNotificationRepository())

    try {
      await markAsRead(manager, 'missing')
      assert.fail('Expected error')
    } catch (error) {
      assert.instanceOf(error, DashboardApiError)
      assert.equal((error as DashboardApiError).status, 404)
    }
  })

  test('markAsUnread clears readAt', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const n = await repo.store({ type: 'A', notifiableType: 'User', notifiableId: '1', data: {} })
    await repo.markAsRead(n.id)
    const manager = createManager(repo)

    const updated = await markAsUnread(manager, n.id)

    assert.isNull(updated.readAt)
  })

  test('markAllAsRead marks every notification for notifiable', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    await repo.store({ type: 'A', notifiableType: 'User', notifiableId: '1', data: {} })
    await repo.store({ type: 'B', notifiableType: 'User', notifiableId: '1', data: {} })
    const manager = createManager(repo)

    const result = await markAllAsRead(manager, 'User', '1')

    assert.deepEqual(result, { ok: true })
    assert.equal(await repo.unreadCount('User', '1'), 0)
  })

  test('markAllAsRead throws 400 when notifiable params are missing', async ({ assert }) => {
    const manager = createManager(new MemoryNotificationRepository())

    try {
      await markAllAsRead(manager, '', '')
      assert.fail('Expected error')
    } catch (error) {
      assert.instanceOf(error, DashboardApiError)
      assert.equal((error as DashboardApiError).status, 400)
    }
  })

  test('deleteNotification removes row', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const n = await repo.store({ type: 'A', notifiableType: 'User', notifiableId: '1', data: {} })
    const manager = createManager(repo)

    const result = await deleteNotification(manager, n.id)

    assert.deepEqual(result, { ok: true })
    assert.isNull(await repo.findById(n.id))
  })

  test('deleteNotification throws 404 for unknown id', async ({ assert }) => {
    const manager = createManager(new MemoryNotificationRepository())

    try {
      await deleteNotification(manager, 'missing')
      assert.fail('Expected error')
    } catch (error) {
      assert.instanceOf(error, DashboardApiError)
      assert.equal((error as DashboardApiError).status, 404)
    }
  })

  test('getCsrfToken extracts token from request', ({ assert }) => {
    const request = { csrfToken: () => 'abc123' }
    assert.equal(getCsrfToken(request).csrfToken, 'abc123')
  })

  test('getCsrfToken returns undefined when method throws', ({ assert }) => {
    const request = {
      csrfToken: () => {
        throw new Error('no shield')
      },
    }
    assert.isUndefined(getCsrfToken(request).csrfToken)
  })

  test('buildFilter parses query params', ({ assert }) => {
    const filter = buildFilter({
      channel: 'mail',
      notificationType: 'InvoicePaid',
      status: 'sent',
      from: '2024-01-01',
      to: '2024-12-31',
    })

    assert.equal(filter.channel, 'mail')
    assert.equal(filter.notificationType, 'InvoicePaid')
    assert.equal(filter.status, 'sent')
    assert.instanceOf(filter.from, Date)
    assert.instanceOf(filter.to, Date)
  })

  test('buildFilter throws on invalid date', ({ assert }) => {
    try {
      buildFilter({ from: 'not-a-date' })
      assert.fail('Expected error')
    } catch (error) {
      assert.instanceOf(error, DashboardApiError)
      assert.equal((error as DashboardApiError).status, 400)
    }
  })
})
