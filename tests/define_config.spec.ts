import { test } from '@japa/runner'
import { defineConfig, resolveConfig } from '../src/define_config.ts'
import { channels } from '../src/channels/index.ts'

test.group('defineConfig', () => {
  test('applies all defaults for minimal config', ({ assert }) => {
    const config = defineConfig({
      channels: {
        log: channels.log(),
      },
    })

    assert.deepEqual(config.queue, {
      enabled: false,
      defaultQueue: 'notifications',
    })
    assert.deepEqual(config.routing, {
      mail: ['email'],
    })
    assert.deepEqual(config.database, {
      table: 'notifications',
      deliveriesTable: 'notification_deliveries',
      idStrategy: 'uuid',
    })
    assert.deepEqual(config.delivery, {
      recordAttempts: true,
      failFast: false,
      retry: {
        attempts: 3,
        backoff: [30, 300, 900],
      },
    })
    assert.deepEqual(config.serialization, {
      notificationAliases: {},
      notifiableAliases: {},
    })
    assert.deepEqual(config.preferences, {
      quietHours: {
        enabled: false,
        bypassPriorities: ['critical'],
      },
    })
  })

  test('merges custom queue config with defaults', ({ assert }) => {
    const config = defineConfig({
      channels: {
        log: channels.log(),
      },
      queue: {
        enabled: true,
        defaultQueue: 'custom-queue',
      },
    })

    assert.equal(config.queue.enabled, true)
    assert.equal(config.queue.defaultQueue, 'custom-queue')
  })

  test('merges custom database config with defaults', ({ assert }) => {
    const config = defineConfig({
      channels: {
        log: channels.log(),
      },
      database: {
        table: 'custom_notifications',
        deliveriesTable: 'custom_deliveries',
        idStrategy: 'nanoid',
      },
    })

    assert.equal(config.database.table, 'custom_notifications')
    assert.equal(config.database.deliveriesTable, 'custom_deliveries')
    assert.equal(config.database.idStrategy, 'nanoid')
  })

  test('deep merges delivery.retry config', ({ assert }) => {
    const config = defineConfig({
      channels: {
        log: channels.log(),
      },
      delivery: {
        retry: {
          attempts: 5,
        },
      },
    })

    assert.equal(config.delivery.retry.attempts, 5)
    assert.deepEqual(config.delivery.retry.backoff, [30, 300, 900])
    assert.equal(config.delivery.recordAttempts, true)
    assert.equal(config.delivery.failFast, false)
  })

  test('throws on empty channels', ({ assert }) => {
    assert.throws(
      () =>
        defineConfig({
          channels: {},
        }),
      /At least one notification channel must be configured/
    )
  })

  test('allows multiple channels', ({ assert }) => {
    const config = defineConfig({
      channels: {
        mail: channels.mail(),
        database: channels.database(),
        log: channels.log(),
        null: channels.null(),
      },
    })

    assert.equal(Object.keys(config.channels).length, 4)
    assert.property(config.channels, 'mail')
    assert.property(config.channels, 'database')
    assert.property(config.channels, 'log')
    assert.property(config.channels, 'null')
  })
})

test.group('resolveConfig', () => {
  test('validates independently', ({ assert }) => {
    const config = {
      channels: {
        log: channels.log(),
      },
      queue: {
        enabled: false,
        defaultQueue: 'notifications',
      },
      routing: {
        mail: ['email'],
      },
      database: {
        table: 'notifications',
        deliveriesTable: 'notification_deliveries',
        idStrategy: 'uuid' as const,
      },
      delivery: {
        recordAttempts: true,
        failFast: false,
        retry: {
          attempts: 3,
          backoff: [30, 300, 900],
        },
      },
      serialization: {
        notificationAliases: {},
        notifiableAliases: {},
      },
      preferences: {
        quietHours: {
          enabled: false,
          bypassPriorities: ['critical'],
        },
      },
    }

    const resolved = resolveConfig(config)
    assert.deepEqual(resolved, config)
  })

  test('throws on empty channels', ({ assert }) => {
    assert.throws(
      () =>
        resolveConfig({
          channels: {},
          queue: {
            enabled: false,
            defaultQueue: 'notifications',
          },
          routing: {},
          database: {
            table: 'notifications',
            deliveriesTable: 'notification_deliveries',
            idStrategy: 'uuid',
          },
          delivery: {
            recordAttempts: true,
            failFast: false,
            retry: {
              attempts: 3,
              backoff: [],
            },
          },
          serialization: {
            notificationAliases: {},
            notifiableAliases: {},
          },
          preferences: {
            quietHours: {
              enabled: false,
              bypassPriorities: [],
            },
          },
        }),
      /At least one notification channel must be configured/
    )
  })
})
