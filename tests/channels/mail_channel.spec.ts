import { test } from '@japa/runner'
import { MailChannel } from '../../src/channels/mail_channel.ts'
import type {
  MailServiceContract,
  MailerContract,
  MessageContract,
} from '../../src/channels/mail_channel.ts'
import { MailMessage } from '../../src/messages/mail_message.ts'
import { Notification } from '../../src/notification.ts'
import type { DeliveryContext } from '../../src/contracts/delivery.ts'
import type { MailMessageOptions } from '../../src/contracts/messages.ts'

/**
 * Mock message builder that captures method calls for assertions.
 */
class MockMessage implements MessageContract {
  public _to: string[] = []
  public _from?: { address: string; name?: string }
  public _replyTo?: { address: string; name?: string }
  public _cc?: string[]
  public _bcc?: string[]
  public _subject?: string
  public _priority?: string
  public _html?: string
  public _text?: string
  public _htmlView?: { template: string; data?: Record<string, unknown> }

  to(address: string | string[]): this {
    if (Array.isArray(address)) {
      this._to.push(...address)
    } else {
      this._to.push(address)
    }
    return this
  }

  from(address: string, name?: string): this {
    this._from = { address, name }
    return this
  }

  replyTo(address: string, name?: string): this {
    this._replyTo = { address, name }
    return this
  }

  cc(addresses: string[]): this {
    this._cc = addresses
    return this
  }

  bcc(addresses: string[]): this {
    this._bcc = addresses
    return this
  }

  subject(value: string): this {
    this._subject = value
    return this
  }

  priority(value: string): this {
    this._priority = value
    return this
  }

  html(value: string): this {
    this._html = value
    return this
  }

  text(value: string): this {
    this._text = value
    return this
  }

  htmlView(template: string, data?: Record<string, unknown>): this {
    this._htmlView = { template, data }
    return this
  }
}

/**
 * Mock mailer that captures sent messages.
 */
class MockMailer implements MailerContract {
  public shouldThrow = false
  public errorMessage = 'SMTP connection failed'

  async send(
    callbackOrMail: ((message: MessageContract) => void | Promise<void>) | any
  ): Promise<{ messageId?: string; envelope?: { from?: string; to?: string[] } }> {
    if (this.shouldThrow) {
      throw new Error(this.errorMessage)
    }

    const mockMessage = new MockMessage()

    if (typeof callbackOrMail === 'function') {
      await callbackOrMail(mockMessage)
    }

    return {
      messageId: '<mock-id@test>',
      envelope: { from: 'test@test.com', to: mockMessage._to },
    }
  }
}

/**
 * Mock mail service that returns mock mailers.
 */
class MockMailService implements MailServiceContract {
  public sentMessages: MockMessage[] = []
  public shouldThrow = false
  public errorMessage = 'SMTP connection failed'
  public selectedMailer?: string

  use(mailer?: string): MailerContract {
    this.selectedMailer = mailer
    const mockMailer = new MockMailer()
    mockMailer.shouldThrow = this.shouldThrow
    mockMailer.errorMessage = this.errorMessage

    const self = this
    return {
      send: async (callback: any) => {
        const result = await mockMailer.send(callback)
        if (!self.shouldThrow && typeof callback === 'function') {
          const msg = new MockMessage()
          await callback(msg)
          self.sentMessages.push(msg)
        }
        return result
      },
    }
  }
}

/**
 * Test notification with toMail() method.
 */
class TestMailNotification extends Notification {
  via() {
    return ['mail']
  }

  toMail(_notifiable: any) {
    return MailMessage.create().subject('Test Subject').html('<p>Test content</p>').toOptions()
  }
}

/**
 * Test notification without toMail() method.
 */
class TestNotificationWithoutMail extends Notification {
  via() {
    return ['mail']
  }
}

/**
 * Helper to build a minimal DeliveryContext for testing.
 */
