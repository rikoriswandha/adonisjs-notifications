import { test } from '@japa/runner'
import { NotificationManager } from '../../src/notification_manager.ts'
import { Notification } from '../../src/notification.ts'
import type { NotificationConfig } from '../../src/contracts/config.ts'
import type { NotificationChannel } from '../../src/contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../../src/contracts/delivery.ts'

class MockChannel implements NotificationChannel {
  name = 'mock'
  resolvesOwnMessage = true
  requiresRoute = false
  calls: DeliveryContext[] = []

  async send(context: DeliveryContext): Promise<DeliveryResult> {
    this.calls.push(context)
    return { success: true, status: 'sent', providerMessageId: 'mock-id' }
  }
}

class TestNotification extends Notification {
  via(_notifiable: unknown): string[] {
    return ['mock']
  }
}

class MultiChannelNotification extends Notification {
  via(_notifiable: unknown): string[] {
    return ['mock', 'mail']
  }

  toMail(_notifiable: unknown): unknown {
    return { subject: 'Hello' }
  }
}

class QueuedNotification extends Notification {
  shouldQueue = true

  via(_notifiable: unknown): string[] {
    return ['mock']
  }
}

class FilterableNotification extends Notification {
  subject: string

  constructor(...args: unknown[]) {
    super()
    this.subject = args[0] as string
  }

  via(_notifiable: unknown): string[] {
    return ['mock']
  }
}

function createConfig(
  channels: Record<string, () => NotificationChannel | Promise<NotificationChannel>>
): NotificationConfig {
  return {
    channels,
    queue: { enabled: false, defaultQueue: 'default' },
    routing: {},
    database: {
      table: 'notifications',
      deliveriesTable: 'notification_deliveries',
      idStrategy: 'uuid',
    },
    delivery: { recordAttempts: false, failFast: true, retry: { attempts: 1, backoff: [] } },
    serialization: { notificationAliases: {}, notifiableAliases: {} },
    preferences: { quietHours: { enabled: false, bypassPriorities: [] } },
  }
}

const notifiable = { id: 1, name: 'Alice' }
const notifiableB = { id: 2, name: 'Bob' }

test.group('FakeNotificationManager - Lifecycle', () => {
  test('fake() returns FakeNotificationManager', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)

    const fake = manager.fake()

    assert.isDefined(fake)
    assert.equal(typeof fake.send, 'function')
    assert.equal(typeof fake.restore, 'function')
  })

  test('restore() clears recorded state', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())
    assert.equal(fake.sent().length, 1)

    manager.restore()
    assert.equal(fake.sent().length, 0)
  })

  test('fake() called twice resets state', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())
    assert.equal(fake.sent().length, 1)

    const fake2 = manager.fake()
    assert.equal(fake2.sent().length, 0)
    assert.notEqual(fake, fake2)
  })

  test('manager delegates to real send when not faked', async ({ assert }) => {
    const channel = new MockChannel()
    const config = createConfig({ mock: () => channel })
    const manager = new NotificationManager(config)

    await manager.sendNow(notifiable, new TestNotification())

    assert.equal(channel.calls.length, 1)
  })
})

test.group('FakeNotificationManager - Recording send/sendNow', () => {
  test('sendNow records single recipient', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    const sent = fake.sent()
    assert.equal(sent.length, 1)
    assert.instanceOf(sent[0].notification, TestNotification)
    assert.equal(sent[0].notifiable.id, 1)
    assert.deepEqual(sent[0].channels, ['mock'])
    assert.isFalse(sent[0].queued)
  })

  test('sendNow records multiple recipients', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow([notifiable, notifiableB], new TestNotification())

    const sent = fake.sent()
    assert.equal(sent.length, 2)
    assert.equal(sent[0].notifiable.id, 1)
    assert.equal(sent[1].notifiable.id, 2)
  })

  test('send records single recipient as queued', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.send(notifiable, new TestNotification())

    const queued = fake.queued()
    assert.equal(queued.length, 1)
    assert.isTrue(queued[0].queued)
    assert.instanceOf(queued[0].notification, TestNotification)
  })

  test('send with shouldQueue=true records as queued', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.send(notifiable, new QueuedNotification())

    // The fake intercepts before queue logic; queued flag comes from notification.shouldQueue
    // But actually in our implementation, fake.send() always records queued=true for send()
    const queued = fake.queued()

    // In the fake: send() records as queued=true, sendNow() records as queued=false
    assert.equal(queued.length, 1)
    assert.instanceOf(queued[0].notification, QueuedNotification)
  })
})

