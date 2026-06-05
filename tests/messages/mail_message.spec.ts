import { test } from '@japa/runner'
import { MailMessage } from '../../src/messages/mail_message.ts'

test.group('MailMessage', () => {
  test('create() returns empty options', ({ assert }) => {
    const message = MailMessage.create()
    const options = message.toOptions()
    assert.deepEqual(options, {})
  })

  test('subject() sets subject', ({ assert }) => {
    const message = MailMessage.create().subject('Test Subject')
    const options = message.toOptions()
    assert.equal(options.subject, 'Test Subject')
  })

  test('greeting() sets greeting', ({ assert }) => {
    const message = MailMessage.create().greeting('Hello User')
    const options = message.toOptions()
    assert.equal(options.greeting, 'Hello User')
  })

  test('salutation() sets salutation', ({ assert }) => {
    const message = MailMessage.create().salutation('Best regards')
    const options = message.toOptions()
    assert.equal(options.salutation, 'Best regards')
  })

  test('line() appends to introLines', ({ assert }) => {
    const message = MailMessage.create().line('First line').line('Second line')
    const options = message.toOptions()
    assert.deepEqual(options.introLines, ['First line', 'Second line'])
  })

  test('action() sets actionText and actionUrl', ({ assert }) => {
    const message = MailMessage.create().action('Click here', 'https://example.com')
    const options = message.toOptions()
    assert.equal(options.actionText, 'Click here')
    assert.equal(options.actionUrl, 'https://example.com')
  })

  test('view() sets view name', ({ assert }) => {
    const message = MailMessage.create().view('emails.welcome')
    const options = message.toOptions()
    assert.equal(options.view, 'emails.welcome')
  })

  test('view() with data sets view and viewData', ({ assert }) => {
    const message = MailMessage.create().view('emails.welcome', { name: 'John' })
    const options = message.toOptions()
    assert.equal(options.view, 'emails.welcome')
    assert.deepEqual(options.viewData, { name: 'John' })
  })

  test('html() sets html', ({ assert }) => {
    const message = MailMessage.create().html('<p>Hello</p>')
    const options = message.toOptions()
    assert.equal(options.html, '<p>Hello</p>')
  })

  test('text() sets text', ({ assert }) => {
    const message = MailMessage.create().text('Hello')
    const options = message.toOptions()
    assert.equal(options.text, 'Hello')
  })

  test('from() sets from address', ({ assert }) => {
    const message = MailMessage.create().from('test@example.com')
    const options = message.toOptions()
    assert.deepEqual(options.from, { address: 'test@example.com', name: undefined })
  })

  test('from() sets from address and name', ({ assert }) => {
    const message = MailMessage.create().from('test@example.com', 'Test User')
    const options = message.toOptions()
    assert.deepEqual(options.from, { address: 'test@example.com', name: 'Test User' })
  })

  test('replyTo() sets replyTo address', ({ assert }) => {
    const message = MailMessage.create().replyTo('reply@example.com')
    const options = message.toOptions()
    assert.deepEqual(options.replyTo, { address: 'reply@example.com', name: undefined })
  })

  test('replyTo() sets replyTo address and name', ({ assert }) => {
    const message = MailMessage.create().replyTo('reply@example.com', 'Support')
    const options = message.toOptions()
    assert.deepEqual(options.replyTo, { address: 'reply@example.com', name: 'Support' })
  })

  test('cc() sets cc', ({ assert }) => {
    const message = MailMessage.create().cc(['cc1@example.com', 'cc2@example.com'])
    const options = message.toOptions()
    assert.deepEqual(options.cc, ['cc1@example.com', 'cc2@example.com'])
  })

  test('bcc() sets bcc', ({ assert }) => {
    const message = MailMessage.create().bcc(['bcc@example.com'])
    const options = message.toOptions()
    assert.deepEqual(options.bcc, ['bcc@example.com'])
  })

  test('mailer() sets mailer name', ({ assert }) => {
    const message = MailMessage.create().mailer('smtp')
    const options = message.toOptions()
    assert.equal(options.mailer, 'smtp')
  })

  test('priority() sets priority', ({ assert }) => {
    const message = MailMessage.create().priority('high')
    const options = message.toOptions()
    assert.equal(options.priority, 'high')
  })

  test('tags() sets tags', ({ assert }) => {
    const message = MailMessage.create().tags(['welcome', 'onboarding'])
    const options = message.toOptions()
    assert.deepEqual(options.tags, ['welcome', 'onboarding'])
  })

  test('with() adds to viewData', ({ assert }) => {
    const message = MailMessage.create().with('key1', 'value1').with('key2', 42)
    const options = message.toOptions()
    assert.deepEqual(options.viewData, { key1: 'value1', key2: 42 })
  })

  test('chaining multiple methods composes correctly', ({ assert }) => {
    const message = MailMessage.create()
      .subject('Welcome')
      .greeting('Hello')
      .line('Thanks for joining')
      .action('Get Started', 'https://example.com')
      .from('noreply@example.com', 'Our App')
      .priority('high')
      .tags(['welcome'])

    const options = message.toOptions()
    assert.equal(options.subject, 'Welcome')
    assert.equal(options.greeting, 'Hello')
    assert.deepEqual(options.introLines, ['Thanks for joining'])
    assert.equal(options.actionText, 'Get Started')
    assert.equal(options.actionUrl, 'https://example.com')
    assert.deepEqual(options.from, { address: 'noreply@example.com', name: 'Our App' })
    assert.equal(options.priority, 'high')
    assert.deepEqual(options.tags, ['welcome'])
  })

  test('toOptions() returns a copy', ({ assert }) => {
    const message = MailMessage.create().subject('Test')
    const options1 = message.toOptions()
    const options2 = message.toOptions()

    options1.subject = 'Modified'
    assert.equal(options2.subject, 'Test')
    assert.notStrictEqual(options1, options2)
  })
})
