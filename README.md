# adonisjs-notifications

> Multi-channel notifications with Laravel-inspired ergonomics for AdonisJS v7

Send notifications through multiple channels using a clean, expressive syntax. Queue deliveries, persist notifications to a database inbox, fake them in tests, and build custom channels with minimal boilerplate.

## Installation

```bash
npm i adonisjs-notifications
```

Then configure the package:

```bash
node ace configure adonisjs-notifications
```

This sets up the provider, copies the config file, registers the CLI commands, and optionally publishes the required migrations.

## Quick start

Send your first notification in five steps:

**1. Install the package**
```bash
npm i adonisjs-notifications
```

**2. Create a notification**
```bash
node ace make:notification OrderShipped
```

**3. Define the notification**
```ts
import { Notification, MailMessage } from 'adonisjs-notifications'
import Order from '#models/order'

export default class OrderShippedNotification extends Notification {
  public shouldQueue = false

  constructor(private order: Order) {
    super()
  }

  via(notifiable: unknown): string[] {
    return ['mail']
  }

  toMail(notifiable: unknown) {
    return MailMessage.create()
      .subject(`Order #${this.order.id} has shipped`)
      .line('Your order has been shipped and is on its way!')
      .action('Track your order', `/orders/${this.order.id}`)
  }
}
```

**4. Add the mixin to your User model**
```ts
import { withNotifications } from 'adonisjs-notifications'

export default class User extends compose(BaseModel, withNotifications()) {
  // ...
}
```

**5. Send the notification**
```ts
import notifications from 'adonisjs-notifications/services/main'
import OrderShippedNotification from '#notifications/order_shipped_notification'

await notifications.send(user, new OrderShippedNotification(order))
// or via the model
await user.notify(new OrderShippedNotification(order))
```

## Table of contents

**Guides**

- [`docs/guides/installation.md`](docs/guides/installation.md) — Installation and manual setup
- [`docs/guides/configuration.md`](docs/guides/configuration.md) — Full configuration reference
- [`docs/guides/creating-notifications.md`](docs/guides/creating-notifications.md) — Notifications, messages, and CLI generators
- [`docs/guides/sending-notifications.md`](docs/guides/sending-notifications.md) — Sending, routing, events, and lifecycle
- [`docs/guides/channels.md`](docs/guides/channels.md) — Built-in channel overview
- [`docs/guides/database-notifications.md`](docs/guides/database-notifications.md) — Database inbox, queries, and read state
- [`docs/guides/queue.md`](docs/guides/queue.md) — Queue delivery, delay, deduplication, and delivery tracking
- [`docs/guides/testing.md`](docs/guides/testing.md) — Faking, assertions, and test helpers
- [`docs/guides/custom-channels.md`](docs/guides/custom-channels.md) — Writing and registering custom channels

**Examples**

- [`docs/examples/invoice-paid.md`](docs/examples/invoice-paid.md) — Invoice notification with mail and database channels
- [`docs/examples/password-changed.md`](docs/examples/password-changed.md) — Security notification with urgent priority
- [`docs/examples/anonymous-support-message.md`](docs/examples/anonymous-support-message.md) — Route notification without a model
- [`docs/examples/database-inbox.md`](docs/examples/database-inbox.md) — Querying and managing notification inboxes
- [`docs/examples/queued-mail.md`](docs/examples/queued-mail.md) — Queued notification with delay and delivery tracking

## Feature highlights

- **Multi-channel delivery** — Send through mail, database (inbox), log, or null channels from a single notification class.
- **Queue support** — Queue any notification channel with `shouldQueue = true`, per-notification queue names, and per-channel delays. No delivery code needed.
- **Database inbox** — Persist notifications and query them directly on the notifiable model with `user.notifications()` and `user.unreadNotifications()`.
- **Test fakes** — Swap the real manager for a fake that records every notification and exposes rich assertions. No network calls during tests.
- **Laravel-style API** — Designed to feel familiar: `via()`, `toMail()`, `shouldSend()`, `MailMessage.create()`, `.subject()`, `.line()`, `.action()`.
- **Routing** — Declarative route resolution with fallback strategies, anonymous route notifications, and per-notification overrides.
- **Lifecycle events** — Listen for `notification:sending`, `notification:sent`, `notification:failed`, `notification:skipped`, and `notification:queued`.
- **Delivery tracking** — Track every delivery attempt, retry failed jobs, and prune old records with built-in CLI commands.
- **Custom channels** — Register your own channels at runtime or via config with a single line.

## Peer dependencies

The following are optional peer dependencies. Install only the ones you need:

- `@adonisjs/lucid` — Required for the **database** channel and inbox features.
- `@adonisjs/mail` — Required for the **mail** channel.
- `@adonisjs/queue` — Required for queue-based delivery.

## Requirements

- Node.js >= 24
- AdonisJS v7

## License

MIT
