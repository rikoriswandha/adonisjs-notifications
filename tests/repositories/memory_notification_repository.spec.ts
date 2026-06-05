import { test } from '@japa/runner'
import { MemoryNotificationRepository } from '../../src/repositories/memory_notification_repository.ts'

test.group('MemoryNotificationRepository', () => {
  test('store and retrieve notification', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const stored = await repo.store({
      type: 'OrderShipped',
      notifiableType: 'User',
      notifiableId: '1',
      data: { orderId: 123, trackingNumber: 'ABC' },
    })

    assert.exists(stored.id)
    assert.equal(stored.type, 'OrderShipped')
    assert.equal(stored.notifiableType, 'User')
    assert.equal(stored.notifiableId, '1')
    assert.deepEqual(stored.data, { orderId: 123, trackingNumber: 'ABC' })
    assert.isNull(stored.metadata)
    assert.isNull(stored.readAt)
    assert.isNull(stored.seenAt)
    assert.exists(stored.createdAt)

    const found = await repo.findById(stored.id)
    assert.deepEqual(found, stored)
  })

  test('store notification with custom ID', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const stored = await repo.store({
      id: 'custom-id-123',
      type: 'Test',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    assert.equal(stored.id, 'custom-id-123')
  })

  test('store notification with metadata', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const stored = await repo.store({
      type: 'Test',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
      metadata: { category: 'orders', priority: 'high' },
    })

    assert.deepEqual(stored.metadata, { category: 'orders', priority: 'high' })
  })

  test('findById returns null for non-existent ID', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const found = await repo.findById('non-existent')
    assert.isNull(found)
  })

  test('listFor returns notifications for specific notifiable', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    await repo.store({
      type: 'Notification1',
      notifiableType: 'User',
      notifiableId: '1',
      data: { n: 1 },
    })

    await repo.store({
      type: 'Notification2',
      notifiableType: 'User',
      notifiableId: '1',
      data: { n: 2 },
    })

    await repo.store({
      type: 'Notification3',
      notifiableType: 'User',
      notifiableId: '2',
      data: { n: 3 },
    })

    const user1Notifications = await repo.listFor('User', '1')
    assert.lengthOf(user1Notifications, 2)

    const user2Notifications = await repo.listFor('User', '2')
    assert.lengthOf(user2Notifications, 1)
  })

  test('listFor with pagination', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    for (let i = 0; i < 5; i++) {
      await repo.store({
        type: `Notification${i}`,
        notifiableType: 'User',
        notifiableId: '1',
        data: { index: i },
      })
    }

    const page1 = await repo.listFor('User', '1', { limit: 2, offset: 0 })
    assert.lengthOf(page1, 2)

    const page2 = await repo.listFor('User', '1', { limit: 2, offset: 2 })
    assert.lengthOf(page2, 2)

    const page3 = await repo.listFor('User', '1', { limit: 2, offset: 4 })
    assert.lengthOf(page3, 1)
  })

  test('listFor with unreadOnly filter', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const n1 = await repo.store({
      type: 'Notification1',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.store({
      type: 'Notification2',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.markAsRead(n1.id)

    const unread = await repo.listFor('User', '1', { unreadOnly: true })
    assert.lengthOf(unread, 1)
    assert.equal(unread[0].type, 'Notification2')
  })

  test('markAsRead sets readAt timestamp', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const stored = await repo.store({
      type: 'Test',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    assert.isNull(stored.readAt)

    await repo.markAsRead(stored.id)

    const updated = await repo.findById(stored.id)
    assert.exists(updated!.readAt)
    assert.isTrue(updated!.readAt instanceof Date)
  })

  test('markAsUnread clears readAt timestamp', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const stored = await repo.store({
      type: 'Test',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.markAsRead(stored.id)
    let updated = await repo.findById(stored.id)
    assert.exists(updated!.readAt)

    await repo.markAsUnread(stored.id)
    updated = await repo.findById(stored.id)
    assert.isNull(updated!.readAt)
  })

  test('markAllAsRead marks all notifications for notifiable', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    await repo.store({
      type: 'Notification1',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.store({
      type: 'Notification2',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.store({
      type: 'Notification3',
      notifiableType: 'User',
      notifiableId: '2',
      data: {},
    })

    await repo.markAllAsRead('User', '1')

    const user1Notifications = await repo.listFor('User', '1')
    user1Notifications.forEach((n) => {
      assert.exists(n.readAt)
    })

    const user2Notifications = await repo.listFor('User', '2')
    user2Notifications.forEach((n) => {
      assert.isNull(n.readAt)
    })
  })

  test('markAsSeen sets seenAt timestamp', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const stored = await repo.store({
      type: 'Test',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    assert.isNull(stored.seenAt)

    await repo.markAsSeen(stored.id)

    const updated = await repo.findById(stored.id)
    assert.exists(updated!.seenAt)
    assert.isTrue(updated!.seenAt instanceof Date)
  })

  test('unreadCount returns correct count', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const n1 = await repo.store({
      type: 'Notification1',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.store({
      type: 'Notification2',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.store({
      type: 'Notification3',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.store({
      type: 'Notification4',
      notifiableType: 'User',
      notifiableId: '2',
      data: {},
    })

    let count = await repo.unreadCount('User', '1')
    assert.equal(count, 3)

    await repo.markAsRead(n1.id)

    count = await repo.unreadCount('User', '1')
    assert.equal(count, 2)

    count = await repo.unreadCount('User', '2')
    assert.equal(count, 1)
  })

  test('storeDelivery creates delivery record', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const delivery = await repo.storeDelivery({
      notificationType: 'OrderShipped',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'dedupe-key-123',
    })

    assert.exists(delivery.id)
    assert.equal(delivery.notificationType, 'OrderShipped')
    assert.equal(delivery.channel, 'mail')
    assert.equal(delivery.status, 'pending')
    assert.equal(delivery.attempts, 1)
    assert.equal(delivery.dedupeKey, 'dedupe-key-123')
    assert.isNull(delivery.sentAt)
    assert.isNull(delivery.failedAt)
    assert.exists(delivery.createdAt)
  })

  test('updateDeliveryStatus updates status and timestamps', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const delivery = await repo.storeDelivery({
      notificationType: 'Test',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'dedupe-1',
    })

    await repo.updateDeliveryStatus(delivery.id, 'sent', {
      providerMessageId: 'msg-123',
    })

    const updated = await repo.findDeliveryByDedupeKey('dedupe-1')
    assert.equal(updated!.status, 'sent')
    assert.equal(updated!.providerMessageId, 'msg-123')
    assert.exists(updated!.sentAt)
    assert.isNull(updated!.failedAt)
  })

  test('updateDeliveryStatus sets failedAt on failure', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    const delivery = await repo.storeDelivery({
      notificationType: 'Test',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'dedupe-1',
    })

    await repo.updateDeliveryStatus(delivery.id, 'failed', {
      error: { message: 'SMTP error' },
    })

    const updated = await repo.findDeliveryByDedupeKey('dedupe-1')
    assert.equal(updated!.status, 'failed')
    assert.deepEqual(updated!.error, { message: 'SMTP error' })
    assert.exists(updated!.failedAt)
    assert.isNull(updated!.sentAt)
  })

  test('findDeliveryByDedupeKey returns null for non-existent key', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const found = await repo.findDeliveryByDedupeKey('non-existent')
    assert.isNull(found)
  })

  test('prune removes old notifications', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    // Store some notifications
    await repo.store({
      type: 'Old',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.store({
      type: 'New',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    // Manually modify createdAt to simulate old notification
    const all = repo.getAllNotifications()
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 30)
    all[0].createdAt = oldDate

    const pruned = await repo.prune(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    assert.equal(pruned, 1)

    const remaining = repo.getAllNotifications()
    assert.lengthOf(remaining, 1)
    assert.equal(remaining[0].type, 'New')
  })

  test('pruneDeliveries removes old delivery records', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    await repo.storeDelivery({
      notificationType: 'Old',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'old-1',
    })

    await repo.storeDelivery({
      notificationType: 'New',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'new-1',
    })

    // Manually modify createdAt to simulate old delivery
    const all = repo.getAllDeliveries()
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 30)
    all[0].createdAt = oldDate

    const pruned = await repo.pruneDeliveries(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    assert.equal(pruned, 1)

    const remaining = repo.getAllDeliveries()
    assert.lengthOf(remaining, 1)
    assert.equal(remaining[0].notificationType, 'New')
  })

  test('clear removes all data', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()

    await repo.store({
      type: 'Test',
      notifiableType: 'User',
      notifiableId: '1',
      data: {},
    })

    await repo.storeDelivery({
      notificationType: 'Test',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'sent',
      dedupeKey: 'dedupe-1',
    })

    assert.lengthOf(repo.getAllNotifications(), 1)
    assert.lengthOf(repo.getAllDeliveries(), 1)

    repo.clear()

    assert.lengthOf(repo.getAllNotifications(), 0)
    assert.lengthOf(repo.getAllDeliveries(), 0)
  })
  test('findFailedForRetry returns only failed deliveries ordered by failedAt asc', async ({
    assert,
  }) => {
    const repo = new MemoryNotificationRepository()
    const sent = await repo.storeDelivery({
      notificationType: 'OrderShipped',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'dedupe-sent',
    })
    await repo.updateDeliveryStatus(sent.id, 'sent')
    await repo.storeDelivery({
      notificationType: 'OrderShipped',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'dedupe-pending',
    })
    const failed = await repo.storeDelivery({
      notificationType: 'OrderShipped',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'dedupe-failed',
    })
    await repo.updateDeliveryStatus(failed.id, 'failed', {
      error: { message: 'SMTP error' },
    })
    // Manually set failedAt to ensure deterministic ordering
    const all = repo.getAllDeliveries()
    const failedRecord = all.find((d) => d.id === failed.id)!
    const fixedDate = new Date('2026-01-15T10:00:00Z')
    failedRecord.failedAt = fixedDate
    const result = await repo.findFailedForRetry()
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, failed.id)
    assert.equal(result[0].status, 'failed')
    assert.equal(result[0].failedAt!.getTime(), fixedDate.getTime())
  })
  test('findFailedForRetry filters by channel', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const mailFailed = await repo.storeDelivery({
      notificationType: 'OrderShipped',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'dedupe-mail',
    })
    await repo.updateDeliveryStatus(mailFailed.id, 'failed', {
      error: { message: 'SMTP error' },
    })
    const smsFailed = await repo.storeDelivery({
      notificationType: 'OrderShipped',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'sms',
      status: 'pending',
      dedupeKey: 'dedupe-sms',
    })
    await repo.updateDeliveryStatus(smsFailed.id, 'failed', {
      error: { message: 'Twilio error' },
    })
    const result = await repo.findFailedForRetry({ channel: 'mail' })
    assert.lengthOf(result, 1)
    assert.equal(result[0].id, mailFailed.id)
    assert.equal(result[0].channel, 'mail')
  })
  test('findFailedForRetry respects limit', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const baseDate = new Date('2026-01-15T10:00:00Z')
    for (let i = 0; i < 5; i++) {
      const delivery = await repo.storeDelivery({
        notificationType: 'OrderShipped',
        notifiableType: 'User',
        notifiableId: '1',
        channel: 'mail',
        status: 'pending',
        dedupeKey: `dedupe-fail-${i}`,
      })
      await repo.updateDeliveryStatus(delivery.id, 'failed', {
        error: { message: `Error ${i}` },
      })
      // Set staggered failedAt dates (older first)
      const all = repo.getAllDeliveries()
      const record = all.find((d) => d.id === delivery.id)!
      record.failedAt = new Date(baseDate.getTime() + i * 60000)
    }
    const result = await repo.findFailedForRetry({ limit: 2 })
    assert.lengthOf(result, 2)
    // Verify ascending order (oldest first)
    assert.equal(result[0].dedupeKey, 'dedupe-fail-0')
    assert.equal(result[1].dedupeKey, 'dedupe-fail-1')
  })
  test('findFailedForRetry returns empty array when no failures', async ({ assert }) => {
    const repo = new MemoryNotificationRepository()
    const sent = await repo.storeDelivery({
      notificationType: 'OrderShipped',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'dedupe-sent',
    })
    await repo.updateDeliveryStatus(sent.id, 'sent')
    await repo.storeDelivery({
      notificationType: 'OrderShipped',
      notifiableType: 'User',
      notifiableId: '1',
      channel: 'mail',
      status: 'pending',
      dedupeKey: 'dedupe-pending',
    })
    const result = await repo.findFailedForRetry()
    assert.lengthOf(result, 0)
  })
})
