import type { Notification } from './notification.ts'
import type { NotificationManager } from './notification_manager.ts'

/**
 * Routes notifications to specific addresses without a persistent notifiable model.
 * Useful for one-off notifications or testing.
 */
export class NotificationRouter {
  private routes: Map<string, unknown> = new Map()

  constructor(private manager: NotificationManager) {}

  /**
   * Set a route for a specific channel.
   */
  route(channel: string, address: unknown): this {
    this.routes.set(channel, address)
    return this
  }

  /**
   * Send a notification using the configured routes.
   */
  async notify(notification: Notification): Promise<void> {
    // Create a synthetic notifiable that returns our routes
    const syntheticNotifiable = {
      routeNotificationFor: (channel: string) => this.routes.get(channel),
    }

    await this.manager.sendNow(syntheticNotifiable, notification)
  }
}
