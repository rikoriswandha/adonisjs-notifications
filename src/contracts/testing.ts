import type { Notification } from '../notification.ts'
import type { NormalizedNotifiable } from './notifiable.ts'

export type NotificationChannelName = string

export interface FakeOptions {
  channels?: string[]
}

export interface RecordedNotification {
  notification: Notification
  notifiable: NormalizedNotifiable
  channels: string[]
  queued: boolean
  getMessage(channel?: string): unknown
}

export interface NotificationFakeAssertions {
  assertSent(
    notificationClass: new (...args: unknown[]) => Notification,
    filterFn?: (n: RecordedNotification) => boolean
  ): void
  assertSentTo(
    notifiable: unknown,
    notificationClass: new (...args: unknown[]) => Notification,
    filterFn?: (n: RecordedNotification) => boolean
  ): void
  assertNotSentTo(
    notifiable: unknown,
    notificationClass: new (...args: unknown[]) => Notification
  ): void
  assertSentOnChannel(
    notifiable: unknown,
    notificationClass: new (...args: unknown[]) => Notification,
    channel: string
  ): void
  assertNothingSent(): void
  assertQueued(
    notifiable: unknown,
    notificationClass: new (...args: unknown[]) => Notification
  ): void
  assertNoneQueued(): void
  assertSentCount(count: number): void
  assertSentCount(
    notificationClass: new (...args: unknown[]) => Notification,
    count: number
  ): void
  assertQueuedCount(count: number): void
  assertQueuedCount(
    notificationClass: new (...args: unknown[]) => Notification,
    count: number
  ): void
}

export interface FakeNotificationRouter {
  route(channel: string, address: unknown): this
  notify(notification: Notification): Promise<void>
}
