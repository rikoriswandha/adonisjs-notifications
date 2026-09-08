import { test } from '@japa/runner'
import { SendNotificationJob } from '../src/jobs/send_notification_job.ts'

const payload = {
  notificationType: 'Test',
  notificationData: {},
  notifiableType: 'User',
  notifiableId: 1,
  channel: 'log',
  dedupeKey: 'test',
}

test.group('SendNotificationJob promise contract', (group) => {
  const original = SendNotificationJob.prototype.execute
  group.each.teardown(() => {
    SendNotificationJob.prototype.execute = original
  })

  test('await resolves after delivery completes', async ({ assert }) => {
    let delivered = false
    SendNotificationJob.prototype.execute = async () => {
      delivered = true
    }
    await SendNotificationJob.dispatch(payload)
    assert.isTrue(delivered)
  }).timeout(1000)

  test('await propagates delivery failures', async ({ assert }) => {
    SendNotificationJob.prototype.execute = async () => {
      throw new Error('delivery failed')
    }
    await assert.rejects(
      () => Promise.resolve(SendNotificationJob.dispatch(payload)),
      'delivery failed'
    )
  }).timeout(1000)
})
