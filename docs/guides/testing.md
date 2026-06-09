# Testing

The package includes a test fake that intercepts notifications without actually delivering them.

## Setup

```ts
import notifications from '@rikology/adonisjs-notifications/services/main'

test('user receives welcome email', async ({ assert }) => {
  const fake = notifications.fake()

  await user.notify(new WelcomeNotification())

  fake.assertSentTo(user, WelcomeNotification)

  notifications.restore()
})
```

## Fake options

Fake all channels:
```ts
const fake = notifications.fake()
```

Fake selected channels only:
```ts
const fake = notifications.fake({ channels: ['mail'] })
```

## Assertions

All assertions are available on the `FakeNotificationManager` returned by `fake()`:

```ts
// Assert a notification class was sent (any recipient)
fake.assertSent(NotificationClass)

// Assert sent to a specific notifiable
fake.assertSentTo(notifiable, NotificationClass)

// Assert NOT sent to a specific notifiable
fake.assertNotSentTo(notifiable, NotificationClass)

// Assert sent on a specific channel
fake.assertSentOnChannel(notifiable, NotificationClass, 'mail')

// Assert queued for a notifiable
fake.assertQueued(notifiable, NotificationClass)

// Assert nothing sent at all
fake.assertNothingSent()

// Assert nothing queued
fake.assertNoneQueued()

// Count assertions
fake.assertSentCount(3)                          // total sent count
fake.assertSentCount(NotificationClass, 1)       // count per class
fake.assertQueuedCount(2)                        // total queued count
fake.assertQueuedCount(NotificationClass, 1)     // count per class
```

## Filter functions

Most assertions accept an optional filter:

```ts
fake.assertSent(InvoicePaid, (recorded) => {
  return recorded.notification.invoiceId === 42
})

fake.assertSentTo(user, InvoicePaid, (recorded) => {
  return recorded.channels.includes('mail')
})
```

## RecordedNotification shape

```ts
interface RecordedNotification {
  notification: Notification
  notifiable: NormalizedNotifiable
  channels: string[]
  queued: boolean
  getMessage(channel?: string): unknown
}
```

## Querying recorded notifications

```ts
// All sent (non-queued)
const sent = fake.sent()

// All queued
const queued = fake.queued()

// Filtered
const invoiceMails = fake.sent((r) =>
  r.notification instanceof InvoicePaid && r.channels.includes('mail')
)
```

## Testing anonymous route notifications

```ts
const fake = notifications.fake()

await notifications
  .route('mail', 'guest@example.com')
  .notify(new WelcomeMessage())

fake.assertSentTo({ id: 'guest@example.com' }, WelcomeMessage)

notifications.restore()
```

## Testing database notifications

In tests without a real database, use `MemoryNotificationRepository`:

```ts
import { MemoryNotificationRepository } from '@rikology/adonisjs-notifications'

const repo = new MemoryNotificationRepository()

// ... configure your test manager to use this repo
const rows = await repo.listFor('User', 1)
assert.equal(rows.length, 1)
```

## Japa integration example

```ts
import { test } from '@japa/runner'
import notifications from '@rikology/adonisjs-notifications/services/main'
import WelcomeNotification from '#notifications/welcome'

test.group('notifications', (group) => {
  group.each.teardown(() => {
    notifications.restore()
  })

  test('sends welcome notification', async ({ assert }) => {
    const fake = notifications.fake()
    const user = await UserFactory.create()

    await user.notify(new WelcomeNotification())

    fake.assertSentTo(user, WelcomeNotification)
    fake.assertSentOnChannel(user, WelcomeNotification, 'mail')
  })
})
```
