import { test } from '@japa/runner'
import NotificationsPrune from '../../commands/notifications_prune.ts'

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

/**
 * Parse a human-readable duration string (e.g. "90d", "30h") into milliseconds.
 */
function parseDuration(value: string): number {
  const match = value.match(/^([0-9]+)\s*(d|h|m|s)?$/)
  if (!match) {
    throw new Error(`Invalid duration format: "${value}". Expected format like "90d", "30h", "15m".`)
  }
  const amount = parseInt(match[1], 10)
  const unit = match[2] || 'd'
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  return amount * multipliers[unit]
}

test.group('parseDuration helper', () => {
  test('converts days to milliseconds', ({ assert }) => {
    assert.equal(parseDuration('1d'), 24 * 60 * 60 * 1000)
    assert.equal(parseDuration('90d'), 90 * 24 * 60 * 60 * 1000)
  })

  test('converts hours to milliseconds', ({ assert }) => {
    assert.equal(parseDuration('1h'), 60 * 60 * 1000)
    assert.equal(parseDuration('12h'), 12 * 60 * 60 * 1000)
  })

  test('converts minutes to milliseconds', ({ assert }) => {
    assert.equal(parseDuration('1m'), 60 * 1000)
    assert.equal(parseDuration('30m'), 30 * 60 * 1000)
  })

  test('converts seconds to milliseconds', ({ assert }) => {
    assert.equal(parseDuration('1s'), 1000)
    assert.equal(parseDuration('30s'), 30 * 1000)
  })

  test('defaults to days when no unit given', ({ assert }) => {
    assert.equal(parseDuration('30'), 30 * 24 * 60 * 60 * 1000)
  })

  test('throws on invalid format', ({ assert }) => {
    assert.throws(() => parseDuration('abc'), /Invalid duration format/)
    assert.throws(() => parseDuration('1x'), /Invalid duration format/)
  })
})

test.group('NotificationsPrune command', () => {
  test('delegates to repository.prune and logs results', async ({ assert }) => {
    const pruneCalls: Date[] = []
    const mockRepository = {
      prune: async (olderThan: Date) => {
        pruneCalls.push(olderThan)
        return 5
      },
      pruneDeliveries: async () => 0,
    }

    const logMessages: string[] = []
    const mockManager = { repository: mockRepository }

    const command = createMockCommand(NotificationsPrune, {
      olderThan: '30d',
      app: {
        container: {
          make: async () => mockManager,
        },
      } as any,
      logger: {
        info: (msg: string) => logMessages.push(msg),
        success: (msg: string) => logMessages.push(msg),
        warning: (msg: string) => logMessages.push(msg),
        error: (msg: string) => logMessages.push(msg),
      } as any,
    })

    await command.run()

    assert.equal(pruneCalls.length, 1)
    const threshold = pruneCalls[0]
    const expectedMs = 30 * 24 * 60 * 60 * 1000
    const now = Date.now()
    assert.isTrue(threshold.getTime() <= now - expectedMs + 1000)
    assert.isTrue(threshold.getTime() >= now - expectedMs - 1000)
    assert.include(logMessages.join(' '), 'Pruned 5 notification(s)')
    assert.include(logMessages.join(' '), 'Total pruned: 5')
  })

  test('delegates to repository.pruneDeliveries when --failed-older-than is set', async ({ assert }) => {
    const pruneDeliveryCalls: Date[] = []
    const mockRepository = {
      prune: async () => 0,
      pruneDeliveries: async (olderThan: Date) => {
        pruneDeliveryCalls.push(olderThan)
        return 3
      },
    }

    const logMessages: string[] = []
    const mockManager = { repository: mockRepository }

    const command = createMockCommand(NotificationsPrune, {
      failedOlderThan: '7d',
      app: {
        container: {
          make: async () => mockManager,
        },
      } as any,
      logger: {
        info: (msg: string) => logMessages.push(msg),
        success: (msg: string) => logMessages.push(msg),
        warning: (msg: string) => logMessages.push(msg),
        error: (msg: string) => logMessages.push(msg),
      } as any,
    })

    await command.run()

    assert.equal(pruneDeliveryCalls.length, 1)
    assert.include(logMessages.join(' '), 'Pruned 3 delivery record(s)')
  })

  test('warns when no repository is configured', async ({ assert }) => {
    const warnings: string[] = []
    const mockManager = { repository: null }

    const command = createMockCommand(NotificationsPrune, {
      olderThan: '30d',
      app: {
        container: {
          make: async () => mockManager,
        },
      } as any,
      logger: {
        info: () => {},
        success: () => {},
        warning: (msg: string) => warnings.push(msg),
        error: () => {},
      } as any,
    })

    await command.run()

    assert.include(warnings.join(' '), 'No notification repository configured')
  })

  test('prunes both notifications and deliveries when both flags are set', async ({ assert }) => {
    const pruneCalls: Date[] = []
    const pruneDeliveryCalls: Date[] = []
    const mockRepository = {
      prune: async (olderThan: Date) => {
        pruneCalls.push(olderThan)
        return 5
      },
      pruneDeliveries: async (olderThan: Date) => {
        pruneDeliveryCalls.push(olderThan)
        return 3
      },
    }

    const logMessages: string[] = []
    const mockManager = { repository: mockRepository }

    const command = createMockCommand(NotificationsPrune, {
      olderThan: '30d',
      failedOlderThan: '7d',
      app: {
        container: {
          make: async () => mockManager,
        },
      } as any,
      logger: {
        info: (msg: string) => logMessages.push(msg),
        success: (msg: string) => logMessages.push(msg),
        warning: (msg: string) => logMessages.push(msg),
        error: (msg: string) => logMessages.push(msg),
      } as any,
    })

    await command.run()

    assert.equal(pruneCalls.length, 1)
    assert.equal(pruneDeliveryCalls.length, 1)
    assert.include(logMessages.join(' '), 'Pruned 5 notification(s)')
    assert.include(logMessages.join(' '), 'Pruned 3 delivery record(s)')
    assert.include(logMessages.join(' '), 'Total pruned: 8')
  })
})
