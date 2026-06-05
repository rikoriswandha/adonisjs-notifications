import { test } from '@japa/runner'
import {
  isWithinQuietHours,
  checkQuietHours,
  filterChannels,
  resolvePreferences,
} from '../src/utils/preference_filter.ts'
import type {
  NotificationPreferences,
  NotificationPreferenceResolver,
} from '../src/contracts/notifiable.ts'
import type { Notification } from '../src/notification.ts'

function mockDateTo(time: string): { mockNow: Date; restore: () => void } {
  const originalDate = globalThis.Date
  const mockNow = new originalDate(time)

  const MockDate = Object.setPrototypeOf(
    class extends Date {
      constructor(...args: [string | number, ...number[]]) {
        if (args.length === 0) {
          super(mockNow)
        } else {
          // @ts-expect-error Date constructor overloads are complex
          super(...args)
        }
      }
    },
    originalDate
  ) as any
  MockDate.now = () => mockNow.getTime()
  MockDate.parse = originalDate.parse.bind(originalDate)
  MockDate.UTC = originalDate.UTC.bind(originalDate)
  globalThis.Date = MockDate

  return {
    mockNow,
    restore: () => {
      globalThis.Date = originalDate
    },
  }
}

test.group('isWithinQuietHours', () => {
  test('same-day range: time within range', ({ assert }) => {
    const now = new Date('2024-01-15T12:00:00Z')
    assert.isTrue(isWithinQuietHours('09:00', '17:00', now, 'UTC'))
  })

  test('same-day range: time before range', ({ assert }) => {
    const now = new Date('2024-01-15T07:00:00Z')
    assert.isFalse(isWithinQuietHours('09:00', '17:00', now, 'UTC'))
  })

  test('same-day range: time after range', ({ assert }) => {
    const now = new Date('2024-01-15T19:00:00Z')
    assert.isFalse(isWithinQuietHours('09:00', '17:00', now, 'UTC'))
  })

  test('same-day range: exact start boundary', ({ assert }) => {
    const now = new Date('2024-01-15T09:00:00Z')
    assert.isTrue(isWithinQuietHours('09:00', '17:00', now, 'UTC'))
  })

  test('same-day range: exact end boundary', ({ assert }) => {
    const now = new Date('2024-01-15T17:00:00Z')
    assert.isFalse(isWithinQuietHours('09:00', '17:00', now, 'UTC'))
  })

  test('overnight range: time in first half', ({ assert }) => {
    const now = new Date('2024-01-15T23:00:00Z')
    assert.isTrue(isWithinQuietHours('22:00', '07:00', now, 'UTC'))
  })

  test('overnight range: time in second half', ({ assert }) => {
    const now = new Date('2024-01-15T05:00:00Z')
    assert.isTrue(isWithinQuietHours('22:00', '07:00', now, 'UTC'))
  })

  test('overnight range: time between end and start', ({ assert }) => {
    const now = new Date('2024-01-15T12:00:00Z')
    assert.isFalse(isWithinQuietHours('22:00', '07:00', now, 'UTC'))
  })

  test('timezone-aware: different local time', ({ assert }) => {
    const now = new Date('2024-01-15T12:00:00Z')
    assert.isTrue(isWithinQuietHours('19:00', '07:00', now, 'Asia/Tokyo'))
  })

  test('timezone-aware: just outside quiet hours', ({ assert }) => {
    const tokyoNow = new Date('2024-01-15T10:00:00Z')
    assert.isTrue(isWithinQuietHours('18:00', '08:00', tokyoNow, 'Asia/Tokyo'))
  })
})

