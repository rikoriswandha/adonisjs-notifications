# Custom Channels

You can add custom notification channels beyond the four built-ins.

## Channel interface

```ts
import type { NotificationChannel } from 'adonisjs-notifications'
import type { DeliveryContext, DeliveryResult } from 'adonisjs-notifications'

export class SmsChannel implements NotificationChannel<string, string> {
  name = 'sms'
  requiresRoute = true
  resolvesOwnMessage = false

  async send(context: DeliveryContext<string>): Promise<DeliveryResult<string>> {
    const phoneNumber = context.notifiable.routes.get('sms')
    const message = context.message

    // Your SMS provider integration
    const providerMessageId = await smsProvider.send(phoneNumber, message)

    return {
      success: true,
      status: 'sent',
      providerMessageId,
      metadata: { sentAt: new Date().toISOString() },
    }
  }
}
```

## DeliveryContext

```ts
interface DeliveryContext<Message = unknown> {
  notification: Notification
  notifiable: NormalizedNotifiable
  channel: string
  message: Message
}
```

## DeliveryResult

```ts
interface DeliveryResult<Result = unknown> {
  success: boolean
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  providerMessageId?: string
  result?: Result
  error?: Error
  metadata?: Record<string, unknown>
}
```

## Registering via config

```ts
import { defineConfig, channels } from 'adonisjs-notifications'
import { SmsChannel } from './channels/sms_channel.js'

export default defineConfig({
  channels: {
    mail: channels.mail(),
    sms: () => new SmsChannel(),
  },
})
```

## Runtime considerations

Runtime channel registration is not currently supported via a dedicated API. Options:

1. **Update config and restart** — the idiomatic approach for AdonisJS.
2. **Factory function** — register your channel in the config with a factory that lazily loads the implementation.

```ts
import { defineConfig, channels } from 'adonisjs-notifications'

export default defineConfig({
  channels: {
    mail: channels.mail(),
    // Lazily loaded custom channel
    myChannel: async () => {
      const { MyChannel } = await import('./channels/my_channel.js')
      return new MyChannel()
    },
  },
})
```
## Notification method

Add a `toSms()` method on your notification:

```ts
export default class OrderShipped extends Notification {
  via(notifiable) {
    return ['sms']
  }

  toSms(notifiable) {
    return `Your order has shipped! Track: ${this.trackingUrl}`
  }
}
```

The channel resolver will call `toSms()` automatically when the `sms` channel is invoked.

## Route resolution

Custom channels participate in the standard route resolution chain:

1. `notification.routeNotificationFor('sms', notifiable)`
2. `notifiable.routeNotificationForSms()`
3. `notifiable.routeNotificationFor('sms')`
4. Config `routing: { sms: ['phone'] }`

## Testing custom channels

```ts
const fake = notifications.fake({ channels: ['sms'] })

await user.notify(new OrderShipped())

fake.assertSentOnChannel(user, OrderShipped, 'sms')
const message = fake.sent()[0].getMessage('sms')
assert.include(message, ' Track: ')
```

## Full custom channel example

```ts
// channels/push_notification_channel.ts
import type { NotificationChannel, DeliveryContext, DeliveryResult } from 'adonisjs-notifications'

interface PushPayload {
  title: string
  body: string
  token: string
}

export class PushNotificationChannel implements NotificationChannel<PushPayload, string> {
  name = 'push'
  requiresRoute = true
  resolvesOwnMessage = false

  async send(context: DeliveryContext<PushPayload>): Promise<DeliveryResult<string>> {
    const deviceToken = context.notifiable.routes.get('push')
    if (!deviceToken) {
      throw new Error('No push device token resolved')
    }

    const payload = context.message

    const response = await fetch('https://push-api.example.com/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: deviceToken,
        title: payload.title,
        body: payload.body,
      }),
    })

    if (!response.ok) {
      throw new Error(`Push failed: ${response.statusText}`)
    }

    const data = await response.json()

    return {
      success: true,
      status: 'sent',
      providerMessageId: data.messageId,
    }
  }
}
```

```ts
// app/notifications/system_alert.ts
import { Notification, MailMessage } from 'adonisjs-notifications'

export default class SystemAlert extends Notification {
  via(notifiable) {
    return ['mail', 'push']
  }

  toMail(notifiable) {
    return MailMessage.create()
      .subject('System Alert')
      .line(this.message)
  }

  toPush(notifiable) {
    return {
      title: 'System Alert',
      body: this.message,
      token: '', // resolved via route
    }
  }

  constructor(private message: string) {
    super()
  }
}
```
