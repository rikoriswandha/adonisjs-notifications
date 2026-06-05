import type { Notification } from '../notification.ts'
import type { NormalizedNotifiable } from './notifiable.ts'

export type NotificationChannelName = string

export interface RecordedNotification {
  notification: Notification
  notifiable: NormalizedNotifiable
  channels: string[]
  queued: boolean
}

export interface NotificationFakeAssertions {
  assertSentTo(
    notifiable: unknown,
    notificationClass: new (...args: unknown[]) => Notification
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
}
