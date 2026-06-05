import { test } from '@japa/runner'
import { channels } from '../../src/channels/index.ts'

test.group('Channel factories', () => {
  test('exports mail, database, log, and null factories', ({ assert }) => {
    assert.property(channels, 'mail')
    assert.property(channels, 'database')
    assert.property(channels, 'log')
    assert.property(channels, 'null')
  })

  test('each factory returns a function', ({ assert }) => {
    assert.isFunction(channels.mail())
    assert.isFunction(channels.database())
    assert.isFunction(channels.log())
    assert.isFunction(channels.null())
  })

  test('factory functions are async-capable', async ({ assert }) => {
    const logFactory = channels.log()
    const result = logFactory()

    // Factory should return a Promise for lazy loading pattern
    assert.instanceOf(result, Promise)
  })

  test('factory functions match NotificationChannelFactory signature', ({ assert }) => {
    const mailFactory = channels.mail()
    const databaseFactory = channels.database()
    const logFactory = channels.log()
    const nullFactory = channels.null()

    // All factories should be callable with no arguments
    assert.isFunction(mailFactory)
    assert.isFunction(databaseFactory)
    assert.isFunction(logFactory)
    assert.isFunction(nullFactory)
  })
})
