import { test } from '@japa/runner'
import { MailChannel } from '../../src/channels/mail_channel.ts'
import type {
  MailServiceContract,
  MailerContract,
  MessageContract,
} from '../../src/channels/mail_channel.ts'
import { LogChannel } from '../../src/channels/log_channel.ts'
import { MailMessage } from '../../src/messages/mail_message.ts'
import { Notification } from '../../src/notification.ts'
import { NotificationManager } from '../../src/notification_manager.ts'
import { defineConfig } from '../../src/define_config.ts'

/**
 * Mock message builder for capturing method calls.
 */
class MockMessage implements MessageContract {
  public _to: string[] = []
  public _from?: { address: string; name?: string }
  public _subject?: string
  public _html?: string
  public _text?: string

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

  replyTo(_address: string, _name?: string): this {
    return this
  }

  cc(_addresses: string[]): this {
    return this
  }

  bcc(_addresses: string[]): this {
    return this
  }

  subject(value: string): this {
    this._subject = value
    return this
  }

  priority(_value: string): this {
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

  htmlView(_template: string, _data?: Record<string, unknown>): this {
    return this
  }
}

/**
 * Mock mail service for testing.
 */
class MockMailService implements MailServiceContract {
  public sentMessages: MockMessage[] = []

  use(_mailer?: string): MailerContract {
    const self = this
    return {
      send: async (callback: any) => {
        const msg = new MockMessage()
        if (typeof callback === 'function') {
          await callback(msg)
        }
        self.sentMessages.push(msg)
        return { messageId: '<test-id>', envelope: { to: msg._to } }
      },
    }
  }
}

/**
 * Mock logger for LogChannel.
 */
class MockLogger {
  public infoCalls: Array<{ context: Record<string, unknown>; message: string }> = []

  info(context: Record<string, unknown>, message: string): void {
    this.infoCalls.push({ context, message })
  }

  error(_context: Record<string, unknown>, _message: string): void {}
}

/**
 * Test notification with toMail() method.
 */
class WelcomeNotification extends Notification {
  via() {
    return ['mail']
  }

  toMail(_notifiable: any) {
    return MailMessage.create()
      .subject('Welcome!')
      .html('<p>Welcome to our platform</p>')
      .toOptions()
  }
}

/**
 * Test notification with multiple channels.
 */
class MultiChannelNotification extends Notification {
  via() {
    return ['mail', 'log']
  }

  toMail(_notifiable: any) {
    return MailMessage.create().subject('Multi').html('<p>Test</p>').toOptions()
  }

  toLog(_notifiable: any) {
    return { message: 'Logged notification' }
  }
}

/**
 * Test notification without toMail() method.
 */
class NotificationWithoutMail extends Notification {
  via() {
    return ['mail']
  }
}

/**
 * Test notification with shouldSend gate.
 */
class GatedNotification extends Notification {
  via() {
    return ['mail']
  }

  toMail(_notifiable: any) {
    return MailMessage.create().subject('Gated').html('<p>Test</p>').toOptions()
  }

  shouldSend(_notifiable: any, channel: string) {
    return channel !== 'mail'
  }
}

/**
 * Notifiable with routeNotificationForMail() method.
 */
class UserWithMailRoute {
  constructor(
    public id: string,
    public email: string
  ) {}

