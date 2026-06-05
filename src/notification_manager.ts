import type { NotificationConfig } from './contracts/config.ts'
import type { Notification } from './notification.ts'

/**
 * Stub implementation of NotificationManager.
 * Real implementation will be added in Phase 4.
 */
export class NotificationManager {
  constructor(protected config: NotificationConfig) {}

  async send(_notifiable: unknown | unknown[], _notification: Notification): Promise<void> {
    throw new Error('NotificationManager.send() is not yet implemented.')
  }

  async sendNow(_notifiable: unknown | unknown[], _notification: Notification): Promise<void> {
    throw new Error('NotificationManager.sendNow() is not yet implemented.')
  }

  route(_channel: string, _route: unknown): NotificationRouter {
    throw new Error('NotificationManager.route() is not yet implemented.')
  }

  fake(): void {
    throw new Error('NotificationManager.fake() is not yet implemented.')
  }

  restore(): void {
    throw new Error('NotificationManager.restore() is not yet implemented.')
  }
}

/**
 * Stub implementation of NotificationRouter.
 * Real implementation will be added in Phase 4.
 */
export class NotificationRouter {
  route(_channel: string, _address: unknown): this {
    return this
  }

  async notify(_notification: Notification): Promise<void> {
    throw new Error('NotificationRouter.notify() is not yet implemented.')
  }
}
