# AdonisJS Notifications Architecture Plan

## Purpose

Design a comprehensive notification system library for AdonisJS v7 inspired by Laravel Notifications. The package should provide a familiar developer experience while using AdonisJS-native package, dependency injection, configuration, mail, queue, event, testing, and Ace command conventions.

The library should help applications send one notification through many delivery channels, persist notification inbox state, track delivery attempts, support queued delivery, and provide excellent test fakes.

## Non-Goals

- Do not replace `@adonisjs/mail`.
- Do not implement a queue runner when `@adonisjs/queue` exists.
- Do not force applications to use Lucid for every recipient type.
- Do not couple the core package to Twilio, Slack, Pusher, or another vendor.
- Do not make every possible channel part of the first stable release.

## Design Principles

- **Adonis-native first**: provider, configure hook, config file, service import, typed container binding, Ace commands, Japa testing.
- **Laravel-inspired ergonomics**: `notify`, `notifyNow`, `via`, `toMail`, `toDatabase`, route notifications, queued notifications.
- **TypeScript-first contracts**: infer channel message types, notifiable routes, config, and fake assertions as much as practical.
- **Composable integrations**: mail, queues, database, HTTP clients, and realtime systems remain replaceable integrations.
- **Explicit lifecycle**: sending, sent, failed, skipped, read, and seen states should be observable.
- **Small stable core**: make channels pluggable and keep vendor-specific adapters optional.
- **Operational clarity**: persist enough delivery metadata to debug failures, retries, and provider responses.

## Package Structure

```txt
.
|-- configure.ts
|-- index.ts
|-- providers
|   `-- notification_provider.ts
|-- services
|   `-- main.ts
|-- src
|   |-- channels
|   |   |-- base_channel.ts
|   |   |-- database_channel.ts
|   |   |-- log_channel.ts
|   |   |-- mail_channel.ts
|   |   |-- null_channel.ts
|   |   `-- index.ts
|   |-- contracts
|   |   |-- channels.ts
|   |   |-- config.ts
|   |   |-- delivery.ts
|   |   |-- messages.ts
|   |   |-- notifiable.ts
|   |   `-- testing.ts
|   |-- exceptions
|   |   `-- main.ts
|   |-- jobs
|   |   `-- send_notification_job.ts
|   |-- messages
|   |   |-- mail_message.ts
|   |   |-- database_message.ts
|   |   `-- index.ts
|   |-- mixins
|   |   `-- notifies.ts
|   |-- models
|   |   |-- database_notification.ts
|   |   `-- notification_delivery.ts
|   |-- notification.ts
|   |-- notification_manager.ts
|   |-- notification_router.ts
|   |-- repositories
|   |   |-- database_notification_repository.ts
|   |   `-- memory_notification_repository.ts
|   |-- testing
|   |   |-- fake_notification_manager.ts
|   |   `-- assertions.ts
|   `-- utils
|       |-- channel_resolver.ts
|       |-- notifiable_resolver.ts
|       `-- retry_key.ts
|-- commands
|   |-- make_notification.ts
|   |-- notifications_prune.ts
|   `-- notifications_retry_failed.ts
`-- stubs
    |-- config
    |   `-- notifications.stub
    |-- make
    |   `-- notification.stub
    `-- migrations
        |-- create_notifications_table.stub
        `-- create_notification_deliveries_table.stub
```

## Public API

### Service Import

```ts
import notifications from '@rikology/adonisjs-notifications/services/main'

await notifications.send(user, new InvoicePaid(invoice))
await notifications.send([user, admin], new InvoicePaid(invoice))
await notifications.sendNow(user, new InvoicePaid(invoice))
```

### Notifiable Model Mixin

```ts
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { Notifies } from '@rikology/adonisjs-notifications/mixins'

export default class User extends compose(BaseModel, Notifies) {
  @column()
  declare email: string

  routeNotificationForMail() {
    return this.email
  }
}
```

```ts
await user.notify(new InvoicePaid(invoice))
await user.notifyNow(new InvoicePaid(invoice))
```

### Anonymous Route Notifications

```ts
await notifications
  .route('mail', 'billing@example.com')
  .route('slack', 'https://hooks.slack.com/services/...')
  .notify(new InvoicePaid(invoice))
```

### Notification Class

```ts
import { Notification, MailMessage } from '@rikology/adonisjs-notifications'

