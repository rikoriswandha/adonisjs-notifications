import type { NotificationChannel } from '../contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../contracts/delivery.ts'
import { redactValue } from '../utils/redactor.ts'

/**
 * Minimal logger interface compatible with AdonisJS Pino logger.
 * Accepts structured context as first arg, message as second.
 */
export interface LogChannelLogger {
  info(context: Record<string, unknown>, message: string, ...args: unknown[]): void
  error(context: Record<string, unknown>, message: string, ...args: unknown[]): void
}

/**
 * Log channel implementation.
 * Uses AdonisJS Pino logger (or injected logger) to write structured notification logs
 * with automatic PII redaction.
 */
export class LogChannel implements NotificationChannel<any, void> {
  name = 'log'
  resolvesOwnMessage = true

  private cachedLogger: LogChannelLogger | null = null

  constructor(logger?: LogChannelLogger) {
    if (logger) {
      this.cachedLogger = logger
    }
  }

  async send(context: DeliveryContext<any>): Promise<DeliveryResult<void>> {
    try {
      const logger = await this.resolveLogger()

      const notification = context.notification
      const className = notification.constructor.name
      const notifiable = context.notifiable

      // Resolve message via toLog() or fallback
      const rawMessage =
        typeof (notification as any).toLog === 'function'
          ? (notification as any).toLog(notifiable.original)
          : { notification: className, sentAt: new Date().toISOString() }

      // Redact PII from message payload
      const redactedMessage =
        typeof rawMessage === 'string'
          ? redactValue(rawMessage)
          : redactValue(rawMessage)

      // Redact PII from notifiable id (only if it's a string)
      const notifiableId =
        typeof notifiable.id === 'string'
          ? redactValue(notifiable.id)
          : notifiable.id

      const logContext = {
        notification: className,
        channel: context.channel,
        notifiableType: notifiable.type,
        notifiableId,
        message: redactedMessage,
      }

      logger.info(logContext, 'Notification sent via %s channel', this.name)

      return {
        success: true,
        status: 'sent',
        metadata: { loggedAt: new Date().toISOString() },
      }
    } catch (error) {
      // Log channel must be resilient: catch errors and return failed result
      try {
        const logger = await this.resolveLogger()
        logger.error(
          { error: error instanceof Error ? error.message : String(error) },
          'LogChannel failed to log notification'
        )
      } catch {
        // Swallow logger resolution errors to avoid recursive failures
      }

      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  private async resolveLogger(): Promise<LogChannelLogger> {
    if (this.cachedLogger) {
      return this.cachedLogger
    }

    // Dynamic import of AdonisJS logger service singleton
    const { default: logger } = await import('@adonisjs/core/services/logger')
    this.cachedLogger = logger as unknown as LogChannelLogger
    return this.cachedLogger
  }
}
