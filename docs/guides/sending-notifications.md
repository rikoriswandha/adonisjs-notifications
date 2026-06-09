# Sending Notifications

## Service import

```ts
import notifications from '@rikology/adonisjs-notifications/services/main'
```

## send()

Dispatches to queue when `shouldQueue = true` and queue is enabled.

```ts
await notifications.send(user, new InvoicePaid(invoice))
```

Send to multiple recipients:
```ts
await notifications.send([user1, user2, user3], new InvoicePaid(invoice))
```

## sendNow()

Bypasses queue unconditionally:
```ts
await notifications.sendNow(user, new InvoicePaid(invoice))
```

## Model mixin methods

When a model uses `withNotifications()`:
```ts
await user.notify(new InvoicePaid(invoice))
await user.notifyNow(new InvoicePaid(invoice))
```

## Anonymous route notifications

Send to arbitrary addresses without a persistent model:
```ts
await notifications
  .route('mail', 'user@example.com')
  .route('sms', '+1234567890')
  .notify(new WelcomeMessage())
```

## Route resolution order

For each channel, the package resolves the destination address in this order:

1. `notification.routeNotificationFor(channel, notifiable)`
2. `notifiable.routeNotificationFor{PascalCase}()` — e.g. `routeNotificationForMail()`
3. `notifiable.routeNotificationFor(channel)`
4. Config `routing` field mapping — e.g. `mail: ['email']`
5. Falls back to channel default if available, or throws `E_NOTIFICATION_ROUTE_MISSING`

## Lifecycle events

|Event|Constant|Emitted when|
|---|---|---|
|`notification:sending`|`NOTIFICATION_SENDING`|Before channel delivery attempt|
|`notification:sent`|`NOTIFICATION_SENT`|After successful delivery|
|`notification:failed`|`NOTIFICATION_FAILED`|After all retry attempts exhausted|
|`notification:skipped`|`NOTIFICATION_SKIPPED`|When deduplicated, gated, or filtered|
|`notification:queued`|`NOTIFICATION_QUEUED`|When job is dispatched to queue|

Import event constants:
```ts
import {
  NOTIFICATION_SENDING,
  NOTIFICATION_SENT,
  NOTIFICATION_FAILED,
  NOTIFICATION_SKIPPED,
} from '@rikology/adonisjs-notifications'
```

Listen in your application:
```ts
import emitter from '@adonisjs/core/services/emitter'
import { NOTIFICATION_SENT } from '@rikology/adonisjs-notifications'

emitter.on(NOTIFICATION_SENT, (payload) => {
  console.log('Sent:', payload.notification.constructor.name)
})
```