export default class InvoicePaid extends Notification {
  public shouldQueue = true
  public queue = 'notifications'
  public category = 'billing'
  public priority = 'normal'

  constructor(private invoice: Invoice) {
    super()
  }

  via(notifiable: unknown) {
    return ['mail', 'database']
  }

  toMail(notifiable: unknown) {
    return MailMessage.create()
      .subject('Invoice paid')
      .line(`Invoice ${this.invoice.number} has been paid.`)
      .action('View invoice', `/invoices/${this.invoice.id}`)
  }

  toDatabase(notifiable: unknown) {
    return {
      invoiceId: this.invoice.id,
      invoiceNumber: this.invoice.number,
      amount: this.invoice.amount,
    }
  }
}
```

## Core Concepts

### Notification

A notification is a class representing a user-facing event. It decides which channels to use and converts itself into channel-specific messages.

Responsibilities:

- Declare channels with `via(notifiable)`.
- Provide channel payload builders such as `toMail`, `toDatabase`, `toSms`, `toWebhook`.
- Optionally declare queue behavior, delay, middleware, category, priority, and tags.
- Optionally define `shouldSend(notifiable, channel)` for final delivery filtering.

### Notifiable

A notifiable is any recipient that can receive notifications.

Minimum contract:

```ts
export interface Notifiable {
  getNotificationId?(): string | number
  getNotificationType?(): string
  routeNotificationFor?(channel: string): unknown
}
```

Resolution order for routes:

1. `notification.routeNotificationFor(channel, notifiable)` if implemented.
2. `notifiable.routeNotificationFor${ChannelName}()` if implemented.
3. `notifiable.routeNotificationFor(channel)` if implemented.
4. Configured field mapping, such as `mail -> email`.
5. Channel-specific fallback.
6. Throw a route resolution error unless the channel is optional.

### Notification Manager

The `NotificationManager` is the orchestration service.

Responsibilities:

- Normalize recipients.
- Resolve channel names.
- Resolve channel drivers.
- Apply preferences and `shouldSend`.
- Persist database notification rows when required.
- Dispatch immediately or enqueue delivery jobs.
- Emit lifecycle events.
- Coordinate testing fakes.

### Channels

A channel is an adapter that can deliver one notification to one recipient.

```ts
export interface NotificationChannel<Message = unknown, Result = unknown> {
  name: string

  send(context: DeliveryContext<Message>): Promise<DeliveryResult<Result>>
}
```

Each channel owns transport-specific delivery and route validation. Channels must not decide recipient preferences or global retry policy.

### Messages

Messages are structured channel payloads.

Core messages:

- `MailMessage`
- `DatabaseMessage`
- `SmsMessage` later
- `SlackMessage` later
- `WebhookMessage` later
- `BroadcastMessage` later

`MailMessage` should be fluent, but still serializable enough for queued jobs.

## Delivery Lifecycle

1. Application calls `send`, `sendNow`, `notify`, or `notifyNow`.
2. Manager normalizes recipients into notifiable descriptors.
3. Manager calls `notification.via(notifiable)`.
4. Manager expands each recipient-channel pair into a delivery task.
5. Manager applies preferences, quiet hours, `shouldSend`, and route availability.
6. Manager persists inbox notification data if the `database` channel is selected or if global persistence is enabled.
7. Manager either sends immediately or enqueues a delivery job.
8. Channel builds message by calling `to${Channel}`.
9. Channel sends through its integration.
10. Delivery result is recorded.
11. Lifecycle event is emitted.

## Data Model

### `notifications`

Stores user-facing inbox state.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid/string | Primary key. |
| `type` | string | Notification class or alias. |
| `notifiable_type` | string | Recipient type, usually model class or configured alias. |
| `notifiable_id` | string | Recipient id. |
| `data` | json | Database notification payload. |
| `metadata` | json nullable | Category, priority, tags, grouping keys. |
| `read_at` | timestamp nullable | Read state. |
| `seen_at` | timestamp nullable | Seen state. |
| `created_at` | timestamp | Created time. |
| `updated_at` | timestamp | Updated time. |

Recommended indexes:

- `(notifiable_type, notifiable_id, read_at)`
- `(notifiable_type, notifiable_id, created_at)`
- `(type)`

### `notification_deliveries`

Stores operational delivery state.

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | uuid/string | Primary key. |
| `notification_id` | uuid/string nullable | Related inbox notification when available. |
| `notification_type` | string | Notification class or alias. |
| `notifiable_type` | string | Recipient type. |
| `notifiable_id` | string | Recipient id. |
| `channel` | string | Delivery channel. |
| `status` | string | `pending`, `sent`, `failed`, `skipped`. |
| `attempts` | integer | Attempt count. |
| `dedupe_key` | string | Idempotency key. |
| `provider_message_id` | string nullable | External provider id. |
| `error` | json nullable | Structured error details. |
| `available_at` | timestamp nullable | Scheduled availability. |
| `sent_at` | timestamp nullable | Successful delivery time. |
| `failed_at` | timestamp nullable | Failure time. |
| `created_at` | timestamp | Created time. |
| `updated_at` | timestamp | Updated time. |

Recommended indexes:

- unique `(dedupe_key)`
- `(status, available_at)`
- `(notifiable_type, notifiable_id, channel)`
- `(notification_type, channel)`

## Configuration

```ts
import { defineConfig, channels } from '@rikology/adonisjs-notifications'

