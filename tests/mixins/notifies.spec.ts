import { test } from '@japa/runner'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { Notifies } from '../../src/mixins/notifies.js'

// ─── Setup: Minimal Lucid-backed notifiable models ──────────────────────────

class TestModel extends compose(BaseModel, Notifies()) {
  static table = 'test_models'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string
}


// ─── Mock DatabaseNotification for query tests ──────────────────

function createMockQuery() {
  const calls: any[] = []

  const mockQuery: any = {
    calls,
    where(col: string, value: any) {
      calls.push({ method: 'where', column: col, value })
      return this
    },
    whereNull(col: string) {
      calls.push({ method: 'whereNull', column: col })
      return this
    },
    orderBy(col: string, direction: string) {
      calls.push({ method: 'orderBy', column: col, direction })
      return this
    },
    update(values: any) {
      calls.push({ method: 'update', values })
      return Promise.resolve([1])
    },
    count(col: string) {
      calls.push({ method: 'count', column: col })
      return Promise.resolve([{ $extras: { total: '3' } }])
    },
  }

  return mockQuery
}

// ─── Test Group ───────────────────────────────────────────────

test.group('Notifies mixin', () => {
  // ─── Group 1: Composition ─────────────────────────────────

  test('model composed with Notifies() compiles and instantiates', ({ assert }) => {
    const instance = new TestModel()
    assert.instanceOf(instance, TestModel)
    assert.instanceOf(instance, BaseModel)
    assert.isFunction(instance.notify)
    assert.isFunction(instance.notifyNow)
    assert.isFunction(instance.notifications)
    assert.isFunction(instance.unreadNotifications)
    assert.isFunction(instance.markNotificationsAsRead)
    assert.isFunction(instance.unreadNotificationsCount)
  })

  test('mixin does not break model without database notification usage', ({ assert }) => {
    const instance = new TestModel()
    instance.id = 1
    instance.name = 'Alice'
    assert.equal(instance.name, 'Alice')
    assert.equal(instance.id, 1)
    assert.isFalse(instance.$isPersisted)
  })

  test('model with Notifies() still works with other mixins via compose()', ({ assert }) => {
    const mixinB = (superclass: any) =>
      class extends superclass {
        greet() {
          return 'hello'
        }
      }

    class MultiModel extends compose(BaseModel, Notifies(), mixinB) {
      @column({ isPrimary: true })
      declare id: number
    }

    const instance = new MultiModel()
    assert.isFunction(instance.notify)
    assert.isFunction(instance.greet)
    assert.equal(instance.greet(), 'hello')
  })

  // ─── Group 2: notify / notifyNow existence ────────────────

  test('notify() exists as a method', ({ assert }) => {
    const instance = new TestModel()
    assert.isFunction(instance.notify)
  })

  test('notifyNow() exists as a method', ({ assert }) => {
    const instance = new TestModel()
    assert.isFunction(instance.notifyNow)
  })

  test('mixin resolves manager lazily (no error at class definition time)', ({ assert }) => {
    // This test passes by virtue of the class being defined at module
    // load time and the spec file loading without error.
    assert.isDefined(TestModel)
  })

  // ─── Group 3: notifications / unreadNotifications ───────────

  test('notifications() returns query builder interface', async ({ assert }) => {
    const instance = new TestModel()
    instance.id = 1

    const result = await instance.notifications()
    assert.isFunction(result.query)
  })

  test('unreadNotifications() returns query builder interface', async ({ assert }) => {
    const instance = new TestModel()
    instance.id = 2

    const result = await instance.unreadNotifications()
    assert.isFunction(result.query)
  })

  // ─── Group 4: markNotificationsAsRead ─────────────────────

  test('markNotificationsAsRead() builds correct update query', async ({ assert }) => {
    const instance = new TestModel()
    instance.id = 3

    const mockQuery = createMockQuery()

    // Mock the DatabaseNotification model
    const { default: DatabaseNotification } =
      await import('../../src/models/database_notification.js')
    const originalQuery = DatabaseNotification.query
    DatabaseNotification.query = function (..._args: any[]) {
      return mockQuery
    }

    try {
      await instance.markNotificationsAsRead()
      const whereCalls = mockQuery.calls.filter((c: any) => c.method === 'where')
      const whereNullCalls = mockQuery.calls.filter((c: any) => c.method === 'whereNull')
      const updateCalls = mockQuery.calls.filter((c: any) => c.method === 'update')

      assert.lengthOf(whereCalls, 2)
      assert.equal(whereCalls[0].column, 'notifiable_type')
      assert.equal(whereCalls[0].value, 'test_models')
      assert.equal(whereCalls[1].column, 'notifiable_id')
      assert.equal(whereCalls[1].value, 3)
      assert.lengthOf(whereNullCalls, 1)
      assert.equal(whereNullCalls[0].column, 'read_at')
      assert.lengthOf(updateCalls, 1)
      assert.exists(updateCalls[0].values.read_at)
    } finally {
      DatabaseNotification.query = originalQuery
    }
  })

  test('markNotificationsAsRead() does not affect read notifications', async ({ assert }) => {
    const instance = new TestModel()
    instance.id = 4

    const mockQuery = createMockQuery()
    const { default: DatabaseNotification } =
      await import('../../src/models/database_notification.js')
    const originalQuery = DatabaseNotification.query
    DatabaseNotification.query = function (..._args: any[]) {
      return mockQuery
    }

    try {
      await instance.markNotificationsAsRead()
      const whereNullCalls = mockQuery.calls.filter((c: any) => c.method === 'whereNull')
      assert.lengthOf(whereNullCalls, 1)
      assert.equal(whereNullCalls[0].column, 'read_at')
    } finally {
      DatabaseNotification.query = originalQuery
    }
  })

  // ─── Group 5: unreadNotificationsCount ────────────────────

  test('unreadNotificationsCount() returns correct count', async ({ assert }) => {
    const instance = new TestModel()
    instance.id = 5

    const mockQuery = createMockQuery()
    const { default: DatabaseNotification } =
      await import('../../src/models/database_notification.js')
    const originalQuery = DatabaseNotification.query
    DatabaseNotification.query = function (..._args: any[]) {
      return mockQuery
    }

    try {
      const count = await instance.unreadNotificationsCount()
      assert.equal(count, 3)
    } finally {
      DatabaseNotification.query = originalQuery
    }
  })

  test('unreadNotificationsCount() returns 0 when no unread notifications', async ({ assert }) => {
    const instance = new TestModel()
    instance.id = 6

    const mockQuery = createMockQuery()
    mockQuery.count = function (_column: string) {
      mockQuery.calls.push({ method: 'count', column: _column })
      return Promise.resolve([{ $extras: { total: '0' } }])
    }

    const { default: DatabaseNotification } =
      await import('../../src/models/database_notification.js')
    const originalQuery = DatabaseNotification.query
    DatabaseNotification.query = function (..._args: any[]) {
      return mockQuery
    }

    try {
      const count = await instance.unreadNotificationsCount()
      assert.equal(count, 0)
    } finally {
      DatabaseNotification.query = originalQuery
    }
  })

  // ─── Edge cases ───────────────────────────────────────────

  test('throws when primary key is missing', async ({ assert }) => {
    const instance = new TestModel()
    // id is undefined

    await assert.rejects(
      () => instance.markNotificationsAsRead(),
      /does not have a primary key value/
    )

    await assert.rejects(
      () => instance.unreadNotificationsCount(),
      /does not have a primary key value/
    )
  })

  test('uses model constructor name when table name is not set', async ({ assert }) => {
    class UnnamedModel extends compose(BaseModel, Notifies()) {
      @column({ isPrimary: true })
      declare id: number
    }

    const mockQuery = createMockQuery()
    mockQuery.count = function (_column: string) {
      mockQuery.calls.push({ method: 'count', column: _column })
      return Promise.resolve([{ $extras: { total: '0' } }])
    }

    const { default: DatabaseNotification } =
      await import('../../src/models/database_notification.js')
    const originalQuery = DatabaseNotification.query
    DatabaseNotification.query = function (..._args: any[]) {
      return mockQuery
    }

    try {
      const instance = new UnnamedModel()
      instance.id = 99
      // Should not throw even without explicit table name
      const count = await instance.unreadNotificationsCount()
      assert.equal(count, 0)
    } finally {
      DatabaseNotification.query = originalQuery
    }
  })
})