test.group('checkQuietHours', () => {
  test('disabled at config level: no blocking', ({ assert }) => {
    const result = checkQuietHours(
      { quietHours: { start: '22:00', end: '07:00' } },
      { enabled: false, bypassPriorities: [] },
      { priority: undefined } as Notification
    )
    assert.deepEqual(result, { blocked: false })
  })

  test('no quiet hours in preferences: no blocking', ({ assert }) => {
    const result = checkQuietHours(
      { enabledChannels: ['mail'] },
      { enabled: true, bypassPriorities: [] },
      { priority: undefined } as Notification
    )
    assert.deepEqual(result, { blocked: false })
  })

  test('missing start/end: no blocking', ({ assert }) => {
    const result = checkQuietHours(
      { quietHours: { timezone: 'UTC' } },
      { enabled: true, bypassPriorities: [] },
      { priority: undefined } as Notification
    )
    assert.deepEqual(result, { blocked: false })
  })

  test('no preference resolver: no blocking', ({ assert }) => {
    const result = checkQuietHours(null, { enabled: true, bypassPriorities: [] }, {
      priority: undefined,
    } as Notification)
    assert.deepEqual(result, { blocked: false })
  })

  test('within quiet hours: blocked', ({ assert }) => {
    const { restore } = mockDateTo('2024-01-15T23:00:00Z')

    const result = checkQuietHours(
      { quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' } },
      { enabled: true, bypassPriorities: [] },
      { priority: undefined } as Notification
    )

    restore()
    assert.deepEqual(result, { blocked: true, reason: 'quiet_hours' })
  })

  test('outside quiet hours: not blocked', ({ assert }) => {
    const { restore } = mockDateTo('2024-01-15T12:00:00Z')

    const result = checkQuietHours(
      { quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' } },
      { enabled: true, bypassPriorities: [] },
      { priority: undefined } as Notification
    )

    restore()
    assert.deepEqual(result, { blocked: false })
  })

  test('bypass priority: not blocked', ({ assert }) => {
    const result = checkQuietHours(
      { quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' } },
      { enabled: true, bypassPriorities: ['critical', 'high'] },
      { priority: 'critical' } as Notification
    )
    assert.deepEqual(result, { blocked: false })
  })

  test('non-bypass priority: blocked when within quiet hours', ({ assert }) => {
    const { restore } = mockDateTo('2024-01-15T23:00:00Z')

    const result = checkQuietHours(
      { quietHours: { start: '22:00', end: '07:00', timezone: 'UTC' } },
      { enabled: true, bypassPriorities: ['critical'] },
      { priority: 'normal' } as Notification
    )

    restore()
    assert.deepEqual(result, { blocked: true, reason: 'quiet_hours' })
  })
})

test.group('filterChannels', () => {
  test('no preferences: all channels pass', ({ assert }) => {
    const notification = { category: 'marketing' } as Notification
    const result = filterChannels(['mail', 'sms'], null, notification)
    assert.deepEqual(result.allowed, ['mail', 'sms'])
    assert.deepEqual(result.skipped, [])
  })

  test('enabledChannels whitelist: only listed channels pass', ({ assert }) => {
    const notification = { category: 'marketing' } as Notification
    const result = filterChannels(
      ['mail', 'sms', 'push'],
      { enabledChannels: ['mail', 'push'] },
      notification
    )
    assert.deepEqual(result.allowed, ['mail', 'push'])
    assert.equal(result.skipped.length, 1)
    assert.equal(result.skipped[0].channel, 'sms')
    assert.equal(result.skipped[0].reason, 'channel_disabled_by_preferences')
  })

  test('disabledChannels blacklist: listed channels blocked', ({ assert }) => {
    const notification = { category: 'marketing' } as Notification
    const result = filterChannels(
      ['mail', 'sms', 'push'],
      { disabledChannels: ['sms'] },
      notification
    )
    assert.deepEqual(result.allowed, ['mail', 'push'])
    assert.equal(result.skipped.length, 1)
    assert.equal(result.skipped[0].channel, 'sms')
  })

  test('both enabledChannels and disabledChannels: intersect then subtract', ({ assert }) => {
    const notification = { category: 'marketing' } as Notification
    const result = filterChannels(
      ['mail', 'sms', 'push'],
      { enabledChannels: ['mail', 'sms'], disabledChannels: ['sms'] },
      notification
    )
    // enabledChannels narrows to mail+sms, then disabledChannels subtracts sms
    assert.deepEqual(result.allowed, ['mail'])
    assert.equal(result.skipped.length, 2)
    assert.equal(
      result.skipped.find((s) => s.channel === 'sms')?.reason,
      'channel_disabled_by_preferences'
    )
    assert.equal(
      result.skipped.find((s) => s.channel === 'push')?.reason,
      'channel_disabled_by_preferences'
    )
  })

  test('disabledCategories: all channels blocked for matching category', ({ assert }) => {
    const notification = { category: 'promotional' } as Notification
    const result = filterChannels(
      ['mail', 'sms'],
      { disabledCategories: ['promotional', 'spam'] },
      notification
    )
    assert.deepEqual(result.allowed, [])
    assert.equal(result.skipped.length, 2)
    assert.equal(result.skipped[0].reason, 'category_disabled_by_preferences')
    assert.equal(result.skipped[1].reason, 'category_disabled_by_preferences')
  })

  test('disabledCategories: non-matching category unaffected', ({ assert }) => {
    const notification = { category: 'transactional' } as Notification
    const result = filterChannels(
      ['mail', 'sms'],
      { disabledCategories: ['promotional'] },
      notification
    )
    assert.deepEqual(result.allowed, ['mail', 'sms'])
    assert.deepEqual(result.skipped, [])
  })

  test('notification without category: category filter no-op', ({ assert }) => {
    const notification = { category: undefined } as Notification
    const result = filterChannels(
      ['mail', 'sms'],
      { disabledCategories: ['promotional'] },
      notification
    )
    assert.deepEqual(result.allowed, ['mail', 'sms'])
    assert.deepEqual(result.skipped, [])
  })
})

test.group('resolvePreferences', () => {
  test('no resolver: returns null', async ({ assert }) => {
    const result = await resolvePreferences(
      { quietHours: { enabled: false, bypassPriorities: [] } },
      {},
      {} as Notification
    )
    assert.isNull(result)
  })

  test('with resolver: calls and returns result', async ({ assert }) => {
    const prefs: NotificationPreferences = {
      enabledChannels: ['mail'],
      disabledCategories: ['spam'],
    }
    const resolver: NotificationPreferenceResolver = {
      resolve: async () => prefs,
    }

    const result = await resolvePreferences(
      { resolver, quietHours: { enabled: false, bypassPriorities: [] } },
      { id: 1 },
      { category: 'test' } as Notification
    )
    assert.deepEqual(result, prefs)
  })
})
