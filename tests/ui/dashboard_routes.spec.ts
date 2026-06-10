import { test } from '@japa/runner'
import { HttpContextFactory, RequestFactory } from '@adonisjs/http-server/factories'
import type { HttpContext } from '@adonisjs/core/http'
import { NotificationManager } from '../../src/notification_manager.ts'
import { MemoryNotificationRepository } from '../../src/repositories/memory_notification_repository.ts'
import {
  handleDashboardIndex,
  handleInboxPage,
  handleInboxList,
  handleMarkAsRead,
  handleMarkAsUnread,
  handleMarkAllAsRead,
  handleDeleteNotification,
} from '../../src/ui/dashboard/handlers.ts'
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

function createMockRequest(url: string, headers?: Record<string, string>) {
  const req = new RequestFactory().merge({ url }).create()
  if (headers) {
    req.request.headers = headers
  }
  return req
}

function createMockContext(url: string, headers?: Record<string, string>) {
  const request = createMockRequest(url, headers)
  const ctx = new HttpContextFactory().merge({ request }).create()
  return ctx
}
function getResponseBody(ctx: HttpContext): string {
  const content = ctx.response.lazyBody?.content as [string, boolean] | undefined
  return content?.[0] ?? ''
}

test.group('Dashboard Routes - GET /', () => {
  test('returns full HTML without HTMX header', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const manager = createManager(repo)
    const ctx = createMockContext('/')

    await handleDashboardIndex(ctx, manager)

    const body = getResponseBody(ctx)
    assert.include(body, '<!doctype html>')
    assert.include(body, 'Notification Metrics')
    assert.include(body, '<script src="https://unpkg.com/htmx.org@2.0.4" defer></script>')
  })

  test('returns metrics fragment with HX-Request header', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const manager = createManager(repo)
    const ctx = createMockContext('/', { 'hx-request': 'true' })

    await handleDashboardIndex(ctx, manager)

    const body = getResponseBody(ctx)
    assert.notInclude(body, '<!doctype html>')
    assert.include(body, 'id="metrics-panel"')
    assert.include(body, 'filter-form')
  })
})

test.group('Dashboard Routes - GET /inbox/:type/:id', () => {
  test('returns full inbox page', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: '1',
      data: { message: 'hello' },
    })
    const manager = createManager(repo)
    const ctx = createMockContext('/inbox/User/1')

    await handleInboxPage(ctx, manager, 'User', '1')

    const body = getResponseBody(ctx)
    assert.include(body, '<!doctype html>')
    assert.include(body, 'Inbox — User 1')
    assert.include(body, 'TestNotification')
    assert.include(body, 'id="inbox-list"')
  })

  test('returns 400 when repository not configured', async ({ assert }) => {
    const manager = new NotificationManager(createConfig())
    const ctx = createMockContext('/inbox/User/1')

    await handleInboxPage(ctx, manager, 'User', '1')

    assert.equal(ctx.response.response.statusCode, 400)
    assert.include(getResponseBody(ctx), 'not configured')
  })
})

test.group('Dashboard Routes - GET /inbox/:type/:id/list', () => {
  test('returns notification rows HTML fragment', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: '1',
      data: { message: 'hello' },
    })
    const manager = createManager(repo)
    const ctx = createMockContext('/inbox/User/1/list')

    await handleInboxList(ctx, manager, 'User', '1')

    const body = getResponseBody(ctx)
    assert.notInclude(body, '<!doctype html>')
    assert.include(body, 'id="inbox-list"')
    assert.include(body, 'TestNotification')
  })

  test('returns paginated list with unreadOnly filter', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    for (let i = 0; i < 5; i++) {
      await repo.store({
        type: 'MsgNotification',
        notifiableType: 'User',
        notifiableId: '1',
        data: { idx: i },
      })
    }
    const all = await repo.listFor('User', '1')
    await repo.markAsRead(all[0].id)

    const manager = createManager(repo)
    const ctx = createMockContext('/inbox/User/1/list?unreadOnly=true&page=1&perPage=2')

    await handleInboxList(ctx, manager, 'User', '1')

    const body = getResponseBody(ctx)
    assert.include(body, 'Mark read')
    assert.include(body, 'Page 1 of')
    assert.include(body, 'Next')
  })
})

test.group('Dashboard Routes - PATCH /notifications/:id/read', () => {
  test('mark read returns updated row + toast for HTMX', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const n = await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })
    const manager = createManager(repo)
    const ctx = createMockContext(`/notifications/${n.id}/read`, { 'hx-request': 'true' })

    await handleMarkAsRead(ctx, manager, n.id)

    const body = getResponseBody(ctx)
    assert.include(body, 'notification-row')
    assert.include(body, 'Mark unread')
    assert.include(body, 'toast-success')
    assert.include(body, 'Marked as read')
  })

  test('mark read redirects without HTMX', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const n = await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })
    const manager = createManager(repo)
    const ctx = createMockContext(`/notifications/${n.id}/read`)

    await handleMarkAsRead(ctx, manager, n.id)

    assert.equal(ctx.response.response.statusCode, 302)
    assert.include(getResponseBody(ctx), '/inbox/User/1')
  })
})

test.group('Dashboard Routes - PATCH /notifications/:id/unread', () => {
  test('mark unread returns updated row + toast for HTMX', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const n = await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })
    await repo.markAsRead(n.id)
    const manager = createManager(repo)
    const ctx = createMockContext(`/notifications/${n.id}/unread`, { 'hx-request': 'true' })

    await handleMarkAsUnread(ctx, manager, n.id)

    const body = getResponseBody(ctx)
    assert.include(body, 'Mark read')
    assert.include(body, 'Marked as unread')
  })
})

test.group('Dashboard Routes - PATCH /notifications/mark-all-read', () => {
  test('redirects to inbox after marking all read', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    await repo.store({ type: 'A', notifiableType: 'User', notifiableId: '1', data: {} })
    await repo.store({ type: 'B', notifiableType: 'User', notifiableId: '1', data: {} })
    const manager = createManager(repo)

    const req = createMockRequest('/notifications/mark-all-read')
    const ctx = new HttpContextFactory().merge({ request: req }).create()
    ;(ctx.request as unknown as { all(): Record<string, unknown> }).all = () => ({
      notifiableType: 'User',
      notifiableId: '1',
    })

    await handleMarkAllAsRead(ctx, manager)

    assert.equal(ctx.response.response.statusCode, 302)
    assert.include(getResponseBody(ctx), '/inbox/User/1')
  })

  test('returns 400 when missing notifiable params', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const manager = createManager(repo)
    const ctx = createMockContext('/notifications/mark-all-read')

    await handleMarkAllAsRead(ctx, manager)

    assert.equal(ctx.response.response.statusCode, 400)
  })
})

test.group('Dashboard Routes - DELETE /notifications/:id', () => {
  test('delete returns toast OOB for HTMX', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const n = await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })
    const manager = createManager(repo)
    const ctx = createMockContext(`/notifications/${n.id}`, { 'hx-request': 'true' })

    await handleDeleteNotification(ctx, manager, n.id)

    const body = getResponseBody(ctx)
    assert.include(body, 'toast-success')
    assert.include(body, 'Deleted')
    const remaining = await repo.findById(n.id)
    assert.isNull(remaining)
  })

  test('delete redirects without HTMX', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const n = await repo.store({
      type: 'TestNotification',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })
    const manager = createManager(repo)
    const ctx = createMockContext(`/notifications/${n.id}`)

    await handleDeleteNotification(ctx, manager, n.id)

    assert.equal(ctx.response.response.statusCode, 302)
  })
})
