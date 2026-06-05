import type { NotificationChannel } from '../contracts/channels.ts'
import type { DeliveryContext, DeliveryResult } from '../contracts/delivery.ts'
import type { MailMessageOptions } from '../contracts/messages.ts'
import { E_NOTIFICATION_MESSAGE_MISSING } from '../exceptions/main.ts'

/**
 * Minimal mail service interface compatible with @adonisjs/mail.
 * Defined inline to avoid external dependencies at type-check time.
 */
export interface MailServiceContract {
  use(mailer?: string): MailerContract
}

/**
 * Minimal mailer contract for sending emails.
 */
export interface MailerContract {
  send(
    callbackOrMail: ((message: MessageContract) => void | Promise<void>) | any
  ): Promise<MailSendResponse>
}

/**
 * Response from sending an email.
 */
export interface MailSendResponse {
  messageId?: string
  envelope?: { from?: string; to?: string[] }
}

/**
 * Minimal message builder interface for constructing emails.
 */
export interface MessageContract {
  to(address: string | string[], name?: string): this
  from(address: string, name?: string): this
  replyTo(address: string, name?: string): this
  cc(addresses: string[]): this
  bcc(addresses: string[]): this
  subject(value: string): this
  priority(value: string): this
  html(value: string): this
  text(value: string): this
  htmlView(template: string, data?: Record<string, unknown>): this
}

/**
 * Options for configuring the MailChannel.
 */
export interface MailChannelOptions {
  /**
   * Inject a mail service instance (for testing).
   * When not provided, dynamically imports @adonisjs/mail/services/main.
   */
  mailService?: MailServiceContract
}

/**
 * Mail channel implementation.
 * Sends email notifications through @adonisjs/mail.
 *
 * @example
 * ```ts
 * // In config/notifications.ts
 * import { channels } from 'adonisjs-notifications/channels'
 *
 * export default defineConfig({
 *   channels: {
 *     mail: channels.mail(),
 *   },
 * })
 * ```
 */
export class MailChannel implements NotificationChannel<MailMessageOptions, MailSendResponse> {
  name = 'mail'

  private cachedMailService: MailServiceContract | null

  constructor(options?: MailChannelOptions) {
    this.cachedMailService = options?.mailService ?? null
  }

  async send(
    context: DeliveryContext<MailMessageOptions>
  ): Promise<DeliveryResult<MailSendResponse>> {
    try {
      const mail = await this.resolveMailService()
      const messageOptions = context.message

      if (!messageOptions) {
        throw new E_NOTIFICATION_MESSAGE_MISSING([
          context.notification.constructor.name,
          'Mail',
          this.name,
        ])
      }

      // Select mailer (named or default)
      const mailer = messageOptions.mailer ? mail.use(messageOptions.mailer) : mail.use()

      // Send using callback approach
      // Send using callback approach
      const response = await mailer.send((message: MessageContract) => {
        this.applyToMessage(message, messageOptions, context)
      })

      return {
        success: true,
        status: 'sent',
        providerMessageId: response?.messageId,
        result: response as MailSendResponse,
        metadata: {
          sentAt: new Date().toISOString(),
          envelope: response?.envelope,
        },
      }
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { failedAt: new Date().toISOString() },
      }
    }
  }

  /**
   * Apply MailMessageOptions to a Message builder instance.
   */
  private applyToMessage(
    message: MessageContract,
    options: MailMessageOptions,
    context: DeliveryContext<MailMessageOptions>
  ): void {
    // Set recipient from notifiable route
    const route = context.notifiable.routes.get(this.name)
    if (route) {
      message.to(route as string)
    }

    // Subject
    if (options.subject) {
      message.subject(options.subject)
    }

    // From
    if (options.from) {
      message.from(options.from.address, options.from.name)
    }

    // Reply-To
    if (options.replyTo) {
      message.replyTo(options.replyTo.address, options.replyTo.name)
    }

    // CC / BCC
    if (options.cc?.length) {
      message.cc(options.cc)
    }
    if (options.bcc?.length) {
      message.bcc(options.bcc)
    }

    // Priority
    if (options.priority) {
      message.priority(options.priority)
    }

    // Content: explicit html/text takes precedence
    if (options.html) {
      message.html(options.html)
    }
    if (options.text) {
      message.text(options.text)
    }

    // View (Edge template) - only if no explicit html/text provided
    if (options.view && !options.html) {
      const data = {
        subject: options.subject,
        greeting: options.greeting,
        salutation: options.salutation,
        introLines: options.introLines,
        outroLines: options.outroLines,
        actionText: options.actionText,
        actionUrl: options.actionUrl,
        ...options.viewData,
      }
      message.htmlView(options.view, data)
    }
  }

  private async resolveMailService(): Promise<MailServiceContract> {
    if (this.cachedMailService) {
      return this.cachedMailService
    }

    try {
      // @ts-ignore - @adonisjs/mail is an optional peer dependency
      const { default: mail } = await import('@adonisjs/mail/services/main')
      this.cachedMailService = mail as unknown as MailServiceContract
      return this.cachedMailService
    } catch {
      const { E_NOTIFICATION_MAIL_MISSING } = await import('../exceptions/main.ts')
      throw new E_NOTIFICATION_MAIL_MISSING([])
    }
  }
}
