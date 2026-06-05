import type { MailMessageOptions } from '../contracts/messages.ts'

/**
 * Fluent builder for constructing MailMessageOptions.
 * Use this in notification classes to build email messages declaratively.
 *
 * @example
 * ```ts
 * toMail(notifiable) {
 *   return MailMessage.create()
 *     .subject('Welcome')
 *     .greeting(`Hello ${notifiable.name}`)
 *     .line('Thanks for joining us!')
 *     .action('Get Started', 'https://example.com/start')
 *     .toOptions()
 * }
 * ```
 */
export class MailMessage {
  private options: MailMessageOptions = {}

  /**
   * Create a new MailMessage builder instance.
   */
  static create(): MailMessage {
    return new MailMessage()
  }

  /**
   * Set the email subject.
   */
  subject(value: string): this {
    this.options.subject = value
    return this
  }

  /**
   * Set the greeting line (used in default template).
   */
  greeting(value: string): this {
    this.options.greeting = value
    return this
  }

  /**
   * Set the salutation line (used in default template).
   */
  salutation(value: string): this {
    this.options.salutation = value
    return this
  }

  /**
   * Add a line to the email body (appends to introLines).
   */
  line(value: string): this {
    if (!this.options.introLines) {
      this.options.introLines = []
    }
    this.options.introLines.push(value)
    return this
  }

  /**
   * Add an action button with text and URL.
   */
  action(text: string, url: string): this {
    this.options.actionText = text
    this.options.actionUrl = url
    return this
  }

  /**
   * Use a custom Edge view template.
   */
  view(name: string, data?: Record<string, unknown>): this {
    this.options.view = name
    if (data) {
      this.options.viewData = { ...this.options.viewData, ...data }
    }
    return this
  }

  /**
   * Set raw HTML content.
   */
  html(value: string): this {
    this.options.html = value
    return this
  }

  /**
   * Set plain text content.
   */
  text(value: string): this {
    this.options.text = value
    return this
  }

  /**
   * Set the from address and optional name.
   */
  from(address: string, name?: string): this {
    this.options.from = { address, name }
    return this
  }

  /**
   * Set the reply-to address and optional name.
   */
  replyTo(address: string, name?: string): this {
    this.options.replyTo = { address, name }
    return this
  }

  /**
   * Set CC recipients.
   */
  cc(addresses: string[]): this {
    this.options.cc = addresses
    return this
  }

  /**
   * Set BCC recipients.
   */
  bcc(addresses: string[]): this {
    this.options.bcc = addresses
    return this
  }

  /**
   * Select a specific mailer by name.
   */
  mailer(name: string): this {
    this.options.mailer = name
    return this
  }

  /**
   * Set email priority.
   */
  priority(value: 'high' | 'normal' | 'low'): this {
    this.options.priority = value
    return this
  }

  /**
   * Set email tags for tracking/filtering.
   */
  tags(values: string[]): this {
    this.options.tags = values
    return this
  }

  /**
   * Add custom data to the view context.
   */
  with(key: string, value: unknown): this {
    if (!this.options.viewData) {
      this.options.viewData = {}
    }
    this.options.viewData[key] = value
    return this
  }

  /**
   * Convert the builder to a MailMessageOptions object.
   * Returns a shallow copy to prevent mutation.
   */
  toOptions(): MailMessageOptions {
    return { ...this.options }
  }
}
