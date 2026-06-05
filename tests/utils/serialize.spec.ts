import { test } from '@japa/runner'
import {
  serializeNotification,
  deserializeNotification,
  serializeNotifiable,
  generateInstanceId,
  registerNotificationClass,
} from '../../src/utils/serialize.ts'
import { Notification } from '../../src/notification.ts'
import { E_NOTIFICATION_SERIALIZATION_FAILED } from '../../src/exceptions/main.ts'

class PlainNotification extends Notification {
  title = 'Hello'
  via() {
    return ['mail']
  }
}

class CustomSerializeNotification extends Notification {
  value = 42
  via() {
    return ['mail']
  }

  serialize() {
    return { custom: true, value: this.value }
  }

  static deserialize(data: Record<string, unknown>): CustomSerializeNotification {
    const n = new CustomSerializeNotification()
    n.value = data.value as number
    return n
  }
}

test.group('serializeNotification', () => {
  test('extracts enumerable properties by default', ({ assert }) => {
    const n = new PlainNotification()
    const data = serializeNotification(n)
    assert.equal(data.title, 'Hello')
    assert.exists(data.instanceId)
  })

  test('uses custom serialize when available', ({ assert }) => {
    const n = new CustomSerializeNotification()
    const data = serializeNotification(n)
    assert.deepEqual(data, { custom: true, value: 42 })
  })
})

test.group('deserializeNotification', () => {
  test('reconstructs via alias map', ({ assert }) => {
    registerNotificationClass('PlainNotification', PlainNotification)
    const data = { title: 'World', instanceId: 'abc' }
    const n = deserializeNotification<PlainNotification>('PlainNotification', data, {})
    assert.instanceOf(n, PlainNotification)
    assert.equal(n.title, 'World')
  })

  test('uses static deserialize when available', ({ assert }) => {
    registerNotificationClass('CustomSerializeNotification', CustomSerializeNotification)
    const n = deserializeNotification<CustomSerializeNotification>(
      'CustomSerializeNotification',
      { value: 99 },
      {}
    )
    assert.instanceOf(n, CustomSerializeNotification)
    assert.equal(n.value, 99)
  })

  test('throws on missing alias/class', ({ assert }) => {
    assert.throws(
      () => deserializeNotification('UnknownNotification', {}, {}),
      E_NOTIFICATION_SERIALIZATION_FAILED
    )
  })
})

test.group('serializeNotifiable', () => {
  test('extracts type and id', ({ assert }) => {
    const result = serializeNotifiable({
      type: 'User',
      id: 1,
      original: { id: 1 },
      routes: new Map(),
    })
    assert.deepEqual(result, { type: 'User', id: 1 })
  })
})

test.group('generateInstanceId', () => {
  test('returns unique UUIDs', ({ assert }) => {
    const id1 = generateInstanceId()
    const id2 = generateInstanceId()
    assert.notEqual(id1, id2)
    assert.match(id1, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })
})
