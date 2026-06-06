# Example: Anonymous Support Message

Send a notification to arbitrary addresses without a persistent user model.

## Use case

A support form where visitors leave their email and phone for follow-up.

## Notification class

```ts
// app/notifications/support_reply.ts
import { Notification, MailMessage } from 'adonisjs-notifications'

export default class SupportReply extends Notification {
  constructor(private ticketId: number, private message: string) {
    super()
  }

  via(notifiable: unknown) {
    return ['mail']
  }

  toMail(notifiable: unknown) {
    return MailMessage.create()
      .subject(`Support Ticket #${this.ticketId}`)
      .greeting('Hello,')
      .line(this.message)
      .action('View Ticket', `https://support.example.com/tickets/${this.ticketId}`)
  }
}
```

## Sending to anonymous routes

```ts
// app/controllers/support_controller.ts
import notifications from 'adonisjs-notifications/services/main'
import SupportReply from '#notifications/support_reply'

export default class SupportController {
  async reply({ request }: HttpContext) {
    const { email, ticketId, message } = request.only(['email', 'ticketId', 'message'])

    await notifications
      .route('mail', email)
      .notify(new SupportReply(ticketId, message))

    return { message: 'Reply sent' }
  }
}
```

## Multiple channels to anonymous routes

```ts
await notifications
  .route('mail', 'user@example.com')
  .route('sms', '+1234567890')
  .notify(new UrgentAlert('Server downtime detected'))
```

## Key points

- No User model required — works with just an email string
- Each `.route()` call maps a channel to an address
- `.notify()` sends via `sendNow()` internally (no queue)
- Useful for guest checkout, contact forms, and alerts