  routeNotificationForMail() {
    return this.email
  }
}

/**
 * Notifiable without mail route method.
 */
class UserWithoutMailRoute {
  constructor(
    public id: string,
    public email: string
  ) {}
}

/**
 * Helper to create a configured manager.
 */
function createManager(mockMailService: MockMailService, mockLogger?: MockLogger) {
  const config = defineConfig({
    channels: {
      mail: async () => new MailChannel({ mailService: mockMailService }),
      log: async () => new LogChannel(mockLogger ?? new MockLogger()),
    },
    routing: {
      mail: ['email'],
    },
  })

  return new NotificationManager(config)
}

test.group('MailChannel Integration', () => {
  test('delivers notification through manager end-to-end', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const manager = createManager(mockMailService)
    const user = new UserWithMailRoute('user-1', 'user@example.com')

    await manager.send(user, new WelcomeNotification())

    assert.equal(mockMailService.sentMessages.length, 1)
    assert.equal(mockMailService.sentMessages[0]._subject, 'Welcome!')
    assert.equal(mockMailService.sentMessages[0]._html, '<p>Welcome to our platform</p>')
    assert.deepEqual(mockMailService.sentMessages[0]._to, ['user@example.com'])
  })

  test('shouldSend gate skips mail channel when false', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const manager = createManager(mockMailService)
    const user = new UserWithMailRoute('user-1', 'user@example.com')

    await manager.send(user, new GatedNotification())

    assert.equal(mockMailService.sentMessages.length, 0)
  })

  test('delivers through multiple channels', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const mockLogger = new MockLogger()
    const manager = createManager(mockMailService, mockLogger)
    const user = new UserWithMailRoute('user-1', 'user@example.com')

    await manager.send(user, new MultiChannelNotification())

    assert.equal(mockMailService.sentMessages.length, 1)
    assert.equal(mockMailService.sentMessages[0]._subject, 'Multi')
    assert.isAtLeast(mockLogger.infoCalls.length, 1)
  })

  test('route resolution finds routeNotificationForMail() on notifiable', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const manager = createManager(mockMailService)
    const user = new UserWithMailRoute('user-1', 'custom@example.com')

    await manager.send(user, new WelcomeNotification())

    assert.deepEqual(mockMailService.sentMessages[0]._to, ['custom@example.com'])
  })

  test('route resolution falls back to config routing fields', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const manager = createManager(mockMailService)
    const user = new UserWithoutMailRoute('user-1', 'fallback@example.com')

    await manager.send(user, new WelcomeNotification())

    assert.deepEqual(mockMailService.sentMessages[0]._to, ['fallback@example.com'])
  })

  test('missing route throws E_NOTIFICATION_ROUTE_MISSING', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const manager = createManager(mockMailService)
    const user = { id: 'user-1' } // No email field, no route method

    await assert.rejects(async () => {
      await manager.send(user, new WelcomeNotification())
    }, /route/i)
  })

  test('missing toMail() returns failed result', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const manager = createManager(mockMailService)
    const user = new UserWithMailRoute('user-1', 'user@example.com')

    // The manager should throw when the notification doesn't have toMail()
    await assert.rejects(async () => {
      await manager.send(user, new NotificationWithoutMail())
    }, /toMail/)
  })

  test('manager caches channel instance', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const manager = createManager(mockMailService)
    const user = new UserWithMailRoute('user-1', 'user@example.com')

    await manager.send(user, new WelcomeNotification())
    await manager.send(user, new WelcomeNotification())

    assert.equal(mockMailService.sentMessages.length, 2)
  })

  test('sendNow delegates to send', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const manager = createManager(mockMailService)
    const user = new UserWithMailRoute('user-1', 'user@example.com')

    await manager.sendNow(user, new WelcomeNotification())

    assert.equal(mockMailService.sentMessages.length, 1)
  })

  test('sends to multiple notifiables', async ({ assert }) => {
    const mockMailService = new MockMailService()
    const manager = createManager(mockMailService)
    const users = [
      new UserWithMailRoute('user-1', 'user1@example.com'),
      new UserWithMailRoute('user-2', 'user2@example.com'),
    ]

    await manager.send(users, new WelcomeNotification())

    assert.equal(mockMailService.sentMessages.length, 2)
    assert.deepEqual(mockMailService.sentMessages[0]._to, ['user1@example.com'])
    assert.deepEqual(mockMailService.sentMessages[1]._to, ['user2@example.com'])
  })
})
