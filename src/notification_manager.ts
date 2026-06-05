import type { NotificationConfig } from './contracts/config.ts'
import type { DeliveryContext } from './contracts/delivery.ts'
import type { NotificationChannel } from './contracts/channels.ts'
import type { NormalizedNotifiable } from './contracts/notifiable.ts'
import type { NotificationEmitter, NotificationEventPayload } from './contracts/events.ts'
import type { Notification } from './notification.ts'
import { NotificationRouter } from './notification_router.ts'
import { normalizeRecipients } from './utils/notifiable_resolver.ts'
import { resolveChannelMessage } from './utils/channel_resolver.ts'
import { resolveRoute } from './utils/route_resolver.ts'
import { E_NOTIFICATION_CHANNEL_MISSING } from './exceptions/main.ts'
import {
  NOTIFICATION_SENDING,
  NOTIFICATION_SENT,
  NOTIFICATION_FAILED,
  NOTIFICATION_SKIPPED,
} from './contracts/events.ts'

/**
 * Core notification manager that orchestrates delivery across channels.
 */
export class NotificationManager {
  private channels: Map<string, NotificationChannel> = new Map()

  constructor(
    protected config: NotificationConfig,
    protected emitter?: NotificationEmitter
  ) {}

  /**
   * Set the event emitter (called by provider during boot).
   */
  setEmitter(emitter: NotificationEmitter): void {
    this.emitter = emitter
  }

  /**
   * Send a notification to one or more notifiables.
   * Currently synchronous; will support queue dispatch in Phase 9.
   */
  async send(notifiable: unknown | unknown[], notification: Notification): Promise<void> {
    const recipients = normalizeRecipients(notifiable)

    for (const recipient of recipients) {
      const channels = notification.via(recipient.original)

      for (const channelName of channels) {
        await this.deliver(recipient, notification, channelName)
      }
    }
  }

  /**
   * Send a notification immediately (bypass queue).
   * Currently identical to send(); queue integration added in Phase 9.
   */
  async sendNow(notifiable: unknown | unknown[], notification: Notification): Promise<void> {
    await this.send(notifiable, notification)
  }

  /**
   * Create an anonymous router for one-off notifications.
   */
  route(channel: string, address: unknown): NotificationRouter {
    return new NotificationRouter(this).route(channel, address)
  }

  /**
   * Resolve a channel by name, lazy-loading and caching on first use.
   */
  async resolveChannel(name: string): Promise<NotificationChannel> {
    if (this.channels.has(name)) {
      return this.channels.get(name)!
    }

    const factory = this.config.channels[name]
    if (!factory) {
      throw new E_NOTIFICATION_CHANNEL_MISSING([name])
    }

    const channel = await factory()
    this.channels.set(name, channel)
    return channel
  }

  /**
   * Placeholder for Phase 12 testing utilities.
   */
  fake(): void {
    throw new Error('NotificationManager.fake() is not yet implemented.')
  }

  /**
   * Placeholder for Phase 12 testing utilities.
   */
  restore(): void {
    throw new Error('NotificationManager.restore() is not yet implemented.')
  }

  /**
   * Core delivery loop for a single recipient + channel pair.
   */
  private async deliver(
    notifiable: NormalizedNotifiable,
    notification: Notification,
    channelName: string
  ): Promise<void> {
    // Check shouldSend gate
    if (notification.shouldSend && !notification.shouldSend(notifiable.original, channelName)) {
      this.emitEvent(NOTIFICATION_SKIPPED, {
        notification,
        notifiable,
        channel: channelName,
        metadata: { reason: 'shouldSend returned false' },
      })
      return
    }

    // Resolve channel
    const channel = await this.resolveChannel(channelName)

    // Emit sending event
    this.emitEvent(NOTIFICATION_SENDING, {
      notification,
      notifiable,
      channel: channelName,
      metadata: {},
    })

    try {
      // Resolve route if channel requires it (skip if requiresRoute === false)
      if (channel.requiresRoute !== false) {
        const route = resolveRoute(notification, notifiable, channelName, this.config.routing)
        notifiable.routes.set(channelName, route)
      }

      // Resolve message (skip if channel resolves its own message)
      const message = channel.resolvesOwnMessage
        ? null
        : resolveChannelMessage(notification, notifiable.original, channelName)

      // Build delivery context
      const context = this.buildDeliveryContext(notifiable, notification, channelName, message)

      // Send through channel
      const result = await channel.send(context)

      // Emit sent event
      this.emitEvent(NOTIFICATION_SENT, {
        notification,
        notifiable,
        channel: channelName,
        result,
        metadata: {},
      })
    } catch (error) {
      // Emit failed event
      this.emitEvent(NOTIFICATION_FAILED, {
        notification,
        notifiable,
        channel: channelName,
        error: error as Error,
        metadata: {},
      })

      // Re-throw to preserve error propagation
      throw error
    }
  }

  /**
   * Build the delivery context passed to channel.send().
   */
  private buildDeliveryContext(
    notifiable: NormalizedNotifiable,
    notification: Notification,
    channelName: string,
    message: unknown
  ): DeliveryContext {
    return {
      notification,
      notifiable,
      channel: channelName,
      message,
    }
  }

  /**
   * Emit a lifecycle event if an emitter is configured.
   */
  private emitEvent(event: string, payload: NotificationEventPayload): void {
    if (this.emitter) {
      this.emitter.emit(event, payload)
    }
  }
}
