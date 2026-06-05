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
import { generateDedupeKey } from './utils/dedupe_key.ts'
import { serializeNotification, serializeNotifiable } from './utils/serialize.ts'
import { E_NOTIFICATION_CHANNEL_MISSING, E_NOTIFICATION_QUEUE_MISSING } from './exceptions/main.ts'
import {
  NOTIFICATION_SENDING,
  NOTIFICATION_SENT,
  NOTIFICATION_FAILED,
  NOTIFICATION_SKIPPED,
  NOTIFICATION_QUEUED,
} from './contracts/events.ts'

/**
 * Minimal interface for dispatching a notification job to a queue.
 */
export interface QueueDispatcher {
  dispatch(payload: QueuePayload): Promise<void>
}

/**
 * Payload passed to the queue dispatcher for each channel delivery.
 */
export interface QueuePayload {
  notificationType: string
  notificationData: Record<string, unknown>
  notifiableType: string
  notifiableId: string | number
  channel: string
  dedupeKey: string
  queue?: string
  connection?: string
  delay?: number
}

/**
 * Core notification manager that orchestrates delivery across channels.
 */
export class NotificationManager {
  private channels: Map<string, NotificationChannel> = new Map()
  private queueDispatcher?: QueueDispatcher

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
   * Set the queue dispatcher (called by provider during boot).
   */
  setQueueDispatcher(dispatcher: QueueDispatcher): void {
    this.queueDispatcher = dispatcher
  }

  /**
   * Expose config for queue job deserialization.
   */
  getConfig(): NotificationConfig {
    return this.config
  }

  /**
   * Send a notification to one or more notifiables.
   * Dispatches to queue when the notification declares `shouldQueue = true`
   * and queue is enabled and available.
   */
  async send(notifiable: unknown | unknown[], notification: Notification): Promise<void> {
    const recipients = normalizeRecipients(notifiable)

    for (const recipient of recipients) {
      const channels = notification.via(recipient.original)

      for (const channelName of channels) {
        if (this.shouldQueueNotification(notification)) {
          await this.dispatchToQueue(recipient, notification, channelName)
        } else {
          await this.deliver(recipient, notification, channelName)
        }
      }
    }
  }

  /**
   * Send a notification immediately, bypassing the queue unconditionally.
   */
  async sendNow(notifiable: unknown | unknown[], notification: Notification): Promise<void> {
    const recipients = normalizeRecipients(notifiable)

    for (const recipient of recipients) {
      const channels = notification.via(recipient.original)

      for (const channelName of channels) {
        await this.deliver(recipient, notification, channelName)
      }
    }
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
   * Determine whether a notification should be queued.
   */
  private shouldQueueNotification(notification: Notification): boolean {
    // Config master switch is off
    if (!this.config.queue.enabled) {
      return false
    }
    // Explicit opt-out
    if (notification.shouldQueue === false) {
      return false
    }
    // Queue if explicitly opted in, or default behavior (not explicitly opted out)
    // AND a dispatcher is available
    return this.queueDispatcher !== undefined
  }

  /**
   * Dispatch a single notification channel delivery to the queue.
   */
  private async dispatchToQueue(
    notifiable: NormalizedNotifiable,
    notification: Notification,
    channelName: string
  ): Promise<void> {
    if (!this.queueDispatcher) {
      throw new E_NOTIFICATION_QUEUE_MISSING([])
    }

    const notificationType = notification.constructor.name
    const notificationData = serializeNotification(notification)
    const serializedNotifiable = serializeNotifiable(notifiable)

    const dedupeKey = generateDedupeKey(
      notificationType,
      notification.instanceId,
      serializedNotifiable.type,
      serializedNotifiable.id,
      channelName
    )

    const delayValue = notification.delay
      ? notification.delay(notifiable.original, channelName)
      : null
    const delayMs =
      typeof delayValue === 'string' ? parseDelay(delayValue) : (delayValue ?? undefined)

    const payload: QueuePayload = {
      notificationType,
      notificationData,
      notifiableType: serializedNotifiable.type,
      notifiableId: serializedNotifiable.id,
      channel: channelName,
      dedupeKey,
      queue: notification.queue,
      connection: notification.connection,
      delay: delayMs,
    }

    this.emitEvent(NOTIFICATION_QUEUED, {
      notification,
      notifiable,
      channel: channelName,
      metadata: { dedupeKey, queue: payload.queue ?? this.config.queue.defaultQueue },
    })

    await this.queueDispatcher.dispatch(payload)
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

/**
 * Parse a human-readable delay string into milliseconds.
 */
function parseDelay(value: string): number {
  const match = value.match(/^(\d+)\s*(ms|s|m|h|d)$/)
  if (!match) {
    throw new Error(`Invalid delay format: ${value}`)
  }
  const num = Number.parseInt(match[1], 10)
  const unit = match[2]
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  return num * multipliers[unit]
}
