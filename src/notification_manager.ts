import type { NotificationConfig } from './contracts/config.ts'
import type { DeliveryContext } from './contracts/delivery.ts'
import type { NotificationChannel } from './contracts/channels.ts'
import type { NormalizedNotifiable, NotificationPreferences } from './contracts/notifiable.ts'
import type { NotificationEmitter, NotificationEventPayload } from './contracts/events.ts'
import type {
  NotificationRepository,
  RetryOptions,
  RetryResult,
  DeliveryAttemptAttributes,
  DeliveryAttemptRow,
} from './contracts/repository.ts'
import type { DeliveryMetricsFilter } from './contracts/metrics.ts'
import { Notification } from './notification.ts'
import { NotificationRouter } from './notification_router.ts'
import { normalizeRecipients } from './utils/notifiable_resolver.ts'
import { resolveChannelMessage } from './utils/channel_resolver.ts'
import { resolveRoute } from './utils/route_resolver.ts'
import { generateDedupeKey } from './utils/dedupe_key.ts'
import { serializeNotification, serializeNotifiable } from './utils/serialize.ts'
import { resolvePreferences, filterChannels, checkQuietHours } from './utils/preference_filter.ts'
import { E_NOTIFICATION_CHANNEL_MISSING, E_NOTIFICATION_QUEUE_MISSING } from './exceptions/main.ts'
import {
  NOTIFICATION_SENDING,
  NOTIFICATION_SENT,
  NOTIFICATION_FAILED,
  NOTIFICATION_SKIPPED,
  NOTIFICATION_QUEUED,
} from './contracts/events.ts'
import type { FakeOptions } from './contracts/testing.ts'
import { FakeNotificationManager } from './testing/fake_notification_manager.ts'
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
  private repository?: NotificationRepository
  #fakeManager?: FakeNotificationManager

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
   * Set the notification repository (called by provider during boot).
   */
  setRepository(repository: NotificationRepository): void {
    this.repository = repository
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
    if (this.#fakeManager) {
      return this.#fakeManager.send(notifiable, notification)
    }

    const recipients = normalizeRecipients(notifiable)

    for (const recipient of recipients) {
      const channels = notification.via(recipient.original)
      const preferences = await resolvePreferences(
        this.config.preferences,
        recipient.original,
        notification
      )
      const { allowed, skipped } = filterChannels(channels, preferences, notification)

      for (const skip of skipped) {
        this.emitEvent(NOTIFICATION_SKIPPED, {
          notification,
          notifiable: recipient,
          channel: skip.channel,
          metadata: { reason: skip.reason },
        })
      }

      for (const channelName of allowed) {
        if (this.shouldQueueNotification(notification)) {
          await this.dispatchToQueue(recipient, notification, channelName, preferences)
        } else {
          await this.deliver(recipient, notification, channelName, preferences)
        }
      }
    }
  }

  /**
   * Send a notification immediately, bypassing the queue unconditionally.
   */
  async sendNow(notifiable: unknown | unknown[], notification: Notification): Promise<void> {
    if (this.#fakeManager) {
      return this.#fakeManager.sendNow(notifiable, notification)
    }

    const recipients = normalizeRecipients(notifiable)
    for (const recipient of recipients) {
      const channels = notification.via(recipient.original)
      const preferences = await resolvePreferences(
        this.config.preferences,
        recipient.original,
        notification
      )
      const { allowed, skipped } = filterChannels(channels, preferences, notification)

      for (const skip of skipped) {
        this.emitEvent(NOTIFICATION_SKIPPED, {
          notification,
          notifiable: recipient,
          channel: skip.channel,
          metadata: { reason: skip.reason },
        })
      }

      for (const channelName of allowed) {
        await this.deliver(recipient, notification, channelName, preferences)
      }
    }
  }

  /**
   * Deliver a single channel for a single notifiable.
   * Used by FakeNotificationManager to delegate non-faked channels.
   */
  async deliverChannel(
    notifiable: unknown,
    notification: Notification,
    channelName: string
  ): Promise<void> {
    const normalized = normalizeRecipients(notifiable)[0]!
    await this.deliver(normalized, notification, channelName, null)
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
   * Intercept all or selected channels with a fake for testing.
   * Returns the fake manager for assertions.
   */
  fake(options?: FakeOptions): FakeNotificationManager {
    this.restore()
    this.#fakeManager = new FakeNotificationManager(this, options)
    return this.#fakeManager
  }

  /**
   * Restore real notification delivery.
   */
  restore(): void {
    if (this.#fakeManager) {
      this.#fakeManager.restore()
      this.#fakeManager = undefined
    }
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
    channelName: string,
    preferences?: NotificationPreferences | null
  ): Promise<void> {
    if (!this.queueDispatcher) {
      throw new E_NOTIFICATION_QUEUE_MISSING([])
    }

    // Quiet-hours check before queuing
    if (preferences) {
      const quietCheck = checkQuietHours(
        preferences,
        this.config.preferences.quietHours,
        notification
      )
      if (quietCheck.blocked) {
        this.emitEvent(NOTIFICATION_SKIPPED, {
          notification,
          notifiable,
          channel: channelName,
          metadata: { reason: quietCheck.reason },
        })
        return
      }
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
    channelName: string,
    preferences?: NotificationPreferences | null
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

    // Quiet-hours check (only when preferences are provided — direct send path)
    if (preferences) {
      const quietCheck = checkQuietHours(
        preferences,
        this.config.preferences.quietHours,
        notification
      )
      if (quietCheck.blocked) {
        this.emitEvent(NOTIFICATION_SKIPPED, {
          notification,
          notifiable,
          channel: channelName,
          metadata: { reason: quietCheck.reason },
        })
        return
      }
    }

    // Resolve channel
    const channel = await this.resolveChannel(channelName)
    // Build dedupe key
    const notificationType = notification.constructor.name
    const serializedNotifiable = serializeNotifiable(notifiable)
    const dedupeKey = generateDedupeKey(
      notificationType,
      notification.instanceId,
      serializedNotifiable.type,
      serializedNotifiable.id,
      channelName
    )
    // Dedupe check
    let deliveryRecord: DeliveryAttemptRow | undefined
    if (this.repository && this.config.delivery.recordAttempts) {
      const existing = await this.repository.findDeliveryByDedupeKey(dedupeKey)
      if (existing && (existing.status === 'sent' || existing.status === 'pending')) {
        this.emitEvent(NOTIFICATION_SKIPPED, {
          notification,
          notifiable,
          channel: channelName,
          deliveryId: existing.id,
          metadata: { reason: 'deduplicated', dedupeKey },
        })
        return
      }
    }
    // Create pending delivery record
    if (this.repository && this.config.delivery.recordAttempts) {
      const attrs: DeliveryAttemptAttributes = {
        notificationType,
        notifiableType: serializedNotifiable.type,
        notifiableId: serializedNotifiable.id,
        channel: channelName,
        status: 'pending',
        dedupeKey,
        attempts: 0,
      }
      deliveryRecord = await this.repository.storeDelivery(attrs)
    }
    const deliveryId = deliveryRecord?.id
    // Emit sending event
    this.emitEvent(NOTIFICATION_SENDING, {
      notification,
      notifiable,
      channel: channelName,
      deliveryId,
      metadata: { dedupeKey },
    })
    let lastError: Error | undefined
    const maxAttempts = this.config.delivery.retry.attempts
    const backoff = this.config.delivery.retry.backoff
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        // Success: update delivery record
        if (deliveryRecord) {
          await this.repository!.updateDeliveryStatus(deliveryRecord.id, 'sent', {
            attempts: attempt,
            providerMessageId: result.providerMessageId ?? null,
          })
        }
        // Emit sent event
        this.emitEvent(NOTIFICATION_SENT, {
          notification,
          notifiable,
          channel: channelName,
          deliveryId,
          result,
          metadata: { dedupeKey, attempts: attempt },
        })
        return
      } catch (error) {
        lastError = error as Error
        // Update delivery record with attempt count and error
        if (deliveryRecord) {
          const errorData: Record<string, unknown> = {
            message: lastError.message,
            stack: lastError.stack ?? null,
            attempt,
          }
          await this.repository!.updateDeliveryStatus(
            deliveryRecord.id,
            attempt < maxAttempts ? 'pending' : 'failed',
            {
              attempts: attempt,
              error: errorData,
            }
          )
        }
        // Retry if attempts remain and backoff is configured for this attempt
        if (attempt < maxAttempts && backoff[attempt - 1] !== undefined) {
          await this.sleep(backoff[attempt - 1])
          continue
        }
        // Final failure: update status if not already failed
        if (deliveryRecord && attempt === maxAttempts) {
          const errorData: Record<string, unknown> = {
            message: lastError.message,
            stack: lastError.stack ?? null,
            attempt,
          }
          await this.repository!.updateDeliveryStatus(deliveryRecord.id, 'failed', {
            attempts: attempt,
            error: errorData,
          })
        }
        break
      }
    }
    // Emit failed event
    this.emitEvent(NOTIFICATION_FAILED, {
      notification,
      notifiable,
      channel: channelName,
      deliveryId,
      error: lastError!,
      metadata: { dedupeKey, attempts: maxAttempts },
    })
    // Always throw after retry exhaustion to preserve error propagation
    throw lastError
  }

  /**
   * Retry failed deliveries that are eligible for re-attempt.
   */
  async retryFailedDeliveries(options?: RetryOptions): Promise<RetryResult> {
    if (!this.repository) {
      return { retried: 0, skipped: 0, errors: [] }
    }
    const failed = await this.repository.findFailedForRetry(options)
    const result: RetryResult = { retried: 0, skipped: 0, errors: [] }
    for (const delivery of failed) {
      try {
        // Reconstruct a minimal notifiable from the delivery record
        const notifiable = {
          original: { id: delivery.notifiableId } as any,
          type: delivery.notifiableType,
          id: delivery.notifiableId,
          routes: new Map<string, unknown>(),
        }
        // Create a minimal notification stub
        const notification = new (class extends Notification {
          via() {
            return [delivery.channel]
          }
          [key: string]: any
        })()
        // Re-deliver
        await this.deliver(notifiable as NormalizedNotifiable, notification, delivery.channel)
        result.retried++
      } catch (error) {
        result.errors.push({ deliveryId: delivery.id, error })
      }
    }
    return result
  }

  /**
   * Get notification metrics snapshot.
   */
  async getMetrics(options?: {
    notifiableType?: string
    notifiableId?: string | number
    filter?: DeliveryMetricsFilter
  }): Promise<import('./contracts/metrics.ts').NotificationMetrics> {
    if (!this.repository) {
      return {
        inbox: null,
        deliveries: {
          total: 0,
          byStatus: { pending: 0, sent: 0, failed: 0, skipped: 0 },
          byChannel: {},
          byType: {},
          byChannelAndStatus: {},
          averageAttempts: 0,
          failureRate: 0,
        },
        computedAt: new Date().toISOString(),
      }
    }

    const inbox =
      options?.notifiableType && options?.notifiableId !== undefined
        ? await this.repository.getInboxMetrics(options.notifiableType, options.notifiableId)
        : null

    const deliveries = await this.repository.getDeliveryMetrics(options?.filter)

    return { inbox, deliveries, computedAt: new Date().toISOString() }
  }

  /**
   * Sleep for the given number of milliseconds.
   */
  private sleep(ms: number): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>()
    setTimeout(resolve, ms)
    return promise
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