function buildContext(
  overrides: Partial<DeliveryContext<MailMessageOptions>> = {}
): DeliveryContext<MailMessageOptions> {
  return {
    notification: new TestMailNotification(),
    notifiable: {
      id: 'user-123',
      type: 'User',
      routes: new Map([['mail', 'user@example.com']]),
      original: { id: 'user-123', email: 'user@example.com' },
    },
    channel: 'mail',
    message: MailMessage.create().subject('Test').html('<p>Test</p>').toOptions(),
    ...overrides,
  }
}

test.group('MailChannel', () => {
  test('sends email with subject and html', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext()

    const result = await channel.send(context)

    assert.isTrue(result.success)
    assert.equal(result.status, 'sent')
    assert.equal(result.providerMessageId, '<mock-id@test>')
    assert.equal(mockService.sentMessages[0]._subject, 'Test')
    assert.equal(mockService.sentMessages[0]._html, '<p>Test</p>')
  })

  test('sets recipient from notifiable route', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext()

    await channel.send(context)

    assert.deepEqual(mockService.sentMessages[0]._to, ['user@example.com'])
  })

  test('applies from option', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({
      message: MailMessage.create().from('sender@example.com', 'Sender').toOptions(),
    })

    await channel.send(context)

    assert.deepEqual(mockService.sentMessages[0]._from, {
      address: 'sender@example.com',
      name: 'Sender',
    })
  })

  test('applies replyTo option', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({
      message: MailMessage.create().replyTo('reply@example.com', 'Support').toOptions(),
    })

    await channel.send(context)

    assert.deepEqual(mockService.sentMessages[0]._replyTo, {
      address: 'reply@example.com',
      name: 'Support',
    })
  })

  test('applies cc option', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({
      message: MailMessage.create().cc(['cc1@example.com', 'cc2@example.com']).toOptions(),
    })

    await channel.send(context)

    assert.deepEqual(mockService.sentMessages[0]._cc, ['cc1@example.com', 'cc2@example.com'])
  })

  test('applies bcc option', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({
      message: MailMessage.create().bcc(['bcc@example.com']).toOptions(),
    })

    await channel.send(context)

    assert.deepEqual(mockService.sentMessages[0]._bcc, ['bcc@example.com'])
  })

  test('applies priority option', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({
      message: MailMessage.create().priority('high').toOptions(),
    })

    await channel.send(context)

    assert.equal(mockService.sentMessages[0]._priority, 'high')
  })

  test('uses view option with htmlView', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({
      message: MailMessage.create()
        .subject('Welcome')
        .view('emails.welcome', { name: 'John' })
        .toOptions(),
    })

    await channel.send(context)

    assert.equal(mockService.sentMessages[0]._htmlView?.template, 'emails.welcome')
    assert.equal(mockService.sentMessages[0]._htmlView?.data?.name, 'John')
    assert.equal(mockService.sentMessages[0]._htmlView?.data?.subject, 'Welcome')
  })

  test('html takes precedence over view', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({
      message: MailMessage.create().html('<p>Custom HTML</p>').view('emails.welcome').toOptions(),
    })

    await channel.send(context)

    assert.equal(mockService.sentMessages[0]._html, '<p>Custom HTML</p>')
    assert.isUndefined(mockService.sentMessages[0]._htmlView)
  })

  test('applies text option', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({
      message: MailMessage.create().text('Plain text content').toOptions(),
    })

    await channel.send(context)

    assert.equal(mockService.sentMessages[0]._text, 'Plain text content')
  })

  test('returns success result with metadata', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext()

    const result = await channel.send(context)

    assert.isTrue(result.success)
    assert.equal(result.status, 'sent')
    assert.equal(result.providerMessageId, '<mock-id@test>')
    assert.exists(result.metadata?.sentAt)
    assert.deepEqual(result.metadata?.envelope, { from: 'test@test.com', to: ['user@example.com'] })
  })

  test('selects named mailer when specified', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({
      message: MailMessage.create().mailer('smtp').toOptions(),
    })

    await channel.send(context)

    assert.equal(mockService.selectedMailer, 'smtp')
  })

  test('uses default mailer when not specified', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext()

    await channel.send(context)

    assert.isUndefined(mockService.selectedMailer)
  })

  test('returns failed result when mail service throws', async ({ assert }) => {
    const mockService = new MockMailService()
    mockService.shouldThrow = true
    mockService.errorMessage = 'Connection timeout'
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext()

    const result = await channel.send(context)

    assert.isFalse(result.success)
    assert.equal(result.status, 'failed')
    assert.instanceOf(result.error, Error)
    assert.equal(result.error?.message, 'Connection timeout')
    assert.exists(result.metadata?.failedAt)
  })

  test('returns failed result when message is null', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const context = buildContext({ message: null as any })

    const result = await channel.send(context)

    assert.isFalse(result.success)
    assert.equal(result.status, 'failed')
    assert.instanceOf(result.error, Error)
    assert.include(result.error?.message, 'toMail')
  })

  test('throws E_NOTIFICATION_MAIL_MISSING when @adonisjs/mail not installed', async ({
    assert,
  }) => {
    // Create a channel without mailService to trigger dynamic import
    const channel = new MailChannel()
    const context = buildContext()

    const result = await channel.send(context)

    // Should return failed result (not throw) since send() catches all errors
    assert.isFalse(result.success)
    assert.equal(result.status, 'failed')
    assert.instanceOf(result.error, Error)
    // The error message should mention the missing package
    assert.include(result.error?.message.toLowerCase(), '@adonisjs/mail')
  })

  test('handles notification without toMail() method', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })
    const notification = new TestNotificationWithoutMail()
    const context = buildContext({
      notification,
      message: null as any,
    })

    const result = await channel.send(context)

    assert.isFalse(result.success)
    assert.equal(result.status, 'failed')
    assert.instanceOf(result.error, Error)
    assert.include(result.error?.message, 'toMail')
  })

  test('works with MailMessage builder output', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })

    const builder = MailMessage.create()
      .subject('Welcome to Our App')
      .greeting('Hello John')
      .line('Thanks for signing up!')
      .line('We are excited to have you.')
      .action('Get Started', 'https://example.com/start')
      .from('noreply@example.com', 'Our App')
      .priority('high')
      .tags(['welcome', 'onboarding'])

    const context = buildContext({ message: builder.toOptions() })
    const result = await channel.send(context)

    assert.isTrue(result.success)
    const sentMsg = mockService.sentMessages[0]
    assert.equal(sentMsg._subject, 'Welcome to Our App')
    assert.deepEqual(sentMsg._from, { address: 'noreply@example.com', name: 'Our App' })
    assert.equal(sentMsg._priority, 'high')
    assert.deepEqual(sentMsg._to, ['user@example.com'])
  })

  test('view with declarative API merges all options into viewData', async ({ assert }) => {
    const mockService = new MockMailService()
    const channel = new MailChannel({ mailService: mockService })

    const builder = MailMessage.create()
      .subject('Invoice Ready')
      .greeting('Hi Jane')
      .salutation('Thanks')
      .line('Your invoice is ready')
      .action('View Invoice', 'https://example.com/invoice')
      .view('emails.invoice', { invoiceNumber: '12345' })

    const context = buildContext({ message: builder.toOptions() })
    await channel.send(context)

    const viewData = mockService.sentMessages[0]._htmlView?.data
    assert.equal(viewData?.subject, 'Invoice Ready')
    assert.equal(viewData?.greeting, 'Hi Jane')
    assert.equal(viewData?.salutation, 'Thanks')
    assert.deepEqual(viewData?.introLines, ['Your invoice is ready'])
    assert.equal(viewData?.actionText, 'View Invoice')
    assert.equal(viewData?.actionUrl, 'https://example.com/invoice')
    assert.equal(viewData?.invoiceNumber, '12345')
  })
})
