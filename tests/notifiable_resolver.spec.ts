import { test } from '@japa/runner'
import { normalizeRecipient, normalizeRecipients } from '../src/utils/notifiable_resolver.ts'
import type { Notifiable } from '../src/contracts/notifiable.ts'

test.group('normalizeRecipient', () => {
  test('normalizes Notifiable interface with getNotificationId', ({ assert }) => {
    const notifiable: Notifiable = {
      getNotificationId() {
        return 123
      },
      getNotificationType() {
        return 'User'
      },
    }

    const normalized = normalizeRecipient(notifiable)

    assert.equal(normalized.id, 123)
    assert.equal(normalized.type, 'User')
    assert.instanceOf(normalized.routes, Map)
    assert.equal(normalized.original, notifiable)
  })

  test('normalizes Notifiable with id property', ({ assert }) => {
    const notifiable = {
      id: 'user-456',
      constructor: { name: 'CustomUser' },
    }

    const normalized = normalizeRecipient(notifiable)

    assert.equal(normalized.id, 'user-456')
    assert.equal(normalized.type, 'CustomUser')
  })

  test('normalizes plain object without Notifiable interface', ({ assert }) => {
    const plainObject = {
      id: 789,
      email: 'test@example.com',
    }

    const normalized = normalizeRecipient(plainObject)

    assert.equal(normalized.id, 789)
    assert.exists(normalized.type)
    assert.equal(normalized.original, plainObject)
  })

  test('stores routeNotificationFor resolver in routes map', ({ assert }) => {
    const notifiable: Notifiable = {
      routeNotificationFor(channel: string) {
        return channel === 'mail' ? 'user@example.com' : null
      },
    }

    const normalized = normalizeRecipient(notifiable)

    assert.isTrue(normalized.routes.has('__resolver__'))
    const resolver = normalized.routes.get('__resolver__') as Function
    assert.equal(resolver('mail'), 'user@example.com')
    assert.isNull(resolver('database'))
  })

  test('handles object without id', ({ assert }) => {
    const notifiable = {
      getNotificationType() {
        return 'Anonymous'
      },
    }

    const normalized = normalizeRecipient(notifiable)

    assert.equal(normalized.id, 0)
    assert.equal(normalized.type, 'Anonymous')
  })

  test('returns already normalized object unchanged', ({ assert }) => {
    const alreadyNormalized = {
      id: 'test-id',
      type: 'TestType',
      routes: new Map(),
      original: {},
    }

    const normalized = normalizeRecipient(alreadyNormalized)

    assert.equal(normalized, alreadyNormalized)
  })
})

test.group('normalizeRecipients', () => {
  test('normalizes single notifiable', ({ assert }) => {
    const notifiable = {
      id: 1,
      getNotificationType() {
        return 'User'
      },
    }

    const normalized = normalizeRecipients(notifiable)

    assert.isArray(normalized)
    assert.lengthOf(normalized, 1)
    assert.equal(normalized[0].id, 1)
  })

  test('normalizes array of notifiables', ({ assert }) => {
    const notifiables = [
      { id: 1, getNotificationType: () => 'User' },
      { id: 2, getNotificationType: () => 'Admin' },
      { id: 3, getNotificationType: () => 'Guest' },
    ]

    const normalized = normalizeRecipients(notifiables)

    assert.isArray(normalized)
    assert.lengthOf(normalized, 3)
    assert.equal(normalized[0].id, 1)
    assert.equal(normalized[1].id, 2)
    assert.equal(normalized[2].id, 3)
  })

  test('handles empty array', ({ assert }) => {
    const normalized = normalizeRecipients([])

    assert.isArray(normalized)
    assert.lengthOf(normalized, 0)
  })

  test('normalizes mixed types in array', ({ assert }) => {
    const notifiables: any[] = [
      { id: 1, getNotificationType: () => 'User' },
      { id: 'admin-2', constructor: { name: 'Admin' } },
    ]

    const normalized = normalizeRecipients(notifiables)

    assert.lengthOf(normalized, 2)
    assert.equal(normalized[0].id, 1)
    assert.equal(normalized[1].id, 'admin-2')
  })
})