export default defineConfig({
  defaultQueue: 'notifications',
  queue: {
    enabled: true,
    connection: undefined,
  },

  channels: {
    mail: channels.mail(),
    database: channels.database(),
    log: channels.log(),
    null: channels.null(),
  },

  routing: {
    mail: ['email'],
    sms: ['phoneNumber', 'phone'],
  },

  database: {
    table: 'notifications',
    deliveriesTable: 'notification_deliveries',
    idStrategy: 'uuid',
  },

  preferences: {
    resolver: undefined,
    quietHours: {
      enabled: false,
      bypassPriorities: ['critical'],
    },
  },

  delivery: {
    recordAttempts: true,
    failFast: false,
    retry: {
      attempts: 3,
      backoff: [30, 300, 900],
    },
  },

  serialization: {
    notificationAliases: {},
    notifiableAliases: {},
  },
})
```

## Container Integration

The provider should register:

- `NotificationManager` singleton.
- `notification.manager` alias if useful.
- Config validator or normalizer.
- Optional channel manager binding.
- Optional repository binding.

Type augmentation should expose the string alias if one is used.

```ts
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'notification.manager': NotificationManager
  }
}
```

## Configure Hook

The configure hook should:

- Copy `config/notifications.ts`.
- Register `providers/notification_provider`.
- Register notification commands.
- Optionally copy migrations.
- Optionally add service import examples to generated docs.
- Avoid overwriting existing files unless the command is run with force behavior supported by Adonis codemods.

Suggested interactive flags:

```txt
node ace configure @rikology/adonisjs-notifications --database --mail --queue
```

## Service Provider Lifecycle

Provider responsibilities:

- `register`: bind manager, repository, router, and channel registry.
- `boot`: resolve optional integrations, register default channels, register macros/mixins only when safe.
- `shutdown`: flush any buffered fake or telemetry state if required.

The provider should not perform database writes, run migrations, or eagerly resolve optional packages during registration.

## Commands

### `make:notification`

Generates a notification class stub.

```txt
node ace make:notification InvoicePaid
node ace make:notification Billing/InvoicePaid --queued --mail --database
```

### `notifications:prune`

Deletes old notification and delivery records.

```txt
node ace notifications:prune --older-than=90d --failed-older-than=30d
```

### `notifications:retry-failed`

Retries failed delivery attempts.

```txt
node ace notifications:retry-failed --channel=mail --limit=100
```

### `notifications:table`

Optional command to publish migration stubs if the configure hook did not install them.

## Events

Emit framework events:

- `notification:sending`
- `notification:sent`
- `notification:failed`
- `notification:skipped`
- `notification:queued`
- `notification:read`
- `notification:seen`

Event payload:

```ts
interface NotificationEventPayload {
  notification: Notification
  notifiable: unknown
  channel: string
  notificationId?: string
  deliveryId?: string
  result?: unknown
  error?: unknown
  metadata: Record<string, unknown>
}
```

## Queueing

Queue behavior should be opt-in per notification or globally configured.

```ts
export default class InvoicePaid extends Notification {
  public shouldQueue = true
  public queue = 'notifications'

