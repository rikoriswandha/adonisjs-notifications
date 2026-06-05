/**
 * Type-level smoke test for Notification contracts.
 * This file verifies that concrete Notification subclasses compile correctly
 * with via, toMail, toDatabase, shouldSend, and delay methods.
 */

import { Notification } from '../src/notification.ts'
import type { MailMessageOptions } from '../src/contracts/messages.ts'
import type { DatabaseMessageData } from '../src/contracts/messages.ts'

/**
 * Example notification demonstrating all optional methods.
 */
export class TestNotification extends Notification {
  constructor(
    private readonly message: string,
    private readonly url: string
  ) {
    super()
  }

  via(_notifiable: unknown): string[] {
    return ['mail', 'database']
  }

  toMail(_notifiable: unknown): MailMessageOptions {
    return {
      subject: 'Test Notification',
      introLines: [this.message],
      actionText: 'View Details',
      actionUrl: this.url,
    }
  }

  toDatabase(_notifiable: unknown): DatabaseMessageData {
    return {
      message: this.message,
      url: this.url,
      timestamp: Date.now(),
    }
  }

  shouldSend(_notifiable: unknown, _channel: string): boolean {
    return true
  }

  delay(_notifiable: unknown, channel: string): number | null {
    if (channel === 'mail') {
      return 5000 // 5 second delay for mail
    }
    return null
  }
}

/**
 * Minimal notification with only required methods.
 */
export class MinimalNotification extends Notification {
  via(_notifiable: unknown): string[] {
    return ['database']
  }

  toDatabase(_notifiable: unknown): DatabaseMessageData {
    return {
      message: 'Minimal notification',
    }
  }
}

/**
 * Notification with queue behavior.
 */
export class QueuedNotification extends Notification {
  shouldQueue = true
  queue = 'notifications'
  connection = 'redis'

  via(_notifiable: unknown): string[] {
    return ['mail']
  }

  toMail(_notifiable: unknown): MailMessageOptions {
    return {
      subject: 'Queued Notification',
      html: '<p>This notification is queued.</p>',
    }
  }
}

/**
 * Notification with category and priority.
 */
export class PriorityNotification extends Notification {
  category = 'alerts'
  priority = 'high'

  via(_notifiable: unknown): string[] {
    return ['mail', 'database']
  }

  toMail(_notifiable: unknown): MailMessageOptions {
    return {
      subject: 'Priority Alert',
      priority: 'high',
      html: '<p>This is a high priority notification.</p>',
    }
  }

  toDatabase(_notifiable: unknown): DatabaseMessageData {
    return {
      category: this.category,
      priority: this.priority,
      message: 'High priority alert',
    }
  }
}

/**
 * Notification with custom route resolution.
 */
export class CustomRouteNotification extends Notification {
  via(_notifiable: unknown): string[] {
    return ['mail', 'sms']
  }

  routeNotificationFor(channel: string, _notifiable: unknown): unknown {
    if (channel === 'mail') {
      return 'custom@example.com'
    }
    if (channel === 'sms') {
      return '+1234567890'
    }
    return null
  }

  toMail(_notifiable: unknown): MailMessageOptions {
    return {
      subject: 'Custom Route Notification',
      text: 'This uses a custom route.',
    }
  }

  toSms(_notifiable: unknown): { body: string } {
    return {
      body: 'Custom SMS notification',
    }
  }
}

/**
 * Type-level assertions to verify the contracts compile correctly.
 * These are compile-time checks, not runtime tests.
 */
export type AssertNotification<T extends Notification> = T

// Verify all notification types extend Notification
export type AssertTestNotification = AssertNotification<TestNotification>
export type AssertMinimalNotification = AssertNotification<MinimalNotification>
export type AssertQueuedNotification = AssertNotification<QueuedNotification>
export type AssertPriorityNotification = AssertNotification<PriorityNotification>
export type AssertCustomRouteNotification = AssertNotification<CustomRouteNotification>

// Verify method signatures exist
export type HasVia = typeof TestNotification.prototype.via
export type HasToMail = typeof TestNotification.prototype.toMail
export type HasToDatabase = typeof TestNotification.prototype.toDatabase
export type HasShouldSend = typeof TestNotification.prototype.shouldSend
export type HasDelay = typeof TestNotification.prototype.delay