test.group('FakeNotificationManager - Selective channel faking', () => {
  test('fake({ channels: ["mail"] }) intercepts mail, delegates mock to real', async ({
    assert,
  }) => {
    const mockChannel = new MockChannel()
    const mailChannel = new MockChannel()
    mailChannel.name = 'mail'

    const config = createConfig({
      mock: () => mockChannel,
      mail: () => mailChannel,
    })
    const manager = new NotificationManager(config)
    const fake = manager.fake({ channels: ['mail'] })

    await manager.sendNow(notifiable, new MultiChannelNotification())

    // mail should be intercepted (not sent through real channel)
    assert.equal(mailChannel.calls.length, 0)
    // mock should be delegated to real manager
    assert.equal(mockChannel.calls.length, 1)

    // Assert the intercepted mail notification was recorded
    const sent = fake.sent()
    assert.equal(sent.length, 1)
    assert.deepEqual(sent[0].channels, ['mail'])
  })
})

test.group('FakeNotificationManager - assertSent', () => {
  test('passes when notification was sent', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    assert.doesNotThrow(() => fake.assertSent(TestNotification))
  })

  test('throws when notification was not sent', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    assert.throws(
      () => fake.assertSent(TestNotification),
      /Expected notification TestNotification to be sent/
    )
  })

  test('assertSent with predicate', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new FilterableNotification('hello'))
    await manager.sendNow(notifiable, new FilterableNotification('world'))

    assert.doesNotThrow(() =>
      fake.assertSent(
        FilterableNotification,
        (n) => (n.notification as FilterableNotification).subject === 'world'
      )
    )
    assert.throws(() =>
      fake.assertSent(
        FilterableNotification,
        (n) => (n.notification as FilterableNotification).subject === 'nope'
      )
    )
  })
})

test.group('FakeNotificationManager - assertSentTo', () => {
  test('passes when sent to matching notifiable', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    assert.doesNotThrow(() => fake.assertSentTo(notifiable, TestNotification))
  })

  test('throws when sent to different notifiable', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    assert.throws(() => fake.assertSentTo(notifiableB, TestNotification))
  })
})

test.group('FakeNotificationManager - assertNotSentTo', () => {
  test('passes when not sent to notifiable', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiableB, new TestNotification())

    assert.doesNotThrow(() => fake.assertNotSentTo(notifiable, TestNotification))
  })

  test('throws when sent to notifiable', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    assert.throws(() => fake.assertNotSentTo(notifiable, TestNotification))
  })
})

test.group('FakeNotificationManager - assertSentOnChannel', () => {
  test('passes when sent on specified channel', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    assert.doesNotThrow(() => fake.assertSentOnChannel(notifiable, TestNotification, 'mock'))
  })

  test('throws when not sent on specified channel', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    assert.throws(() => fake.assertSentOnChannel(notifiable, TestNotification, 'mail'))
  })
})

test.group('FakeNotificationManager - assertQueued', () => {
  test('passes when notification is queued', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    // Use send() which records as queued in fake
    await manager.send(notifiable, new TestNotification())

    // Actually wait... our fake.send() records as queued=true
    assert.doesNotThrow(() => fake.assertQueued(notifiable, TestNotification))
  })

  test('throws when notification is not queued', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    // sendNow records as queued=false
    await manager.sendNow(notifiable, new TestNotification())

    assert.throws(() => fake.assertQueued(notifiable, TestNotification))
  })
})

