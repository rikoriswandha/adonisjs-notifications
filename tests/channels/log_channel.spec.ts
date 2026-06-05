import { test } from '@japa/runner'
import { LogChannel } from '../../src/channels/log_channel.ts'
import { Notification } from '../../src/notification.ts'
import type { DeliveryContext } from '../../src/contracts/delivery.ts'

/**
 * Mock logger that captures calls for assertions.
 */
class MockLogger {
  public infoCalls: Array<{ context: Record<string, unknown>; message: string; args: unknown[] }> = []
  public errorCalls: Array<{ context: Record<string, unknown>; message: string; args: unknown[] }> = []
  public shouldThrow = false

  info(context: Record<string, unknown>, message: string, ...args: unknown[]): void {
    if (this.shouldThrow) {
      throw new Error('Logger error')
    }
    this.infoCalls.push({ context, message, args })
  }

  error(context: Record<string, unknown>, message: string, ...args: unknown[]): void {
    this.errorCalls.push({ context, message, args })
  }
}

/**
 * Notification with toLog() method.
 */
class TestNotificationWithLog extends Notification {
  via() {
    return ['log']
  }

  toLog(notifiable: any) {
    return {
      greeting: `Hello ${notifiable.name}`,
      email: 'user@example.com',
    }
  }
}

/**
 * Notification without toLog() method.
 */
class TestNotificationWithoutLog extends Notification {
  via() {
    return ['log']
  }
}

/**
 * Helper to build a minimal DeliveryContext for testing.
 */
function buildContext(overrides: Partial<DeliveryContext<any>> = {}): DeliveryContext<any> {
  return {
    notification: new TestNotificationWithLog(),
    notifiable: {
      id: 1,
      type: 'user',
      routes: new Map(),
      original: { id: 1, name: 'John' },
    },
    channel: 'log',
    message: null,
    ...overrides,
  }
}

test.group('LogChannel', () => {
  test('sets resolvesOwnMessage to true', ({ assert }) => {
    const logger = new MockLogger()
    const channel = new LogChannel(logger)
    assert.isTrue(channel.resolvesOwnMessage)
  })

  test('calls logger with structured context containing notification name, channel, notifiable type/id', async ({ assert }) => {
    const logger = new MockLogger()
    const channel = new LogChannel(logger)
    const context = buildContext()

    await channel.send(context)

    assert.lengthOf(logger.infoCalls, 1)
    const call = logger.infoCalls[0]
    
    assert.equal(call.context.notification, 'TestNotificationWithLog')
    assert.equal(call.context.channel, 'log')
    assert.equal(call.context.notifiableType, 'user')
    assert.equal(call.context.notifiableId, 1)
    assert.isDefined(call.context.message)
  })

  test('returns success true, status sent with metadata.loggedAt', async ({ assert }) => {
    const logger = new MockLogger()
    const channel = new LogChannel(logger)
    const context = buildContext()

    const result = await channel.send(context)

    assert.isTrue(result.success)
    assert.equal(result.status, 'sent')
    assert.isDefined(result.metadata)
    assert.isDefined(result.metadata!.loggedAt)
    assert.typeOf(result.metadata!.loggedAt, 'string')

    // Verify it's a valid ISO timestamp
    const parsed = new Date(result.metadata!.loggedAt as string)
    assert.isFalse(isNaN(parsed.getTime()))
  })

  test('uses toLog() message when notification implements it', async ({ assert }) => {
    const logger = new MockLogger()
    const channel = new LogChannel(logger)
    const context = buildContext()

    await channel.send(context)

    const call = logger.infoCalls[0]
    const message = call.context.message as string
    
    // The message should be the redacted version of { greeting: 'Hello John', email: 'user@example.com' }
    // Email should be redacted
    assert.include(message, '[REDACTED_EMAIL]')
    assert.include(message, 'Hello John')
    assert.notInclude(message, 'user@example.com')
  })

  test('falls back to default format when toLog() is not implemented', async ({ assert }) => {
    const logger = new MockLogger()
    const channel = new LogChannel(logger)
    const notification = new TestNotificationWithoutLog()
    const context = buildContext({ notification })

    await channel.send(context)

    const call = logger.infoCalls[0]
    const message = call.context.message as string
    
    // Default format includes notification name and sentAt
    assert.include(message, 'TestNotificationWithoutLog')
    assert.include(message, 'sentAt')
  })

  test('redacts email addresses found in message payload', async ({ assert }) => {
    const logger = new MockLogger()
    const channel = new LogChannel(logger)

    class NotificationWithEmail extends Notification {
      via() {
        return ['log']
      }

      toLog() {
        return { contact: 'admin@secret.com' }
      }
    }

    const context = buildContext({ notification: new NotificationWithEmail() })
    await channel.send(context)

    const call = logger.infoCalls[0]
    const message = call.context.message as string
    
    assert.include(message, '[REDACTED_EMAIL]')
    assert.notInclude(message, 'admin@secret.com')
  })

  test('redacts email addresses in notifiable id when id is an email', async ({ assert }) => {
    const logger = new MockLogger()
    const channel = new LogChannel(logger)

    const context = buildContext({
      notifiable: {
        id: 'user@domain.com',
        type: 'user',
        routes: new Map(),
        original: { id: 'user@domain.com' },
      },
    })

    await channel.send(context)

    const call = logger.infoCalls[0]
    assert.include(call.context.notifiableId, '[REDACTED_EMAIL]')
    assert.notInclude(call.context.notifiableId, 'user@domain.com')
  })

  test('does not redact plain numeric ids', async ({ assert }) => {
    const logger = new MockLogger()
    const channel = new LogChannel(logger)

    const context = buildContext({
      notifiable: {
        id: 12345,
        type: 'user',
        routes: new Map(),
        original: { id: 12345 },
      },
    })

    await channel.send(context)

    const call = logger.infoCalls[0]
    assert.equal(call.context.notifiableId, 12345)
  })

  test('handles logger errors gracefully and returns failed result', async ({ assert }) => {
    const logger = new MockLogger()
    logger.shouldThrow = true
    const channel = new LogChannel(logger)
    const context = buildContext()

    const result = await channel.send(context)

    assert.isFalse(result.success)
    assert.equal(result.status, 'failed')
    assert.isDefined(result.error)
    assert.instanceOf(result.error, Error)
  })

  test('handles logger errors gracefully even when error logging fails', async ({ assert }) => {
    const logger = new MockLogger()
    logger.shouldThrow = true
    const channel = new LogChannel(logger)
    const context = buildContext()

    // Both info and error will throw, but channel should still return failed result
    const result = await channel.send(context)

    assert.isFalse(result.success)
    assert.equal(result.status, 'failed')
    assert.isDefined(result.error)
  })

  test('logs correct message format', async ({ assert }) => {
    const logger = new MockLogger()
    const channel = new LogChannel(logger)
    const context = buildContext()

    await channel.send(context)

    const call = logger.infoCalls[0]
    assert.equal(call.message, 'Notification sent via %s channel')
    assert.deepEqual(call.args, ['log'])
  })
})
