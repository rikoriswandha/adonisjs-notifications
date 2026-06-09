# Database Notifications

Database notifications provide a persistent inbox for users. Requires `@adonisjs/lucid`.

## Model setup

Add the mixin to your Lucid model:

```ts
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { withNotifications } from '@rikology/adonisjs-notifications/mixins'

export default class User extends compose(BaseModel, withNotifications()) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string
}
```

## Sending to database

```ts
import { Notification } from '@rikology/adonisjs-notifications'

export default class WelcomeNotification extends Notification {
  via(notifiable) {
    return ['database']
  }

  toDatabase(notifiable) {
    return {
      title: 'Welcome to the app',
      body: 'Thanks for signing up!',
      icon: 'user-add',
    }
  }
}
```

Send:
```ts
await user.notify(new WelcomeNotification())
```

## Querying notifications

```ts
// All notifications
const all = await (await user.notifications()).query().paginate(1, 20)

// Unread only
const unread = await (await user.unreadNotifications()).query().paginate(1, 20)

// Unread count
const count = await user.unreadNotificationsCount()
```

## Read state

```ts
await user.markNotificationsAsRead()   // mark all as read
// Note: mark single notification via repository
```

The `NotificationRepository` contract also provides:
- `markAsRead(id)` — mark single notification as read
- `markAsUnread(id)` — mark single notification as unread
- `markAllAsRead(notifiableType, notifiableId)` — mark all unread for a notifiable
- `markAsSeen(id)` — mark as seen (separate from read)

## Repository

The package uses a repository pattern for database operations.

**LucidNotificationRepository** (default) — uses Lucid models.

**MemoryNotificationRepository** (testing) — in-memory, non-persistent.

```ts
import { MemoryNotificationRepository } from '@rikology/adonisjs-notifications'

const repo = new MemoryNotificationRepository()
```

## Migrations

When you run `node ace configure @rikology/adonisjs-notifications`, two migration stubs are published:

- `database/migrations/xxx_create_notifications_table.ts`
- `database/migrations/xxx_create_notification_deliveries_table.ts`

The `notifications` table stores inbox records with columns:
`id`, `type`, `notifiable_type`, `notifiable_id`, `data`, `metadata`, `read_at`, `seen_at`, `created_at`, `updated_at`

The `notification_deliveries` table stores delivery attempts with columns:
`id`, `notification_id`, `notification_type`, `notifiable_type`, `notifiable_id`, `channel`, `status`, `attempts`, `dedupe_key`, `provider_message_id`, `error`, `available_at`, `sent_at`, `failed_at`, `created_at`, `updated_at`

## Pruning

Remove old notifications:
```bash
node ace notifications:prune --older-than=90d
```