test.group('FakeNotificationManager - assertNothingSent / assertNoneQueued', () => {
  test('assertNothingSent passes when empty', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    assert.doesNotThrow(() => fake.assertNothingSent())
  })

  test('assertNothingSent throws when sent', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    assert.throws(() => fake.assertNothingSent())
  })

  test('assertNoneQueued passes when empty', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    assert.doesNotThrow(() => fake.assertNoneQueued())
  })

  test('assertNoneQueued throws when queued', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.send(notifiable, new TestNotification())

    assert.throws(() => fake.assertNoneQueued())
  })
})

test.group('FakeNotificationManager - Count assertions', () => {
  test('assertSentCount without class filter', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())
    await manager.sendNow(notifiable, new TestNotification())

    assert.doesNotThrow(() => fake.assertSentCount(2))
    assert.throws(() => fake.assertSentCount(1))
  })

  test('assertSentCount with class filter', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())
    await manager.sendNow(notifiable, new FilterableNotification('x'))

    assert.doesNotThrow(() => fake.assertSentCount(TestNotification, 1))
    assert.doesNotThrow(() => fake.assertSentCount(FilterableNotification, 1))
    assert.throws(() => fake.assertSentCount(TestNotification, 2))
  })

  test('assertQueuedCount without class filter', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.send(notifiable, new TestNotification())
    await manager.send(notifiable, new TestNotification())

    assert.doesNotThrow(() => fake.assertQueuedCount(2))
    assert.throws(() => fake.assertQueuedCount(1))
  })

  test('assertQueuedCount with class filter', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.send(notifiable, new TestNotification())
    await manager.send(notifiable, new FilterableNotification('x'))

    assert.doesNotThrow(() => fake.assertQueuedCount(TestNotification, 1))
    assert.throws(() => fake.assertQueuedCount(TestNotification, 2))
  })
})

test.group('FakeNotificationManager - route()', () => {
  test('records synthetic notifiable', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await fake.route('mock', 'test@example.com').notify(new TestNotification())

    const sent = fake.sent()
    assert.equal(sent.length, 1)
    assert.instanceOf(sent[0].notification, TestNotification)
  })

  test('supports [Symbol.dispose]() for cleanup', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    const router = fake.route('mock', 'test@example.com')
    await router.notify(new TestNotification())
    assert.equal(fake.sent().length, 1)

    router[Symbol.dispose]()
    assert.equal(fake.sent().length, 0)
  })
})

test.group('FakeNotificationManager - getMessage()', () => {
  test('resolves message lazily', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new MultiChannelNotification())

    const sent = fake.sent()
    assert.equal(sent.length, 1)
    const message = sent[0].getMessage('mail')
    assert.deepEqual(message, { subject: 'Hello' })
  })

  test('returns undefined for unknown channel', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    const sent = fake.sent()
    assert.equal(sent.length, 1)
    const message = sent[0].getMessage('nonexistent')
    assert.isUndefined(message)
  })
})

test.group('FakeNotificationManager - sent() / queued() query methods', () => {
  test('sent() returns all recorded notifications', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())
    await manager.sendNow(notifiable, new FilterableNotification('x'))

    const all = fake.sent()
    assert.equal(all.length, 2)
  })

  test('sent() with filter predicate', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new FilterableNotification('hello'))
    await manager.sendNow(notifiable, new FilterableNotification('world'))

    const filtered = fake.sent(
      (n) => (n.notification as FilterableNotification).subject === 'hello'
    )
    assert.equal(filtered.length, 1)
  })

  test('queued() returns queued notifications', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.send(notifiable, new TestNotification())

    const queued = fake.queued()
    assert.equal(queued.length, 1)
  })
})

test.group('FakeNotificationManager - Assertion error messages', () => {
  test('assertSentTo message includes notifiable description', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    try {
      fake.assertSentTo(notifiable, TestNotification)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.include((error as Error).message, 'Object(1)')
    }
  })

  test('assertNotSentTo message includes notification name', async ({ assert }) => {
    const config = createConfig({ mock: () => new MockChannel() })
    const manager = new NotificationManager(config)
    const fake = manager.fake()

    await manager.sendNow(notifiable, new TestNotification())

    try {
      fake.assertNotSentTo(notifiable, TestNotification)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.include((error as Error).message, 'TestNotification')
      assert.include((error as Error).message, 'NOT to be sent')
    }
  })
})
