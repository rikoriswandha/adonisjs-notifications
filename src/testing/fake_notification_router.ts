import type { Notification } from '../notification.ts'
import type { FakeNotificationManager } from './fake_notification_manager.ts'

export class FakeNotificationRouter {
  #routes: Map<string, unknown> = new Map()
  #fakeManager: FakeNotificationManager

  constructor(fakeManager: FakeNotificationManager) {
    this.#fakeManager = fakeManager
  }

  route(channel: string, address: unknown): this {
    this.#routes.set(channel, address)
    return this
  }

  async notify(notification: Notification): Promise<void> {
    const syntheticNotifiable = {
      routeNotificationFor: (channel: string) => this.#routes.get(channel),
    }

    await this.#fakeManager.sendNow(syntheticNotifiable, notification)
  }

  [Symbol.dispose](): void {
    this.#fakeManager.restore()
  }
}
