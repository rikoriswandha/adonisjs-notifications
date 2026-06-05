import { test } from '@japa/runner'
import NotificationsRetryFailed from '../../commands/notifications_retry_failed.ts'

function createMockCommand<T extends new (...args: any[]) => any>(
  CommandClass: T,
  props: Record<string, any>
): InstanceType<T> {
  const command = Object.create(CommandClass.prototype)
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(command, key, { value, writable: true, configurable: true })
  }
  return command
}

test.group('NotificationsRetryFailed command', () => {
  test('delegates to manager.retryFailedDeliveries with correct options', async ({ assert }) => {
    const retryCalls: any[] = []
    const mockManager = {
      repository: { exists: true },
      retryFailedDeliveries: async (options: any) => {
        retryCalls.push(options)
        return { retried: 5, skipped: 2, errors: [] }
      },
    }

    const logMessages: string[] = []

    const command = createMockCommand(NotificationsRetryFailed, {
      channel: 'mail',
      limit: 10,
      app: {
        container: {
          make: async () => mockManager,
        },
      } as any,
      logger: {
        success: (msg: string) => logMessages.push(msg),
        warning: (msg: string) => logMessages.push(msg),
        error: (msg: string) => logMessages.push(msg),
      } as any,
    })

    await command.run()

    assert.equal(retryCalls.length, 1)
    assert.equal(retryCalls[0].channel, 'mail')
    assert.equal(retryCalls[0].limit, 10)
    assert.include(logMessages.join(' '), 'Retried: 5, Skipped: 2')
  })

  test('passes only channel when limit is not set', async ({ assert }) => {
    const retryCalls: any[] = []
    const mockManager = {
      repository: { exists: true },
      retryFailedDeliveries: async (options: any) => {
        retryCalls.push(options)
        return { retried: 3, skipped: 0, errors: [] }
      },
    }

    const logMessages: string[] = []

    const command = createMockCommand(NotificationsRetryFailed, {
      channel: 'mail',
      app: {
        container: {
          make: async () => mockManager,
        },
      } as any,
      logger: {
        success: (msg: string) => logMessages.push(msg),
        warning: (msg: string) => logMessages.push(msg),
        error: (msg: string) => logMessages.push(msg),
      } as any,
    })

    await command.run()

    assert.equal(retryCalls.length, 1)
    assert.equal(retryCalls[0].channel, 'mail')
    assert.isUndefined(retryCalls[0].limit)
  })

  test('logs errors when retry produces errors', async ({ assert }) => {
    const mockManager = {
      repository: { exists: true },
      retryFailedDeliveries: async () => ({
        retried: 1,
        skipped: 0,
        errors: [{ deliveryId: 'delivery-1', error: new Error('network failure') }],
      }),
    }

    const errors: string[] = []
    const successes: string[] = []

    const command = createMockCommand(NotificationsRetryFailed, {
      app: {
        container: {
          make: async () => mockManager,
        },
      } as any,
      logger: {
        success: (msg: string) => successes.push(msg),
        warning: (msg: string) => errors.push(msg),
        error: (msg: string) => errors.push(msg),
      } as any,
    })

    await command.run()

    assert.include(successes.join(' '), 'Retried: 1, Skipped: 0')
    assert.include(errors.join(' '), '1 error(s) during retry')
    assert.include(errors.join(' '), 'Delivery delivery-1')
  })

  test('warns when no repository is configured', async ({ assert }) => {
    const warnings: string[] = []
    const mockManager = { repository: null }

    const command = createMockCommand(NotificationsRetryFailed, {
      app: {
        container: {
          make: async () => mockManager,
        },
      } as any,
      logger: {
        success: () => {},
        warning: (msg: string) => warnings.push(msg),
        error: () => {},
      } as any,
    })

    await command.run()

    assert.include(warnings.join(' '), 'No notification repository configured')
  })

  test('passes empty options when no flags are set', async ({ assert }) => {
    const retryCalls: any[] = []
    const mockManager = {
      repository: { exists: true },
      retryFailedDeliveries: async (options: any) => {
        retryCalls.push(options)
        return { retried: 0, skipped: 0, errors: [] }
      },
    }

    const logMessages: string[] = []

    const command = createMockCommand(NotificationsRetryFailed, {
      app: {
        container: {
          make: async () => mockManager,
        },
      } as any,
      logger: {
        success: (msg: string) => logMessages.push(msg),
        warning: (msg: string) => logMessages.push(msg),
        error: (msg: string) => logMessages.push(msg),
      } as any,
    })

    await command.run()

    assert.equal(retryCalls.length, 1)
    assert.deepEqual(retryCalls[0], {})
  })
})
