import { test } from '@japa/runner'
import { resolveRoute } from '../src/utils/route_resolver.ts'
import { Notification } from '../src/notification.ts'
import type { NormalizedNotifiable } from '../src/contracts/notifiable.ts'
import type { NotificationRoutingConfig } from '../src/contracts/config.ts'
import { E_NOTIFICATION_ROUTE_MISSING } from '../src/exceptions/main.ts'

class TestNotification extends Notification {
  via() {
    return ['mail']
  }
}

test.group('resolveRoute', () => {
  test('uses notification.routeNotificationFor when available', ({ assert }) => {
    class CustomNotification extends Notification {
      via() {
        return ['mail']
      }
      routeNotificationFor(channel: string) {
        return channel === 'mail' ? 'override@example.com' : null
      }
    }

    const notification = new CustomNotification()
    const notifiable: NormalizedNotifiable = {
      id: 1,
      type: 'User',
      routes: new Map(),
      original: { email: 'user@example.com' },
    }
    const config: NotificationRoutingConfig = { mail: ['email'] }

    const route = resolveRoute(notification, notifiable, 'mail', config)

    assert.equal(route, 'override@example.com')
  })

  test('uses PascalCase method on notifiable', ({ assert }) => {
    const notification = new TestNotification()
    const notifiable: NormalizedNotifiable = {
      id: 1,
      type: 'User',
      routes: new Map(),
      original: {
        routeNotificationForMail: () => 'pascal@example.com',
        email: 'field@example.com',
      },
    }
    const config: NotificationRoutingConfig = { mail: ['email'] }

    const route = resolveRoute(notification, notifiable, 'mail', config)

    assert.equal(route, 'pascal@example.com')
  })

  test('uses generic routeNotificationFor method', ({ assert }) => {
    const notification = new TestNotification()
    const resolver = (channel: string) => {
      return channel === 'mail' ? 'generic@example.com' : null
    }
    const notifiable: NormalizedNotifiable = {
      id: 1,
      type: 'User',
      routes: new Map([['__resolver__', resolver]]),
      original: { email: 'field@example.com' },
    }
    const config: NotificationRoutingConfig = { mail: ['email'] }

    const route = resolveRoute(notification, notifiable, 'mail', config)

    assert.equal(route, 'generic@example.com')
  })

  test('uses config routing field mapping', ({ assert }) => {
    const notification = new TestNotification()
    const notifiable: NormalizedNotifiable = {
      id: 1,
      type: 'User',
      routes: new Map(),
      original: { email: 'field@example.com' },
    }
    const config: NotificationRoutingConfig = { mail: ['email'] }

    const route = resolveRoute(notification, notifiable, 'mail', config)

    assert.equal(route, 'field@example.com')
  })

  test('tries multiple fields from config', ({ assert }) => {
    const notification = new TestNotification()
    const notifiable: NormalizedNotifiable = {
      id: 1,
      type: 'User',
      routes: new Map(),
      original: { emailAddress: 'secondary@example.com' },
    }
    const config: NotificationRoutingConfig = { mail: ['email', 'emailAddress'] }

    const route = resolveRoute(notification, notifiable, 'mail', config)

    assert.equal(route, 'secondary@example.com')
  })

  test('throws E_NOTIFICATION_ROUTE_MISSING when no route found', ({ assert }) => {
    const notification = new TestNotification()
    const notifiable: NormalizedNotifiable = {
      id: 1,
      type: 'User',
      routes: new Map(),
      original: {},
    }
    const config: NotificationRoutingConfig = { mail: ['email'] }

    assert.throws(
      () => resolveRoute(notification, notifiable, 'mail', config),
      E_NOTIFICATION_ROUTE_MISSING
    )
  })

  test('throws with correct context in error message', ({ assert }) => {
    const notification = new TestNotification()
    const notifiable: NormalizedNotifiable = {
      id: 1,
      type: 'Admin',
      routes: new Map(),
      original: {},
    }
    const config: NotificationRoutingConfig = { database: ['phoneNumber'] }

    try {
      resolveRoute(notification, notifiable, 'database', config)
      assert.fail('Should have thrown')
    } catch (error) {
      assert.instanceOf(error, E_NOTIFICATION_ROUTE_MISSING)
      assert.match(error.message, /database/)
      assert.match(error.message, /Admin/)
    }
  })

  test('prioritizes notification override over notifiable methods', ({ assert }) => {
    class PriorityNotification extends Notification {
      via() {
        return ['mail']
      }
      routeNotificationFor() {
        return 'priority@example.com'
      }
    }

    const notification = new PriorityNotification()
    const notifiable: NormalizedNotifiable = {
      id: 1,
      type: 'User',
      routes: new Map(),
      original: {
        routeNotificationForMail: () => 'pascal@example.com',
        email: 'field@example.com',
      },
    }
    const config: NotificationRoutingConfig = { mail: ['email'] }

    const route = resolveRoute(notification, notifiable, 'mail', config)

    assert.equal(route, 'priority@example.com')
  })

  test('falls back through resolution chain', ({ assert }) => {
    const notification = new TestNotification()
    const notifiable: NormalizedNotifiable = {
      id: 1,
      type: 'User',
      routes: new Map(),
      original: {
        routeNotificationForDatabase: () => null,
        email: 'fallback@example.com',
      },
    }
    const config: NotificationRoutingConfig = { mail: ['email'] }

    const route = resolveRoute(notification, notifiable, 'mail', config)

    assert.equal(route, 'fallback@example.com')
  })
})
