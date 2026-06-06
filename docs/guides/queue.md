# Queue

Queue-based delivery moves notifications to background workers. Requires `@adonisjs/queue`.

## Setup

1. Install `@adonisjs/queue` and configure it
2. Enable in `config/notifications.ts`:

```ts
export default defineConfig({
  channels: { ... },
  queue: {
    enabled: true,
    defaultQueue: 'notifications',
    connection: 'redis',
  },
})
```

## Per-notification opt-in

```ts
export default class InvoicePaid extends Notification {
  public shouldQueue = true
  public queue = 'billing'         // override default queue
  public connection = 'redis'      // override connection

  via(notifiable) {
    return ['mail', 'database']
  }
}
```

## Per-channel delay

```ts
export default class InvoicePaid extends Notification {
  delay(notifiable, channel) {
    if (channel === 'mail') {
      return '10m'   // 10 minutes
    }
    if (channel === 'database') {
      return 5000    // 5 seconds (ms)
    }
    return null
  }
}
```

Supported delay formats:
- Number: milliseconds
- String: `<number><unit>` where unit is `ms`, `s`, `m`, `h`, `d`

## Bypassing queue

Use `sendNow()` to skip the queue:
```ts
await notifications.sendNow(user, new InvoicePaid(invoice))
```

## Queue job

Each channel delivery dispatches a `SendNotificationJob` with this payload:

```ts
interface QueuePayload {
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
```

## Serialization

When a notification is queued, it is serialized. The default serialization uses the notification's constructor name. For complex notifications, override:

```ts
export default class InvoicePaid extends Notification {
  serialize() {
    return {
      invoiceId: this.invoice.id,
      amount: this.invoice.amount,
    }
  }

  static deserialize(data: Record<string, unknown>) {
    const n = new InvoicePaid(data.invoiceId as number)
    n.amount = data.amount as number
    return n
  }
}
```

Use `config.serialization.notificationAliases` to map class names to import paths:
```ts
serialization: {
  notificationAliases: {
    InvoicePaid: '#notifications/invoice_paid',
  },
}
```

## Deduplication

Each queued delivery has a dedupe key:
```
notification_type + instance_id + notifiable_type + notifiable_id + channel
```

If a pending or sent delivery with the same key exists, the new one is skipped.

## Delivery tracking

When `config.delivery.recordAttempts` is true, a pending delivery row is created when a job is enqueued, and updated on success/failure.