  delay(notifiable: unknown, channel: string) {
    return channel === 'mail' ? '5 minutes' : null
  }
}
```

Queue job payload should contain serialized notification data, notifiable identity, channel name, delivery id, and dedupe key.

Idempotency key format:

```txt
notification_type + notification_instance_id + notifiable_type + notifiable_id + channel
```

## Preferences and Quiet Hours

Preference support should be contract-based.

```ts
export interface NotificationPreferenceResolver {
  resolve(notifiable: unknown, notification: Notification): Promise<NotificationPreferences>
}
```

Preferences can include:

- enabled channels
- disabled categories
- quiet hours
- timezone
- critical priority bypass
- digest-only categories

The initial implementation should support a resolver hook but should not ship a full preference UI or schema.

## Read and Seen State

Database notifications should expose repository methods:

- `markAsRead(id)`
- `markAsUnread(id)`
- `markAllAsRead(notifiable)`
- `markAsSeen(id)`
- `unreadCount(notifiable)`
- `listFor(notifiable, options)`

The Lucid mixin may add convenience methods:

```ts
await user.notifications().query()
await user.unreadNotifications().query()
await user.markNotificationsAsRead()
```

## Testing Architecture

Testing must be a first-class feature.

```ts
import notifications from '@rikology/adonisjs-notifications/services/main'

notifications.fake()

await user.notify(new InvoicePaid(invoice))

notifications.assertSentTo(user, InvoicePaid)
notifications.assertSentOnChannel(user, InvoicePaid, 'mail')
notifications.assertNotSentTo(admin, InvoicePaid)
notifications.assertNothingSent()

notifications.restore()
```

Fake manager should record:

- notification instance
- notifiable descriptor
- selected channels
- generated messages when possible
- queued vs immediate intent

Tests should not require a database unless database channel behavior is being tested.

## Error Handling

Define package-specific exceptions:

- `E_NOTIFICATION_ROUTE_MISSING`
- `E_NOTIFICATION_CHANNEL_MISSING`
- `E_NOTIFICATION_MESSAGE_MISSING`
- `E_NOTIFICATION_SERIALIZATION_FAILED`
- `E_NOTIFICATION_DELIVERY_FAILED`
- `E_NOTIFICATION_CONFIG_INVALID`

Errors should include actionable metadata:

- notification type
- channel
- notifiable type/id when available
- route key attempted
- original provider error when available

## Channel Extensibility

Third-party channels should be installable without modifying core.

```ts
notifications.extend('discord', () => {
  return new DiscordChannel()
})
```

or through config:

```ts
channels: {
  discord: channels.extend(() => new DiscordChannel()),
}
```

Channel packages should be able to export:

- channel factory
- message builder
- config types
- test assertion helpers

## Security and Privacy

- Do not log full message payloads by default.
- Redact emails, phone numbers, URLs with tokens, and provider secrets in errors.
- Keep notification `data` JSON application-controlled and document privacy expectations.
- Support pruning old delivery errors.
- Make webhook signing an adapter concern.
- Never serialize arbitrary class instances into queue payloads without explicit serializer support.

## Performance Considerations

- Batch recipient expansion where possible.
- Avoid eager database writes for channels that do not require persistence unless delivery attempts are enabled.
- Use bulk inserts for delivery rows.
- Avoid resolving route data repeatedly for the same notifiable/channel pair.
- Provide pagination for inbox reads.
- Keep fake manager in-memory and low overhead.

## Versioning Strategy

Suggested milestones:

- `0.1.x`: core notification class, manager, log/null channels, tests.
- `0.2.x`: mail and database channels.
- `0.3.x`: queue integration and delivery attempts.
- `0.4.x`: commands, configure hook, docs, fakes.
- `1.0.0`: stable public contracts, migrations, and core channels.

Breaking changes before `1.0.0` are acceptable but should be documented in changelog entries.

## Initial Stable Scope

The first stable release should include:

- Provider and service binding.
- Config file and defineConfig helper.
- `Notification` base class.
- `NotificationManager`.
- `Notifiable` contract and Lucid mixin.
- Route notifications.
- `mail`, `database`, `log`, and `null` channels.
- Queue integration with optional `@adonisjs/queue`.
- Notification and delivery migrations.
- Japa fake/assertion helpers.
- `make:notification`.
- Prune and retry commands if delivery attempts ship in the same release.

## Deferred Scope

Defer until after the core contracts stabilize:

- SMS vendor adapters.
- Slack adapter.
- Webhook adapter.
- Broadcast/realtime adapter.
- Digest notifications.
- Preference storage schema.
- Admin UI.
- Rate limiting integration.
- Multi-tenant delivery routing.
