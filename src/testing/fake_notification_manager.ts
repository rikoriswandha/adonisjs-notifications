import { AssertionError } from 'node:assert'
import type { Notification } from '../notification.ts'
import type { NotificationManager } from '../notification_manager.ts'
import type { RecordedNotification, FakeOptions } from '../contracts/testing.ts'
import { normalizeRecipients } from '../utils/notifiable_resolver.ts'
import { resolveChannelMessage } from '../utils/channel_resolver.ts'
import { FakeNotificationRouter } from './fake_notification_router.ts'

export class FakeNotificationManager {
  #sent: RecordedNotification[] = []
  #queued: RecordedNotification[] = []
  #interceptedChannels: Set<string> | null = null
  #realManager: NotificationManager

  constructor(realManager: NotificationManager, options?: FakeOptions) {
    this.#realManager = realManager
    if (options?.channels) {
      this.#interceptedChannels = new Set(options.channels)
    }
  }

  restore(): void {
    this.#sent = []
    this.#queued = []
    this.#interceptedChannels = null
  }

  // --- Core send methods ---

  async send(notifiable: unknown | unknown[], notification: Notification): Promise<void> {
    const recipients = normalizeRecipients(notifiable)

    for (const recipient of recipients) {
      const channels = notification.via(recipient.original)
      const intercepted = channels.filter((c) => this.#isIntercepted(c))
      const real = channels.filter((c) => !this.#isIntercepted(c))

      if (intercepted.length > 0) {
        this.#record(recipient.original, notification, intercepted, true)
      }

      for (const channelName of real) {
        await this.#realManager.deliverChannel(recipient.original, notification, channelName)
      }
    }
  }

  async sendNow(notifiable: unknown | unknown[], notification: Notification): Promise<void> {
    const recipients = normalizeRecipients(notifiable)

    for (const recipient of recipients) {
      const channels = notification.via(recipient.original)
      const intercepted = channels.filter((c) => this.#isIntercepted(c))
      const real = channels.filter((c) => !this.#isIntercepted(c))

      if (intercepted.length > 0) {
        this.#record(recipient.original, notification, intercepted, false)
      }

      for (const channelName of real) {
        await this.#realManager.deliverChannel(recipient.original, notification, channelName)
      }
    }
  }

  route(channel: string, address: unknown): FakeNotificationRouter {
    return new FakeNotificationRouter(this).route(channel, address)
  }

  // --- Recording ---

  #record(
    notifiable: unknown,
    notification: Notification,
    channels: string[],
    queued: boolean
  ): void {
    const normalized = normalizeRecipients(notifiable)[0]!
    const recorded: RecordedNotification = {
      notification,
      notifiable: normalized,
      channels,
      queued,
      getMessage: (channel?: string) => {
        const ch = channel ?? channels[0]
        if (!ch) return undefined
        try {
          return resolveChannelMessage(notification, normalized.original, ch)
        } catch {
          return undefined
        }
      },
    }

    if (queued) {
      this.#queued.push(recorded)
    } else {
      this.#sent.push(recorded)
    }
  }

  #isIntercepted(channel: string): boolean {
    return this.#interceptedChannels === null || this.#interceptedChannels.has(channel)
  }

  // --- Query methods ---

  sent(filterFn?: (n: RecordedNotification) => boolean): RecordedNotification[] {
    const result = this.#sent.slice()
    return filterFn ? result.filter(filterFn) : result
  }

  queued(filterFn?: (n: RecordedNotification) => boolean): RecordedNotification[] {
    const result = this.#queued.slice()
    return filterFn ? result.filter(filterFn) : result
  }

  // --- Assertion methods ---

  assertSent(
    notificationClass: new (...args: unknown[]) => Notification,
    filterFn?: (n: RecordedNotification) => boolean
  ): void {
    const all = this.sent().filter((n) => n.notification instanceof notificationClass)
    const matches = filterFn ? all.filter(filterFn) : all
    if (matches.length === 0) {
      throw new AssertionError({
        message: `Expected notification ${notificationClass.name} to be sent, but it was not.`,
        actual: 0,
        expected: 1,
        operator: '>=',
      })
    }
  }

  assertSentTo(
    notifiable: unknown,
    notificationClass: new (...args: unknown[]) => Notification,
    filterFn?: (n: RecordedNotification) => boolean
  ): void {
    const all = this.sent().filter(
      (n) => n.notification instanceof notificationClass && this.#notifiableMatches(n, notifiable)
    )
    const matches = filterFn ? all.filter(filterFn) : all
    if (matches.length === 0) {
      throw new AssertionError({
        message: `Expected notification ${notificationClass.name} to be sent to ${this.#describeNotifiable(notifiable)}, but it was not.`,
        actual: 0,
        expected: 1,
        operator: '>=',
      })
    }
  }

  assertNotSentTo(
    notifiable: unknown,
    notificationClass: new (...args: unknown[]) => Notification
  ): void {
    const match = this.sent().find(
      (n) => n.notification instanceof notificationClass && this.#notifiableMatches(n, notifiable)
    )
    if (match) {
      throw new AssertionError({
        message: `Expected notification ${notificationClass.name} NOT to be sent to ${this.#describeNotifiable(notifiable)}, but it was sent.`,
        actual: 1,
        expected: 0,
        operator: '==',
      })
    }
  }

  assertSentOnChannel(
    notifiable: unknown,
    notificationClass: new (...args: unknown[]) => Notification,
    channel: string
  ): void {
    const match = this.sent().find(
      (n) =>
        n.notification instanceof notificationClass &&
        this.#notifiableMatches(n, notifiable) &&
        n.channels.includes(channel)
    )
    if (!match) {
      throw new AssertionError({
        message: `Expected notification ${notificationClass.name} to be sent on channel "${channel}" to ${this.#describeNotifiable(notifiable)}, but it was not.`,
        actual: 0,
        expected: 1,
        operator: '>=',
      })
    }
  }

  assertQueued(
    notifiable: unknown,
    notificationClass: new (...args: unknown[]) => Notification
  ): void {
    const match = this.queued().find(
      (n) => n.notification instanceof notificationClass && this.#notifiableMatches(n, notifiable)
    )
    if (!match) {
      throw new AssertionError({
        message: `Expected notification ${notificationClass.name} to be queued for ${this.#describeNotifiable(notifiable)}, but it was not.`,
        actual: 0,
        expected: 1,
        operator: '>=',
      })
    }
  }

  assertNothingSent(): void {
    if (this.#sent.length > 0 || this.#queued.length > 0) {
      const total = this.#sent.length + this.#queued.length
      throw new AssertionError({
        message: `Expected no notifications to be sent, but ${total} notification(s) were recorded.`,
        actual: total,
        expected: 0,
        operator: '==',
      })
    }
  }

  assertNoneQueued(): void {
    if (this.#queued.length > 0) {
      throw new AssertionError({
        message: `Expected no notifications to be queued, but ${this.#queued.length} notification(s) were queued.`,
        actual: this.#queued.length,
        expected: 0,
        operator: '==',
      })
    }
  }

  assertSentCount(count: number): void
  assertSentCount(
    notificationClass: new (...args: unknown[]) => Notification,
    count: number
  ): void
  assertSentCount(
    ...args: [number] | [new (...args: unknown[]) => Notification, number]
  ): void {
    if (args.length === 1) {
      const [count] = args
      if (this.#sent.length !== count) {
        throw new AssertionError({
          message: `Expected ${count} notification(s) to be sent, but ${this.#sent.length} were sent.`,
          actual: this.#sent.length,
          expected: count,
          operator: '==',
        })
      }
    } else {
      const [notificationClass, count] = args
      const matches = this.sent().filter((n) => n.notification instanceof notificationClass)
      if (matches.length !== count) {
        throw new AssertionError({
          message: `Expected ${count} ${notificationClass.name} notification(s) to be sent, but ${matches.length} were sent.`,
          actual: matches.length,
          expected: count,
          operator: '==',
        })
      }
    }
  }

  assertQueuedCount(count: number): void
  assertQueuedCount(
    notificationClass: new (...args: unknown[]) => Notification,
    count: number
  ): void
  assertQueuedCount(
    ...args: [number] | [new (...args: unknown[]) => Notification, number]
  ): void {
    if (args.length === 1) {
      const [count] = args
      if (this.#queued.length !== count) {
        throw new AssertionError({
          message: `Expected ${count} notification(s) to be queued, but ${this.#queued.length} were queued.`,
          actual: this.#queued.length,
          expected: count,
          operator: '==',
        })
      }
    } else {
      const [notificationClass, count] = args
      const matches = this.queued().filter((n) => n.notification instanceof notificationClass)
      if (matches.length !== count) {
        throw new AssertionError({
          message: `Expected ${count} ${notificationClass.name} notification(s) to be queued, but ${matches.length} were queued.`,
          actual: matches.length,
          expected: count,
          operator: '==',
        })
      }
    }
  }

  // --- Helpers ---

  #notifiableMatches(recorded: RecordedNotification, expected: unknown): boolean {
    const original = recorded.notifiable.original
    if (original === expected) return true
    if (typeof expected === 'object' && expected !== null) {
      const obj = expected as Record<string, unknown>
      const getId = obj.getNotificationId
      if (typeof getId === 'function') {
        const id = (getId as () => string | number).call(expected)
        const getType = obj.getNotificationType
        const type = typeof getType === 'function'
          ? (getType as () => string).call(expected)
          : obj.constructor?.name
        return (
          recorded.notifiable.id === id &&
          recorded.notifiable.type === type
        )
      }
      if ('id' in obj && recorded.notifiable.id === obj.id) return true
    }
    return false
  }

  #describeNotifiable(notifiable: unknown): string {
    if (notifiable === null || notifiable === undefined) return String(notifiable)
    if (typeof notifiable === 'object') {
      const obj = notifiable as Record<string, unknown>
      const getId = obj.getNotificationId
      const id = typeof getId === 'function'
        ? (getId as () => string | number).call(notifiable)
        : obj.id
      const getType = obj.getNotificationType
      const type = typeof getType === 'function'
        ? (getType as () => string).call(notifiable)
        : obj.constructor?.name ?? 'object'
      return `${type}(${id})`
    }
    return String(notifiable)
  }
}
