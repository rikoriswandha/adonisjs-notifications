import { test } from '@japa/runner'
import { NullChannel } from '../../src/channels/null_channel.ts'
import type { DeliveryContext } from '../../src/contracts/delivery.ts'

/**
 * Helper to build a minimal DeliveryContext for testing.
 */
function buildContext(overrides: Partial<DeliveryContext<any>> = {}): DeliveryContext<any> {
  return {
    notification: {
      constructor: { name: 'TestNotification' },
      via: () => ['null'],
    } as any,
    notifiable: {
      id: 1,
      type: 'user',
      routes: new Map(),
      original: { id: 1 },
    },
    channel: 'null',
    message: { title: 'Test' },
    ...overrides,
  }
}

test.group('NullChannel', () => {
  test('returns success true and status sent for any delivery context', async ({ assert }) => {
    const channel = new NullChannel()
    const context = buildContext()
    const result = await channel.send(context)

    assert.isTrue(result.success)
    assert.equal(result.status, 'sent')
  })

  test('includes metadata.processedAt as an ISO timestamp string', async ({ assert }) => {
    const channel = new NullChannel()
    const context = buildContext()
    const result = await channel.send(context)

    assert.isDefined(result.metadata)
    assert.isDefined(result.metadata!.processedAt)
    assert.typeOf(result.metadata!.processedAt, 'string')

    // Verify it's a valid ISO timestamp
    const parsed = new Date(result.metadata!.processedAt as string)
    assert.isFalse(isNaN(parsed.getTime()))
  })

  test('does not throw regardless of input', async ({ assert }) => {
    const channel = new NullChannel()

    // Empty-ish context
    const result1 = await channel.send({
      notification: {} as any,
      notifiable: { id: 1, type: 'user', routes: new Map(), original: null },
      channel: 'null',
      message: null,
    })
    assert.isTrue(result1.success)

    // Context with complex message
    const result2 = await channel.send(
      buildContext({ message: { deep: { nested: { data: [1, 2, 3] } } } })
    )
    assert.isTrue(result2.success)
  })

  test('works with message undefined', async ({ assert }) => {
    const channel = new NullChannel()
    const context = buildContext({ message: undefined })
    const result = await channel.send(context)

    assert.isTrue(result.success)
    assert.equal(result.status, 'sent')
  })

  test('works with numeric notifiable id', async ({ assert }) => {
    const channel = new NullChannel()
    const context = buildContext({
      notifiable: { id: 42, type: 'user', routes: new Map(), original: { id: 42 } },
    })
    const result = await channel.send(context)

    assert.isTrue(result.success)
  })

  test('works with string notifiable id', async ({ assert }) => {
    const channel = new NullChannel()
    const context = buildContext({
      notifiable: {
        id: 'user-abc-123',
        type: 'user',
        routes: new Map(),
        original: { id: 'user-abc-123' },
      },
    })
    const result = await channel.send(context)

    assert.isTrue(result.success)
  })

  test('works with missing notifiable id (undefined cast to string)', async ({ assert }) => {
    const channel = new NullChannel()
    const context = buildContext({
      notifiable: {
        id: undefined as any,
        type: 'anonymous',
        routes: new Map(),
        original: {},
      },
    })
    const result = await channel.send(context)

    assert.isTrue(result.success)
    assert.equal(result.status, 'sent')
  })
})
