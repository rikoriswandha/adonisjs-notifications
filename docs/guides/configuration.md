# Configuration

The configuration file `config/notifications.ts` is created by `node ace configure @rikology/adonisjs-notifications`.

```ts
import { defineConfig, channels } from '@rikology/adonisjs-notifications'

export default defineConfig({
  channels: {
    mail: channels.mail(),
    database: channels.database(),
    log: channels.log(),
    null: channels.null(),
  },

  queue: {
    enabled: false,
    defaultQueue: 'notifications',
    connection: undefined,
  },

  routing: {
    mail: ['email'],
  },

  database: {
    table: 'notifications',
    deliveriesTable: 'notification_deliveries',
    idStrategy: 'uuid',
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

  preferences: {
    quietHours: {
      enabled: false,
      bypassPriorities: ['critical'],
    },
  },
})
```

## channels

Maps channel names to factory functions. Remove channels you don't need.
- `channels.mail()` — requires @adonisjs/mail
- `channels.database()` — requires @adonisjs/lucid
- `channels.log()` — no dependencies
- `channels.null()` — no dependencies

## queue

- `enabled` — master switch for queue delivery
- `defaultQueue` — default queue name for notifications
- `connection` — optional queue connection name

## routing

Maps channel names to notifiable field names for route resolution. Example:
```ts
routing: {
  mail: ['email', 'backupEmail'],
  sms: ['phone'],
}
```

## database

- `table` — notifications inbox table name
- `deliveriesTable` — delivery attempts tracking table name
- `idStrategy` — 'uuid' | 'nanoid' | 'auto-increment'

## delivery

- `recordAttempts` — whether to persist delivery attempts
- `failFast` — whether to stop on first channel failure
- `retry.attempts` — max retry attempts per channel
- `retry.backoff` — delay in seconds between retries: [30, 300, 900] means 30s, 5min, 15min

## serialization

- `notificationAliases` — map class names to import paths for queue deserialization
- `notifiableAliases` — map model names to import paths for queue deserialization

## preferences

- `resolver` — optional async function to resolve recipient preferences
- `quietHours.enabled` — whether quiet hours filtering is active
- `quietHours.bypassPriorities` — array of priority strings that skip quiet hours
